// What each form on /edit asks for. One description per block type and per kind of document; the page draws the forms
// from these, so teaching the editor a new field means adding a line here (and, if it is a new field in the content
// itself, in src/lib/blocks.ts or src/content.config.ts and the checks in rules.ts).
import { BLOCK_TYPES, CROPS } from '../blocks';

export type Field = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'markdown' | 'bool' | 'select' | 'checks' | 'image' | 'button' | 'object' | 'group' | 'list' | 'strings' | 'cards';
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

/** The entry (card and popup) form. The write-up is edited separately, below these fields. */
export const ENTRY_FIELDS: Field[] = [
  { key: 'title', label: 'Title', type: 'text', hint: 'Shown on the card and at the top of the popup.' },
  { key: 'outcome', label: 'One-line summary', type: 'textarea', rows: 3, hint: 'Shown on the card, and in bold at the top of the popup.' },
  { key: 'org', label: 'Organization (optional)', type: 'text' },
  { key: 'role', label: 'Role (optional)', type: 'text' },
  { key: 'dates', label: 'Dates (optional)', type: 'text' },
  { key: 'confidential', label: 'Described or recreated, not the original (confidential work)', type: 'bool' },
  { key: 'draft', label: 'Hide this card from the site', type: 'bool' },
  { key: 'media', label: 'Pictures and videos in the popup', type: 'list', itemName: 'picture or video', defaults: { type: 'image', fit: 'contain' }, fields: [
    { key: 'type', label: 'Kind', type: 'select', options: [['image', 'Picture'], ['video', 'YouTube video']] },
    { key: 'src', label: 'Picture', type: 'image', altKey: 'alt', showIf: { key: 'type', is: 'image' } },
    { key: 'fit', label: 'Show', type: 'select', options: [['contain', 'The whole picture'], ['cover', 'Cropped to fill']], showIf: { key: 'type', is: 'image' } },
    { key: 'url', label: 'YouTube link', type: 'text', showIf: { key: 'type', is: 'video' } },
    { key: 'title', label: 'Video title (read aloud by screen readers)', type: 'text', showIf: { key: 'type', is: 'video' } },
    { key: 'caption', label: 'Caption (optional)', type: 'text' },
  ] },
  { key: 'artifacts', label: 'Files and samples to link to', type: 'list', itemTitle: 'label', itemName: 'link', defaults: { label: '', url: '' }, fields: [
    { key: 'label', label: 'Words', type: 'text' },
    { key: 'url', label: 'Address', type: 'text' },
  ] },
  { key: 'links', label: 'Other links', type: 'list', itemTitle: 'label', itemName: 'link', defaults: { label: '', url: '' }, fields: [
    { key: 'label', label: 'Words', type: 'text' },
    { key: 'url', label: 'Address', type: 'text' },
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
