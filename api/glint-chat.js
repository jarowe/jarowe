// Vercel serverless function: Glint AI Chat proxy with SSE streaming
// POST /api/glint-chat  { messages: [...], context: {...} }

import { buildSystemPrompt } from './_lib/glint-system-prompt.js';
import { checkRateLimit } from './_lib/rate-limiter.js';
import { getToolSchemas } from './_lib/glint-tools.js';

export const config = {
  runtime: 'edge',
};

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Validate Supabase JWT to identify authenticated users.
 * Returns user ID if valid, null if anonymous.
 */
async function validateAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  // Decode JWT payload (Supabase JWTs are standard RS256)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload.sub || null; // sub = user ID in Supabase JWTs
  } catch {
    return null;
  }
}

export default async function handler(req) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check for OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI not configured', fallback: true }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse body
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { messages, context } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Auth check
  const userId = await validateAuth(req.headers.get('authorization'));
  const isAuthenticated = !!userId;

  // Rate limiting
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rateLimitKey = isAuthenticated ? `auth:${userId}` : `anon:${clientIP}`;
  const limit = isAuthenticated ? 100 : 10;
  const { allowed, remaining } = checkRateLimit(rateLimitKey, limit);

  if (!allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      fallback: true,
      message: isAuthenticated
        ? "Even prisms need to cool down! Try again in a bit."
        : "Glint is resting his voice. Sign in for more conversations!",
    }), {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Limit': String(limit),
      },
    });
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(context || {});

  // Prepare messages for OpenAI
  const model = context?.model || 'gpt-4o-mini';
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-20).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 1000),
    })),
  ];

  // Call OpenAI with streaming
  try {
    const openaiRes = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        stream: true,
        max_tokens: 300,
        temperature: 0.85,
        presence_penalty: 0.3,
        frequency_penalty: 0.2,
        tools: getToolSchemas(),
        tool_choice: 'auto',
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI API error:', openaiRes.status, errText);
      return new Response(JSON.stringify({
        error: 'AI service error',
        fallback: true,
        message: "Glint's connection flickered. Try again!",
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stream SSE response to client
    const encoder = new TextEncoder();
    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let toolCalls = {};
        let finishReason = null;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // If stream ended with tool_calls, emit accumulated tool calls
              if (finishReason === 'tool_calls') {
                const calls = Object.values(toolCalls);
                if (calls.length > 0) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ tool_calls: calls })}\n\n`)
                  );
                }
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') {
                if (trimmed === 'data: [DONE]') {
                  // Check for tool calls before sending DONE
                  if (finishReason === 'tool_calls') {
                    const calls = Object.values(toolCalls);
                    if (calls.length > 0) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ tool_calls: calls })}\n\n`)
                      );
                    }
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                }
                continue;
              }
              if (!trimmed.startsWith('data: ')) continue;

              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta;
                const fr = json.choices?.[0]?.finish_reason;
                if (fr) finishReason = fr;

                // Stream text content tokens (existing behavior)
                const token = delta?.content;
                if (token) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
                  );
                }

                // Accumulate tool call arguments across chunks
                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index;
                    if (!toolCalls[idx]) {
                      toolCalls[idx] = { id: tc.id, name: tc.function?.name || '', arguments: '' };
                    }
                    if (tc.function?.name) toolCalls[idx].name = tc.function.name;
                    if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
                  }
                }

                // When finish_reason is tool_calls, emit accumulated tool calls
                if (fr === 'tool_calls') {
                  const calls = Object.values(toolCalls);
                  if (calls.length > 0) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ tool_calls: calls })}\n\n`)
                    );
                  }
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Limit': String(limit),
      },
    });
  } catch (err) {
    console.error('Glint chat error:', err);
    return new Response(JSON.stringify({
      error: 'Internal error',
      fallback: true,
      message: "Glint's connection flickered. Try again!",
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
