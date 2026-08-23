# Codebase Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the monolithic `main.html` into a maintainable Vite `src/` layout that builds back into one self-contained `dist/index.html`, with no behavior changes.

**Architecture:** Vite (root = `src/`) + `vite-plugin-singlefile` re-inlines all CSS, JS, and npm libraries into a single `dist/index.html`. CSS is split into 8 cascade-ordered modules; the app IIFE is decomposed into focused ES modules (`deck`, `reveal`, `swatches`, `hero`) wired by `main.js`. Three.js/anime.js become pinned npm dependencies imported as modules. A zero-dependency Node smoke script verifies structural parity after every build.

**Tech Stack:** Vite 5, vite-plugin-singlefile 2, three@0.128.0, animejs@3.2.1, Node 18+ (ESM).

**Source of truth during migration:** `main.html` is kept UNTOUCHED until the final task and is copied *from*, so all `main.html:line` references below stay valid across every task. It is deleted only in Task 8 after parity is confirmed.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | npm metadata + `dev`/`build`/`preview`/`smoke` scripts + deps |
| `vite.config.js` | Vite config: `root: src`, `outDir: ../dist`, singlefile plugin |
| `.gitignore` | Updated ignore rules |
| `tools/smoke.mjs` | Zero-dep structural parity check (runnable on any HTML file) |
| `src/index.html` | HTML shell + 15 sectioned slides; links `styles/index.css` + `scripts/main.js` |
| `src/styles/index.css` | `@import`s the 8 style modules in cascade order |
| `src/styles/tokens.css` | `:root` custom properties (main.html 30–40) |
| `src/styles/base.css` | reset, html/body, ::selection, halftone, vignette (41–63) |
| `src/styles/deck.css` | deck/track/slide/chrome/swatch (65–116) |
| `src/styles/typography.css` | eyebrow/headline/subhead/lead/rule (118–144) |
| `src/styles/components.css` | grid/stat/blist/num-list/tag/quote/mtable/journey/map-grid/foot (146–227) |
| `src/styles/navigation.css` | rail/dot/progress-bar/nav-btn (229–258) |
| `src/styles/hero.css` | hero-canvas/title-*/begin-hint/pulse/thanks-mark/reveal (260–282) |
| `src/styles/responsive.css` | `@media` mobile + reduced-motion (284–308) |
| `src/scripts/main.js` | entry: injects swatches, builds deck, starts hero, wires them |
| `src/scripts/deck.js` | `createDeck({slides})` nav controller (main.html 664–796) |
| `src/scripts/reveal.js` | `revealSlide(slideEl, reduceMotion)` (714–730) |
| `src/scripts/swatches.js` | `injectSwatches(slides)` + `shadeFor` palette (679–698) |
| `src/scripts/hero.js` | `initHero({slides,reduceMotion}) -> {setActive}` (798–1003) |
| `vercel.json` | Updated for Vite build output |
| `README.md` | Updated dev/build docs |

### Module interfaces (locked — use these exact names everywhere)

```js
// swatches.js
export function injectSwatches(slides) // slides: HTMLElement[]; injects .swatch into each .chrome

// reveal.js
export function revealSlide(slideEl, reduceMotion) // animates .reveal children of slideEl

// deck.js
export function createDeck({ slides })
// returns: { goTo(i), next(), prev(), onChange(cb), get current(): number, reduceMotion: boolean }

// hero.js
export function initHero({ slides, reduceMotion })
// returns: { setActive(bool) }  OR  null when reduceMotion is true

// main.js orchestration:
//   const slides = [...document.querySelectorAll('.slide')]
//   injectSwatches(slides)
//   const deck = createDeck({ slides })
//   const hero = initHero({ slides, reduceMotion: deck.reduceMotion })
//   deck.onChange((i) => hero && hero.setActive(i === 0))
```

---

## Task 1: Tooling scaffold + smoke harness + git hygiene

