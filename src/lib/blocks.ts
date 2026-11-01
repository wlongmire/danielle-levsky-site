// The page blocks, defined once. Every page (home, about, and each section page) is an ordered list of these in its
// Markdown file's `blocks:` list. The page renderer (components/PageBlocks.astro) draws them in order, and the /edit
// page builds its forms from the same list (BLOCK_TYPES below), so adding a field here is the only place to teach both.
import { z } from 'astro/zod';
import type { ImageMetadata } from 'astro';

/** Where a Card Grid block gets its entries: every entry tagged for that section page, or a hand-picked list. */
export const CARD_SOURCES = ['ld-portfolio', 'dei', 'digital-humanities', 'picks'] as const;

const link = z.object({ label: z.string(), url: z.string() });

/** The zod schema for a page's `blocks:` list. `image` is Astro's image() helper from the content config. */
export const blocksSchema = (image: () => z.ZodType<ImageMetadata>) =>
  z.array(
    z.discriminatedUnion('type', [
      // Headline, paragraph(s), optional button(s), optional picture or logo.
      z.object({
        type: z.literal('hero'),
        headline: z.string(),
        intro: z.string().default(''),                  // a blank line starts a new paragraph
        cta: link.optional(),                           // the main button; url "#contact" opens the contact popup
        showCv: z.boolean().default(false),             // a second, outlined button for the CV link in site.json
        image: image().optional(),
        imageAlt: z.string().optional(),
        imagePosition: z.string().optional(),           // where a wide picture is cropped to, e.g. "46% 30%"
        logo: z.object({ src: image(), alt: z.string(), url: z.string().optional() }).optional(), // shown whole beside the text
        featured: z.boolean().default(false),           // the big home-page look: taller, on a panel, with a picture slot
      }),
      // A headline over a list of items that open and close.
      z.object({
        type: z.literal('overview'),
        title: z.string().optional(),
        items: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
      }),
      // A grid of portfolio entries; each opens its popup.
      z.object({
        type: z.literal('cards'),
        title: z.string().optional(),
        source: z.enum(CARD_SOURCES),
        entries: z.array(z.string()).default([]),       // for source "picks": the entry names, in the order shown
        groupByOrg: z.boolean().default(false),         // true = under a heading for each entry's `org`
      }),
      // Text (Markdown) with optional pictures beside it.
      z.object({
        type: z.literal('text'),
        title: z.string().optional(),
        body: z.string().default(''),
        photos: z.array(z.object({ src: image(), alt: z.string() })).default([]),
      }),
    ]),
  ).default([]);

export type Block = z.infer<ReturnType<typeof blocksSchema>>[number];

/** What the /edit forms show for each block type (a name and a one-line hint). */
export const BLOCK_TYPES = {
  hero: { label: 'Hero', hint: 'A headline, a short paragraph, optional buttons and a picture or logo.' },
  overview: { label: 'Overview list', hint: 'A heading over a list of items that open and close.' },
  cards: { label: 'Card grid', hint: 'Boxes for portfolio entries; each opens a popup.' },
  text: { label: 'Text and pictures', hint: 'Longer text with optional pictures beside it.' },
} as const;

/** The text search engines show for a page: its own `description`, or else the first paragraph found in its blocks. */
export function pageDescription(page: { description?: string; blocks: Block[] }): string | undefined {
  if (page.description) return page.description;
  for (const b of page.blocks) {
    const text = b.type === 'hero' ? b.intro : b.type === 'text' ? b.body.replace(/^#+\s.*$/gm, '') : '';
    const first = text.split(/\n\s*\n/).map((p) => p.trim()).find(Boolean);
    if (first) return first.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').slice(0, 300);
  }
  return undefined;
}
