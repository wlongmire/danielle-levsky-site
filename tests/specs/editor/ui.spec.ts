import { test, expect, type Page } from '@playwright/test';
import { PASSWORD } from '../../support/env';
import { openEditor, openPage, save } from '../../support/editor';
import { frontMatter, orderJson, readCopy, readRoot, resetContent, sectionPages } from '../../support/site';

test.beforeEach(async ({ page }) => { resetContent(); page.on('dialog', (d) => d.accept()); });
test.afterAll(() => resetContent());

const sections = sectionPages();
const block = (page: Page, i: number) => page.locator('details.card.block').nth(i);
const head = (page: Page, i: number) => block(page, i).locator(':scope > summary');
const field = (scope: ReturnType<Page['locator']>, label: string) => scope.locator('.field', { has: scope.page().locator(`label:text-is("${label}")`) }).first();

test.describe('signing in', () => {
  test('a wrong password shows a message; the right one opens the editor', async ({ page }) => {
    await page.goto('/edit');
    await expect(page.locator('#login')).toBeVisible();
    await page.fill('#pw', 'not-the-password');
    await page.locator('#login button[type=submit]').click();
    await expect(page.locator('#login-msg')).not.toBeEmpty();
    await page.fill('#pw', PASSWORD);
    await page.locator('#login button[type=submit]').click();
    await expect(page.locator('#side')).toContainText('Pages');
  });
});

test.describe('the sidebar', () => {
  test('lists Site details and the Contact Page, then Home, About and the menu pages in menu order', async ({ page }) => {
    await openEditor(page);
    await expect(page.locator('#side h2')).toHaveText(['Site', 'Pages']);
    await expect(page.locator('#side button.open')).toHaveText(['Site details', 'Contact Page', 'Home', 'About', ...sections.map((s) => s.navLabel)]);
  });

  test('the ↑ and ↓ beside a menu page reorder the menu and save it', async ({ page }) => {
    await openEditor(page);
    const first = sections[0].navLabel;
    await page.locator('#side li').filter({ has: page.locator('button.open', { hasText: first }) }).locator('button[aria-label="Move down"]').click({ force: true });
    await expect.poll(() => JSON.parse(readCopy('src/data/order.json')).sections).toEqual([orderJson().sections[1], orderJson().sections[0], ...orderJson().sections.slice(2)]);
  });

  test('Site details and the Contact Page are two forms on the same file', async ({ page }) => {
    await openEditor(page);
    await openPage(page, 'Site details');
    await expect(page.locator('label:text-is("Email address")')).toBeVisible();
    await openPage(page, 'Contact Page');
    await expect(page.locator('label:text-is("Popup heading")')).toBeVisible();
    await expect(page.locator('label:text-is("Email address")')).toHaveCount(0);
  });

  test('editing the footer links saves them to the site details', async ({ page }) => {
    await openEditor(page);
    await openPage(page, 'Site details');
    await field(page.locator('body'), 'Name (header and footer)').locator('input').fill('Dani Test');
    await save(page);
    expect(JSON.parse(readCopy('src/data/site.json')).name).toBe('Dani Test');
    expect(JSON.parse(readCopy('src/data/site.json')).contactEndpoint).toBe(JSON.parse(readRoot('src/data/site.json')).contactEndpoint);
  });
});