**Files:**
- Create: `package.json`, `vite.config.js`, `tools/smoke.mjs`
- Modify: `.gitignore`
- Delete: `test.html` (working-tree file); untrack `.playwright-mcp/`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "pantone-gtm-teardown",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "PANTONE — Go-To-Market Teardown, an interactive single-file presentation.",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "smoke": "node tools/smoke.mjs"
  },
  "dependencies": {
    "animejs": "3.2.1",
    "three": "0.128.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vite-plugin-singlefile": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
```

- [ ] **Step 3: Create `tools/smoke.mjs`** (structural parity check; runs on any HTML file, default `dist/index.html`)

```js
#!/usr/bin/env node
import { readFileSync, existsSync, statSync } from 'node:fs';

const target = process.argv[2] || 'dist/index.html';
const fail = (m) => { console.error(`SMOKE FAIL: ${m}`); process.exit(1); };
const ok = (m) => console.log(`  ok: ${m}`);

if (!existsSync(target)) fail(`file not found: ${target}`);
const html = readFileSync(target, 'utf8');
const size = statSync(target).size;

// 1. Single self-contained file: no LOCAL (non-http) script/style references.
for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
  const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
  const rel = (tag.match(/rel=["']([^"']+)["']/i) || [])[1];
  if (rel && /stylesheet/i.test(rel) && href && !/^https?:/i.test(href))
    fail(`external local stylesheet not inlined: ${href}`);
}
for (const tag of html.match(/<script\b[^>]*>/gi) || []) {
  const src = (tag.match(/src=["']([^"']+)["']/i) || [])[1];
  if (src && !/^https?:/i.test(src)) fail(`external local script not inlined: ${src}`);
}
ok('no external local script/style references');

// 2. Exactly 15 slides.
const slideCount = (html.match(/class="slide[ "]/g) || []).length;
if (slideCount !== 15) fail(`expected 15 slides, found ${slideCount}`);
ok('15 slides present');

// 3. Key element IDs present.
for (const id of ['deck-wrap', 'track', 'rail', 'progress-bar', 'prev-btn', 'next-btn', 'hero-canvas'])
  if (!html.includes(`id="${id}"`)) fail(`missing #${id}`);
ok('all key element IDs present');

// 4. Libraries inlined -> file must be large (three + anime are hundreds of KB).
if (size < 200 * 1024) fail(`file too small (${(size / 1024) | 0}KB) — libraries may not be inlined`);
ok(`file size ${(size / 1024) | 0}KB (libraries inlined)`);

