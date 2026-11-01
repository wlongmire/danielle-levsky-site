// What each form on /edit asks for. One description per block type and per kind of document; the page draws the forms
// from these, so teaching the editor a new field means adding a line here (and, if it is a new field in the content
// itself, in src/lib/blocks.ts or src/content.config.ts and the checks in rules.ts).
import { BLOCK_TYPES, CARD_SOURCES } from '../blocks';

export type Field = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'markdown' | 'bool' | 'select' | 'checks' | 'image' | 'button' | 'object' | 'list' | 'strings' | 'picks';
  hint?: string;
  rows?: number;
  options?: [value: string, label: string][];
  altKey?: string;                    // image: where its description (alt text) is stored, next to the picture
  fields?: Field[];                   // object and list: the fields of the object / of each item
  itemTitle?: string;                 // list: which field names an item in the list
  itemName?: string;                  // list: "Add a ..." wording
  showIf?: { key: string; is: string }; // only shown while a sibling field has this value
  defaults?: Record<string, unknown>; // list: values a new item starts with
};

const sourceLabels: Record<string, string> = {
  'ld-portfolio': 'Every entry marked for L&D Portfolio',
  'dei': 'Every entry marked for DEI',
  'digital-humanities': 'Every entry marked for Digital Humanities',
  'picks': 'A hand-picked list of entries',
};

export const SECTION_OPTIONS: [string, string][] = [
  ['ld-portfolio', 'L&D Portfolio'],
  ['dei', 'DEI'],
  ['digital-humanities', 'Digital Humanities'],
];

const button = (key: string, label: string, hint: string): Field => ({ key, label, type: 'button', hint });

export const BLOCK_FORMS: Record<string, { label: string; hint: string; fields: Field[]; defaults: Record<string, unknown> }> = {
  hero: {
    ...BLOCK_TYPES.hero,
    defaults: { type: 'hero', headline: '', intro: '' },
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'intro', label: 'Paragraph', type: 'textarea', rows: 5, hint: 'Leave a blank line between paragraphs.' },
      button('cta', 'Main button', 'Leave both empty for no button. An address of #contact opens the contact popup.'),
      { key: 'showCv', label: 'Show the CV button beside it (uses the CV link in Site details)', type: 'bool' },
      { key: 'image', label: 'Picture', type: 'image', altKey: 'imageAlt', hint: 'Shown beside the text.' },
      { key: 'imagePosition', label: 'Where the picture is cropped to', type: 'text', hint: 'For example 46% 30% (left/right, then top/bottom). Leave empty for the default.' },
      { key: 'logo', label: 'Logo (shown whole, beside the text)', type: 'object', fields: [
        { key: 'src', label: 'Logo picture', type: 'image', altKey: 'alt' },
        { key: 'url', label: 'Link when clicked (optional)', type: 'text', hint: 'A web address starting with https://' },
      ] },
      { key: 'featured', label: 'Big home-page look (taller, on a panel, with a picture slot)', type: 'bool' },
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
    defaults: { type: 'cards', title: '', source: 'picks', entries: [] },
    fields: [
      { key: 'title', label: 'Heading (optional)', type: 'text' },
      { key: 'source', label: 'Which entries', type: 'select', options: CARD_SOURCES.map((s) => [s, sourceLabels[s]] as [string, string]) },
      { key: 'entries', label: 'The entries, in the order shown', type: 'picks', showIf: { key: 'source', is: 'picks' } },
      { key: 'groupByOrg', label: 'Group the cards under a heading for each entry\'s "Group heading"', type: 'bool' },
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
  { key: 'org', label: 'Group heading', type: 'text', hint: 'The heading the card sits under on a grouped card grid (a position, a program, "DEI Projects"). Cards with the same words sit together.' },
  { key: 'role', label: 'Role (optional)', type: 'text' },
  { key: 'dates', label: 'Dates (optional)', type: 'text' },
  { key: 'sections', label: 'Show on these pages\' card grids', type: 'checks', options: SECTION_OPTIONS },
  { key: 'confidential', label: 'Described or recreated, not the original (confidential work)', type: 'bool' },
  { key: 'draft', label: 'Hide this entry from the site', type: 'bool' },
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
    { key: 'label', label: 'Words', type: 'text', hint: 'A link with "CV" in its words is the one the home page CV button uses.' },
    { key: 'url', label: 'Address', type: 'text', hint: 'Leave empty to hide the link.' },
  ] },
  { key: 'contactReasons', label: 'Choices in the contact form\'s "reason" list', type: 'strings' },
];
