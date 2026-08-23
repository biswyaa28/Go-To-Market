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
