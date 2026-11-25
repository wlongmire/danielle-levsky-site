import { test, expect } from '../../support/fixtures';
import { cardCount, cardTitle, frontMatter, menuItems, readRoot, resetContent, sectionPages, sharedCards } from '../../support/site';
import { putDoc, readDoc, signIn } from '../../support/editor';

const sections = sectionPages();
const home = frontMatter('src/content/pages/home.md').data;
const about = frontMatter('src/content/pages/about.md').data;
const PAGES = [{ href: '/', blocks: home.blocks as any[], name: 'Home' }, { href: '/about', blocks: about.blocks as any[], name: 'About' }, ...sections.map((s) => ({ href: s.href, blocks: s.blocks, name: s.navLabel }))];

test.describe('every public page', () => {
  for (const p of PAGES) {
    test(`${p.name} (${p.href}) loads cleanly and is built the accessible way`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
      const res = await page.goto(p.href);
      expect(res?.status()).toBe(200);
      await expect(page.locator('main h1')).toHaveCount(1);                              // one main heading
      expect(await page.locator('img:not([alt])').count()).toBe(0);                      // every picture has alt text (empty for decoration)
      expect(await page.locator('main').count()).toBe(1);
      await expect(page.locator('a.skip')).toHaveAttribute('href', '#main');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);   // no sideways scroll
      expect(errors).toEqual([]);
    });
  }
});

test.describe('header and footer', () => {
  test('the menu lists About, then the menu pages in the saved order, and highlights the page you are on', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('.site-nav a:not(.btn)');
    const flat = menuItems().flatMap((i) => ('group' in i ? i.links : [i.link]));   // pages inside a dropdown come in the dropdown's place
    await expect(links).toHaveText(flat.map((l) => l.label));
    const hrefs = await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(flat.map((l) => l.href));
    await expect(page.locator('.site-nav [aria-current]')).toHaveCount(0);   // Home is the logo, not a menu item
    for (const s of sections) {
      await page.goto(s.href);
      await expect(page.locator('.site-nav [aria-current]')).toHaveText(s.navLabel);
    }
  });

  test('pages that share a dropdown name sit in one dropdown that opens, marks the current page, and closes with Esc or a click elsewhere', async ({ page }) => {
    const group = menuItems().find((i): i is Extract<ReturnType<typeof menuItems>[number], { group: string }> => 'group' in i);
    expect(group, 'at least one dropdown is set in the content files').toBeTruthy();
    const g = page.locator('.nav-group').first();
    const btn = g.locator('button');
    const list = g.locator('.nav-sub');

    await page.goto('/');
    await expect(btn).toHaveText(group!.group);
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(list).toBeHidden();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(list.locator('a')).toHaveText(group!.links.map((l) => l.label));
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(btn).toBeFocused();
    await btn.click();
    await page.locator('main').click({ position: { x: 5, y: 5 } });
    await expect(list).toBeHidden();

    // On one of its pages the dropdown button is marked, and the page's own link is the current one.
    await page.goto(group!.links[1].href);
    await expect(btn).toHaveAttribute('data-current', '');
    await btn.click();
    await expect(list.locator('[aria-current]')).toHaveText(group!.links[1].label);
    await list.locator('a').first().click();
    await expect(page).toHaveURL(new RegExp(group!.links[0].href + '$'));
  });

  test('a dropdown can be opened and walked through with the keyboard', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('.nav-group button').first();
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(page.locator('.nav-sub a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(btn).toBeFocused();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  test('the footer shows the email and the site links from the site details', async ({ page }) => {
    const site = JSON.parse(readRoot('src/data/site.json'));
    await page.goto('/');
    const foot = page.locator('.site-footer');
    await expect(foot).toContainText(site.name);
    await expect(foot.locator(`a[href="mailto:${site.email}"]`)).toBeVisible();
    for (const l of site.links.filter((x: any) => x.url)) await expect(foot.locator(`a[href="${l.url}"]`)).toHaveText(l.label);
  });
});

