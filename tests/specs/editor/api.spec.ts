import { test, expect, type APIRequestContext } from '@playwright/test';
import { PASSWORD } from '../../support/env';
import { putDoc, readDoc, signIn, WRITE_HEADERS } from '../../support/editor';
import { existsInCopy, frontMatter, orderJson, readCopy, readRoot, resetContent, sectionPages, TINY_PNG } from '../../support/site';

const CARD = 'src/content/work/eighty2i.md';
const PAGE = 'src/content/sections/dei.md';
const docUrl = (p: string) => `/api/edit/doc?path=${encodeURIComponent(p)}`;

test.beforeEach(() => resetContent());
test.afterAll(() => resetContent());

test.describe('locked out without signing in', () => {
  for (const url of ['/api/edit/files', docUrl(CARD), '/api/edit/image?path=src/assets/headshot.jpg']) {
    test(`GET ${url.split('?')[0]} needs a sign-in`, async ({ request }) => {
      expect((await request.get(url)).status()).toBe(401);
    });
  }
  test('saving, uploading and ordering need a sign-in', async ({ request }) => {
    expect((await request.put('/api/edit/doc', { headers: WRITE_HEADERS, data: { path: CARD, data: {}, sha: 'x' } })).status()).toBe(401);
    expect((await request.post('/api/edit/doc', { headers: WRITE_HEADERS, data: { path: 'src/content/work/x.md', data: {} } })).status()).toBe(401);
    expect((await request.put('/api/edit/order', { headers: WRITE_HEADERS, data: { kind: 'sections', ids: [] } })).status()).toBe(401);
    expect((await request.post('/api/edit/upload', { headers: WRITE_HEADERS, multipart: { target: 'work-image', file: { name: 'a.png', mimeType: 'image/png', buffer: TINY_PNG } } })).status()).toBe(401);
  });
});

test.describe('signing in', () => {
  test('a wrong password is refused', async ({ request }) => {
    const res = await request.post('/api/edit/login', { headers: { ...WRITE_HEADERS, 'x-forwarded-for': '198.51.100.7' }, data: { password: 'not-it' } });
    expect(res.status()).toBe(401);
    expect((await request.get('/api/edit/files')).status()).toBe(401);
  });
  test('a login coming from another website is blocked', async ({ request }) => {
    const res = await request.post('/api/edit/login', { headers: { 'x-edit': '1', origin: 'https://evil.example' }, data: { password: PASSWORD } });
    expect(res.status()).toBe(403);
  });
  test('the right password signs in, and signing out locks it again', async ({ request }) => {
    await signIn(request);
    expect((await request.get('/api/edit/files')).status()).toBe(200);
    await request.post('/api/edit/logout', { headers: WRITE_HEADERS });
    expect((await request.get('/api/edit/files')).status()).toBe(401);
  });
});