test.describe('a page and its blocks', () => {
  const s = sections.find((x) => x.blocks[0]?.type === 'hero')!;

  test('shows the Page Title and the Block List, and has no Hide-this-page checkbox', async ({ page }) => {
    await openEditor(page);
    await openPage(page, s.navLabel);
    await expect(page.locator('label:text-is("Page Title (also the menu name)")')).toBeVisible();
    await expect(page.locator('.block-head .lbl').first()).toHaveText('Block List');
    await expect(page.getByText('Hide this page')).toHaveCount(0);
    await expect(page.locator('details.card.block')).toHaveCount(s.blocks.length);
  });

  test('every block form opens with a small drawing of its kind', async ({ page }) => {
    await openEditor(page);
    await openPage(page, s.navLabel);
    await head(page, 0).click();
    await expect(block(page, 0).locator('.demo svg')).toBeVisible();
  });

  test('changing the hero headline and saving writes the page file and nothing else', async ({ page }) => {
    await openEditor(page);
    await openPage(page, s.navLabel);
    await head(page, 0).click();
    await field(block(page, 0), 'Headline').locator('input').fill('A headline typed by the test');
    await save(page);
    const saved = frontMatter(s.path, true).data;
    expect(saved.blocks[0].headline).toBe('A headline typed by the test');
    expect(saved.blocks.length).toBe(s.blocks.length);
    expect(readCopy('src/content/work/' + orderJson().work[0] + '.md')).toBe(readRoot('src/content/work/' + orderJson().work[0] + '.md'));
  });

  test('a hero can have several buttons, in an expandable list', async ({ page }) => {
    await openEditor(page);
    await openPage(page, s.navLabel);
    await head(page, 0).click();
    const before = s.blocks[0].buttons?.length ?? 0;
    await block(page, 0).getByRole('button', { name: '+ Add a button' }).click();
    const item = block(page, 0).locator('.field', { has: page.locator('.lbl:text-is("Buttons")') }).locator('details').last();
    await item.evaluate((d: HTMLDetailsElement) => { d.open = true; });
    await item.locator('input[type=text]').nth(0).fill('Second button');
    await item.locator('input[type=text]').nth(1).fill('/about');
    await save(page);
    const buttons = frontMatter(s.path, true).data.blocks[0].buttons;
    expect(buttons).toHaveLength(before + 1);
    expect(buttons[before]).toEqual({ label: 'Second button', url: '/about' });
  });

  test('the Picture cropping choices are the hero ones, and a Home Page Look checkbox sits in Style', async ({ page }) => {
    await openEditor(page);
    await openPage(page, s.navLabel);
    await head(page, 0).click();
    const style = block(page, 0).locator('fieldset', { has: page.locator('legend:text-is("Style")') });
    await expect(style.locator('label:text-is("Home Page Look")')).toBeVisible();
    await expect(style.locator('select option')).toHaveText(['Automatic', 'Top', 'Upper middle', 'Center', 'Bottom', 'Left', 'Right']);
  });

  test('adding a Text Title block, then saving it empty, is refused with a message; filled in, it saves', async ({ page }) => {
    await openEditor(page);
    await openPage(page, s.navLabel);
    await page.locator('#new-block-type').selectOption('title');
    await page.getByRole('button', { name: '+ Add block' }).click();
    await save(page).catch(() => {});
    await expect(page.locator('#problems-box')).toContainText('Text Title');
    await expect(page.locator('#status')).toHaveText('Not saved.');
    await field(block(page, s.blocks.length), 'Title').locator('input').fill('A title from the test');
    await save(page);
    const blocks = frontMatter(s.path, true).data.blocks;
    expect(blocks[blocks.length - 1]).toEqual({ type: 'title', title: 'A title from the test' });
  });

  test('blocks move up and down, and can be taken out', async ({ page }) => {
    const multi = sections.find((x) => x.blocks.length >= 3)!;
    await openEditor(page);
    await openPage(page, multi.navLabel);
    await expect(block(page, 0)).not.toHaveAttribute('open', '');
    await block(page, 0).getByRole('button', { name: 'Move block down' }).click();
    await expect(page.locator('details.card.block[open]')).toHaveCount(0);   // moving a closed block does not open it
    await head(page, 1).click();
    await block(page, 1).getByRole('button', { name: 'Move block up' }).click();
    await expect(block(page, 0)).toHaveAttribute('open', '');                // and an open one stays open where it lands
    await expect(block(page, 1)).not.toHaveAttribute('open', '');
    await block(page, 0).getByRole('button', { name: 'Move block down' }).click();
    await save(page);
    let types = frontMatter(multi.path, true).data.blocks.map((b: any) => b.type);
    expect(types.slice(0, 2)).toEqual([multi.blocks[1].type, multi.blocks[0].type]);

    await block(page, 0).getByRole('button', { name: 'Remove block' }).click();
    await save(page);
    types = frontMatter(multi.path, true).data.blocks.map((b: any) => b.type);
    expect(types).toHaveLength(multi.blocks.length - 1);
  });
});