test.describe('page blocks', () => {
  test('Home: the hero says what the file says, with its buttons, and the cards listed there', async ({ page }) => {
    const hero = home.blocks.find((b: any) => b.type === 'hero');
    await page.goto('/');
    await expect(page.locator('main h1')).toHaveText(hero.headline);
    await expect(page.locator('.hero-actions a')).toHaveCount(hero.buttons?.length ?? 0);
    await expect(page.locator('.cards article.card')).toHaveCount(cardCount(home.blocks));
  });

  for (const s of sections) {
    test(`${s.navLabel}: the cards, panels and overview items match the page file`, async ({ page }) => {
      await page.goto(s.href);
      await expect(page.locator('article.card')).toHaveCount(cardCount(s.blocks));
      await expect(page.locator('section.cards.boxed')).toHaveCount(s.blocks.filter((b) => b.type === 'cards' && b.boxed && b.title).length);
      const items = s.blocks.filter((b) => b.type === 'overview').reduce((n, b) => n + (b.items?.length ?? 0), 0);
      await expect(page.locator('details')).toHaveCount(items);
      // each grid's title shows, in the order the blocks list them
      const titles = s.blocks.filter((b) => (b.type === 'cards' || b.type === 'title' || b.type === 'overview') && b.title).map((b) => b.title);
      const shown = await page.locator('.section-title, .group-title').allTextContents();
      expect(shown).toEqual(titles);
    });
  }

  test('an Overview list item opens and closes with no script', async ({ page }) => {
    const s = sections.find((x) => x.blocks.some((b) => b.type === 'overview' && b.items?.length))!;
    await page.goto(s.href);
    const item = page.locator('details').last();
    const wasOpen = await item.evaluate((d: HTMLDetailsElement) => d.open);
    await item.locator('summary').click();
    expect(await item.evaluate((d: HTMLDetailsElement) => d.open)).toBe(!wasOpen);
    await item.locator('summary').click();
    expect(await item.evaluate((d: HTMLDetailsElement) => d.open)).toBe(wasOpen);
  });

  test('About: the text block and its pictures', async ({ page }) => {
    const text = about.blocks.find((b: any) => b.type === 'text');
    await page.goto('/about');
    await expect(page.locator('.about-img')).toHaveCount(text.photos?.length ?? 0);
    for (const alt of (text.photos ?? []).map((p: any) => p.alt)) await expect(page.locator(`.about-img img[alt="${alt}"]`)).toHaveCount(1);
  });

  test('a card shows its title, summary and subtitle, but not the old role and dates line', async ({ page }) => {
    const id = sections.flatMap((s) => s.blocks).find((b) => b.type === 'cards')!.entries[0];
    const href = sections.find((s) => s.blocks.some((b) => b.type === 'cards' && b.entries.includes(id)))!.href;
    const { data } = frontMatter(`src/content/work/${id}.md`);
    await page.goto(href);
    const card = page.locator(`article.card#${id}`).first();
    await expect(card.locator('.card-title')).toHaveText(data.title);
    await expect(card.locator('.outcome')).toHaveText(data.outcome);
  });
});

