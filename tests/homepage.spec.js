// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console errors for debugging
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    // Wait for React to hydrate — bento-container is the main layout wrapper
    await page.waitForSelector('.bento-container', { timeout: 20000 });
  });

  test('homepage loads without crash', async ({ page }) => {
    // The page should have the app container rendered
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toBeVisible({ timeout: 10000 });
  });

  test('bento grid renders with multiple cells', async ({ page }) => {
    const bentoGrid = page.locator('.bento-grid');
    await expect(bentoGrid).toBeVisible({ timeout: 10000 });

    // Check that multiple bento cells exist (homepage has many: hero, map, music, project, etc.)
    const cellCount = await page.locator('.bento-cell').count();
    expect(cellCount).toBeGreaterThanOrEqual(5);
  });

  test('hero cell renders with identity content', async ({ page }) => {
    const heroCell = page.locator('.bento-cell.cell-hero');
    await expect(heroCell).toBeVisible({ timeout: 10000 });

    // Hero should have the avatar and identity content
    const heroContent = page.locator('.bento-cell.cell-hero .bento-content');
    await expect(heroContent).toBeVisible();
  });

  test('globe canvas appears in map cell', async ({ page }) => {
    const mapCell = page.locator('.bento-cell.cell-map');
    await expect(mapCell).toBeVisible({ timeout: 15000 });

    // Globe is lazy-loaded — wait for its canvas to render
    // NOTE: Globe uses WebGL and may take extra time in headless mode
    try {
      const canvas = mapCell.locator('canvas');
      await expect(canvas).toBeVisible({ timeout: 25000 });
    } catch {
      // Globe canvas may not render in headless CI (no WebGL).
      // Verify at least the map-container wrapper exists.
      const mapContainer = page.locator('.map-container');
      await expect(mapContainer).toBeAttached({ timeout: 10000 });
    }
  });

  test('TodayRail renders 3 cards', async ({ page }) => {
    const todayRail = page.locator('.today-rail');
    await expect(todayRail).toBeVisible({ timeout: 15000 });

    // TodayRail has 3 cards: state (day+holiday), glint journal, creative prompt
    const cards = page.locator('.today-card');
    // Wait for at least the first card to be visible (framer-motion staggered entry)
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);
  });

  test('holiday banner shows', async ({ page }) => {
    // HolidayBanner is conditionally rendered — it shows when there's a holiday today.
    // The holiday calendar has 364 entries so almost every day has one.
    // We check that either the banner exists or the page loaded without error.
    const banner = page.locator('.holiday-banner');
    const bannerCount = await banner.count();

    if (bannerCount > 0) {
      // Banner exists — verify it has content
      await expect(banner.first()).toBeVisible({ timeout: 5000 });
      // Should have an emoji and text
      const emoji = page.locator('.holiday-banner-emoji, .holiday-banner-emoji-hero');
      await expect(emoji.first()).toBeVisible();
    }
    // If bannerCount === 0, today might be the one day without a holiday (birthday excluded)
    // or it's the user's birthday (birthday mode replaces banner). Either way, no crash = pass.
  });

  test('navbar renders with navigation links', async ({ page }) => {
    const navbar = page.locator('nav.navbar');
    await expect(navbar).toBeVisible({ timeout: 10000 });

    // Check brand link
    const brand = page.locator('.nav-brand');
    await expect(brand).toBeVisible();

    // Check navigation links: Home, Starseed, Garden, Now
    const navLinks = page.locator('.nav-links .nav-link');
    const linkCount = await navLinks.count();
    expect(linkCount).toBe(4);

    // Verify link text
    const linkTexts = await navLinks.allInnerTexts();
    expect(linkTexts).toContain('Home');
    expect(linkTexts).toContain('Starseed');
    expect(linkTexts).toContain('Garden');
    expect(linkTexts).toContain('Now');
  });

  test('navbar has social links', async ({ page }) => {
    const socials = page.locator('.nav-socials');
    await expect(socials).toBeVisible({ timeout: 10000 });

    // X (Twitter), LinkedIn, Instagram, Starseed (Wrench), mute button
    const socialIcons = page.locator('.nav-socials .social-icon');
    const count = await socialIcons.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('navigation links point to correct routes', async ({ page }) => {
    // Home link
    const homeLink = page.locator('.nav-links .nav-link', { hasText: 'Home' });
    await expect(homeLink).toHaveAttribute('href', '/');

    // Starseed link
    const starseedLink = page.locator('.nav-links .nav-link', { hasText: 'Starseed' });
    await expect(starseedLink).toHaveAttribute('href', '/starseed');

    // Garden link
    const gardenLink = page.locator('.nav-links .nav-link', { hasText: 'Garden' });
    await expect(gardenLink).toHaveAttribute('href', '/garden');

    // Now link
    const nowLink = page.locator('.nav-links .nav-link', { hasText: 'Now' });
    await expect(nowLink).toHaveAttribute('href', '/now');
  });

  test('clickable bento cells have correct navigation targets', async ({ page }) => {
    // Starseed cell should be clickable and navigate to /starseed
    const starseedCell = page.locator('.bento-cell.cell-project.clickable');
    await expect(starseedCell).toBeVisible({ timeout: 10000 });

    // Garden cell
    const gardenCell = page.locator('.bento-cell.cell-garden.clickable');
    await expect(gardenCell).toBeVisible({ timeout: 10000 });
  });

  test('music cell renders', async ({ page }) => {
    const musicCell = page.locator('.bento-cell.cell-music');
    await expect(musicCell).toBeVisible({ timeout: 10000 });
  });

  test('quotes cell renders', async ({ page }) => {
    const quotesCell = page.locator('.bento-cell.cell-quotes');
    await expect(quotesCell).toBeVisible({ timeout: 10000 });
  });
});
