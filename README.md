# PANTONE — Go-To-Market Teardown

An interactive, single-file HTML presentation that reverse-engineers the go-to-market (GTM) strategy of PANTONE — the company that turned color into a licensed, universal language and a business.

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

## Usage

`main.html` is fully self-contained — open it directly in any modern browser:

```sh
open main.html
```

Or serve it locally (recommended, avoids any CDN/font caching quirks):

```sh
python3 -m http.server 8000
# then visit http://localhost:8000/main.html
```

### Navigation

- **Arrow keys** — move between slides
- **Scroll** — advance through the deck
- **Click** — begin / advance

## Tech

- Plain HTML/CSS/JS in a single file (`main.html`) — no build step
- [Three.js](https://threejs.org/) (inlined) — WebGL hero animation
- [anime.js](https://animejs.com/) (inlined) — slide reveal animations
- Google Fonts: Space Grotesk, Inter, JetBrains Mono (requires internet for font loading)

## Files

- `main.html` — the presentation
- `test.html` — local scratch file (git-ignored)

## Team

- Biswajeet (Lead)
- Kanishk Singh
- Ganesh Padhi
- Om Maurya
