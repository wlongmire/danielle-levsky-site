// What /edit is allowed to touch, and checks that stop a bad edit from breaking the site.
// Only content files can be edited: never layouts, styles or code.
import { load as yamlLoad } from 'js-yaml';
import { MAX_TEXT_BYTES } from './config';
import { shaOf } from './storage';
import { resumes } from '../../data/resumes';
import { CROPS } from '../blocks';

export type Kind = 'work' | 'timeline' | 'page' | 'site';

export function kindOf(path: string): Kind | null {
  if (/^src\/content\/work\/[a-z0-9][a-z0-9-]*\.md$/.test(path)) return 'work';
  if (/^src\/content\/timeline\/[a-z0-9][a-z0-9-]*\.md$/.test(path)) return 'timeline';
  if (/^src\/content\/pages\/(home|about)\.md$/.test(path) || /^src\/content\/sections\/[a-z0-9][a-z0-9-]*\.md$/.test(path)) return 'page';
  if (path === 'src/data/site.json') return 'site';
  return null;
}
/** Pictures the editor may show a preview of: the site's own picture folders only. */
export const IMAGE_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export function previewablePath(path: string): boolean {
  if (path.includes('..')) return false;
  return path === 'src/assets/headshot.jpg' || /^src\/assets\/(work|timeline|about|pages|consulting|digital-humanities)\/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp)$/i.test(path);
}
export const canCreate = (path: string) => kindOf(path) === 'work';   // new entries only; pages are not created here

export const TRACKS = ['learning-design', 'teaching', 'engineering', 'design-ux'];

export function splitFrontMatter(text: string): { fm: string; body: string } | null {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : null;
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

async function assetExists(fromFile: string, ref: string): Promise<boolean> {
  // A bare file name ("my-picture.jpg") lives in the folder for this kind of page.
  if (/^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp)$/i.test(ref)) {
    const folder = kindOf(fromFile) === 'timeline' ? 'timeline' : 'work';
    return (await shaOf(`src/assets/${folder}/${ref}`)) !== null;
  }
  // "../../assets/x.jpg" written inside src/content/<collection>/ points at src/assets/x.jpg
  const m = ref.match(/^\.\.\/\.\.\/assets\/([A-Za-z0-9._\/-]+)$/);
  if (!m || m[1].includes('..')) return false;
  return (await shaOf(`src/assets/${m[1]}`)) !== null;
}

