---
title: Brand and logo
sidebar_position: 2
description: The current Red Cab logo files, where the web app uses them, and five new logo options under review.
doc_type: convention
normative: false
status: draft
---

## TL;DR

- Red Cab has not chosen a new logo yet.
  - This page is a draft.
- The page lists the logo files that `red-cab-web` uses today.
- The page shows five new options.
  - Each option keeps the red sun and the road of the current logo.
- After the team chooses one option, this page becomes the rule page for the logo.

## About this document

| Topic | Document |
| --- | --- |
| Frontend conventions | [Frontend Conventions](/docs/50-59-frontend/conventions/frontend) |
| Words for the team | [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100) |
| Logo code in the web app | the file `red-cab-web/app/components/brand/brand-constants.js` |
| Logo image files in the web app | the folder `red-cab-web/public/brand/` |

---

## Words used in this doc

| Word | Meaning |
| --- | --- |
| Symbol | The picture part of the logo, without the name. |
| Wordmark | The name "RedCab" written in letters. |
| Lockup | The symbol and the wordmark placed together. |
| Horizontal lockup | A lockup with the symbol on the left of the wordmark. |
| Stacked lockup | A lockup with the symbol above the wordmark. |
| App icon tile | A red rounded square with a white symbol. It is used for the favicon and the phone home screen. |

---

## When to use this

- Read this page before you add a logo to a page in `red-cab-web`.
- Read this page before you ask a designer for new brand files.
- Do not copy a logo option from this page into the app yet.
  - The options are not approved.

## Rules

### Current logo files

The folder `red-cab-web/public/brand/` holds the logo files.
- All files are PNG.
  - There is no SVG file.
- The symbol files are `redcab-mark-24.png`, `redcab-mark-32.png`, `redcab-mark-40.png` and `redcab-mark-48.png`.
- The lockup files are `redcab-logo-light-{size}.png` and `redcab-logo-dark-{size}.png`, in sizes 32, 40, 48, 64, 128 and 256.
- The browser tab uses `favicon-32.png`.
- The phone home screen uses `apple-touch-icon.png`.

The file `red-cab-web/app/components/brand/brand-constants.js` sets the logo height for each place.

| Place (size key) | Lockup height | Symbol height |
| --- | --- | --- |
| `navbar` | 32 px | 32 px |
| `sidebar` | 40 px | 40 px |
| `auth` | 48 px | 48 px |
| `hero` | 64 px | 48 px |

The symbol file `redcab-mark-48.png` is also the placeholder image for a region, a listing and a profile.

### Problems in the current files

- The "Cab" text in the dark lockup is white.
  - A person cannot see it on a white page.
- The light lockup has a grey glow and a black outline in the picture.
  - Pages with another background look wrong.
- A PNG file loses quality when the size changes.
  - The smallest symbol is 24 px.
- The road touches the edge of the circle and looks cut at small sizes.

## Examples

Each option below is a proposal, drawn as a vector from the current logo.
- Each picture shows four places.
  - The header on a light page.
  - The footer on a dark page.
  - The stacked lockup.
  - The app icon tile.
- Option A to D have a symbol file in SVG format.
  - Option E has no separate symbol.

### Option A: Road Sun

The current logo, cleaned up.
- The road narrows toward the horizon.
- The circle stays whole.

![Option A, Road Sun, in four places](/img/brand/logo-options/option-a-overview.png)

The symbol file is `static/img/brand/logo-options/option-a-symbol.svg`.

### Option B: Torii Road

A red torii gate with the road between the two pillars.
- It shows Japan at first sight.

![Option B, Torii Road, in four places](/img/brand/logo-options/option-b-overview.png)

The symbol file is `static/img/brand/logo-options/option-b-symbol.svg`.

### Option C: Destination Pin

A map pin with the road inside.
- It tells a tourist "find a place and go".

![Option C, Destination Pin, in four places](/img/brand/logo-options/option-c-overview.png)

The symbol file is `static/img/brand/logo-options/option-c-symbol.svg`.

### Option D: Sunrise Road

Half a sun over a road that gets narrower toward the horizon.
- It suits large hero areas.

![Option D, Sunrise Road, in four places](/img/brand/logo-options/option-d-overview.png)

The symbol file is `static/img/brand/logo-options/option-d-symbol.svg`.

### Option E: Road Underline

A wordmark with a road drawn under it.
- It has no symbol.
- The app icon tile shows the letter R.

![Option E, Road Underline, in four places](/img/brand/logo-options/option-e-overview.png)

## Open questions

These items are proposed, not agreed.
- Which option does Red Cab choose?
  - The owner decides.
- Which font does the final wordmark use?
  - The pictures use free Google Fonts as stand-ins.
- Does the final wordmark need a Japanese version for the `ja` language setting?
- Does the road in the symbol need a redraw by a designer?
  - The code generated the road shape.
- Which one-colour version does Red Cab use for emails, invoices and PDFs?

## Related docs

- [Frontend Conventions](/docs/50-59-frontend/conventions/frontend)
- [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100)