console.log(`SMOKE PASS: ${target}`);
```

- [ ] **Step 4: Verify the smoke harness passes on the current known-good file**

Run: `node tools/smoke.mjs main.html`
Expected: prints 4 `ok:` lines and `SMOKE PASS: main.html` (exit 0). This proves the assertions are valid against working output before any refactor.

- [ ] **Step 5: Overwrite `.gitignore`** with:

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

- [ ] **Step 6: Untrack the accidentally-committed artifacts and delete the scratch file**

Run:
```bash
git rm -r --cached .playwright-mcp
rm -f test.html
```
Expected: git stages deletion of the 3 `.playwright-mcp/*` files from the index (they remain on disk but ignored); `test.html` removed from disk.

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created; `package-lock.json` written; `three@0.128.0` and `animejs@3.2.1` resolved exactly.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js tools/smoke.mjs .gitignore
git rm -r --cached --quiet .playwright-mcp
git commit -m "chore: scaffold Vite tooling, smoke harness, and git hygiene"
```

---

## Task 2: Extract CSS into cascade-ordered modules

**Files:**
- Create: `src/styles/index.css` + 8 module files
- Read from: `main.html:29-309` (the `<style>` block)

- [ ] **Step 1: Create the 8 module files by copying VERBATIM blocks from `main.html`'s `<style>`**

Copy each contiguous line range exactly (CSS text only, no `<style>`/`</style>` tags):

| Create file | Copy `main.html` lines |
|-------------|------------------------|
| `src/styles/tokens.css` | 30–40 (the `:root { ... }` block) |
| `src/styles/base.css` | 41–63 (`*{box-sizing}`, `html,body`, `::selection`, `.halftone`, `.grain-vignette`) |
| `src/styles/deck.css` | 65–116 (deck-wrap, track, slide, slide-inner, chrome, idx, swatch) |
| `src/styles/typography.css` | 118–144 (eyebrow, headline, subhead, lead, rule) |
| `src/styles/components.css` | 146–227 (grid-2 … foot) |
| `src/styles/navigation.css` | 229–258 (rail, dot, progress-bar, nav-btn) |
| `src/styles/hero.css` | 260–282 (hero-canvas, title-*, begin-hint, @keyframes pulse, thanks-mark, .reveal) |
| `src/styles/responsive.css` | 284–308 (both `@media` blocks) |

Do not add, remove, reorder, or reformat any rule.

- [ ] **Step 2: Create `src/styles/index.css`** (aggregator — order matters for the cascade):

```css
@import './tokens.css';
@import './base.css';
@import './deck.css';
@import './typography.css';
@import './components.css';
@import './navigation.css';
@import './hero.css';
@import './responsive.css';
```

- [ ] **Step 3: Sanity-check no CSS was lost**

Run: `cat src/styles/{tokens,base,deck,typography,components,navigation,hero,responsive}.css | wc -l`
Expected: approximately 281 lines total (main.html 29–309 minus the two tag lines). Small differences from trailing newlines are fine; there must be no missing selectors.

- [ ] **Step 4: Commit**

```bash
git add src/styles
git commit -m "refactor: extract CSS into cascade-ordered modules"
```

---

## Task 3: Create `src/index.html` + monolithic `main.js` → first green build

This reaches a working, behavior-identical build with libraries imported. It is the primary parity checkpoint.

**Files:**
- Create: `src/index.html`, `src/scripts/main.js`
- Read from: `main.html` (head 1–9; body markup 313–659; app IIFE 662–1005)

- [ ] **Step 1: Create `src/index.html`**

Head + shell (copy the slide markup verbatim where indicated):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PANTONE — Go-To-Market Teardown</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles/index.css">
</head>
<body>
<!-- PASTE main.html lines 313–659 VERBATIM HERE:
     .halftone, .grain-vignette, #progress-bar, #deck-wrap (all 15 .slide sections), #rail -->
<script type="module" src="/scripts/main.js"></script>
</body>
</html>
```

Note: the two inlined library `<script>` blobs (main.html 10–18 and 19–28) and the `<style>` block are intentionally NOT copied — CSS is linked; libraries arrive via npm imports in `main.js`.

- [ ] **Step 2: Create `src/scripts/main.js`** as the whole original app, with library globals replaced by imports.

Line 1–2 are new; the rest is `main.html` lines 662–1005 pasted VERBATIM (the existing `(function(){ ... })();` IIFE, including all deck logic, `shadeFor`, `revealSlide`, hero code, and the trailing `setInterval` poll):

```js
import * as THREE from 'three';
import anime from 'animejs';

// >>> PASTE main.html lines 662–1005 VERBATIM BELOW (the entire IIFE) <<<
// (function(){ "use strict"; ... setInterval(checkHeroActive, 300); })();
```

The pasted IIFE references `THREE` and `anime` as free variables; they now resolve to the module imports above. No other edits in this task.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds; writes `dist/index.html`. No unresolved-import or Rollup errors.

- [ ] **Step 4: Structural smoke check on the build output**

Run: `npm run smoke`
Expected: 4 `ok:` lines + `SMOKE PASS: dist/index.html`.

- [ ] **Step 5: Manual behavior parity check**

Run: `npm run preview` then open the shown URL. Verify against current `main.html`:
- All 15 slides present; arrow keys / wheel / touch / right-edge click navigate.
- Progress bar + rail dots update; clicking a dot jumps to that slide.
- Slide 00 hero: Three.js swatch cards float; hovering a card shows the tooltip; parallax follows the mouse.
- Reveal animations play on slide entry.
- Test `prefers-reduced-motion` (OS setting or DevTools rendering emulation): animations disabled, `.reveal` items visible.

If anything differs, fix before committing.

- [ ] **Step 6: Commit**

```bash
git add src/index.html src/scripts/main.js
git commit -m "feat: add Vite src entry and monolithic module (first green single-file build)"
```

---

## Task 4: Extract `swatches.js`

**Files:**
- Create: `src/scripts/swatches.js`
- Modify: `src/scripts/main.js`
- Read from: `main.html:679-698`

- [ ] **Step 1: Create `src/scripts/swatches.js`**

Move the swatch-injection loop (main.html 680–688) and `shadeFor` (690–698) into an exported function. Full module:

```js
// Injects a PANTONE swatch card into each slide's .chrome (top-right).
export function injectSwatches(slides) {
  slides.forEach((s) => {
    const chrome = s.querySelector('.chrome');
    const sw = document.createElement('div');
    sw.className = 'swatch';
    const code = s.getAttribute('data-code');
    const name = s.getAttribute('data-name');
    sw.innerHTML = '<div class="chip" style="background:' + shadeFor(name) + '"></div><div><div class="code">PANTONE ' + code + '</div><div class="name">' + name.toUpperCase() + '</div></div>';
    chrome.appendChild(sw);
  });
}

function shadeFor(name) {
  const map = {
    'Bright White':'#F5F5F3','Pavement':'#B9B8B3','Steel Gray':'#8C8B87','Castlerock':'#6E6D69',
    'Blanc de Blanc':'#EDEDEA','Ash':'#A9A8A3','Charcoal Gray':'#4A4946','High-Rise':'#8f8e8a',
    'Jet Black':'#161615','Glacier Gray':'#C7C6C1','Gargoyle':'#767570','Silver Lining':'#D6D5D0',
    'Anthracite':'#302f2d','Bone White':'#E6E4DE','Black Beauty':'#0d0d0c'
  };
  return map[name] || '#999';
}
```

- [ ] **Step 2: Edit `src/scripts/main.js`**

Add at the top, after the library imports:
```js
import { injectSwatches } from './swatches.js';
```
Inside the IIFE, DELETE the swatch-injection block (moved from main.html 679–698: the `slides.forEach((s)=>{...})` that builds `.swatch`, plus the `shadeFor` function). Immediately after the line `const slides = Array.from(document.querySelectorAll('.slide'));`, add:
```js
  injectSwatches(slides);
```

- [ ] **Step 3: Build + smoke**

Run: `npm run build && npm run smoke`
Expected: build succeeds; `SMOKE PASS`.

- [ ] **Step 4: Manual check** — swatch cards still render in each slide's top-right chrome (via `npm run preview`).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/swatches.js src/scripts/main.js
git commit -m "refactor: extract swatch card injection into swatches.js"
```

---

## Task 5: Extract `reveal.js`

**Files:**
- Create: `src/scripts/reveal.js`
- Modify: `src/scripts/main.js`
- Read from: `main.html:714-730`

- [ ] **Step 1: Create `src/scripts/reveal.js`**

Change signature from index-based to element-based (`revealSlide(slideEl, reduceMotion)`); body is the original 715–729 logic:

```js
import anime from 'animejs';

// Animates the .reveal children of a slide into view (or shows them instantly under reduced motion).
export function revealSlide(slideEl, reduceMotion) {
  const items = slideEl.querySelectorAll('.reveal');
  if (reduceMotion) {
    items.forEach((el) => (el.style.opacity = 1));
    return;
  }
  anime.set(items, { opacity: 0, translateY: 18 });
  anime({
    targets: items,
    opacity: [0, 1],
    translateY: [18, 0],
    easing: 'easeOutCubic',
    duration: 700,
    delay: anime.stagger(80, { start: 120 }),
  });
}
```

- [ ] **Step 2: Edit `src/scripts/main.js`**

Add import after the other module imports:
```js
import { revealSlide } from './reveal.js';
```
DELETE the original `function revealSlide(idx){ ... }` (main.html 714–730) from inside the IIFE. Update its 3 call sites inside the IIFE to pass the element + `reduceMotion`:
- `revealSlide(current)` (in the reduced-motion branch of `goTo`) → `revealSlide(slides[current], reduceMotion)`
- `setTimeout(()=> revealSlide(current), 260)` (in `goTo`) → `setTimeout(() => revealSlide(slides[current], reduceMotion), 260)`
- `revealSlide(0)` (init, near main.html 796) → `revealSlide(slides[0], reduceMotion)`

- [ ] **Step 3: Build + smoke**

Run: `npm run build && npm run smoke`
Expected: build succeeds; `SMOKE PASS`.

- [ ] **Step 4: Manual check** — reveal animations still play on slide entry; reduced-motion shows items immediately.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/reveal.js src/scripts/main.js
git commit -m "refactor: extract slide reveal animation into reveal.js"
```

---

## Task 6: Extract `deck.js`

**Files:**
- Create: `src/scripts/deck.js`
- Modify: `src/scripts/main.js`
- Read from: `main.html:664-796`

- [ ] **Step 1: Create `src/scripts/deck.js`**

Wrap the deck logic in `createDeck({ slides })`. Move VERBATIM from `main.html` into the function body: the element lookups (667–670: `rail`, `progressBar`, `prevBtn`, `nextBtn`; note `track`/`slides` come differently — see below), state (`current`, `animating`, `reduceMotion` 671–673), positioning loop (676–677), rail-dot building (701–707), `updateChrome` (709–712), `goTo` (732–753), `next`/`prev` (755–756), all event listeners (758–793), and the init calls (`updateChrome()` 795). Adapt exactly as follows:

```js
import anime from 'animejs';
import { revealSlide } from './reveal.js';

export function createDeck({ slides }) {
  const track = document.getElementById('track');
  const total = slides.length;
  const rail = document.getElementById('rail');
  const progressBar = document.getElementById('progress-bar');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  let current = 0;
  let animating = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const listeners = [];

  // build vertical positions
  slides.forEach((s, i) => { s.style.position = 'absolute'; s.style.top = (i * 100) + 'vh'; s.style.left = '0'; });
  track.style.height = (total * 100) + 'vh';

  // build progress rail dots
  slides.forEach((s, i) => {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goTo(i));
    rail.appendChild(dot);
  });
  const dots = Array.from(rail.children);

  function updateChrome() {
    progressBar.style.width = (((current + 1) / total) * 100) + '%';
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function goTo(idx) {
    if (animating || idx === current || idx < 0 || idx >= total) return;
    animating = true;
    current = idx;
    listeners.forEach((cb) => cb(current)); // notify subscribers (e.g., hero)
    const y = -(current * 100);
    if (reduceMotion) {
      track.style.transform = 'translateY(' + y + 'vh)';
      revealSlide(slides[current], reduceMotion);
      updateChrome();
      animating = false;
      return;
    }
    anime({ targets: track, translateY: y + 'vh', duration: 900, easing: 'easeInOutCubic', complete: () => { animating = false; } });
    updateChrome();
    setTimeout(() => revealSlide(slides[current], reduceMotion), 260);
  }

  function next() { if (current < total - 1) goTo(current + 1); }
  function prev() { if (current > 0) goTo(current - 1); }

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === 'Home') { goTo(0); }
    else if (e.key === 'End') { goTo(total - 1); }
  });

  let wheelLock = false;
  window.addEventListener('wheel', (e) => {
    if (wheelLock) return;
    if (Math.abs(e.deltaY) < 12) return;
    wheelLock = true;
    if (e.deltaY > 0) next(); else prev();
    setTimeout(() => (wheelLock = false), 700);
  }, { passive: true });

  let touchStartY = null;
  window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (touchStartY === null) return;
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 50) { dy > 0 ? next() : prev(); }
    touchStartY = null;
  }, { passive: true });

  document.getElementById('deck-wrap').addEventListener('click', (e) => {
    if (e.target.closest('.nav-btn') || e.target.closest('#rail') || e.target.closest('a') || e.target.closest('.dot')) return;
    const w = window.innerWidth;
    if (e.clientX > w * 0.85) next();
  });

  updateChrome();
  revealSlide(slides[0], reduceMotion);

  return {
    goTo, next, prev,
    onChange(cb) { listeners.push(cb); },
    get current() { return current; },
    reduceMotion,
  };
}
```

- [ ] **Step 2: Edit `src/scripts/main.js`**

Add import:
```js
import { createDeck } from './deck.js';
```
DELETE from the IIFE everything now living in `deck.js` (the `track`/`rail`/`progressBar`/`prevBtn`/`nextBtn` lookups, `current`/`animating`/`reduceMotion`, positioning loop, rail dots, `updateChrome`, `goTo`, `next`, `prev`, all the deck event listeners, and the `updateChrome()`/`revealSlide(...)` init calls). Replace with:
```js
  const deck = createDeck({ slides });
```
Keep `const slides = Array.from(document.querySelectorAll('.slide'));` and `injectSwatches(slides);` above it. The hero code below still references `reduceMotion` and `current` — for THIS task only, immediately after creating the deck add bridging locals so the not-yet-extracted hero keeps working:
```js
  const reduceMotion = deck.reduceMotion; // (removed in Task 7 when hero is extracted)
```
For the hero's `current` references (the `checkHeroActive`/`setInterval` poll near main.html 997–1003), leave them but change `current` → `deck.current`. (All of this hero glue is deleted in Task 7.)

- [ ] **Step 3: Build + smoke**

Run: `npm run build && npm run smoke`
Expected: build succeeds; `SMOKE PASS`.

- [ ] **Step 4: Manual check** — full navigation parity (keyboard, wheel, touch, edge-click, dots, progress bar) via `npm run preview`.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/deck.js src/scripts/main.js
git commit -m "refactor: extract deck navigation controller into deck.js"
```

---

## Task 7: Extract `hero.js` (and replace the polling with a callback)

**Files:**
- Create: `src/scripts/hero.js`
- Modify: `src/scripts/main.js`
- Read from: `main.html:798-1003`

- [ ] **Step 1: Create `src/scripts/hero.js`**

Wrap the hero in `initHero({ slides, reduceMotion })`. Move VERBATIM the tooltip overlay creation (main.html 805–817), `cardData` (820–826), `initHero` internals (828–920: renderer/scene/camera/group/raycaster, `swatchTexture`, `layout`, card build loop, lights, mousemove, resize wiring), `onResize` (922–937), `clock`/`animateHero` (940–990). Apply these adaptations:
1. `import * as THREE from 'three';` at the top (replaces the former global).
2. Rename the outer function to the exported `initHero({ slides, reduceMotion })`; the original inner `function initHero(){...}` becomes an inner `function start(){...}` (or keep the name but call it internally) — pick one and be consistent.
3. Guard: `if (reduceMotion) return null;` at the top (mirrors original `if(!reduceMotion) initHero()`).
4. Keep `let heroActive = true;` and the `if(!heroActive) return;` early-out inside the animation loop.
5. DELETE the polling glue (main.html 996–1003: `heroObserverTarget`, `checkHeroActive`, `origGoTo`, `setInterval(...)`).
6. Return `{ setActive(bool) { heroActive = bool; } }`.

Skeleton (fill the `/* … verbatim … */` regions from the cited lines):

```js
import * as THREE from 'three';

