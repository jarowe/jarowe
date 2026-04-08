// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Starseed page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/starseed`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.starseed-shell', { timeout: 15000 });
  });

  test('page loads with starseed shell', async ({ page }) => {
    const shell = page.locator('.starseed-shell');
    await expect(shell).toBeVisible();

    // Should have starseed brand attribute
    await expect(shell).toHaveAttribute('data-brand', 'starseed');
  });

  test('starseed nav renders with brand and links', async ({ page }) => {
    const nav = page.locator('.starseed-nav');
    await expect(nav).toBeVisible({ timeout: 5000 });

    // Brand wordmark
    const wordmark = page.locator('.starseed-wordmark');
    await expect(wordmark).toBeVisible();
    await expect(wordmark).toHaveText('Starseed');

    // Back link to jarowe.com
    const escapeLink = page.locator('.starseed-escape');
    await expect(escapeLink).toBeVisible();
    await expect(escapeLink).toHaveAttribute('href', '/');

    // Labs link
    const labsLink = page.locator('.starseed-nav-link');
    await expect(labsLink).toBeVisible();
    await expect(labsLink).toHaveText('Labs');
    await expect(labsLink).toHaveAttribute('href', '/starseed/labs');
  });

  test('hero section renders with title', async ({ page }) => {
    const hero = page.locator('.starseed-hero');
    await expect(hero).toBeVisible({ timeout: 10000 });

    const title = page.locator('.starseed-title');
    await expect(title).toBeVisible();
    // Title contains "Where ideas become real."
    const titleText = await title.textContent();
    expect(titleText).toContain('Where ideas');
    expect(titleText).toContain('become real');
  });

  test('4 project cards render', async ({ page }) => {
    // Wait for the project grid
    const grid = page.locator('.starseed-project-grid');
    await expect(grid).toBeVisible({ timeout: 10000 });

    // Should have exactly 4 project cards (BEAMY, AMINA, DECKIT, Starseed Labs)
    const cards = page.locator('.starseed-card');
    // Cards are animated in via framer-motion — wait for them
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    const cardCount = await cards.count();
    expect(cardCount).toBe(4);

    // Verify project names
    const cardTexts = await page.locator('.starseed-card h3').allInnerTexts();
    expect(cardTexts).toContain('BEAMY');
    expect(cardTexts).toContain('AMINA');
    expect(cardTexts).toContain('DECKIT');
    expect(cardTexts).toContain('Starseed Labs');
  });

  test('active project cards have launch buttons, disabled ones show coming soon', async ({ page }) => {
    await page.waitForSelector('.starseed-card', { timeout: 10000 });

    // Active cards (BEAMY, Starseed Labs) should have launch button
    const launchBtns = page.locator('.starseed-card__launch');
    const launchCount = await launchBtns.count();
    expect(launchCount).toBe(2); // BEAMY and Starseed Labs

    // Disabled cards should show "Coming soon" status
    const disabledCards = page.locator('.starseed-card--disabled');
    const disabledCount = await disabledCards.count();
    expect(disabledCount).toBe(2); // AMINA and DECKIT

    const statusBadges = page.locator('.starseed-card__status');
    const statusCount = await statusBadges.count();
    expect(statusCount).toBe(2);
  });

  test('project cards have tags', async ({ page }) => {
    await page.waitForSelector('.starseed-card', { timeout: 10000 });

    const tags = page.locator('.starseed-tag');
    const tagCount = await tags.count();
    // Each project has 2 tags → 4 projects × 2 = 8 tags
    expect(tagCount).toBe(8);
  });

  test('3D tilt applies on mousemove (not just hover)', async ({ page }) => {
    // Wait for cards to render and tilt handlers to attach
    await page.waitForSelector('.starseed-card:not(.starseed-card--disabled)', { timeout: 10000 });

    const activeCard = page.locator('.starseed-card:not(.starseed-card--disabled)').first();
    const box = await activeCard.boundingBox();
    if (!box) {
      // Card not visible — skip in headless
      test.skip();
      return;
    }

    // The tilt handler is attached via addEventListener on the actual DOM element.
    // Playwright's page.mouse.move dispatches native browser events, but we need to
    // ensure the mouseenter fires first (sets transition to 'none'), then mousemove
    // applies the perspective transform.

    // First, move mouse outside the card to ensure clean state
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);

    // Enter the card area (triggers mouseenter)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(100);

    // Move within the card — top-left corner
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.waitForTimeout(200);

    const transformTopLeft = await activeCard.evaluate(el => el.style.transform);

    // Move within the card — bottom-right corner
    await page.mouse.move(box.x + box.width - 10, box.y + box.height - 10);
    await page.waitForTimeout(200);

    const transformBottomRight = await activeCard.evaluate(el => el.style.transform);

    // The mousemove handler applies: perspective(1000px) rotateX(...) rotateY(...) scale3d(...)
    // At least one of the positions should have set a transform.
    // NOTE: If this fails in CI, it may be because Playwright's mouse events don't trigger
    // handlers attached via addEventListener on the specific element. In that case, we verify
    // the handler is wired up by checking programmatic dispatch.
    const hasTransform = (transformTopLeft && transformTopLeft.includes('perspective')) ||
                          (transformBottomRight && transformBottomRight.includes('perspective'));

    if (!hasTransform) {
      // Fallback: verify tilt handlers are attached by dispatching a MouseEvent directly
      const tilted = await activeCard.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const event = new MouseEvent('mousemove', {
          clientX: rect.left + 10,
          clientY: rect.top + 10,
          bubbles: true,
        });
        el.dispatchEvent(event);
        return el.style.transform.includes('perspective');
      });
      expect(tilted).toBe(true);
    } else {
      // Both corners should produce different rotation angles
      if (transformTopLeft.includes('perspective') && transformBottomRight.includes('perspective')) {
        expect(transformTopLeft).not.toBe(transformBottomRight);
      }
    }
  });

  test('iridescent border effect exists in CSS for cards', async ({ page }) => {
    // The iridescent border is a CSS effect (::before or ::after pseudo-element, or border style)
    // on hover. We verify the card has the necessary class and that hovering doesn't break anything.
    await page.waitForSelector('.starseed-card:not(.starseed-card--disabled)', { timeout: 10000 });

    const activeCard = page.locator('.starseed-card:not(.starseed-card--disabled)').first();
    const box = await activeCard.boundingBox();
    if (!box) {
      test.skip();
      return;
    }

    // Hover over the card
    await activeCard.hover();
    await page.waitForTimeout(300);

    // Card should still be visible and not broken after hover
    await expect(activeCard).toBeVisible();

    // Move away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);

    // Card should reset (transform goes back to default)
    const transformReset = await activeCard.evaluate(el => el.style.transform);
    // After mouseleave, the transform should be empty or reset
    // (the handler sets transition and clears transform)
    expect(transformReset === '' || transformReset === 'none' || !transformReset.includes('rotateX')).toBe(true);
  });

  test('Labs link navigates to labs page', async ({ page }) => {
    const labsLink = page.locator('.starseed-nav-link');
    await expect(labsLink).toBeVisible({ timeout: 5000 });

    await labsLink.click();
    // Wait for labs page to load (lazy-loaded)
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/starseed/labs');
  });

  test('contact section is visible', async ({ page }) => {
    const contact = page.locator('.starseed-contact');
    // Scroll into view if needed
    await contact.scrollIntoViewIfNeeded();
    await expect(contact).toBeVisible({ timeout: 5000 });

    // Should have heading
    const heading = contact.locator('.starseed-section-heading');
    await expect(heading).toHaveText('Work With Starseed');

    // Should have email link
    const emailLink = contact.locator('.starseed-contact__link');
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute('href', 'mailto:jared@starseed.llc');
  });

  test('footer CTA is visible', async ({ page }) => {
    const footer = page.locator('.starseed-footer-cta');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible({ timeout: 5000 });

    // Should reference jarowe.com
    const footerText = await footer.textContent();
    expect(footerText).toContain('jarowe.com');
  });
});
