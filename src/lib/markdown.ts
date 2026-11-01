// Turns the Markdown written inside a block (a Text block's body) into HTML at build time, with the same engine Astro
// uses for the .md files (curly quotes and dashes on, and an id on each subheading so it can be linked to).
// The /edit page already refuses <script>, <iframe>, <object> and <embed> in anything it saves.
import { markdownToHtml } from 'satteri';

const slug = (html: string) =>
  html.replace(/<[^>]+>/g, '').toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');

export function markdown(source: string): string {
  const html = markdownToHtml(source ?? '', { features: { smartPunctuation: true } }).html;
  return html.replace(/<h([2-6])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => `<h${level} id="${slug(inner)}">${inner}</h${level}>`);
}