/** Returns a list of plain-language problems (empty = fine to save). */
export async function validateMarkdown(path: string, text: string): Promise<string[]> {
  const kind = kindOf(path);
  const errors: string[] = [];
  if (Buffer.byteLength(text) > MAX_TEXT_BYTES) return ['This file is too large (limit 100 KB).'];
  const parts = splitFrontMatter(text);
  if (!parts) return ['The file must start with a block between two "---" lines (that is the top part). Nothing was saved.'];
  let data: unknown;
  try { data = yamlLoad(parts.fm); } catch (e: any) {
    return [`The top block (between the "---" lines) has a formatting problem: ${String(e.reason ?? e.message ?? e).split('\n')[0]}`];
  }
  if (!isObj(data)) return ['The top block (between the "---" lines) is empty or not written as "name: value" lines.'];
  if (/<\s*(script|iframe|object|embed)\b/i.test(parts.body)) errors.push('The text may not contain <script>, <iframe>, <object> or <embed>.');

  const need = (k: string, type: 'string' | 'number' = 'string') => {
    const v = data[k as keyof typeof data];
    if (type === 'string' ? !isStr(v) : typeof v !== 'number') errors.push(`"${k}" is required${type === 'number' ? ' and must be a number' : ''}.`);
  };
  const pairList = (k: string) => {
    const v = (data as any)[k];
    if (v === undefined) return;
    if (!Array.isArray(v) || !v.every((x) => isObj(x) && typeof x.label === 'string' && typeof x.url === 'string'))
      errors.push(`"${k}" must be a list where each item has a label and a url.`);
  };

  // The pictures-and-videos list (the same format for case studies and journey steps).
  const checkMedia = async (list: unknown) => {
    if (list === undefined) return;
    if (!Array.isArray(list)) { errors.push('"media" must be a list.'); return; }
    for (const [i, m] of list.entries()) {
      if (!isObj(m)) { errors.push(`media item ${i + 1} is not formatted correctly.`); continue; }
      if (m.type === 'image') {
        if (!isStr(m.src) || !isStr(m.alt)) errors.push(`media item ${i + 1} (picture) needs a src and an alt.`);
        else if (!(await assetExists(path, m.src))) errors.push(`media item ${i + 1}: the picture "${m.src}" has not been uploaded.`);
        if (m.fit !== undefined && !['contain', 'cover'].includes(m.fit as string)) errors.push(`media item ${i + 1}: fit must be contain or cover.`);
      } else if (m.type === 'video') {
        if (!isStr(m.url) || !/(youtu\.be\/|youtube\.com\/(watch\?|embed\/|shorts\/))/.test(m.url)) errors.push(`media item ${i + 1} (video) needs a YouTube link as its url.`);
      } else errors.push(`media item ${i + 1}: type must be image or video.`);
    }
  };

  if (kind === 'work') {
    ['title', 'outcome'].forEach((k) => need(k));
    const d = data as any;
    // role, org and dates must be there but may be empty (a project box under a position heading leaves role and dates blank)
    ['role', 'org', 'dates'].forEach((k) => { if (typeof d[k] !== 'string') errors.push(`"${k}" is required (write "" if there is nothing to say).`); });
    if (d.tracks !== undefined && (!Array.isArray(d.tracks) || d.tracks.some((t: unknown) => !TRACKS.includes(t as string))))
      errors.push(`"tracks" may only contain: ${TRACKS.join(', ')}.`);
    if (d.order !== undefined && typeof d.order !== 'number') errors.push('"order" must be a number.');
    if (d.draft !== undefined && typeof d.draft !== 'boolean') errors.push('"draft" must be true or false.');
    if (d.confidential !== undefined && typeof d.confidential !== 'boolean') errors.push('"confidential" must be true or false.');
    pairList('artifacts'); pairList('links');
    await checkMedia(d.media);   // pictures and YouTube videos shown in the popup
    if (d.images !== undefined) {
      if (!Array.isArray(d.images)) errors.push('"images" must be a list.');
      else for (const [i, img] of d.images.entries()) {
        if (!isObj(img) || !isStr(img.src) || !isStr(img.alt)) { errors.push(`images item ${i + 1} needs a src and an alt.`); continue; }
        if (img.fit !== undefined && !['contain', 'cover'].includes(img.fit as string)) errors.push(`images item ${i + 1}: fit must be contain or cover.`);
        if (!(await assetExists(path, img.src))) errors.push(`images item ${i + 1}: the picture "${img.src}" has not been uploaded.`);
      }
    }
  } else if (kind === 'timeline') {
    ['title', 'period'].forEach((k) => need(k));
    const d = data as any;
    if (d.skills !== undefined && (!Array.isArray(d.skills) || d.skills.some((s: unknown) => typeof s !== 'string'))) errors.push('"skills" must be a list of words or phrases.');
    if (d.link !== undefined && !(isObj(d.link) && typeof d.link.label === 'string' && typeof d.link.url === 'string')) errors.push('"link" needs a label and a url.');
    await checkMedia(d.media);
  }
  return errors;
}