export function initHero({ slides, reduceMotion }) {
  if (reduceMotion) return null;

  const canvas = document.getElementById('hero-canvas');
  let renderer, scene, camera, group, raf;
  let mouseX = 0, mouseY = 0; const mousePx = { x: 0, y: 0 };
  let raycaster, pointer, hovered = null;
  let heroActive = true;

  /* tooltip overlay: main.html 805–817 verbatim (tip element + tipCode/tipName/tipDesc) */

  const cardData = [ /* main.html 820–826 verbatim */ ];

  function start() {
    /* main.html 829–919 verbatim: renderer/scene/camera/group/raycaster/geo/edges,
       swatchTexture(d), layout[], cardData.forEach(...), lights, mousemove listener,
       window.addEventListener('resize', onResize), onResize(), animateHero() */
  }

  function onResize() { /* main.html 923–937 verbatim */ }

  const clock = new THREE.Clock();
  function animateHero() { /* main.html 942–990 verbatim */ }

  start();
  return { setActive(bool) { heroActive = bool; } };
}
```

- [ ] **Step 2: Edit `src/scripts/main.js`** — it becomes a clean orchestrator.

Remove the leftover IIFE wrapper and hero glue. The ENTIRE file should now be:

```js
import { injectSwatches } from './swatches.js';
import { createDeck } from './deck.js';
import { initHero } from './hero.js';

