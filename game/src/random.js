// A small seeded random source (mulberry32), so a screenshot seed always
// replays the same gallery: same patrol timing, same pebble scatter.
export function createRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one of `choices` with the seeded source. */
export function pick(random, choices) {
  return choices[Math.floor(random() * choices.length)];
}
