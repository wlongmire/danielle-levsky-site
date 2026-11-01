// Loads the portfolio entries (src/content/work) that a page shows as cards, in the order set in src/data/order.json,
// each with its rendered body for the popup. Pass a section slug to get only the entries that list it.
import { getCollection, render } from 'astro:content';
import { sortByOrder } from './order';

export async function loadCases(section?: string) {
  const entries = sortByOrder(
    await getCollection('work', (e) => !e.data.draft && (!section || (e.data.sections as string[]).includes(section))),
    'work',
  );
  return Promise.all(entries.map(async (entry) => ({ entry, Content: (await render(entry)).Content })));
}

/** Hand-picked entries for a Card Grid block, in the order listed (names that no longer exist are skipped). */
export async function loadPicks(ids: string[]) {
  const all = await getCollection('work', (e) => !e.data.draft);
  const byId = new Map(all.map((e) => [e.id, e]));
  const entries = ids.map((id) => byId.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
  return Promise.all(entries.map(async (entry) => ({ entry, Content: (await render(entry)).Content })));
}