const slides = Array.from(document.querySelectorAll('.slide'));
injectSwatches(slides);

const deck = createDeck({ slides });
const hero = initHero({ slides, reduceMotion: deck.reduceMotion });

deck.onChange((i) => { if (hero) hero.setActive(i === 0); });
```

Note: `import * as THREE`, `import anime`, and the `(function(){ ... })()` wrapper are all gone from `main.js` (THREE lives in hero.js, anime in deck.js/reveal.js). Confirm no other code remains in `main.js`.

- [ ] **Step 3: Build + smoke**

Run: `npm run build && npm run smoke`
Expected: build succeeds; `SMOKE PASS`.

- [ ] **Step 4: Manual check (hero-focused)** via `npm run preview`:
- Slide 00 cards float, hover tooltip works, parallax follows mouse.
- Navigate away from slide 00 and back: rendering pauses off-slide-0 and resumes on return (now driven by `deck.onChange`, not the removed poll).
- Narrow window (< 1.1 aspect): card cluster hides (mobile).
- Reduced-motion: hero does not initialize; no canvas activity.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/hero.js src/scripts/main.js
git commit -m "refactor: extract three.js hero into hero.js; replace poll with deck callback"
```

---

## Task 8: Finalize deploy config, docs, and remove the monolith

**Files:**
- Modify: `vercel.json`, `README.md`
- Delete: `main.html`

