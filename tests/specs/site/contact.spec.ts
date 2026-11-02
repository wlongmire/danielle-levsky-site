import { test, expect } from '../../support/fixtures';
import { readRoot, resetContent, sectionPages, setContactEndpoint } from '../../support/site';

const site = JSON.parse(readRoot('src/data/site.json'));

test.afterAll(() => resetContent());

async function openContact(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('.site-nav a[data-open-contact]').click();
  await expect(page.locator('#contact-dialog')).toBeVisible();
}
const fill = async (page: import('@playwright/test').Page, over: Record<string, string> = {}) => {
  const v = { name: 'Pat Example', email: 'pat@example.com', reason: site.contactReasons[0], message: 'Hello from the test suite.', ...over };
  await page.fill('#ct-name', v.name);
  await page.fill('#ct-email', v.email);
  await page.selectOption('#ct-reason', v.reason);
  await page.fill('#ct-message', v.message);
};

test.describe('the contact popup', () => {
  test.beforeEach(() => { resetContent(); setContactEndpoint('https://formspree.io/f/test-suite'); });

  test('opens from the header, and closes with Esc and with the × button', async ({ page }) => {
    await openContact(page);
    await expect(page.locator('#contact-title')).toHaveText(site.contactTitle);
    await expect(page.locator('#ct-name')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#contact-dialog')).not.toBeVisible();
    await page.locator('.site-nav a[data-open-contact]').click();
    await page.locator('#contact-dialog .ct-close').first().click();
    await expect(page.locator('#contact-dialog')).not.toBeVisible();
  });

  test('opens from a hero button whose address is #contact', async ({ page }) => {
    const host = sectionPages().find((p) => p.blocks.some((b) => b.type === 'hero' && b.buttons?.some((x: any) => x.url === '#contact')));
    test.skip(!host, 'no hero button opens the contact popup right now');
    await page.goto(host!.href);
    await page.locator('.hero-actions a[data-open-contact]').first().click();
    await expect(page.locator('#contact-dialog')).toBeVisible();
  });

  test('offers the reasons from the site details', async ({ page }) => {
    await openContact(page);
    await expect(page.locator('#ct-reason option:not([disabled])')).toHaveText(site.contactReasons);
  });

  test('asks for every field, and for a real email address', async ({ page }) => {
    await openContact(page);
    await page.click('button[type=submit].ct-send');
    await expect(page.locator('.ct-status')).toHaveText('Please fill in every field.');
    await fill(page, { email: 'not-an-email' });
    await page.click('button[type=submit].ct-send');
    await expect(page.locator('.ct-status')).toHaveText('Please enter a valid email address.');
    await expect(page.locator('#ct-email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('sends the message to the form service, then says thanks', async ({ page, mail }) => {
    await openContact(page);
    await fill(page);
    await page.click('button[type=submit].ct-send');
    await expect(page.locator('#contact-done-title')).toBeVisible();
    await expect(page.locator('.ct-done-text')).toContainText('Thanks, Pat Example');
    await expect(page.locator('.ct-done-sub')).toHaveText(site.contactThanks);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]).toMatchObject({ name: 'Pat Example', email: 'pat@example.com', reason: site.contactReasons[0], message: 'Hello from the test suite.' });
  });

  test('a second message within a minute shows the confirmation instead of the form', async ({ page, mail }) => {
    await openContact(page);
    await fill(page);
    await page.click('button[type=submit].ct-send');
    await expect(page.locator('#contact-done-title')).toBeVisible();
    await page.locator('.ct-done-close').click();
    await page.locator('.site-nav a[data-open-contact]').click();
    await expect(page.locator('.ct-done-text')).toHaveText('Your message was sent a moment ago.');
    expect(mail.sent).toHaveLength(1);
  });

  test('if the service is down, the person is told and can try again', async ({ page, mail }) => {
    mail.fail = true;
    await openContact(page);
    await fill(page);
    await page.click('button[type=submit].ct-send');
    await expect(page.locator('.ct-status')).toContainText(`email me directly at ${site.email}`);
    await expect(page.locator('button[type=submit].ct-send')).toBeEnabled();
  });

  test('the hidden spam field makes a bot think it worked, and nothing is sent', async ({ page, mail }) => {
    await openContact(page);
    await fill(page);
    await page.locator('input[name="company"]').evaluate((el: HTMLInputElement) => { el.value = 'Spam Inc'; });
    await page.click('button[type=submit].ct-send');
    await expect(page.locator('#contact-done-title')).toBeVisible();
    expect(mail.sent).toHaveLength(0);
  });
});

test.describe('with no form service connected', () => {
  test.beforeEach(() => resetContent());
  test('the message opens the visitor\'s email app instead', async ({ page }) => {
    await openContact(page);
    await fill(page);
    await page.click('button[type=submit].ct-send');
    await expect(page.locator('.ct-status')).toHaveText('Opening your email app to finish sending.');
  });
});
