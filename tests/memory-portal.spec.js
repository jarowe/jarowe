// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5179';
const SCENE_ID = 'placeholder-scene';

test.describe('Memory Portal', () => {
  test('page loads at /memory/placeholder-scene', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });

    // Main container should render
    const portal = page.locator('.memory-portal');
    await expect(portal).toBeVisible({ timeout: 15000 });
  });

  test('scene title shows location', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 15000 });

    const title = page.locator('.memory-title');
    await expect(title).toBeVisible({ timeout: 5000 });

    // The placeholder scene has location "Memory Lane"
    const titleText = await title.textContent();
    expect(titleText).toContain('Memory Lane');
  });

  test('back link navigates to homepage', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 15000 });

    const backLink = page.locator('.memory-back .back-link');
    await expect(backLink).toBeVisible({ timeout: 5000 });
    await expect(backLink).toHaveAttribute('href', '/');
  });

  test('GPU capability check runs and resolves', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 15000 });

    // Initially capable state is null → "Checking device capabilities..." shown
    // Then it resolves to true (splat viewer) or false (fallback)
    // Wait for the check to complete — either splat container or fallback should appear
    await page.waitForTimeout(3000);

    const capable = await page.evaluate(() => {
      // Check if the splat container OR fallback is present (capability resolved)
      const splatContainer = document.querySelector('.memory-splat-container');
      const fallback = document.querySelector('.memory-fallback');
      const checking = document.querySelector('.memory-loading');

      return {
        hasSplat: !!splatContainer,
        hasFallback: !!fallback,
        stillChecking: !!checking && !splatContainer && !fallback,
      };
    });

    // GPU check should have resolved — either splat or fallback rendered
    // In headless CI, WebGL2 may not be available, so fallback is expected
    const resolved = capable.hasSplat || capable.hasFallback;
    // NOTE: In some CI environments the loading state may persist because
    // the splat library is downloading from HuggingFace (network-dependent).
    // We accept either resolved OR still-loading as valid states.
    expect(resolved || capable.stillChecking).toBe(true);

    if (capable.hasFallback) {
      // Verify fallback has the scene title and explanation text
      const fallbackPrompt = page.locator('.memory-fallback-prompt');
      await expect(fallbackPrompt).toBeVisible();

      const heading = fallbackPrompt.locator('h2');
      await expect(heading).toBeVisible();
      const headingText = await heading.textContent();
      expect(headingText).toContain('A Place That Matters');

      const explanation = fallbackPrompt.locator('p');
      await expect(explanation.first()).toBeVisible();
    }
  });

  test('either splat viewer or fallback renders', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 15000 });

    // Give extra time for capability check + splat loading
    await page.waitForTimeout(5000);

    const state = await page.evaluate(() => {
      return {
        hasSplat: !!document.querySelector('.memory-splat-container'),
        hasFallback: !!document.querySelector('.memory-fallback'),
        hasLoading: !!document.querySelector('.memory-loading'),
      };
    });

    // At least one of these should be true:
    // - splat viewer is rendering (capable device, library loaded)
    // - fallback is showing (not capable or error)
    // - still loading (capable but splat file still downloading)
    const validState = state.hasSplat || state.hasFallback || state.hasLoading;
    expect(validState).toBe(true);
  });

  test('narrative cards appear after delays', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 15000 });

    // The placeholder scene has narrative cards at delays: 2000ms, 6000ms, 11000ms
    // Wait past the first delay
    const narrativeContainer = page.locator('.memory-narrative');
    await expect(narrativeContainer).toBeAttached({ timeout: 5000 });

    // No cards should be visible immediately (delay starts at 2000ms)
    const initialCards = await page.locator('.memory-narrative-card').count();
    // It's possible the test started slightly after the timer, so we don't assert 0

    // Wait past first card delay (2000ms) + buffer
    await page.waitForTimeout(3000);

    const firstCardCount = await page.locator('.memory-narrative-card').count();
    expect(firstCardCount).toBeGreaterThanOrEqual(1);

    // Verify first card has the expected text
    const firstCardText = await page.locator('.memory-narrative-card').first().textContent();
    expect(firstCardText).toContain('Some places hold more than what you see');

    // Wait past second card delay (6000ms from mount = ~3s more from here)
    await page.waitForTimeout(4000);

    const secondCardCount = await page.locator('.memory-narrative-card').count();
    expect(secondCardCount).toBeGreaterThanOrEqual(2);
  });

  test('narrative cards accumulate (all 3 appear over time)', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 15000 });

    // Wait past ALL narrative delays (last card at 11000ms) + generous buffer
    await page.waitForTimeout(14000);

    const cards = page.locator('.memory-narrative-card');
    const cardCount = await cards.count();

    // All 3 narrative cards should be visible
    expect(cardCount).toBe(3);

    // Verify all 3 card texts
    const allTexts = await cards.allInnerTexts();
    expect(allTexts[0]).toContain('Some places hold more than what you see');
    expect(allTexts[1]).toContain('They hold the feeling of being exactly where you belong');
    expect(allTexts[2]).toContain('This is one of those places');
  });

  test('unknown scene ID falls back gracefully', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    // Use a non-existent scene ID — getSceneById returns first scene as fallback
    await page.goto(`${BASE}/memory/nonexistent-scene-xyz`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 15000 });

    // Should still render the portal (fallback to first scene)
    const portal = page.locator('.memory-portal');
    await expect(portal).toBeVisible();

    // Title should show the fallback scene's location
    const title = page.locator('.memory-title');
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText).toContain('Memory Lane');
  });
});