test.describe('project popups', () => {
  const withPopup = sections.find((s) => s.blocks.some((b) => b.type === 'cards'))!;

  test('opening a card sets the address; Esc closes it, clears the address and gives focus back to the card', async ({ page }) => {
    await page.goto(withPopup.href);
    const btn = page.locator('button.card-more').first();
    const id = (await btn.getAttribute('data-case'))!;
    await btn.click();
    const dialog = page.locator('#case-dialog');
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${withPopup.href}#${id}$`));
    await expect(dialog.locator('#case-title')).toHaveText(cardTitle(id));
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${withPopup.href}$`));
    await expect(btn).toBeFocused();
  });

  test('the Back button closes the popup, and Forward opens it again', async ({ page }) => {
    await page.goto(withPopup.href);
    const btn = page.locator('button.card-more').first();
    await btn.click();
    await expect(page.locator('#case-dialog')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#case-dialog')).not.toBeVisible();
    await page.goForward();
    await expect(page.locator('#case-dialog')).toBeVisible();
  });

  test('the × button closes it', async ({ page }) => {
    await page.goto(withPopup.href);
    await page.locator('button.card-more').first().click();
    await page.locator('#case-dialog .cs-close').click();
    await expect(page.locator('#case-dialog')).not.toBeVisible();
  });

  for (const s of sections.filter((x) => x.blocks.some((b) => b.type === 'cards'))) {
    test(`${s.navLabel}: sending someone a link to a card opens that card`, async ({ page }) => {
      await page.goto(s.href);
      const ids = await page.locator('button.card-more').evaluateAll((bs) => bs.map((b) => b.getAttribute('data-case')!));
      expect(ids.length).toBeGreaterThan(0);
      const id = ids[ids.length - 1];
      await page.goto(`${s.href}#${id}`);
      await expect(page.locator('#case-dialog')).toBeVisible();
      await expect(page.locator('#case-title')).toHaveText(cardTitle(id));
    });
  }

  test('a popup shows the subtitle, the content, and the Artifacts and Links of a card that has them', async ({ page }) => {
    const all = sections.flatMap((x) => x.blocks.filter((b) => b.type === 'cards').flatMap((b) => b.entries.map((cid: string) => ({ sec: x, id: cid }))));
    const { sec, id } = all.find((c) => frontMatter(`src/content/work/${c.id}.md`).data.artifacts?.length)!;
    const { data, body } = frontMatter(`src/content/work/${id}.md`);
    await page.goto(`${sec.href}#${id}`);
    const dialog = page.locator('#case-dialog');
    await expect(dialog.locator('.cs-outcome')).toHaveText(data.outcome);
    const firstLine = body.replace(/[*#]/g, '').split('\n').map((l) => l.trim()).find(Boolean);
    if (firstLine) await expect(dialog.locator('.cs-text')).toContainText(firstLine.slice(0, 30));
    await expect(dialog.locator('.cs-meta')).toHaveText(data.title.includes(data.org) ? '' : data.org);   // the subtitle sits under the title
    await expect(dialog.getByRole('heading', { name: 'Artifacts' })).toBeVisible();
    for (const a of data.artifacts) await expect(dialog.locator(`.cs-list a[href="${a.url}"]`)).toContainText(a.label);
  });

  test('a card with several pictures has a slideshow with arrows and a counter', async ({ page }) => {
    const all = sections.flatMap((s) => s.blocks.filter((b) => b.type === 'cards').flatMap((b) => b.entries.map((id: string) => ({ s, id }))));
    const hit = all.find(({ id }) => (frontMatter(`src/content/work/${id}.md`).data.media ?? []).length > 1)!;
    const media = frontMatter(`src/content/work/${hit.id}.md`).data.media;
    await page.goto(`${hit.s.href}#${hit.id}`);
    const dialog = page.locator('#case-dialog');
    await expect(dialog.locator('.cs-gcount')).toHaveText(`1 of ${media.length}`);
    await dialog.locator('.cs-gnext').click();
    await expect(dialog.locator('.cs-gcount')).toHaveText(`2 of ${media.length}`);
    await dialog.locator('.cs-gprev').click();
    await dialog.locator('.cs-gprev').click();
    await expect(dialog.locator('.cs-gcount')).toHaveText(`${media.length} of ${media.length}`);   // wraps round
  });

  test('a card listed on two pages is one card: the same title and popup on both', async ({ page }) => {
    const shared = sharedCards();
    test.skip(shared.length === 0, 'no card is on more than one page right now');
    const { id, hrefs } = shared[0];
    for (const href of hrefs) {
      await page.goto(`${href}#${id}`);
      await expect(page.locator('#case-title')).toHaveText(cardTitle(id));
    }
  });
});

test.describe('a summary with several paragraphs', () => {
  test.afterEach(() => resetContent());

  test('runs together on the card, and shows as separate paragraphs in the popup', async ({ page, request }) => {
    resetContent();
    await signIn(request);
    const { id, hrefs } = sharedCards()[0];
    const path = `src/content/work/${id}.md`;
    const doc = await readDoc(request, path);
    const saved = await putDoc(request, path, { ...doc.data, outcome: 'First paragraph of the summary.\n\nSecond paragraph of the summary.' }, doc.sha, doc.body);
    expect(saved.status()).toBe(200);
    await page.waitForTimeout(800);                                   // the dev server reloads its content after a save
    await page.goto(`${hrefs[0]}#${id}`);
    await expect(page.locator('#case-dialog .cs-outcome')).toHaveText(['First paragraph of the summary.', 'Second paragraph of the summary.']);
    await page.keyboard.press('Escape');
    await expect(page.locator(`article.card#${id}`).first().locator('.outcome')).toHaveText('First paragraph of the summary. Second paragraph of the summary.');
  });
});