// ---- Pages (home, about and the section pages): an ordered list of blocks ----
const urlOk = (u: string) => /^(\/|#|https?:\/\/|mailto:)\S*$/.test(u);

/** Plain-language problems with a page's data (empty = fine to save). `data` is the page's front matter as an object. */
export async function validatePage(path: string, data: any): Promise<string[]> {
  const errors: string[] = [];
  if (!isObj(data)) return ['That page is not formatted correctly.'];
  const isSection = path.startsWith('src/content/sections/');
  if (isSection ? !isStr(data.navLabel) : !isStr(data.title)) errors.push(isSection ? 'The menu name is required.' : 'The page name is required.');
  if (data.description !== undefined && typeof data.description !== 'string') errors.push('The search description must be text.');
  if (data.draft !== undefined && typeof data.draft !== 'boolean') errors.push('"draft" must be true or false.');
  if (!Array.isArray(data.blocks)) return [...errors, 'The page needs a list of blocks.'];
  if (data.blocks.length > 30) errors.push('A page can have at most 30 blocks.');

  const pic = async (where: string, src: unknown, alt: unknown) => {
    if (!isStr(src)) return;
    if (!(await assetExists(path, src))) errors.push(`${where}: the picture "${src}" has not been uploaded.`);
    if (!isStr(alt)) errors.push(`${where}: add alt text for the picture.`);
  };
  const button = (where: string, b: any) => {
    if (b === undefined) return;
    if (!isObj(b) || !isStr(b.label) || !isStr(b.url)) errors.push(`${where}: a button needs both its words and its address.`);
    else if (!urlOk(b.url)) errors.push(`${where}: the address must start with /, #, http://, https:// or mailto:.`);
  };

  for (const [i, b] of (data.blocks as any[]).entries()) {
    const at = `Block ${i + 1}`;
    if (!isObj(b)) { errors.push(`${at} is not formatted correctly.`); continue; }
    const strs = (keys: string[]) => keys.forEach((k) => { if (b[k] !== undefined && typeof b[k] !== 'string') errors.push(`${at}: "${k}" must be text.`); });
    switch (b.type) {
      case 'hero':
        if (!isStr(b.headline)) errors.push(`${at} (Hero): the headline is required.`);
        strs(['intro', 'imageAlt']);
        if (b.buttons !== undefined) {
          if (!Array.isArray(b.buttons) || b.buttons.length > 4) errors.push(`${at} (Hero): the buttons must be a list of at most 4.`);
          else b.buttons.forEach((btn: any, n: number) => button(`${at} (Hero) button ${n + 1}`, btn));
        }
        if (b.featured !== undefined && typeof b.featured !== 'boolean') errors.push(`${at}: the big style must be on or off.`);
        if (b.imageCrop !== undefined && b.imageCrop !== '' && !Object.hasOwn(CROPS, b.imageCrop)) errors.push(`${at}: pick one of the picture cropping choices.`);
        await pic(`${at} (Hero) picture`, b.image, b.imageAlt);
        if (isStr(b.intro) && /<\s*(script|iframe|object|embed)\b/i.test(b.intro)) errors.push(`${at}: the text may not contain <script>, <iframe>, <object> or <embed>.`);
        break;
      case 'overview':
        strs(['title']);
        if (!Array.isArray(b.items)) { errors.push(`${at} (Overview list): the items must be a list.`); break; }
        if (b.items.length > 40) errors.push(`${at}: at most 40 items.`);
        b.items.forEach((it: any, n: number) => {
          if (!isObj(it) || !isStr(it.title)) errors.push(`${at} (Overview list) item ${n + 1}: the title is required.`);
          else if (typeof it.text !== 'string') errors.push(`${at} item ${n + 1}: the text must be text.`);
          else if (/<\s*(script|iframe|object|embed)\b/i.test(it.text)) errors.push(`${at} item ${n + 1}: the text may not contain <script>, <iframe>, <object> or <embed>.`);
        });
        break;
      case 'title':
        if (!isStr(b.title)) errors.push(`${at} (Text Title): the title is required.`);
        break;
      case 'cards':
        strs(['title']);
        if (b.boxed !== undefined && typeof b.boxed !== 'boolean') errors.push(`${at}: the dark panel must be on or off.`);
        if (!Array.isArray(b.entries) || b.entries.length === 0) errors.push(`${at} (Card grid): add at least one card.`);
        else for (const id of b.entries) if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id) || (await shaOf(`src/content/work/${id}.md`)) === null) errors.push(`${at}: the card "${id}" does not exist.`);
        break;
      case 'text':
        strs(['title', 'body']);
        if (typeof b.body === 'string' && /<\s*(script|iframe|object|embed)\b/i.test(b.body)) errors.push(`${at}: the text may not contain <script>, <iframe>, <object> or <embed>.`);
        if (b.photos !== undefined) {
          if (!Array.isArray(b.photos)) errors.push(`${at}: the pictures must be a list.`);
          else for (const [n, p] of b.photos.entries()) {
            if (!isObj(p) || !isStr(p.src)) errors.push(`${at} picture ${n + 1}: choose a picture.`);
            else await pic(`${at} picture ${n + 1}`, p.src, p.alt);
          }
        }
        break;
      default:
        errors.push(`${at}: unknown block type.`);
    }
  }
  return errors;
}

