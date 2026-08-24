# PANTONE — Go-To-Market Teardown

An interactive HTML presentation that reverse-engineers the go-to-market (GTM) strategy of PANTONE — the company that turned color into a licensed, universal language and a business. The source is modular (Vite); the build bundles everything into one self-contained HTML file.

Built as an in-class assignment for Entrepreneurship.

## Overview

The deck is a horizontally-scrolling presentation of 15 slides (00–14) that walk through PANTONE's business and GTM strategy:

| # | Section |
|---|---------|
| 00 | Title |
| 01 | Company Snapshot |
| 02 | Who Buys Color |
| 03 | The Problem |
| 04 | Value Proposition |
| 05 | Product Strategy |
| 06 | Pricing Strategy |
| 07 | Distribution Strategy |
| 08 | Customer Acquisition & Promotion |
| 09 | Customer Journey |
| 10 | Growth Engine |
| 11 | One-Page GTM Strategy Map |
| 12 | CMO Challenge: Grow 10X in 12 Months |
| 13 | Final Reflection |
| 14 | Thank You |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm

## Develop

```sh
npm install
npm run dev        # Vite dev server with HMR
```

## Build

```sh
npm run build      # emits a single self-contained dist/index.html
npm run preview    # serve the production build locally
npm run smoke      # structural parity check on dist/index.html
```

## Navigation

- **Arrow keys** — move between slides
- **Scroll** — advance through the deck
- **Click** — begin / advance

## Tech

- **Source** split under `src/`: `index.html` (shell + 15 sectioned slides), CSS modules in `styles/`, ES modules in `scripts/` (`main`, `deck`, `reveal`, `swatches`, `hero`)
- **Build**: [Vite](https://vitejs.dev/) + [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile) bundle and inline everything into one `dist/index.html`
- [Three.js](https://threejs.org/) (`three@0.128.0`) — WebGL hero animation, a pinned npm dependency
- [anime.js](https://animejs.com/) (`animejs@3.2.1`) — slide reveal animations, a pinned npm dependency
- Google Fonts: Space Grotesk, Inter, JetBrains Mono (loaded at runtime; requires internet)

## Project structure

```
.
├── src/
│   ├── index.html          # HTML shell + all 15 slides (sectioned)
│   ├── styles/
│   │   ├── index.css       # imports the 8 modules below, in cascade order
│   │   ├── tokens.css      # design tokens: colors, fonts, spacing
│   │   ├── base.css        # reset, background texture
│   │   ├── deck.css        # deck / track / slide / chrome / swatch
│   │   ├── typography.css  # headings, body, eyebrow, rules
│   │   ├── components.css  # grids, stats, lists, tags, tables, journey, map
│   │   ├── navigation.css  # progress rail, dots, nav arrows
│   │   ├── hero.css        # title hero + reveal helper
│   │   └── responsive.css  # media queries + reduced-motion
│   └── scripts/
│       ├── main.js         # entry point — wires the deck + hero together
│       ├── deck.js         # navigation controller (goTo / next / prev / onChange)
│       ├── reveal.js       # slide reveal animations (anime.js)
│       ├── swatches.js     # per-slide PANTONE swatch cards
│       └── hero.js         # WebGL title-slide hero (three.js)
├── tools/
│   └── smoke.mjs           # structural parity check for the build output
├── dist/                   # build output — single index.html (generated, git-ignored)
├── vite.config.js          # Vite + vite-plugin-singlefile config
├── vercel.json             # Vercel build config
└── package.json
```

## Deploy

Configured for [Vercel](https://vercel.com/) via `vercel.json` (`buildCommand: npm run build`, `outputDirectory: dist`). Any static host works too — run `npm run build` and serve the generated `dist/`, which is a single self-contained `index.html`.

## Team

- Biswajeet (Lead)
- Kanishk Singh
- Ganesh Padhi
- Om Maurya
- Sneha Chaturvedi
