# Tests for this site

End-to-end tests ([Playwright](https://playwright.dev)) that open the public site and the `/edit` admin in a real browser.
They live in their own folder with their own `package.json`, so the site and its Vercel build don't know they exist.

## Run them

```bash
cd tests
npm install              # first time only
npm run install-browsers # first time only, if Playwright says it has no browser (~100 MB)
                         # or skip it and use the Chrome you already have: PW_CHANNEL=chrome npm test
npm test                 # everything (about 3 minutes)
npm run test:site        # public site (desktop and phone)
npm run test:editor      # the /edit page and its API
npm run report           # open the last HTML report
```

`npm test` from the project's top folder runs the same thing.

## Safe by design

`scripts/serve.mjs` makes a **throwaway copy** of the project in your temp folder and runs a dev server from it on port 4322.

- Editor tests save into the copy. Your real files are never changed (`support/site.ts` puts the copy's content back between tests).
- The copy has no `.env` and an empty `GITHUB_TOKEN`: nothing can be committed to GitHub.
- The copy uses its own test password, not your real `EDIT_PASSWORD`, and sets `EDIT_REQUIRE_PASSWORD` so the dev shortcut that skips the sign-in on localhost is off. That is what lets the sign-in tests mean something.
- Site tests block every outside address. The contact form's service (Formspree) is replaced by a stand-in, so no real email is sent.
- The copy is wiped and rebuilt at the start of every run.

## What is covered

| File | Checks |
| --- | --- |
| `specs/site/pages.spec.ts` | every public page: loads, one main heading, pictures have alt text, no sideways scroll, no script errors; menu order and highlight; footer links; each page's cards, dark panels, grid titles and overview items match its Markdown file; Overview items open and close; About pictures; project popups (address set, Esc, Back and Forward, ×, focus returns to the card, a link opens a card, the subtitle and Artifacts show, slideshow arrows, one card shown on two pages) |
| `specs/site/contact.spec.ts` | the contact popup: opens, closes, reasons list, field and email checks, send, one message a minute, service down, spam field, no service connected |
| `specs/site/mobile.spec.ts` | phone: no sideways scroll on any page, Menu button, popup fits the screen |
| `specs/editor/api.spec.ts` | sign-in required, wrong password, other-site requests blocked, only content files editable, saving cards and pages, a card being created, conflict (409), the checks before saving (pictures, YouTube links, cropping, buttons, scripts, block rules), uploads, picture preview limits, menu order, site details keep the form address |
| `specs/editor/ui.spec.ts` | login, sidebar order, Site details and Contact Page, page and block editing (headline, buttons, Style, add, move, remove, refused empty Text Title), block drawings, the card form (field order, Media box, Content, Type and cropping), new card, add an existing card, take a card out, shared-card note |
| `specs/editor/zz-lockout.spec.ts` | five wrong passwords lock further tries |

Tests read what they expect (card counts, menu names, titles) from the content files, so adding a card or a page doesn't break them.
They do not check how the site looks, only what it says and does. When you add a new kind of block or a new field, add a line here.