/** The site details file: the name, email, links and contact reasons. The form address is not editable here. */
export function validateSite(text: string, current: string | null): { errors: string[]; text: string } {
  let d: any;
  try { d = JSON.parse(text); } catch { return { errors: ['That is not valid site details.'], text }; }
  const errors: string[] = [];
  if (!isStr(d.name)) errors.push('Name is required.');
  if (!isStr(d.email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) errors.push('Enter a valid email address.');
  if (!Array.isArray(d.links) || d.links.length > 8 || !d.links.every((l: any) => isStr(l?.label) && typeof l?.url === 'string' && (l.url === '' || /^https?:\/\/\S+$/.test(l.url))))
    errors.push('Each link needs a label and a web address starting with http:// or https:// (or leave the address empty to hide it).');
  if (!Array.isArray(d.contactReasons) || d.contactReasons.length < 1 || d.contactReasons.length > 12 || !d.contactReasons.every((r: unknown) => isStr(r) && (r as string).length <= 80))
    errors.push('Add between 1 and 12 contact reasons (80 characters at most each).');
  for (const [k, max] of [['contactTitle', 80], ['contactThanks', 300]] as const)
    if (!isStr(d[k]) || d[k].length > max) errors.push(`The contact popup needs ${k === 'contactTitle' ? 'a heading' : 'a line shown after a message is sent'} (${max} characters at most).`);
  // Keep the contact-form address exactly as it is, whatever the browser sent.
  let endpoint = '';
  try { endpoint = JSON.parse(current ?? '{}').contactEndpoint ?? ''; } catch {}
  const clean = { name: d.name, email: d.email, links: d.links, contactEndpoint: endpoint, contactTitle: d.contactTitle, contactThanks: d.contactThanks, contactReasons: d.contactReasons };
  return { errors, text: JSON.stringify(clean, null, 2) + '\n' };
}

// ---- Uploads ----
export type UploadTarget = 'work-image' | 'timeline-image' | 'page-image' | 'headshot' | 'artifact' | 'resume';

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp'];
const FILE_EXT = ['pdf', 'docx', 'pptx', 'xlsx', ...IMAGE_EXT];

export const resumeFiles = () => resumes.map((r) => ({ id: r.id, title: r.title, file: r.file }));

export function cleanName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80);
}

function signatureOk(ext: string, b: Buffer): boolean {
  const starts = (...bytes: number[]) => bytes.every((v, i) => b[i] === v);
  if (ext === 'png') return starts(0x89, 0x50, 0x4e, 0x47);
  if (ext === 'jpg' || ext === 'jpeg') return starts(0xff, 0xd8, 0xff);
  if (ext === 'webp') return b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP';
  if (ext === 'pdf') return b.subarray(0, 4).toString() === '%PDF';
  if (['docx', 'pptx', 'xlsx'].includes(ext)) return starts(0x50, 0x4b, 0x03, 0x04);
  return false;
}

/** Works out where an upload goes (or why it is refused). */
export function planUpload(target: UploadTarget, fileName: string, bytes: Buffer, resumeId?: string):
  { path: string; reference: string } | { error: string } {
  const ext = (fileName.split('.').pop() ?? '').toLowerCase();
  const base = cleanName(fileName.replace(/\.[^.]+$/, ''));
  if (!base) return { error: 'That file name is not usable. Rename it with plain letters and numbers.' };
  const check = (allowed: string[]) =>
    !allowed.includes(ext) ? `Only these file types are allowed here: ${allowed.join(', ')}.`
    : !signatureOk(ext, bytes) ? 'That file does not look like a real .' + ext + ' file.' : null;
  let bad: string | null;
  switch (target) {
    case 'work-image': bad = check(IMAGE_EXT); return bad ? { error: bad } : { path: `src/assets/work/${base}.${ext}`, reference: `../../assets/work/${base}.${ext}` };
    case 'timeline-image': bad = check(IMAGE_EXT); return bad ? { error: bad } : { path: `src/assets/timeline/${base}.${ext}`, reference: `../../assets/timeline/${base}.${ext}` };
    case 'page-image': bad = check(IMAGE_EXT); return bad ? { error: bad } : { path: `src/assets/pages/${base}.${ext}`, reference: `../../assets/pages/${base}.${ext}` };
    case 'headshot': bad = check(['jpg', 'jpeg']); return bad ? { error: bad } : { path: 'src/assets/headshot.jpg', reference: '../../assets/headshot.jpg' };
    case 'artifact': bad = check(FILE_EXT); return bad ? { error: bad } : { path: `public/artifacts/${base}.${ext}`, reference: `/artifacts/${base}.${ext}` };
    case 'resume': {
      const r = resumes.find((x) => x.id === resumeId);
      if (!r) return { error: 'Choose which resume this is.' };
      bad = check(['pdf']);
      return bad ? { error: bad } : { path: `public/resumes/${r.file}`, reference: `/resumes/${r.file}` };
    }
    default: return { error: 'Unknown upload type.' };
  }
}
