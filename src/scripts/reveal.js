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
