// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const SCENE_ID = 'placeholder-scene';

test.describe('Memory Portal', () => {
  test('page loads at /memory/placeholder-scene', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    const portal = page.locator('.memory-portal');
    await expect(portal).toBeVisible({ timeout: 10000 });
  });

  test('scene title shows MEMORY LANE', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 10000 });
    const title = page.locator('.memory-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('MEMORY LANE');
  });

  test('back link navigates to homepage', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 10000 });
    const backLink = page.locator('.memory-back .back-link');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/');
  });

  test('center content shows scene title and location', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 10000 });
    await page.waitForTimeout(1500);

    const sceneTitle = page.locator('.memory-portal__scene-title');
    await expect(sceneTitle).toBeVisible();
    await expect(sceneTitle).toContainText('A Place That Matters');

    const location = page.locator('.memory-portal__scene-location');
    await expect(location).toContainText('Memory Lane');
  });

  test('hero image renders with parallax container', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 10000 });
    await page.waitForTimeout(500);

    const heroImage = page.locator('.memory-portal__hero-image');
    await expect(heroImage).toBeVisible();

    const vignette = page.locator('.memory-portal__vignette');
    await expect(vignette).toBeAttached();
  });

  test('narrative cards appear after delays', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 10000 });

    let cards = await page.locator('.memory-narrative-card').count();
    expect(cards).toBe(0);

    await page.waitForTimeout(2500);
    cards = await page.locator('.memory-narrative-card').count();
    expect(cards).toBeGreaterThanOrEqual(1);
  });

  test('narrative cards accumulate over time', async ({ page }) => {
    await page.goto(`${BASE}/memory/${SCENE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 10000 });

    await page.waitForTimeout(12000);
    const cards = await page.locator('.memory-narrative-card').count();
    expect(cards).toBe(3);
  });

  test('unknown scene ID falls back gracefully', async ({ page }) => {
    await page.goto(`${BASE}/memory/nonexistent-scene-xyz`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.memory-portal', { timeout: 10000 });

    const title = page.locator('.memory-portal__scene-title');
    await expect(title).toContainText('A Place That Matters');
  });
});
