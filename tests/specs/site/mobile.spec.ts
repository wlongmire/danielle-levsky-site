import { test, expect } from '../../support/fixtures';
import { sectionPages } from '../../support/site';

const hrefs = ['/', '/about', ...sectionPages().map((s) => s.href)];

for (const href of hrefs) {
  test(`${href} has no sideways scroll on a phone`, async ({ page }) => {
    await page.goto(href);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('the menu hides behind a Menu button that opens, and closes with Esc', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('.menu-btn');
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.site-nav a', { hasText: 'About' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
});

test('a project popup fits the phone screen', async ({ page }) => {
  const s = sectionPages().find((x) => x.blocks.some((b) => b.type === 'cards'))!;
  await page.goto(s.href);
  await page.locator('button.card-more').first().click();
  const box = await page.locator('#case-dialog').boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