- [ ] **Step 1: Overwrite `vercel.json`** for the Vite build (output is `dist/`; `index.html` serves at `/`, so the old rewrite is dropped):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

- [ ] **Step 2: Update `README.md`** — replace the "Tech", "Usage", and "Files" sections.

Replace the Usage section body with:
```md
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
```

Replace the "Tech" bullets so they state: split `src/` (HTML shell + 15 sectioned slides, CSS modules under `styles/`, ES modules under `scripts/`); Three.js (`three@0.128.0`) and anime.js (`animejs@3.2.1`) are pinned npm deps bundled + inlined by `vite-plugin-singlefile`; the build output `dist/index.html` is a single self-contained file.

Replace the "Files" section with:
```md
## Files

- `src/index.html` — HTML shell + all 15 slides
- `src/styles/` — CSS modules (imported by `styles/index.css`)
- `src/scripts/` — `main.js` (entry), `deck.js`, `reveal.js`, `swatches.js`, `hero.js`
- `dist/index.html` — built single-file output (generated; git-ignored)
- `tools/smoke.mjs` — structural parity check
```

- [ ] **Step 3: Delete the monolith**

Run: `git rm main.html`
Expected: `main.html` removed from the repo (behavior now lives in `src/` and builds to `dist/index.html`).

- [ ] **Step 4: Final build + smoke + manual parity**

