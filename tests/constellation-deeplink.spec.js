// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5179';
const HELIX_NODE = 'ig-020';
const PARTICLE_NODE = 'ig-008';

test.describe('Constellation deep-link', () => {
  test('particle node: store state + panel', async ({ page }) => {
    // Collect console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE}/constellation/${PARTICLE_NODE}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.constellation-page', { timeout: 15000 });

    // Wait for canvas + fly-to
    try { await page.waitForSelector('canvas', { timeout: 15000 }); } catch {}
    await page.waitForTimeout(4000);

    const state = await page.evaluate(() => {
      const store = window.__constellationStore;
      if (!store) return { error: 'no store' };
      const s = store.getState();
      const node = s.nodes?.find(n => n.id === 'ig-008');
      return {
        focusedNodeId: s.focusedNodeId,
        dataLoaded: s.dataLoaded,
        dataLoading: s.dataLoading,
        nodeExists: !!node,
        nodeTier: node?.tier,
        nodeHasXYZ: !!(node?.x !== undefined),
        storyPanelInDOM: !!document.querySelector('.story-panel'),
        canvasInDOM: !!document.querySelector('canvas'),
      };
    });

    console.log('\n=== PARTICLE NODE STATE ===');
    console.log(JSON.stringify(state, null, 2));

    expect(state.focusedNodeId).toBe(PARTICLE_NODE);
    expect(state.nodeExists).toBe(true);
    expect(state.nodeHasXYZ).toBe(true);
    // The key assertion: story-panel should exist
    expect(state.storyPanelInDOM).toBe(true);
  });

  test('helix node: store state + panel', async ({ page }) => {
    await page.goto(`${BASE}/constellation/${HELIX_NODE}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.constellation-page', { timeout: 15000 });
    try { await page.waitForSelector('canvas', { timeout: 15000 }); } catch {}
    await page.waitForTimeout(4000);

    const state = await page.evaluate(() => {
      const store = window.__constellationStore;
      if (!store) return { error: 'no store' };
      const s = store.getState();
      return {
        focusedNodeId: s.focusedNodeId,
        dataLoaded: s.dataLoaded,
        storyPanelInDOM: !!document.querySelector('.story-panel'),
        canvasInDOM: !!document.querySelector('canvas'),
      };
    });

    console.log('\n=== HELIX NODE STATE ===');
    console.log(JSON.stringify(state, null, 2));

    expect(state.focusedNodeId).toBe(HELIX_NODE);
    expect(state.storyPanelInDOM).toBe(true);
  });

  test('no flash: canvas stays mounted for 8 seconds', async ({ page }) => {
    let canvasRemovals = 0;

    // Watch for canvas being removed from DOM
    await page.goto(`${BASE}/constellation/${HELIX_NODE}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.constellation-page', { timeout: 15000 });
    try { await page.waitForSelector('canvas', { timeout: 15000 }); } catch {}

    // Now monitor for canvas removal over 8 seconds
    await page.evaluate(() => {
      window.__canvasRemovals = 0;
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const n of m.removedNodes) {
            if (n.tagName === 'CANVAS' || n.querySelector?.('canvas')) {
              window.__canvasRemovals++;
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    await page.waitForTimeout(8000);

    canvasRemovals = await page.evaluate(() => window.__canvasRemovals);
    console.log(`\n=== FLASH TEST: ${canvasRemovals} canvas removals in 8s ===`);
    expect(canvasRemovals).toBe(0);
  });
});
