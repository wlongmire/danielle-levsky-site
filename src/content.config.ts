import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    outcome: z.string(),
    role: z.string(),
    org: z.string(),
    dates: z.string(),
    // Which section pages show this entry as a card. An entry in two sections is still one file.
    sections: z.array(z.enum(['ld-portfolio', 'dei', 'digital-humanities'])).default([]),
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
        fit: z.enum(['contain', 'cover']).default('contain'),
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

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    tagline: z.string().optional(),   // the big line at the top of the home page
    description: z.string().optional(),
    headshot: image().optional(),
    headshotAlt: z.string().optional(),
    // Pictures shown beside the text on the About page, in order. Each needs a short plain description (alt).
    photos: z.array(z.object({ src: image(), alt: z.string() })).default([]),
    cta: z.object({ label: z.string(), url: z.string() }).optional(),  // the Hero's button
  }),
});

// One file per section page (L&D Portfolio, Consulting, Digital Humanities, DEI), built from the page blocks:
// Hero (headline, intro, optional button), Overview List (collapsible items) and Card Grid (entries from `work`
// that list this section). Any block left empty is simply not shown. The nav order is in src/data/order.json.
const sections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sections' }),
  schema: ({ image }) => z.object({
    navLabel: z.string(),
    headline: z.string(),
    intro: z.string(),
    cta: z.object({ label: z.string(), url: z.string() }).optional(),
    image: image().optional(),           // the Hero's picture, e.g. "../../assets/consulting/consulting-1.jpeg"
    imageAlt: z.string().optional(),     // a short, plain description of the picture
    imagePosition: z.string().optional(), // where the picture is cropped to, e.g. "46% 30%" (left/right, top/bottom)
    // An optional logo shown under the Hero's text (e.g. a program or employer), shown whole, never cropped. `url` makes it a link.
    logo: z.object({ src: image(), alt: z.string(), url: z.string().optional() }).optional(),
    overviewTitle: z.string().optional(),
    overview: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
    cardsTitle: z.string().optional(),   // shown only when entries list this section
    groupCards: z.boolean().default(false),  // true = the cards sit under a heading for each position (each entry's `org`)
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
