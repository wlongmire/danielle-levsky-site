import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { blocksSchema, CROP_KEYS } from './lib/blocks';

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    outcome: z.string(),
    role: z.string(),
    org: z.string(),
    dates: z.string(),
    audience: z.string().optional(),
    tools: z.array(z.string()).default([]),
    tracks: z.array(z.enum(['learning-design', 'teaching', 'engineering', 'design-ux'])).default([]),
    cover: z.string().optional(),
    confidential: z.boolean().default(false),
    draft: z.boolean().default(false),
    order: z.number().optional(),     // old style; the order now lives in src/data/order.json (drag and drop on /edit)
    // Shown in the "More info" popup. Every one of these is optional; empty ones are simply not shown.
    // `media` is the picture-and-video slideshow at the top of the popup (same format as My Journey).
    media: z.array(z.discriminatedUnion('type', [
      z.object({
        type: z.literal('image'),
        src: z.string(),   // a picture file name, e.g. "my-picture.jpg" (or the older full path)
        alt: z.string(),
        caption: z.string().optional(),
        fit: z.enum(['contain', 'cover']).default('contain'),   // older; `crop` below replaces it
        crop: z.enum(CROP_KEYS).optional(),                     // empty = the whole picture; otherwise cropped to a wide banner, kept at this position (see CROPS in lib/blocks.ts)
      }),
      z.object({
        type: z.literal('video'),
        url: z.string(),                                     // a YouTube link
        title: z.string().default('Embedded video'),         // read aloud by screen readers
        caption: z.string().optional(),
      }),
    ])).default([]),
    // Older pictures-only list, still shown (before the media list) if a file has one:
    images: z.array(z.object({
      src: image(),
      alt: z.string(),
      caption: z.string().optional(),
      fit: z.enum(['contain', 'cover']).default('contain'), // 'cover' crops to a wide banner (good for a logo on a square canvas)
    })).default([]),
    artifacts: z.array(z.object({ label: z.string(), url: z.string() })).default([]), // samples, PDFs, files
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),     // outside pages
  }),
});

// Home and About: one file each in src/content/pages. A page is an ordered list of blocks (see src/lib/blocks.ts),
// drawn in order by components/PageBlocks.astro. `title` is the browser-tab name; `description` is the search-result text
// (left empty, it falls back to the first paragraph on the page).
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string().optional(),
    blocks: blocksSchema(image),
    draft: z.boolean().default(false),
  }),
});

// One file per section page (L&D Portfolio, Consulting, Digital Humanities, DEI), at /projects/<file name>.
// The same block list as every other page. `navLabel` is its name in the menu; the menu order is in src/data/order.json.
const sections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sections' }),
  schema: ({ image }) => z.object({
    navLabel: z.string(),
    description: z.string().optional(),
    blocks: blocksSchema(image),
    draft: z.boolean().default(false),
  }),
});

// One file per career moment in src/content/timeline/. Their order lives in src/data/order.json.
const timeline = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/timeline' }),
  schema: ({ image }) => z.object({
    label: z.string().optional(),     // short tag shown first, e.g. "Design"
    title: z.string(),
    period: z.string(),               // e.g. "2019 to 2021", shown as a label
    org: z.string().optional(),
    order: z.number().optional(),     // old style; see src/data/order.json
    skills: z.array(z.string()).default([]),
    link: z.object({ label: z.string(), url: z.string() }).optional(), // shown only once url is filled in
    // The step's picture area is a slideshow of images and/or YouTube videos, in this order.
    // Put image files in src/assets/timeline/. With one item there are no arrows; with several there are.
    media: z.array(z.discriminatedUnion('type', [
      z.object({
        type: z.literal('image'),
        src: z.string(),   // a picture file name, e.g. "my-picture.jpg" (or the older full path)
        alt: z.string(),
        caption: z.string().optional(),
        fit: z.enum(['contain', 'cover']).default('cover'), // 'contain' shows the whole picture
      }),
      z.object({
        type: z.literal('video'),
        url: z.string(),                                     // a YouTube link (youtu.be/... or youtube.com/watch?v=...)
        title: z.string().default('Embedded video'),         // read aloud by screen readers
        caption: z.string().optional(),
      }),
    ])).default([]),
    // Older single-image form, still accepted:
    image: image().optional(),
    imageAlt: z.string().optional(),
  }),
});

export const collections = { work, pages, timeline, sections };