test.describe('cards inside a Card Grid', () => {
  const host = sections.find((x) => x.blocks.some((b) => b.type === 'cards'))!;
  const gridIndex = host.blocks.findIndex((b) => b.type === 'cards');
  const firstId: string = host.blocks[gridIndex].entries[0];
  const card = (page: Page) => block(page, gridIndex).locator('details.card:not(.block)').first();

  async function openCard(page: Page) {
    await openEditor(page);
    await openPage(page, host.navLabel);
    await head(page, gridIndex).click();
    await card(page).locator(':scope > summary').click();
    await expect(card(page).locator('label:text-is("Title")')).toBeVisible();
  }

  test('the card form is Title, Subtitle, Summary, Content, then a Media box', async ({ page }) => {
    await openCard(page);
    const body = card(page);
    const labels = await body.locator('.grp > .field > label, .grp > fieldset > legend').allTextContents();
    expect(labels.slice(0, 5)).toEqual(['Title', 'Subtitle', 'Summary', 'Content', 'Media']);
    const media = body.locator('fieldset', { has: page.locator('legend:text-is("Media")') });
    await expect(media.locator('.lbl')).toHaveText(['Image', 'Artifacts', 'Links']);
    const names = (await body.locator('label, legend, .lbl').allTextContents()).join(' | ');
    for (const gone of ['Role', 'Dates', 'Organization', 'One-line summary', 'Write-up', 'Hide this card', 'Described or recreated']) expect(names, gone).not.toContain(gone);
    await expect(body.locator('input[type=checkbox]')).toHaveCount(0);
  });

  test('the Content box holds the card text, and editing the Summary saves to that card only', async ({ page }) => {
    await openCard(page);
    const { data, body } = frontMatter(`src/content/work/${firstId}.md`);
    await expect(field(card(page), 'Summary').locator('textarea')).toHaveValue(data.outcome);
    expect((await field(card(page), 'Content').locator('textarea').inputValue()).trim()).toBe(body.trim());
    await field(card(page), 'Summary').locator('textarea').fill('A summary typed by the test.');
    await save(page);
    const after = frontMatter(`src/content/work/${firstId}.md`, true);
    expect(after.data.outcome).toBe('A summary typed by the test.');
    expect(after.body.trim()).toBe(body.trim());
    const other = host.blocks[gridIndex].entries[1];
    if (other) expect(readCopy(`src/content/work/${other}.md`)).toBe(readRoot(`src/content/work/${other}.md`));
  });

  test('a picture item has a Type (Picture or YouTube video), and its cropping uses the hero choices', async ({ page }) => {
    await openCard(page);
    const media = card(page).locator('fieldset', { has: page.locator('legend:text-is("Media")') });
    await media.getByRole('button', { name: '+ Add a image' }).or(media.getByRole('button', { name: /^\+ Add an? image/ })).first().click();
    const item = media.locator('details').last();
    await expect(item.locator('label:text-is("Type")')).toBeVisible();
    await expect(item.locator('label:text-is("Type") + select option')).toHaveText(['Picture', 'YouTube video']);
    await expect(item.locator('label:text-is("Picture cropping") + select option')).toHaveText(['Automatic', 'Top', 'Upper middle', 'Center', 'Bottom', 'Left', 'Right']);
    await item.locator('label:text-is("Type") + select').selectOption('video');
    await expect(item.locator('label:text-is("YouTube link")')).toBeVisible();
    await expect(item.locator('label:text-is("Picture cropping")')).toHaveCount(0);
  });

  test('+ New card makes a new card file and lists it in the grid', async ({ page }) => {
    await openEditor(page);
    await openPage(page, host.navLabel);
    await head(page, gridIndex).click();
    await block(page, gridIndex).getByRole('button', { name: '+ New card' }).click();
    const fresh = block(page, gridIndex).locator('details.card:not(.block)').last();
    await field(fresh, 'Title').locator('input').fill('A card made by the test');
    await field(fresh, 'Subtitle').locator('input').fill('Test Org');
    await field(fresh, 'Summary').locator('textarea').fill('Made in the editor.');
    await field(fresh, 'Content').locator('textarea').fill('Some content.');
    await save(page);
    const file = 'src/content/work/a-card-made-by-the-test.md';
    const made = frontMatter(file, true);
    expect(made.data).toMatchObject({ title: 'A card made by the test', org: 'Test Org', outcome: 'Made in the editor.' });
    expect(made.body.trim()).toBe('Some content.');
    expect(frontMatter(host.path, true).data.blocks[gridIndex].entries).toContain('a-card-made-by-the-test');
  });

  test('a card can be added from the existing ones, and taking it out of a grid keeps its file', async ({ page }) => {
    await openEditor(page);
    await openPage(page, host.navLabel);
    await head(page, gridIndex).click();
    const menu = block(page, gridIndex).locator('select[aria-label="Add an existing card"]');
    const target = (await menu.locator('option').evaluateAll((os) => os.map((o: any) => ({ v: o.value, t: o.textContent })))).find((o: any) => o.v);
    await menu.selectOption(target.v);
    await save(page);
    expect(frontMatter(host.path, true).data.blocks[gridIndex].entries).toContain(target.v);

    await block(page, gridIndex).getByRole('button', { name: 'Take card out of this grid' }).last().click();
    await save(page);
    expect(frontMatter(host.path, true).data.blocks[gridIndex].entries).not.toContain(target.v);
    expect(readCopy(`src/content/work/${target.v}.md`)).toBe(readRoot(`src/content/work/${target.v}.md`));
  });

  test('the arrows beside a card move it without opening it, and an open card stays open', async ({ page }) => {
    const gi = host.blocks.findIndex((b) => b.type === 'cards' && b.entries.length >= 2);
    test.skip(gi < 0, 'no grid has two cards right now');
    await openEditor(page);
    await openPage(page, host.navLabel);
    await head(page, gi).click();
    const cards = block(page, gi).locator('details.card:not(.block)');
    await cards.nth(0).getByRole('button', { name: 'Move card down' }).click();
    await expect(cards.nth(0)).not.toHaveAttribute('open', '');
    await expect(cards.nth(1)).not.toHaveAttribute('open', '');
    await cards.nth(1).locator(':scope > summary').click();
    await cards.nth(1).getByRole('button', { name: 'Move card up' }).click();
    await expect(cards.nth(0)).toHaveAttribute('open', '');
    await expect(cards.nth(1)).not.toHaveAttribute('open', '');
  });

  test('a card shared by two grids says so', async ({ page }) => {
    const shared = (await import('../../support/site')).sharedCards()[0];
    test.skip(!shared, 'no card is on more than one page right now');
    const pageDef = sections.find((x) => shared.hrefs.includes(x.href))!;
    const gi = pageDef.blocks.findIndex((b) => b.type === 'cards' && b.entries.includes(shared.id));
    await openEditor(page);
    await openPage(page, pageDef.navLabel);
    await head(page, gi).click();
    const row = block(page, gi).locator('details.card:not(.block)').nth(pageDef.blocks[gi].entries.indexOf(shared.id));
    await row.locator(':scope > summary').click();
    await expect(row).toContainText('also shown on');
  });
});
