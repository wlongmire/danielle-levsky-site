// The page blocks, defined once. Every page (home, about, and each section page) is an ordered list of these in its
// Markdown file's `blocks:` list. The page renderer (components/PageBlocks.astro) draws them in order, and the /edit
// page builds its forms from the same list (BLOCK_TYPES below), so adding a field here is the only place to teach both.
import { z } from 'astro/zod';
import type { ImageMetadata } from 'astro';

/** Where a hero picture is cropped to when it is cut down to the portrait frame. '' (Automatic) keeps the site's default. */
export const CROPS = {
  '': { label: 'Automatic', position: undefined },
  top: { label: 'Top', position: '50% 0%' },
  upper: { label: 'Upper middle', position: '50% 30%' },
  center: { label: 'Center', position: '50% 50%' },
  bottom: { label: 'Bottom', position: '50% 100%' },
  left: { label: 'Left', position: '0% 50%' },
  right: { label: 'Right', position: '100% 50%' },
} as const;
export const CROP_KEYS = Object.keys(CROPS).filter(Boolean) as [string, ...string[]];


const link = z.object({ label: z.string(), url: z.string() });

/** The zod schema for a page's `blocks:` list. `image` is Astro's image() helper from the content config. */
export const blocksSchema = (image: () => z.ZodType<ImageMetadata>) =>
  z.array(
    z.discriminatedUnion('type', [
      // Headline, paragraph(s), optional button(s), optional picture.
      z.object({
        type: z.literal('hero'),
        headline: z.string(),
        intro: z.string().default(''),                  // a blank line starts a new paragraph
        buttons: z.array(link).default([]),             // the first is the main button, the rest are outlined; url "#contact" opens the contact popup
        image: image().optional(),
        imageAlt: z.string().optional(),
        imageCrop: z.enum(CROP_KEYS).optional(),        // where the picture is cropped to (see CROPS)
        featured: z.boolean().default(false),           // the big home-page look: taller, on a panel, with a picture slot
      }),
      // A heading on its own, to introduce the blocks beneath it.
      z.object({
        type: z.literal('title'),
        title: z.string().default(''),
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
        entries: z.array(z.string()).default([]),       // the cards (file names in src/content/work), in the order shown; one card can be in several grids
        boxed: z.boolean().default(false),              // true = the title and cards sit together in a dark panel
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
  hero: { label: 'Hero', hint: 'A headline, a short paragraph, optional buttons and a picture.' },
  overview: { label: 'Overview list', hint: 'A heading over a list of items that open and close.' },
  cards: { label: 'Card grid', hint: 'Boxes for portfolio cards, with an optional title; each card opens a popup.' },
  title: { label: 'Text Title', hint: 'A heading on its own, to introduce the blocks beneath it.' },
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
