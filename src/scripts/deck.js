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
