// What each form on /edit asks for. One description per block type and per kind of document; the page draws the forms
// from these, so teaching the editor a new field means adding a line here (and, if it is a new field in the content
// itself, in src/lib/blocks.ts or src/content.config.ts and the checks in rules.ts).
import { BLOCK_TYPES, CROPS } from '../blocks';

export type Field = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'markdown' | 'bool' | 'select' | 'checks' | 'image' | 'button' | 'object' | 'group' | 'list' | 'strings' | 'cards' | 'body';
  hint?: string;
  rows?: number;
  options?: [value: string, label: string][];
  altKey?: string;                    // image: where its description (alt text) is stored, next to the picture
  fields?: Field[];                   // object, group and list: the fields of the object / of the group / of each item (a group draws its fields in a titled box but stores them beside its siblings)
  itemTitle?: string;                 // list: which field names an item in the list
  itemName?: string;                  // list: "Add a ..." wording
  showIf?: { key: string; is: string }; // only shown while a sibling field has this value
  defaults?: Record<string, unknown>; // list: values a new item starts with
};


export const BLOCK_FORMS: Record<string, { label: string; hint: string; fields: Field[]; defaults: Record<string, unknown> }> = {
  hero: {
    ...BLOCK_TYPES.hero,
    defaults: { type: 'hero', headline: '', intro: '' },
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'intro', label: 'Paragraph', type: 'textarea', rows: 5, hint: 'Leave a blank line between paragraphs.' },
      { key: 'buttons', label: 'Buttons', type: 'list', itemTitle: 'label', itemName: 'button', defaults: { label: '', url: '' }, hint: 'The first button is the main one; the others are outlined. An address of #contact opens the contact popup.', fields: [
        { key: 'label', label: 'Title', type: 'text' },
        { key: 'url', label: 'URL', type: 'text' },
      ] },
      { key: 'image', label: 'Picture', type: 'image', altKey: 'imageAlt' },
      { key: 'style', label: 'Style', type: 'group', fields: [
        { key: 'featured', label: 'Home Page Look', type: 'bool' },
        { key: 'imageCrop', label: 'Picture cropping', type: 'select', options: Object.entries(CROPS).map(([v, c]) => [v, c.label] as [string, string]) },
      ] },
    ],
  },
  title: {
    ...BLOCK_TYPES.title,
    defaults: { type: 'title', title: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
    ],
  },
  overview: {
    ...BLOCK_TYPES.overview,
    defaults: { type: 'overview', title: '', items: [] },
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'items', label: 'Items', type: 'list', itemTitle: 'title', itemName: 'item', defaults: { title: '', text: '' }, fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Text', type: 'textarea', rows: 8, hint: 'Leave a blank line between paragraphs.' },
      ] },
    ],
  },
  cards: {
    ...BLOCK_TYPES.cards,
    defaults: { type: 'cards', title: '', entries: [] },
    fields: [
      { key: 'title', label: 'Title (optional)', type: 'text' },
      { key: 'entries', label: 'Cards', type: 'cards' },
      { key: 'style', label: 'Style', type: 'group', fields: [
        { key: 'boxed', label: 'Dark Panel', type: 'bool' },
      ] },
    ],
  },
  text: {
    ...BLOCK_TYPES.text,
    defaults: { type: 'text', title: '', body: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Text', type: 'markdown', rows: 18, hint: 'A line starting with ## makes a subheading. [words](address) makes a link. A blank line starts a new paragraph.' },
      { key: 'photos', label: 'Pictures beside the text', type: 'list', itemName: 'picture', defaults: {}, fields: [
        { key: 'src', label: 'Picture', type: 'image', altKey: 'alt' },
      ] },
    ],
  },
};

/** The entry (card and popup) form. `body` is the Markdown content under the front matter; the page draws it where it sits here. */
export const ENTRY_FIELDS: Field[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'org', label: 'Subtitle', type: 'text' },
  { key: 'outcome', label: 'Summary', type: 'textarea', rows: 3 },
  { key: 'body', label: 'Content', type: 'body', rows: 18, hint: 'A line starting with ### makes a subheading. A blank line starts a new paragraph. [words](address) makes a link.' },
  { key: 'mediaGroup', label: 'Media', type: 'group', fields: [
    { key: 'media', label: 'Image', type: 'list', itemName: 'image', defaults: { type: 'image' }, fields: [
      { key: 'type', label: 'Type', type: 'select', options: [['image', 'Picture'], ['video', 'YouTube video']] },
      { key: 'src', label: 'Image', type: 'image', altKey: 'alt', showIf: { key: 'type', is: 'image' } },
      { key: 'crop', label: 'Picture cropping', type: 'select', options: Object.entries(CROPS).map(([v, c]) => [v, c.label] as [string, string]), showIf: { key: 'type', is: 'image' } },
      { key: 'url', label: 'YouTube link', type: 'text', showIf: { key: 'type', is: 'video' } },
      { key: 'title', label: 'Video title (read aloud by screen readers)', type: 'text', showIf: { key: 'type', is: 'video' } },
      { key: 'caption', label: 'Caption (optional)', type: 'text' },
    ] },
    { key: 'artifacts', label: 'Artifacts', type: 'list', itemTitle: 'label', itemName: 'artifact', defaults: { label: '', url: '' }, fields: [
      { key: 'label', label: 'Title', type: 'text' },
      { key: 'url', label: 'URL', type: 'text' },
    ] },
    { key: 'links', label: 'Links', type: 'list', itemTitle: 'label', itemName: 'link', defaults: { label: '', url: '' }, fields: [
      { key: 'label', label: 'Title', type: 'text' },
      { key: 'url', label: 'URL', type: 'text' },
    ] },
  ] },
];

export const SITE_FIELDS: Field[] = [
  { key: 'name', label: 'Name (header and footer)', type: 'text' },
  { key: 'email', label: 'Email address', type: 'text' },
  { key: 'links', label: 'Footer links', type: 'list', itemTitle: 'label', itemName: 'link', defaults: { label: '', url: '' }, fields: [
    { key: 'label', label: 'Title', type: 'text' },
    { key: 'url', label: 'URL', type: 'text' },
  ] },
];

/** The contact popup (the Contact Page section on /edit). These live in the same file as the site details. */
export const CONTACT_FIELDS: Field[] = [
  { key: 'contactTitle', label: 'Popup heading', type: 'text' },
  { key: 'contactReasons', label: 'Choices in the "What\'s this about?" list', type: 'strings' },
  { key: 'contactThanks', label: 'Line shown after a message is sent', type: 'textarea', rows: 2 },
];
