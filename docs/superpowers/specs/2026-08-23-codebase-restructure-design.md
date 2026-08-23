# Codebase Restructure — Design

**Date:** 2026-08-23
**Project:** PANTONE — Go-To-Market Teardown
**Status:** Approved (pending spec review)

## Problem

The presentation lives entirely in `main.html` — a single 650 KB, ~1008-line file that
inlines Three.js (r128) and anime.js (v3.2.1) alongside ~280 lines of CSS, ~350 lines of
slide markup, and ~345 lines of application JavaScript. Everything is intentionally in one
file (README: "no build step"), which is great for portability but poor for maintainability:
the CSS, slide content, deck logic, and WebGL hero are all tangled in one document, and the
two library blobs make up ~95% of the file weight and noise.

Additional hygiene issues:
- `.playwright-mcp/` debugging artifacts were accidentally committed to git (3 tracked files).
- `test.html` is an identical 650 KB scratch duplicate sitting on disk.
- `.gitignore` is minimal (`/test.html`, `.vercel`) and omits standard Node/build/OS entries.

## Goal

Restructure into an industry-standard, maintainable source layout **while preserving a
single self-contained deployable output**. Separate concerns (styles, scripts, libraries,
markup) in source; re-bundle into one inlined HTML file at build time.

## Decisions (confirmed with user)

1. **Split source + build step** to re-bundle into a single deployable file. (Not: linked
   multi-file static site; not: leave the monolith as-is.)
2. **Build tool: Vite + `vite-plugin-singlefile`** — dev server with HMR, and a build that
   emits exactly one inlined HTML file. (Not: custom Node script; not: Eleventy.)
3. **Libraries via npm, pinned to current versions** — `three@0.128.0`, `animejs@3.2.1` —
   imported as ES modules and re-inlined by the bundler. This preserves current behavior
   while making the deps version-pinned and updatable. (Not: keep vendored blobs; not: latest
   versions, which would break the r128-era WebGL hero.)
4. **Slides stay in `index.html`, sectioned with comments.** CSS and JS are split into
   modules; slide markup remains declarative content in one file. (Not: one partial per
   slide; not: data-driven runtime rendering.)
5. **Entry renamed `main.html` → `index.html`** (Vite convention; serves at `/`).
6. **Delete `test.html`** — the Vite dev server replaces the need for a scratch duplicate.

## Target structure

```
go-to-market/
├── src/
│   ├── index.html              # HTML shell + 15 sectioned slides; links styles/index.css + scripts/main.js
│   ├── styles/
│   │   ├── index.css           # @imports the files below, in order
│   │   ├── tokens.css          # :root vars: colors, fonts, --gap             (from main.html 30–40)
│   │   ├── base.css            # reset, html/body, ::selection, halftone, vignette (41–63)
│   │   ├── deck.css            # #deck-wrap, #track, .slide, .slide-inner, chrome, swatch (65–116)
│   │   ├── typography.css      # eyebrow, headline, subhead, lead, rule       (118–144)
│   │   ├── components.css      # grid-2, stat, blist, num-list, tag, quote, mtable, journey, map-grid, foot (146–227)
│   │   ├── navigation.css      # #rail, .dot, #progress-bar, .nav-btn         (229–258)
│   │   ├── hero.css            # #hero-canvas, title-*, begin-hint, thanks-mark, .reveal (260–282)
│   │   └── responsive.css      # @media mobile + prefers-reduced-motion       (284–308)
│   └── scripts/
│       ├── main.js             # entry point: imports libs + bootstraps deck & hero
│       ├── deck.js             # nav controller: goTo/next/prev, keyboard/wheel/touch/click, rail dots, progress (664–796)
│       ├── reveal.js           # anime.js slide reveal animations             (714–730)
│       ├── swatches.js         # chrome swatch-card injection + shadeFor palette (679–698)
│       └── hero.js             # three.js WebGL hero: cards, raycast hover tooltip, parallax (798–1003)
├── public/                     # static passthrough assets (favicon/og image) — future use
├── dist/                       # BUILD OUTPUT (gitignored) → single self-contained index.html
├── docs/superpowers/specs/     # design docs
├── .gitignore                  # updated
├── package.json                # scripts: dev / build / preview
├── vite.config.js              # vite-plugin-singlefile config
├── vercel.json                 # updated for Vite build
├── README.md                   # updated dev/build instructions
└── LICENSE                     # optional
```

## CSS module mapping

Each module maps to a contiguous, logically grouped block of the current `<style>`
(main.html lines 29–309). `styles/index.css` `@import`s them in the order below to preserve
the cascade:

