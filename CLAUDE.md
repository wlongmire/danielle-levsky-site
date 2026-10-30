# Danielle Levsky's professional site: project guide for Claude

## What this is
Danielle Levsky's professional site: Learning & Development, L&D consulting, Digital Humanities and DEI work. It was started from the template behind warrenlongmire.com (same stack, same content model, same /edit admin), with Warren's content removed.

**Bigger goal:** a companion site for Danielle's artist practice with a similar admin model and infrastructure. The two sites should feel like the same person: shared look, voice and bridge links. So build anything reusable (palette, type, spacing, header/footer, the /edit admin, block components) so it can be lifted into the second site without a rewrite. Keep palette and type in one tokens file.

The live site today is a Squarespace site at https://daniellelevsky.squarespace.com/. Existing sections to carry over: About, L&D Portfolio, L&D Consulting, Digital Humanities, DEI, Artist Professional Consulting (may move to the artist site), Full Professional CV, Contact.

## Decisions made so far
- **Multi-page**, not a one-pager.
- **Page blocks** (every section page is built from these, nothing else):
  - Hero: headline, paragraph, optional image, optional call-to-action button.
  - Overview List: headline plus a collapsible list (native `<details>`, no JS).
  - Card Grid: a titled list of assets or projects.
  - Free Text / Image: About page and similar.
- **Popup rule:** anything deeper than a section page is rendered in a popup (native `<dialog>`), never a page of its own. Every popup must have its own URL (for example `/projects/ld-portfolio#baker-tilly`) so Danielle can send a section to a hiring manager: opening it sets the URL, loading the URL opens it, Back closes it, Esc closes it, focus returns to the card.
- Content shown on more than one page (for example eighty2i on both L&D and DEI) is one entry shown in both places, not two copies.

## Still open (do not decide without asking)
- Primary audience and which roles/services to prioritize.
- Splitting the menu into **Roles** (what she wants to be hired for) and **Services** (what she sells).
- Whether Artist Consulting stays here or moves to the artist site.
- Look: keep her lavender-grey and blue, or something new. Two homepage directions are drafted in the design page https://claude.ai/artifact/XJpfyZKPrngg8Do8bdZH1n.
- Domain, contact form endpoint, headshot, CV format (Google Doc link or PDFs).

## Stack
- Astro (static output), content collections in Markdown
- Deployed to Vercel from GitHub (main branch = production)
- No CMS, no database, no client-side framework unless a component truly needs it
- Plain CSS (custom properties for the palette); no Tailwind unless Danielle asks

## How the site is built now (demo)
Pages: `/` (Hero + first three L&D entries), `/about`, and `/projects/<section>` for each file in `src/content/sections`
(ld-portfolio, ld-consulting, digital-humanities, dei). Contact is a popup from the header button. Blocks live in
`src/components/` (`Hero`, `OverviewList`, `CardGrid`) inside the shared frame `src/layouts/Base.astro`. Palette and fonts
are in `src/styles/tokens.css` only. Project popups are `CaseDialog.astro`, with deep links (`#entry-name`) already working.
Content in the demo is taken from her current site; titles and dates she did not state are left empty, not guessed.

Left over from the template and not used by any page yet: `Timeline.astro`, `Resume.astro`, `src/scripts/filter.ts`,
`src/data/mockCards.ts`, the `timeline` collection. Remove or reuse once the structure settles.

## Content model (Danielle edits these by hand)
- `src/content/work/*.md`: one file per portfolio entry (card and popup). `sections:` lists the section pages that show it
  (`ld-portfolio`, `dei`, `digital-humanities`); an entry in two sections is still one file.
- `src/content/sections/*.md`: one file per section page (headline, intro, optional button, Overview List items, card grid title). Nav order is `sections` in `src/data/order.json`.
- `src/content/pages/home.md`, `about.md`
- `public/resumes/*.pdf`: resumes (not wired to a page yet; her CV is a Google Doc link in `site.json`)

Entry front matter:
```yaml
title: ""
outcome: ""          # one line, shown on the card
role: ""
org: ""
dates: ""
audience: ""
tools: []
tracks: []           # any of: learning-design, teaching, engineering, design-ux (to be revisited for Danielle's sections)
cover: ""            # optional image path
media: []            # optional popup slideshow: items of {type: image, src: "file-name.jpg", alt, fit} or {type: video, url, title}; pictures are named by file name only (looked up in src/assets/work or src/assets/timeline)
confidential: false  # true = described/recreated, not original artifacts
draft: false
```
Body sections, in order: Context, Approach, What I built, Outcome, Reflection.

## Editing from the web
`/edit` (password-protected, content only) saves Markdown/uploads to GitHub, which redeploys the site. It runs as a few
on-demand routes via `@astrojs/vercel`; every public page stays static. Code is in `src/lib/editor/` and
`src/pages/edit/`, `src/pages/api/edit/`. Setup and safety rules: `EDITING.md`. Site-wide details live in
`src/data/site.json` (read by `site.ts`). The order of entries and journey steps lives in `src/data/order.json`
(set by drag and drop on /edit; read by `src/lib/order.ts`), so content files have no `order:` field. Keep new content fields editable: if you add a field to a content collection,
also add it to the checks in `src/lib/editor/rules.ts`.
**Gap:** `/edit` still only knows `work`, `timeline`, `about.md` and `site.json`. The new `sections` files and `home.md` are
not editable there yet (and the `sections:` field on work entries is not checked), so that needs doing before handoff.
The About page shows a `photos:` list (pictures in `src/assets/about/`, each with alt text). `rules.ts` checks it, but `/edit` has
no way to upload or reorder those pictures yet, and its About-page "Replace the headshot photo" button swaps the home-page headshot only.

## Rules
- Keep content editable by a non-developer: never hard-code entry text in components.
- Never invent facts about Danielle's work. Take wording only from her own site, CV or LinkedIn, or from her. If a detail is missing, leave a `TODO:` in the Markdown and ask. Some of her work is proprietary: show described or recreated examples, never confidential artifacts.
- Accessibility: WCAG AA contrast (her current blue on grey is borderline, so check any blue), semantic HTML, keyboard navigable, popups via `<dialog>` with focus return, respects `prefers-reduced-motion`.
- Performance: static pages, no layout shift, images optimized with Astro's image tools.
- Voice: plain and specific in entries; a noticeably poetic line on the homepage and About page. Clarity for a 30-second skim wins every tie.
- Explain what you changed in plain language after each task.
