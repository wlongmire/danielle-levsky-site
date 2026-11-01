// Loads the portfolio entries (src/content/work) that a Card Grid block lists, each with its rendered body for the popup.
import { getCollection, render } from 'astro:content';

/** The entries a Card Grid block lists, in the order listed (names that no longer exist are skipped). */
export async function loadPicks(ids: string[]) {
  const all = await getCollection('work', (e) => !e.data.draft);
  const byId = new Map(all.map((e) => [e.id, e]));
  const entries = ids.map((id) => byId.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
  return Promise.all(entries.map(async (entry) => ({ entry, Content: (await render(entry)).Content })));
}
