import { LEVELS, WORLDS, worldLevels } from './levels.js';

// One full-width page per world. Every route runs left to right, never snakes back.
export function journeyLayout(world) {
  const entries = worldLevels(world), count = entries.length;
  const width = Math.min(290, 1060 / count), start = count <= 3 ? 245 : 140;
  return entries.map(({ index }, i) => ({
    index, x: start + i * (1280 - start * 2) / Math.max(1, count - 1),
    y: 438 - Math.sin(i / Math.max(1, count - 1) * Math.PI) * 52,
    w: width, h: 235
  }));
}
const clamp = x => Math.max(0, Math.min(1, x));
export const easeSlide = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
export function swipeWorld(world, dx, dy, width, count = WORLDS.length) {
  if (Math.abs(dx) < Math.max(38, width * .075) || Math.abs(dx) <= Math.abs(dy) * 1.2) return world;
  return Math.max(0, Math.min(count - 1, world + (dx < 0 ? 1 : -1)));
}
export function journeyView(trip, reduced = false) {
  if (!trip.auto) return trip.view ?? LEVELS[trip.to].world;
  const from = LEVELS[trip.from].world, to = LEVELS[trip.to].world;
  // Let the ball leave to the right before following it into the next page.
  // Panning during flight would make a forward throw appear to move backwards.
  return from + (to - from) * (reduced ? 1 : easeSlide((trip.age - 1.47) / .6));
}
export function journeyAnchor(index) {
  const world = LEVELS[index].world, node = journeyLayout(world).find(n => n.index === index);
  return { x: world * 1280 + node.x - node.w * .25, y: node.y + 44 };
}
export function blendColor(a, b, fraction) {
  return '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - clamp(fraction)) + parseInt(b.slice(i, i + 2), 16) * clamp(fraction)).toString(16).padStart(2, '0')).join('');
}
export function tripFrame(age, reduced = false) {
  if (reduced) return { flight: 1, source: 0, arrival: 1, fade: clamp((age - .8) / .25), done: age >= 1.05, phase: 'arrived' };
  const flight = clamp((age - .65) / .82), arrival = clamp((age - 1.55) / .28);
  return { flight, source: 1 - clamp((age - 1.44) / .17), arrival, fade: clamp((age - 2.65) / .35), done: age >= 3, phase: age < .65 ? 'windup' : age < 1.47 ? 'throw' : 'arrived' };
}
export function tripBall(from, to, fraction) {
  return { x: from.x + (to.x - from.x) * fraction, y: from.y - 12 + (to.y - from.y) * fraction - Math.sin(fraction * Math.PI) * 78 };
}
