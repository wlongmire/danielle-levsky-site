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
(ld-portfolio, ld-consulting, digital-humanities, dei, career-coaching-for-creatives: her old "Artist Professional Consulting" page under its new name; a Text block's Markdown can hold bullet lists; its four testimonials are Cards (`testimonial-*` in `src/content/work`: the person is the title, their role line the Subtitle, the quote's first sentence the Summary and the rest of the quote the Content, wording unchanged) in a Card Grid titled Testimonials). Contact is a popup from the header button. Blocks live in
`src/components/` (`Hero`, `OverviewList`, `CardGrid`) inside the shared frame `src/layouts/Base.astro`. Palette and fonts
are in `src/styles/tokens.css` only. Project popups are `CaseDialog.astro`, with deep links (`#entry-name`) already working.
Content in the demo is taken from her current site; titles and dates she did not state are left empty, not guessed.

Left over from the template and not used by any page yet: `Timeline.astro`, `Resume.astro`, `src/scripts/filter.ts`,
`src/data/mockCards.ts`, the `timeline` collection. Remove or reuse once the structure settles.

## Content model (Danielle edits these by hand)
- `src/content/work/*.md`: one file per portfolio entry (card and popup). /edit calls these "Cards"; the files, code and this guide still say "entry". A card has no page of its own: a Card Grid
  block lists the cards it shows (`entries:`, in order), so a card listed in two grids is still one file. A set of cards with its own
  subheading (a position) is its own Card Grid block with a title and `boxed: true`.
  On the L&D Portfolio page each entry is one asset box from her old site (title, one-line `outcome`, the full write-up as the
  body, pictures in `media`). The position a box sits under is the title of the Card Grid block it is in;
  `org` is the card's Subtitle (shown under its title, and left off a card that sits in a titled panel); `role` and `dates` are no longer shown or edited (the few that had values moved into the top of the card's Content as `**Role:**` / `**Dates:**` lines; the keys stay in the files as empty strings because the schema still requires them). The text is her old site's, word for word. The picture alt text there is a
  generic placeholder ("Picture 2 of 7 from ...") until she describes each one.
- `src/content/pages/home.md`, `about.md` and `src/content/sections/<slug>.md`: one file per page. Each is a page name (`title`, or `navLabel` for section pages; an optional `menuGroup` on a section page, and section pages sharing the same one are shown as one dropdown in the header menu (L&D Consulting and Career Coaching for Creatives are in "Consulting"; the dropdown sits where its first page comes in the order; a group with one page is a plain link; set in /edit as "Dropdown name"); `draft: true` hides a section page; /edit has no checkbox for it for now), an optional `description`, and an ordered `blocks:` list. Block types (defined once in `src/lib/blocks.ts`, drawn by `components/PageBlocks.astro`): `hero` (headline, intro, `buttons` (first is the main one, the rest outlined; `#contact` opens the contact popup), `image`/`imageAlt`/`imageCrop` (where the picture is cropped to: top, upper, center, bottom, left, right; a picture more than 2.5 times wider than tall, like a logo, is shown whole instead of cropped), `featured`), `overview` (title, items), `title` (Text Title: a heading on its own, e.g. "Project Assets" above a run of card grids), `cards` (optional `title`, `entries` = the cards in order, `boxed` = dark panel), `text` (title, Markdown `body`, `photos`). Pictures live in `src/assets/pages/` (uploads from /edit) or the older `src/assets/<page>/` folders. Menu order is `sections` in `src/data/order.json`.
- `public/resumes/*.pdf`: resumes (not wired to a page yet; her CV is a Google Doc link in `site.json`)

