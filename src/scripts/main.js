import { injectSwatches } from './swatches.js';
import { createDeck } from './deck.js';
import { initHero } from './hero.js';

const slides = Array.from(document.querySelectorAll('.slide'));
injectSwatches(slides);

const deck = createDeck({ slides });
const hero = initHero({ reduceMotion: deck.reduceMotion });

deck.onChange((i) => { if (hero) hero.setActive(i === 0); });
