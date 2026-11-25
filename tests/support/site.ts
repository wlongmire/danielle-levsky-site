import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { COPY, ROOT } from './env';

// The site's own copy of js-yaml, so the tests read content files the same way the site does.
const { load: yamlLoad, JSON_SCHEMA } = createRequire(path.join(ROOT, 'package.json'))('js-yaml');

/** Puts the throwaway copy's content back exactly as it is in the real project. */
export function resetContent() {
  for (const dir of ['src/content', 'src/data', 'src/assets']) {
    execFileSync('rsync', ['-a', '--delete', `${path.join(ROOT, dir)}/`, `${path.join(COPY, dir)}/`]);
  }
  // Let the dev server notice the changed files before a page opens; otherwise its "reload" message can land mid-test.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 800);
}
export const readCopy = (rel: string) => fs.readFileSync(path.join(COPY, rel), 'utf8');
export const existsInCopy = (rel: string) => fs.existsSync(path.join(COPY, rel));
export const readRoot = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** The front matter and body of a Markdown content file in the real project (or, with `inCopy`, in the throwaway copy). */
export function frontMatter(rel: string, inCopy = false): { data: any; body: string } {
  const text = inCopy ? readCopy(rel) : readRoot(rel);
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${rel} has no front matter`);
  return { data: yamlLoad(m[1], { schema: JSON_SCHEMA }) ?? {}, body: m[2] };
}

export const orderJson = () => JSON.parse(readRoot('src/data/order.json')) as { work: string[]; sections: string[] };

/** The menu pages in menu order, with their blocks, read from the content files. */
export function sectionPages() {
  return orderJson().sections.map((id) => {
    const { data } = frontMatter(`src/content/sections/${id}.md`);
    return { id, href: `/projects/${id}`, path: `src/content/sections/${id}.md`, navLabel: data.navLabel as string, menuGroup: ((data.menuGroup as string | undefined) ?? '').trim(), draft: !!data.draft, blocks: (data.blocks ?? []) as any[] };
  }).filter((p) => !p.draft);
}
/** The menu as the header draws it: About, then the pages in order, with pages that share a menuGroup collected into one dropdown
    (placed where the first of them comes; a dropdown holding one page is a plain link). */
export function menuItems() {
  type Link = { label: string; href: string };
  const items: ({ link: Link } | { group: string; links: Link[] })[] = [{ link: { label: 'About', href: '/about' } }];
  for (const s of sectionPages()) {
    const link = { label: s.navLabel, href: s.href };
    if (!s.menuGroup) { items.push({ link }); continue; }
    const open = items.find((i): i is { group: string; links: Link[] } => 'group' in i && i.group.toLowerCase() === s.menuGroup.toLowerCase());
    if (open) open.links.push(link); else items.push({ group: s.menuGroup, links: [link] });
  }
  return items.map((i) => ('group' in i && i.links.length === 1 ? { link: i.links[0] } : i));
}
/** How many cards a page's Card Grid blocks list in all. */
export const cardCount = (blocks: any[]) => blocks.filter((b) => b.type === 'cards').reduce((n, b) => n + (b.entries?.length ?? 0), 0);
/** A card's title and (empty) Subtitle as the site shows them. */
export const cardTitle = (id: string) => frontMatter(`src/content/work/${id}.md`).data.title as string;

/** A tiny valid PNG (1x1) for upload tests. */
export const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/** Points the throwaway copy's contact form at the stand-in service (see support/fixtures.ts). The next resetContent() undoes it. */
export function setContactEndpoint(url: string) {
  const file = path.join(COPY, 'src/data/site.json');
  const site = JSON.parse(fs.readFileSync(file, 'utf8'));
  site.contactEndpoint = url;
  fs.writeFileSync(file, JSON.stringify(site, null, 2) + '\n');
}

/** The cards listed on more than one page (a card is one file shown in several places). */
export function sharedCards(): { id: string; hrefs: string[] }[] {
  const pages = [{ href: '/', blocks: frontMatter('src/content/pages/home.md').data.blocks ?? [] }, ...sectionPages().map((p) => ({ href: p.href, blocks: p.blocks }))];
  const where = new Map<string, Set<string>>();
  for (const p of pages) for (const b of p.blocks) if (b.type === 'cards') for (const id of b.entries ?? []) where.set(id, new Set([...(where.get(id) ?? []), p.href]));
  return [...where].filter(([, h]) => h.size > 1).map(([id, h]) => ({ id, hrefs: [...h] }));
}
