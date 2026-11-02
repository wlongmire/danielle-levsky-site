import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { BASE_URL, PASSWORD } from './env';

export const WRITE_HEADERS = { 'x-edit': '1', origin: BASE_URL };

/** Signs in through the login API (the cookie stays on the request context / browser context). */
export async function signIn(request: APIRequestContext) {
  const res = await request.post('/api/edit/login', { headers: WRITE_HEADERS, data: { password: PASSWORD } });
  expect(res.status()).toBe(200);
}

/** Opens /edit signed in; the sidebar is drawn once the page lists have loaded. */
export async function openEditor(page: Page) {
  await signIn(page.request);
  await page.goto('/edit');
  await expect(page.locator('#side')).toContainText('Pages');
}

/** Opens one page (or Site details / Contact Page) from the sidebar by its name. */
export async function openPage(page: Page, name: string) {
  await page.locator('#side button.open', { hasText: new RegExp(`^${name}$`) }).click();
  await expect(page.locator('#side .row.on')).toContainText(name);
}

/** Saves and waits for the "Saved" message. */
export async function save(page: Page) {
  await page.locator('#save').click();
  await expect(page.locator('#status')).toHaveText(/^Saved$/);
}

/** The saved-state helpers on the API: read a document as the editor does. */
export async function readDoc(request: APIRequestContext, path: string) {
  const res = await request.get(`/api/edit/doc?path=${encodeURIComponent(path)}`);
  expect(res.status()).toBe(200);
  return res.json() as Promise<{ data: any; body: string; sha: string; kind: string }>;
}
export const putDoc = (request: APIRequestContext, path: string, data: unknown, sha: string, body = '') =>
  request.put('/api/edit/doc', { headers: WRITE_HEADERS, data: { path, data, body, sha } });