| File | Responsibility | Source lines |
|------|----------------|--------------|
| `tokens.css` | `:root` custom properties (color palette, font stacks, `--gap`) | 30–40 |
| `base.css` | box-sizing reset, `html/body`, `::selection`, `.halftone`, `.grain-vignette` | 41–63 |
| `deck.css` | `#deck-wrap`, `#track`, `.slide` (+`.alt`/`.dark`), `.slide-inner`, `.chrome`, `.idx`, `.swatch` | 65–116 |
| `typography.css` | `.eyebrow`, `h1.headline`, `h2.subhead`, `p.lead`, `.rule` | 118–144 |
| `components.css` | `.grid-2`, `.stat-*`, `ul.blist`, `.num-list`, `.tag-row`/`.tag`, `.quote`, `.mtable`, `.journey`, `.map-grid`, `.foot` | 146–227 |
| `navigation.css` | `#rail`, `.dot`, `#progress-bar`, `.nav-btn` (+`#prev-btn`/`#next-btn`) | 229–258 |
| `hero.css` | `#hero-canvas`, `.title-*`, `.begin-hint`, `@keyframes pulse`, `.thanks-mark`, `.reveal` | 260–282 |
| `responsive.css` | `@media (max-width:820px)` and `@media (prefers-reduced-motion)` | 284–308 |

Cascade order is preserved exactly; no rules are added, removed, or reordered within blocks.

## JS module mapping & interfaces

The current app is one IIFE (main.html 662–1005). It is decomposed into focused ES modules.
The only real coupling is that the hero needs to know when the title slide (index 0) is
active — today handled by a `setInterval(..., 300)` poll (lines 997–1003). The restructure
replaces that poll with an explicit callback.

| Module | Exports / responsibility | Source lines |
|--------|--------------------------|--------------|
| `deck.js` | `createDeck()` controller → `goTo(i)`, `next()`, `prev()`, `onChange(cb)`, current index; owns track layout, rail dots, progress bar, and keyboard/wheel/touch/edge-click handlers | 664–677, 700–796 |
| `reveal.js` | `revealSlide(slide, { reduceMotion })` using anime.js | 714–730 |
| `swatches.js` | `injectSwatches(slides)` + internal `shadeFor(name)` palette map | 679–698 |
| `hero.js` | `initHero({ onActiveChange })` → three.js scene, 5 swatch cards, canvas swatch texture, raycast hover tooltip, damped parallax, resize handling; subscribes to deck `onChange` instead of polling | 798–1003 |
| `main.js` | Imports `three`/`animejs`; constructs deck, injects swatches, wires reveal into `deck.onChange`, and starts the hero (respecting `prefers-reduced-motion`) | 662–663, 795–796, 992–994 |

Behavior parity: the palette map in `swatches.js` and the `cardData` array in `hero.js` are
carried over verbatim. `reduceMotion` handling is preserved in both reveal and hero paths.

## Build & deploy

- **`package.json` scripts:** `dev` → `vite`, `build` → `vite build`, `preview` → `vite preview`.
- **`vite.config.js`:** register `vite-plugin-singlefile` so `vite build` inlines all CSS,
  JS, and npm libraries into a single `dist/index.html`. `root` is `src/`; `build.outDir` is
  `../dist`.
- **Output:** one self-contained `dist/index.html` — functionally identical to today's
  `main.html`, openable directly or served.
- **`vercel.json`:** switch to a Vite build — `outputDirectory: dist` (Vercel also
  auto-detects Vite). The old `{ "/" → "/main.html" }` rewrite is removed because
  `index.html` is served at `/` by default.

## `.gitignore` (new contents)

```
node_modules/
dist/
.vercel
.playwright-mcp/
test.html
.DS_Store
*.log
npm-debug.log*
.env
.env.*
!.env.example
```

Plus two one-time cleanup actions:
- `git rm -r --cached .playwright-mcp` to untrack the accidentally-committed artifacts.
- Delete the obsolete `test.html` file from disk.

## README

Update the "Tech", "Usage", and "Files" sections: document `npm install`, `npm run dev`
(HMR), `npm run build` (single-file output in `dist/`), the new `src/` layout, and that
Three.js/anime.js are now pinned npm dependencies rather than inlined blobs.

## Non-goals (YAGNI)

- No slide content changes, redesign, or copy edits.
- No TypeScript, no CSS preprocessor, no framework.
- No per-slide partial files or data-driven slide rendering.
- No dependency upgrades beyond pinning the current versions.
- No new features. This is a structural refactor only.

## Success criteria

1. `npm run build` produces a single `dist/index.html` that renders and behaves identically
   to the current `main.html` (all 15 slides, reveal animations, WebGL hero + hover tooltips,
   keyboard/wheel/touch/edge-click navigation, progress rail, responsive + reduced-motion).
2. `npm run dev` serves the deck with working HMR.
3. Source is split per the structure above; no library blobs remain in source.
4. `.playwright-mcp/` is untracked and ignored; `test.html` removed; `.gitignore` updated.
5. Vercel deploy serves the built single-file deck at `/`.