Run: `npm run build && npm run smoke`
Expected: `SMOKE PASS: dist/index.html`.
Then `npm run preview` and run the full checklist from Task 3 Step 5 one final time.

- [ ] **Step 5: Commit**

```bash
git add vercel.json README.md
git rm --quiet --cached main.html 2>/dev/null || true
git commit -m "chore: update deploy config + docs; remove monolithic main.html"
```

---

## Verification Summary (run before declaring done)

- [ ] `npm run build` produces `dist/index.html` with no errors.
- [ ] `npm run smoke` prints `SMOKE PASS` (single file, 15 slides, all IDs, libraries inlined).
- [ ] `npm run dev` serves with working HMR.
- [ ] Manual parity: 15 slides; keyboard/wheel/touch/edge-click nav; rail dots + progress bar; hero cards + hover tooltip + parallax; reveal animations; reduced-motion path; narrow-viewport hero hidden.
- [ ] `git status` clean; `.playwright-mcp/` untracked and ignored; `test.html` and `main.html` gone; `dist/` and `node_modules/` ignored.

---

## Self-Review (performed by plan author)

**Spec coverage:** Every spec section maps to a task — tooling/hygiene (T1), CSS split (T2), src shell + first build (T3), JS modules swatches/reveal/deck/hero incl. poll→callback (T4–T7), vercel + README + entry rename + main.html removal (T8). `.gitignore` rewrite + `.playwright-mcp` untrack + `test.html` delete (T1). npm-pinned libs (T1) imported as modules (T3–T7). Slides stay sectioned in `index.html` (T3). ✔ No gaps.

**Placeholder scan:** All new code (config, smoke harness, css aggregator, every module's glue/interface) is shown in full. The only "paste verbatim" markers are for existing, unchanged CSS/JS identified by exact `main.html` line ranges — deliberate, to avoid divergence from the source of truth, not placeholders. ✔

**Type/name consistency:** `injectSwatches(slides)`, `revealSlide(slideEl, reduceMotion)`, `createDeck({slides}) -> {goTo,next,prev,onChange,current,reduceMotion}`, `initHero({slides,reduceMotion}) -> {setActive} | null` are used identically in the interface table, each producing task, and `main.js` orchestration. `deck.onChange` ↔ `hero.setActive` wiring matches. ✔