test.describe('signed in', () => {
  test.beforeEach(({ request }) => signIn(request));

  test('lists Home, About, then the menu pages in menu order, and every card', async ({ request }) => {
    const data = await (await request.get('/api/edit/files')).json();
    expect(data.pages.map((p: any) => p.id)).toEqual(['home', 'about', ...orderJson().sections]);
    expect(data.entries.map((e: any) => e.id).sort()).toEqual([...orderJson().work].sort());
    expect(data.site.path).toBe('src/data/site.json');
  });

  test('says which pages show each card, as the page files list them', async ({ request }) => {
    const data = await (await request.get('/api/edit/files')).json();
    const labels: Record<string, string> = { home: 'Home', about: 'About' };
    const pages = [
      ...['home', 'about'].map((id) => ({ label: labels[id], blocks: frontMatter(`src/content/pages/${id}.md`).data.blocks ?? [] })),
      ...sectionPages().map((p) => ({ label: p.navLabel, blocks: p.blocks })),
    ];
    for (const e of data.entries) {
      const expected = pages.filter((p) => p.blocks.some((b: any) => b.type === 'cards' && b.entries?.includes(e.id))).map((p) => p.label);
      expect([...e.usedOn].sort(), e.id).toEqual([...new Set(expected)].sort());
    }
  });

  test('only content files can be opened', async ({ request }) => {
    for (const bad of ['src/pages/index.astro', 'package.json', '../package.json', 'src/content/work/../../../package.json', '.env', 'src/lib/editor/auth.ts']) {
      expect((await request.get(docUrl(bad))).status(), bad).toBe(400);
    }
  });

  test('changes without the editor header or from another origin are blocked', async ({ request }) => {
    const doc = await readDoc(request, CARD);
    const body = { path: CARD, data: doc.data, body: doc.body, sha: doc.sha };
    expect((await request.put('/api/edit/doc', { data: body })).status()).toBe(403);
    expect((await request.put('/api/edit/doc', { headers: { 'x-edit': '1', origin: 'https://evil.example' }, data: body })).status()).toBe(403);
  });

  test('saving a card writes the file, keeps the Content, and an out-of-date copy is refused', async ({ request }) => {
    const doc = await readDoc(request, CARD);
    const data = { ...doc.data, outcome: 'Changed by the test suite.' };
    const ok = await putDoc(request, CARD, data, doc.sha, doc.body);
    expect(ok.status()).toBe(200);
    expect(readCopy(CARD)).toContain('Changed by the test suite.');
    expect(readCopy(CARD)).toContain(doc.body.trim().slice(0, 40));
    expect(readRoot(CARD)).not.toContain('Changed by the test suite.');   // the real project is untouched

    const stale = await putDoc(request, CARD, data, doc.sha, doc.body);
    expect(stale.status()).toBe(409);
  });

  test('a new card is created once; a second one with the same name is refused', async ({ request }) => {
    const path = 'src/content/work/test-new-card.md';
    const data = { title: 'Test new card', outcome: 'A card made by the test suite.', role: '', org: 'Test org', dates: '' };
    const make = () => request.post('/api/edit/doc', { headers: WRITE_HEADERS, data: { path, data, body: 'Some content.' } });
    expect((await make()).status()).toBe(200);
    expect(readCopy(path)).toContain('title: Test new card');
    expect((await make()).status()).toBe(409);
    expect((await request.post('/api/edit/doc', { headers: WRITE_HEADERS, data: { path: 'src/content/sections/new-page.md', data: { navLabel: 'x', blocks: [] } } })).status()).toBe(400);   // pages are not created here
  });

  test.describe('checks before saving a card', () => {
    const trySave = async (request: APIRequestContext, edit: (d: any) => any, body?: string) => {
      const doc = await readDoc(request, CARD);
      const res = await putDoc(request, CARD, edit({ ...doc.data }), doc.sha, body ?? doc.body);
      return { status: res.status(), problems: ((await res.json()).problems ?? []).join(' ') as string };
    };

    test('a missing title', async ({ request }) => {
      const r = await trySave(request, (d) => { delete d.title; return d; });
      expect(r.status).toBe(422);
      expect(r.problems).toContain('"title" is required');
    });
    test('a script tag in the Content', async ({ request }) => {
      expect((await trySave(request, (d) => d, 'Hello\n<script>alert(1)</script>\n')).status).toBe(422);
    });
    test('a video that is not a YouTube link', async ({ request }) => {
      const r = await trySave(request, (d) => ({ ...d, media: [{ type: 'video', url: 'https://example.com/video', title: 'x' }] }));
      expect(r.status).toBe(422);
      expect(r.problems).toContain('YouTube');
    });
    test('a picture that was never uploaded', async ({ request }) => {
      const r = await trySave(request, (d) => ({ ...d, media: [{ type: 'image', src: 'nope.jpg', alt: 'x' }] }));
      expect(r.status).toBe(422);
      expect(r.problems).toContain('has not been uploaded');
    });
    test('a picture cropping that is not one of the choices', async ({ request }) => {
      const up = await request.post('/api/edit/upload', { headers: WRITE_HEADERS, multipart: { target: 'work-image', file: { name: 'crop.png', mimeType: 'image/png', buffer: TINY_PNG } } });
      expect(up.status()).toBe(200);
      const media = (crop: string) => (d: any) => ({ ...d, media: [{ type: 'image', src: 'crop.png', alt: 'A crop test', crop }] });
      expect((await trySave(request, media('sideways'))).status).toBe(422);
      expect((await trySave(request, media('top'))).status).toBe(200);
    });
    test('an unknown media type', async ({ request }) => {
      expect((await trySave(request, (d) => ({ ...d, media: [{ type: 'audio', url: 'x' }] }))).status).toBe(422);
    });
    test('a good YouTube video and a picture written as just a file name', async ({ request }) => {
      const up = await request.post('/api/edit/upload', { headers: WRITE_HEADERS, multipart: { target: 'work-image', file: { name: 'check.png', mimeType: 'image/png', buffer: TINY_PNG } } });
      expect(up.status()).toBe(200);
      const r = await trySave(request, (d) => ({ ...d, media: [{ type: 'video', url: 'https://youtu.be/dQw4w9WgXcQ', title: 'A video' }, { type: 'image', src: 'check.png', alt: 'A check' }] }));
      expect(r.status).toBe(200);
    });
    test('Artifacts and Links need words and an address', async ({ request }) => {
      expect((await trySave(request, (d) => ({ ...d, artifacts: [{ label: 'A file' }] }))).status).toBe(422);
      expect((await trySave(request, (d) => ({ ...d, links: [{ label: 'A link', url: 'https://example.com' }] }))).status).toBe(200);
    });
  });

  test.describe('checks before saving a page', () => {
    const trySave = async (request: APIRequestContext, edit: (d: any) => any) => {
      const doc = await readDoc(request, PAGE);
      const res = await putDoc(request, PAGE, edit(structuredClone(doc.data)), doc.sha);
      return { status: res.status(), problems: ((await res.json()).problems ?? []).join(' ') as string };
    };

    test('the page keeps its blocks when saved unchanged', async ({ request }) => {
      expect((await trySave(request, (d) => d)).status).toBe(200);
    });
    test('a Text Title block needs a title', async ({ request }) => {
      const r = await trySave(request, (d) => ({ ...d, blocks: [...d.blocks, { type: 'title', title: '' }] }));
      expect(r.status).toBe(422);
      expect(r.problems).toContain('Text Title');
    });
    test('a Card grid block needs cards that exist', async ({ request }) => {
      expect((await trySave(request, (d) => ({ ...d, blocks: [...d.blocks, { type: 'cards', entries: [] }] }))).status).toBe(422);
      const r = await trySave(request, (d) => ({ ...d, blocks: [...d.blocks, { type: 'cards', entries: ['no-such-card'] }] }));
      expect(r.status).toBe(422);
      expect(r.problems).toContain('does not exist');
    });
    test('a hero picture needs alt text', async ({ request }) => {
      const r = await trySave(request, (d) => ({ ...d, blocks: [{ type: 'hero', headline: 'Hello', image: '../../assets/headshot.jpg' }] }));
      expect(r.status).toBe(422);
      expect(r.problems).toContain('alt text');
    });
    test('a hero button needs a good address, and at most four buttons', async ({ request }) => {
      const hero = (buttons: unknown[]) => (d: any) => ({ ...d, blocks: [{ type: 'hero', headline: 'Hello', buttons }] });
      expect((await trySave(request, hero([{ label: 'Go', url: 'javascript:alert(1)' }]))).status).toBe(422);
      expect((await trySave(request, hero(Array.from({ length: 5 }, () => ({ label: 'Go', url: '/about' }))))).status).toBe(422);
      expect((await trySave(request, hero([{ label: 'Go', url: '/about' }, { label: 'Talk', url: '#contact' }]))).status).toBe(200);
    });
    test('a script tag in a Text block, an overview item or a hero paragraph', async ({ request }) => {
      const bad = '<script>alert(1)</script>';
      expect((await trySave(request, (d) => ({ ...d, blocks: [{ type: 'text', title: 'x', body: bad }] }))).status).toBe(422);
      expect((await trySave(request, (d) => ({ ...d, blocks: [{ type: 'overview', items: [{ title: 'x', text: bad }] }] }))).status).toBe(422);
      expect((await trySave(request, (d) => ({ ...d, blocks: [{ type: 'hero', headline: 'x', intro: bad }] }))).status).toBe(422);
    });
    test('an unknown block type and a missing menu name', async ({ request }) => {
      expect((await trySave(request, (d) => ({ ...d, blocks: [{ type: 'carousel' }] }))).status).toBe(422);
      expect((await trySave(request, (d) => { delete d.navLabel; return d; })).status).toBe(422);
    });
    test('a dropdown name that is not text, or is too long', async ({ request }) => {
      expect((await trySave(request, (d) => ({ ...d, menuGroup: 5 }))).status).toBe(422);
      expect((await trySave(request, (d) => ({ ...d, menuGroup: 'x'.repeat(41) }))).status).toBe(422);
      expect((await trySave(request, (d) => ({ ...d, menuGroup: 'Consulting' }))).status).toBe(200);
    });
  });

  test.describe('uploads', () => {
    const upload = (request: APIRequestContext, target: string, name: string, mimeType: string, buffer: Buffer) =>
      request.post('/api/edit/upload', { headers: WRITE_HEADERS, multipart: { target, file: { name, mimeType, buffer } } });

    test('a real picture is stored in the right folder with a clean name', async ({ request }) => {
      const res = await upload(request, 'work-image', 'My Photo (1).PNG', 'image/png', TINY_PNG);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.path).toBe('src/assets/work/my-photo-1.png');
      expect(existsInCopy(body.path)).toBe(true);
      const page = await (await upload(request, 'page-image', 'block.png', 'image/png', TINY_PNG)).json();
      expect(page.path).toBe('src/assets/pages/block.png');
    });
    test('a file pretending to be a picture is refused', async ({ request }) => {
      expect((await upload(request, 'work-image', 'fake.png', 'image/png', Buffer.from('this is not a picture'))).status()).toBe(400);
    });
    test('a wrong file type is refused', async ({ request }) => {
      expect((await upload(request, 'work-image', 'script.js', 'text/javascript', Buffer.from('alert(1)'))).status()).toBe(400);
    });
    test('a file over 4 MB is refused', async ({ request }) => {
      const big = Buffer.concat([TINY_PNG, Buffer.alloc(4.5 * 1024 * 1024)]);
      expect((await upload(request, 'work-image', 'big.png', 'image/png', big)).status()).toBe(413);
    });
  });

  test('picture preview serves the site picture folders only', async ({ request }) => {
    expect((await request.get('/api/edit/image?path=src/assets/headshot.jpg')).status()).toBe(200);
    for (const bad of ['package.json', 'src/assets/../../package.json', 'src/content/work/eighty2i.md', '.env']) {
      expect((await request.get(`/api/edit/image?path=${encodeURIComponent(bad)}`)).status(), bad).toBe(400);
    }
  });

  test.describe('menu order', () => {
    test('saves a new order', async ({ request }) => {
      const ids = [...orderJson().sections].reverse();
      const res = await request.put('/api/edit/order', { headers: WRITE_HEADERS, data: { kind: 'sections', ids } });
      expect(res.status()).toBe(200);
      expect(JSON.parse(readCopy('src/data/order.json')).sections).toEqual(ids);
      const list = await (await request.get('/api/edit/files')).json();
      expect(list.pages.filter((p: any) => p.kind === 'section').map((p: any) => p.id)).toEqual(ids);
    });
    test('refuses a list that is missing, repeating or inventing pages', async ({ request }) => {
      const ids = orderJson().sections;
      const put = (list: string[]) => request.put('/api/edit/order', { headers: WRITE_HEADERS, data: { kind: 'sections', ids: list } });
      for (const bad of [ids.slice(1), [...ids, 'made-up'], []]) expect((await put(bad)).status()).toBe(409);
      expect((await put([...ids.slice(1), ids[1]])).status()).toBe(400);
      expect((await request.put('/api/edit/order', { headers: WRITE_HEADERS, data: { kind: 'nonsense', ids } })).status()).toBe(400);
    });
  });

  test('the site details keep the contact form address, and check the contact wording', async ({ request }) => {
    const before = JSON.parse(readCopy('src/data/site.json'));
    const doc = await readDoc(request, 'src/data/site.json');
    expect(doc.data.contactEndpoint).toBeUndefined();
    expect((await putDoc(request, 'src/data/site.json', { ...doc.data, contactTitle: 'x'.repeat(200) }, doc.sha)).status()).toBe(422);
    const ok = await putDoc(request, 'src/data/site.json', { ...doc.data, name: 'Test Name' }, doc.sha);
    expect(ok.status()).toBe(200);
    const after = JSON.parse(readCopy('src/data/site.json'));
    expect(after.name).toBe('Test Name');
    expect(after.contactEndpoint).toBe(before.contactEndpoint);
  });
});