Entry front matter:
```yaml
title: ""
outcome: ""          # /edit calls it Summary: shown on the card (trimmed to four lines with an ellipsis) and in bold in the popup; a blank line starts a new paragraph (they run together on the card)
role: ""
org: ""            # /edit calls it Subtitle
dates: ""
audience: ""
tools: []
tracks: []           # any of: learning-design, teaching, engineering, design-ux (to be revisited for Danielle's sections)
cover: ""            # optional image path
media: []            # optional popup slideshow: items of {type: image, src: "file-name.jpg", alt, fit} or {type: video, url, title}; pictures are named by file name only (looked up in src/assets/work or src/assets/timeline)
confidential: false  # true = described/recreated, not original artifacts
draft: false
```
/edit's card form, in order: Title, Subtitle (`org`), Summary (`outcome`), Content (the Markdown body), then a Media box (Image = `media`, whose Type is Picture or YouTube video; a picture's `crop` uses the same choices as a hero picture: empty shows the whole picture, any other crops it to a wide banner at that position, Artifacts = `artifacts`, Links = `links`). It has no checkbox for `confidential` or `draft`; both stay in the files (six cards are `confidential: true`; it is not displayed).
Body sections, in order: Context, Approach, What I built, Outcome, Reflection.

## Editing from the web
`/edit` (password-protected, content only) saves to GitHub, which redeploys the site; with no `GITHUB_TOKEN` and on the dev server it
writes local files, and `devBypass()` in `auth.ts` skips the password there (localhost only). It runs as a few on-demand routes via
`@astrojs/vercel`; every public page stays static. The screen is `src/pages/edit/index.astro`: sidebar of Pages (Home, About, each
section page), Site details and the Contact Page. A page opens as its ordered blocks, which can be
edited, added, removed and reordered. Cards are made, edited and reordered inside the Card Grid block that lists them (there is no
card list in the sidebar); Save writes the changed cards, then the page. A grid can also add an existing card, which is how one card
appears in several grids. The forms are drawn from field lists in `src/lib/editor/forms.ts`, data goes through
`src/pages/api/edit/doc.ts` (one endpoint for pages, cards and site) and is checked in `src/lib/editor/rules.ts` (`validatePage`,
`validateMarkdown`). Setup and safety rules: `EDITING.md` (partly out of date: still describes the old raw-Markdown editor). Site-wide
details live in `src/data/site.json`. The menu order lives in `src/data/order.json` (its old `work` list is no longer used; a grid's own list sets card order).
Each block's form opens with a small drawing of that block type (`DEMOS` in `src/pages/edit/index.astro`); a new block type needs a drawing there too.
Moving a block, card, list item or menu page with its arrows goes through `motion()` in `index.astro`: the others slide, the moved one gets a `moved` class for a second (no visible style; the amber glow was removed as too much), the page scrolls to keep it under the pointer and focus returns to the arrow (reduced motion: no slide, so only the scroll and focus show where it went). Use it for any new reorderable list.
`EDIT_OPEN=1` (an environment variable, off by default; see `.env.example`) turns the password off on a deployed copy for demos. It makes `/edit` public, so never leave it on together with a real `GITHUB_TOKEN`.
To teach /edit a new field: add it to `blocks.ts` or `content.config.ts`, to `forms.ts`, and to the checks in `rules.ts`.
Not editable there: creating new pages, the `timeline` collection, resumes, the contact form endpoint. Saving a card rewrites its
front matter in tidy YAML (same data, different style). In dev, saving triggers a page reload.

## Tests
`tests/` is a separate Playwright project (README inside). `npm test` here (or in `tests/`) runs about 100 checks in about three minutes
against a throwaway copy of the project, so real content and GitHub are never touched. It covers the public pages, popups with their
addresses, the contact popup, phone layout, and the `/edit` API and screens. Run it before committing changes to blocks, cards, `/edit`
or the popup, and add a test with each new block type or field. `EDIT_REQUIRE_PASSWORD=1` turns off the localhost sign-in shortcut (the tests set it).

## Rules
- Keep content editable by a non-developer: never hard-code entry text in components.
- Never invent facts about Danielle's work. Take wording only from her own site, CV or LinkedIn, or from her. If a detail is missing, leave a `TODO:` in the Markdown and ask. Some of her work is proprietary: show described or recreated examples, never confidential artifacts.
- Accessibility: WCAG AA contrast (her current blue on grey is borderline, so check any blue), semantic HTML, keyboard navigable, popups via `<dialog>` with focus return, respects `prefers-reduced-motion`.
- Performance: static pages, no layout shift, images optimized with Astro's image tools.
- Voice: plain and specific in entries; a noticeably poetic line on the homepage and About page. Clarity for a 30-second skim wins every tie.
- Explain what you changed in plain language after each task.
