import type { APIRoute } from 'astro';
import { load as yamlLoad, JSON_SCHEMA } from 'js-yaml';
import { guard, json } from '../../../lib/editor/auth';
import { list, read, storageMode, storageReady } from '../../../lib/editor/storage';
import { splitFrontMatter } from '../../../lib/editor/rules';
import { sortByOrder, type OrderData } from '../../../lib/order';

export const prerender = false;

const front = (text: string | undefined): any => {
  const parts = text ? splitFrontMatter(text) : null;
  if (!parts) return {};
  try { return yamlLoad(parts.fm, { schema: JSON_SCHEMA }) ?? {}; } catch { return {}; }
};

// What the sidebar shows: the pages (home, about, then the menu pages in menu order), every entry in its site order,
// and the site details.
export const GET: APIRoute = async ({ request }) => {
  const blocked = guard(request);
  if (blocked) return blocked;
  if (!storageReady()) return json({ error: 'GITHUB_TOKEN is not set, so there is nowhere to save yet.' }, 503);
  try {
    let order: OrderData = {};
    try { order = JSON.parse((await read('src/data/order.json'))?.text ?? '{}'); } catch {}

    const sectionFiles = (await list('src/content/sections')).filter((f) => f.name.endsWith('.md'));
    const sections = await Promise.all(sectionFiles.map(async (f) => {
      const d = front((await read(f.path))?.text);
      return { id: f.name.replace(/\.md$/, ''), path: f.path, label: d.navLabel || f.name, draft: !!d.draft, data: {} as { order?: number } };
    }));
    const menu = sortByOrder(sections, 'sections', order).map(({ id, path, label, draft }) => ({ id, path, label, draft, kind: 'section' }));
    const pages = [
      { id: 'home', path: 'src/content/pages/home.md', label: 'Home', kind: 'home', draft: false },
      { id: 'about', path: 'src/content/pages/about.md', label: 'About', kind: 'about', draft: false },
      ...menu,
    ];

    const entryFiles = (await list('src/content/work')).filter((f) => f.name.endsWith('.md'));
    const entries = await Promise.all(entryFiles.map(async (f) => {
      const d = front((await read(f.path))?.text);
      return { id: f.name.replace(/\.md$/, ''), path: f.path, title: d.title || f.name, org: d.org || '', sections: d.sections ?? [], draft: !!d.draft, data: {} as { order?: number } };
    }));
    const sortedEntries = sortByOrder(entries, 'work', order).map(({ id, path, title, org, sections, draft }) => ({ id, path, title, org, sections, draft }));

    return json({ mode: storageMode(), pages, entries: sortedEntries, site: { path: 'src/data/site.json', label: 'Site details' } });
  } catch (e: any) {
    return json({ error: e.message ?? 'Could not load the file list.' }, 502);
  }
};
