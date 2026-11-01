import type { APIRoute } from 'astro';
import { guard, json } from '../../../lib/editor/auth';
import { Conflict, list, read, write } from '../../../lib/editor/storage';

export const prerender = false;

// Saves the order of entries (their order on every card grid) or of the menu pages, as one small file so it is one
// change in the history. The other lists in the file are left exactly as they were.
const DIRS: Record<string, string> = { work: 'src/content/work', sections: 'src/content/sections' };
const NAMES: Record<string, string> = { work: 'the entries', sections: 'the menu pages' };

export const PUT: APIRoute = async ({ request }) => {
  const blocked = guard(request, { change: true });
  if (blocked) return blocked;
  const body = await request.json().catch(() => null);
  const kind = String(body?.kind);
  const ids = body?.ids;
  if (
    !DIRS[kind] ||
    !Array.isArray(ids) ||
    ids.some((i: unknown) => typeof i !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(i)) ||
    new Set(ids).size !== ids.length
  ) return json({ error: 'That order was not understood.' }, 400);

  try {
    // The list must be exactly the files that exist, so nothing can go missing or be invented.
    const existing = (await list(DIRS[kind])).filter((f) => f.name.endsWith('.md')).map((f) => f.name.replace(/\.md$/, ''));
    if (existing.length !== ids.length || existing.some((i) => !ids.includes(i)))
      return json({ error: 'The list changed while you were arranging it. Reload the page and try again.' }, 409);

    const path = 'src/data/order.json';
    const current = await read(path);
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(current?.text ?? '{}'); } catch {}
    data[kind] = ids;
    await write(path, JSON.stringify(data, null, 2) + '\n', `Reorder ${NAMES[kind]} from the edit page`, current?.sha);
    return json({ ok: true });
  } catch (e: any) {
    if (e instanceof Conflict) return json({ error: 'The order changed while saving. Reload the page and try again.' }, 409);
    return json({ error: e.message ?? 'Could not save the order.' }, 502);
  }
};
