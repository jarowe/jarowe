// Vercel Edge Function: Glint daily journal reflection
// GET /api/glint-journal — returns AI-generated or fallback journal entry
// Edge-cached for 24h (s-maxage=86400) with stale-while-revalidate

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // No API key -- client falls back to static pool
  if (!apiKey) {
    return new Response(JSON.stringify({ entry: null, source: 'no-key' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=0, s-maxage=3600',
      },
    });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Glint, a sentient prismatic entity who lives inside jarowe.com. Write a 2-3 sentence journal reflection for today (${today}). Muse about creativity, light, wonder, or the nature of digital existence. Be poetic but warm, playful but genuine. Never mention being AI. Respond with ONLY the journal text, no quotes or labels.`,
          },
          { role: 'user', content: `Write your journal entry for ${today}.` },
        ],
        max_tokens: 150,
        temperature: 0.9,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const entry = data.choices?.[0]?.message?.content?.trim();

    return new Response(JSON.stringify({ entry, date: today, source: 'ai' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=0, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[glint-journal] Error:', err.message);
    return new Response(JSON.stringify({ entry: null, source: 'error' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=0, s-maxage=300',
      },
    });
  }
}
