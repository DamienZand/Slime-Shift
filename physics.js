import { WIDTH, HEIGHT } from './levels.js';

export const GRAVITY = 1050;
export const MAX_SPEED = 820;
export const BALL_RADIUS = 10;
export const FIXED_STEP = 1 / 120;
export const PULL_GAIN = 5;
export const PLAYER_SPEED = 300;
export const JUMP_SPEED = 520;
export const PLAYER_GRAVITY = 1500;
const HERO_RADIUS = 22;
const HERO_FEET = 24;
const HERO_HEAD = 30;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// A slingshot is relative to the pointer's starting position, not the player.
// This also allows a comfortable pull anywhere on a small touch screen.
export function aimVector(anchor, target) {
  const dx = anchor.x - target.x, dy = anchor.y - target.y;
  const distance = Math.hypot(dx, dy);
  const speed = distance < 6 ? 0 : Math.min(distance * PULL_GAIN, MAX_SPEED);
  return { vx: dx / (distance || 1) * speed, vy: dy / (distance || 1) * speed, power: speed / MAX_SPEED };
}

export function platformAt(platform, time) {
  const shift = platform.moving ? Math.sin(time * platform.moving.speed) * platform.moving.range : 0;
  return { ...platform, x: platform.x + (platform.moving?.axis !== 'y' ? shift : 0), y: platform.y + (platform.moving?.axis === 'y' ? shift : 0) };
}

const cycle = (time, period, phase = 0) => ((time + phase) % period + period) % period;
export const wallActive = (wall, time, switches = {}) => !switches[wall.switch] && (!wall.timed || cycle(time, wall.timed.period) / wall.timed.period < wall.timed.closed);
export function trapStatus(platform, time) {
  if (!platform.trap) return { open: false, warning: 0 };
  const t = platform.trap, age = cycle(time, t.period, t.phase), closing = t.period * (1 - t.open);
  return { open: age >= closing, warning: clamp((age - closing + t.warning) / t.warning, 0, 1) };
}
export const platformActive = (platform, time, crumbles = {}) => !trapStatus(platform, time).open && (!platform.crumble || crumbles[platform.id] == null || time - crumbles[platform.id] < platform.crumble || time - crumbles[platform.id] >= platform.crumble + 3);
export function bombStatus(bomb, time) {
  const age = cycle(time, bomb.period, bomb.phase), exploding = age >= bomb.period - bomb.blast;
  return { exploding, age: exploding ? age - bomb.period + bomb.blast : 0, fuse: clamp((age - bomb.period + bomb.blast + bomb.fuse) / bomb.fuse, 0, 1) };
}
export function blastAt(level, x, y, radius, time) {
  return (level.bombs || []).some(b => bombStatus(b, time).exploding && Math.hypot(x - b.x, y - b.y) < b.radius + radius);
}
function activateSwitches(level, x, y, radius, switches) {
  const hits = [];
  for (const button of level.switches || []) if (!switches[button.id] && Math.hypot(x - button.x, y - button.y) < button.radius + radius) {
    switches[button.id] = true; hits.push(button);
  }
  return hits;
}
export const windAt = (level, x, y) => (level.wind || []).filter(w => x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h).reduce((force, w) => ({ x: force.x + w.force, y: force.y + (w.lift || 0) }), { x: 0, y: 0 });
function hitsHazard(level, x, y, rx, ry) { return (level.hazards || []).some(h => x + rx > h.x + 4 && x - rx < h.x + h.w - 4 && y + ry > h.y + 5 && y - ry < h.y + h.h); }

export function createState(level) {
  const support = level.platforms[0].id;
  return {
    level, hero: { ...level.spawn, vx: 0, vy: 0, grounded: true, crouching: false, facing: 1 },
    ball: null, time: 0, shots: 0, misses: 0, falls: 0, won: false, support, crumbles: {}, switches: {},
    events: [], lastLanding: null, jumpHeld: false, jumpBuffer: 0, coyote: .1, controlLock: 0,
    checkpoint: { support, offset: level.spawn.x - level.platforms[0].x }
  };
}

export function launch(state, velocity) {
  if (state.ball || state.won || state.controlLock > 0 || !Number.isFinite(velocity.vx) || !Number.isFinite(velocity.vy) || Math.hypot(velocity.vx, velocity.vy) < 30) return false;
  state.ball = { x: state.hero.x, y: state.hero.y - 8, vx: velocity.vx, vy: velocity.vy, age: 0, bounces: 0 };
  state.shots++;
  state.events.push({ type: 'throw', x: state.ball.x, y: state.ball.y });
  return true;
}

function crossed(a, b, boundary) { return a <= boundary && b >= boundary; }

export function advanceBall(ball, level, time, dt, crumbles = {}, switches = {}) {
  const old = { x: ball.x, y: ball.y };
  const wind = windAt(level, ball.x, ball.y);
  ball.vx += wind.x * dt; ball.vy += (GRAVITY + wind.y) * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.age += dt;
  const r = BALL_RADIUS;
  if (hitsHazard(level, ball.x, ball.y, r, r) || blastAt(level, ball.x, ball.y, r, time)) return { type: 'miss', x: ball.x, y: ball.y };
  activateSwitches(level, ball.x, ball.y, r, switches);
  ball.portalCooldown = Math.max(0, (ball.portalCooldown || 0) - dt);
  if (ball.portalCooldown === 0) {
    for (const portal of level.portals || []) {
      if (Math.hypot(ball.x - portal.x, ball.y - portal.y) < 32) {
        const exit = level.portals[portal.to];
        ball.x = exit.x; ball.y = exit.y; ball.portalCooldown = .45;
        return { type: 'portal', x: exit.x, y: exit.y, from: { x: portal.x, y: portal.y } };
      }
    }
  }
  for (const base of level.platforms) {
    if (!platformActive(base, time, crumbles)) continue;
    const p = platformAt(base, time);
    if (ball.x + r < p.x || ball.x - r > p.x + p.w) continue;
    if (ball.vy > 0 && crossed(old.y + r, ball.y + r, p.y)) {
      ball.y = p.y - r;
      if (p.spring) {
        ball.vy = -970; ball.vx *= .91; ball.bounces++;
        return { type: 'bounce', x: ball.x, y: ball.y, support: p.id };
      }
      return { type: 'land', x: clamp(ball.x, p.x + 18, p.x + p.w - 18), y: p.y - 24, support: p.id };
    }
    if (ball.vy < 0 && old.y - r >= p.y + p.h && ball.y - r < p.y + p.h) {
      ball.y = p.y + p.h + r; ball.vy *= -.62;
      return { type: 'ricochet', x: ball.x, y: ball.y };
    }
  }
  for (const wall of level.walls) {
    if (!wallActive(wall, time, switches)) continue;
    if (ball.x + r < wall.x || ball.x - r > wall.x + wall.w || ball.y + r < wall.y || ball.y - r > wall.y + wall.h) continue;
    if (old.x + r <= wall.x) { ball.x = wall.x - r; ball.vx = -Math.abs(ball.vx) * .7; }
    else if (old.x - r >= wall.x + wall.w) { ball.x = wall.x + wall.w + r; ball.vx = Math.abs(ball.vx) * .7; }
    else if (old.y + r <= wall.y) { ball.y = wall.y - r; ball.vy = -Math.abs(ball.vy) * .65; }
    else { ball.y = wall.y + wall.h + r; ball.vy = Math.abs(ball.vy) * .65; }
    return { type: 'ricochet', x: ball.x, y: ball.y };
  }
  if (ball.y > HEIGHT + 90 || ball.x < -100 || ball.x > WIDTH + 100 || ball.age > 8) return { type: 'miss', x: ball.x, y: ball.y };
  return null;
}

function solidsAt(state, time) {
  return [
    ...state.level.platforms.filter(p => platformActive(p, time, state.crumbles)).map(p => platformAt(p, time)),
    ...state.level.walls.filter(w => wallActive(w, time, state.switches)).map(w => ({ ...w, id: `wall-${state.level.walls.indexOf(w)}` }))
  ];
}

function checkpoint(state, solid) {
  if (solid.crumble || solid.trap || solid.timed || hitsHazard(state.level, state.hero.x, solid.y - 20, HERO_RADIUS, 24)) return;
  state.checkpoint = { support: solid.id, offset: clamp(state.hero.x - solid.x, HERO_RADIUS, solid.w - HERO_RADIUS) };
}

function respawn(state, cause = 'fall') {
  const atStart = cause === 'spikes' || cause === 'blast';
  if (atStart) {
    state.checkpoint = { support: state.level.platforms[0].id, offset: state.level.spawn.x - state.level.platforms[0].x };
    state.crumbles = {};
    state.lastLanding = null;
  }
  const safe = state.level.platforms.find(p => p.id === state.checkpoint.support) || state.level.platforms[0];
  const solid = platformAt(safe, state.time), h = state.hero;
  Object.assign(h, { x: atStart ? state.level.spawn.x : solid.x + clamp(state.checkpoint.offset, HERO_RADIUS, solid.w - HERO_RADIUS), y: atStart ? state.level.spawn.y : solid.y - HERO_FEET, vx: 0, vy: 0, grounded: true, crouching: false });
  state.support = safe.id; state.ball = null; state.falls++; state.controlLock = .32; state.jumpBuffer = 0; state.coyote = 0;
  state.events.push({ type: 'respawn', cause, x: h.x, y: h.y });
}

function moveHero(state, dt, input, before) {
  const h = state.hero;
  h.vx ??= 0; h.vy ??= 0; h.grounded ??= true; h.facing ??= 1;
  const solids = solidsAt(state, state.time);
  const support = solids.find(p => p.id === state.support);
  if (h.grounded && support) {
    const oldSupport = solidsAt(state, before).find(p => p.id === state.support);
    if (oldSupport) { h.x += support.x - oldSupport.x + (support.conveyor || 0) * dt; h.y += support.y - oldSupport.y; }
  }
  if (h.grounded && (!support || h.x + HERO_RADIUS <= support.x || h.x - HERO_RADIUS >= support.x + support.w || Math.abs(h.y + HERO_FEET - support.y) > 1)) {
    h.grounded = false; state.support = null;
  }
  state.controlLock = Math.max(0, state.controlLock - dt);
  state.coyote = h.grounded ? .1 : Math.max(0, state.coyote - dt);
  state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
  if (input.jump && !state.jumpHeld && state.controlLock === 0) state.jumpBuffer = .12;
  state.jumpHeld = !!input.jump;
  h.crouching = !!input.crouch && h.grounded;
  const move = state.controlLock > 0 ? 0 : clamp(input.move || 0, -1, 1);
  const target = move * PLAYER_SPEED * (h.crouching ? .45 : 1);
  const acceleration = (support?.ice ? (move ? 800 : 150) : move ? (h.grounded ? 2000 : 1100) : h.grounded ? 2600 : 650) * dt;
  h.vx += clamp(target - h.vx, -acceleration, acceleration);
  if (!h.grounded) { const wind = windAt(state.level, h.x, h.y); h.vx += wind.x * dt * .35; h.vy += wind.y * dt * .4; }
  if (move) h.facing = Math.sign(move);
  if (state.jumpBuffer > 0 && state.coyote > 0 && state.controlLock === 0) {
    h.vy = -JUMP_SPEED; h.grounded = false; h.crouching = false; state.support = null;
    state.jumpBuffer = 0; state.coyote = 0;
    state.events.push({ type: 'jump', x: h.x, y: h.y + HERO_FEET });
  }
  const oldX = h.x, oldY = h.y, wasGrounded = h.grounded;
  h.x = clamp(h.x + h.vx * dt, HERO_RADIUS, WIDTH - HERO_RADIUS);
  for (const solid of solids) {
    if (oldY + HERO_FEET <= solid.y + .1 || oldY - HERO_HEAD >= solid.y + solid.h - .1) continue;
    if (h.x + HERO_RADIUS <= solid.x || h.x - HERO_RADIUS >= solid.x + solid.w) continue;
    if (oldX + HERO_RADIUS <= solid.x + .1) { h.x = solid.x - HERO_RADIUS; h.vx = 0; }
    else if (oldX - HERO_RADIUS >= solid.x + solid.w - .1) { h.x = solid.x + solid.w + HERO_RADIUS; h.vx = 0; }
  }
  if (!h.grounded) h.vy = Math.min(h.vy + PLAYER_GRAVITY * dt, 1050);
  h.y += h.vy * dt;
  const impact = h.vy;
  let landing = null;
  for (const solid of solids) {
    if (h.x + HERO_RADIUS <= solid.x || h.x - HERO_RADIUS >= solid.x + solid.w) continue;
    if (h.vy >= 0 && oldY + HERO_FEET <= solid.y + .1 && h.y + HERO_FEET >= solid.y && (!landing || solid.y < landing.y)) landing = solid;
    if (h.vy < 0 && oldY - HERO_HEAD >= solid.y + solid.h - .1 && h.y - HERO_HEAD <= solid.y + solid.h) { h.y = solid.y + solid.h + HERO_HEAD; h.vy = 0; }
  }
  if (landing) {
    h.y = landing.y - HERO_FEET; h.vy = 0; h.grounded = true; state.support = landing.id;
    if (!wasGrounded) { checkpoint(state, landing); state.events.push({ type: 'landing', x: h.x, y: landing.y, impact }); }
  } else if (h.grounded && support && (h.x + HERO_RADIUS <= support.x || h.x - HERO_RADIUS >= support.x + support.w)) { h.grounded = false; state.support = null; }
  if (h.y > HEIGHT + 140) respawn(state);
  else if (state.controlLock === 0 && hitsHazard(state.level, h.x, h.y, 16, 22)) respawn(state, 'spikes');
  if (h.grounded && support?.crumble && (state.crumbles[support.id] == null || state.time - state.crumbles[support.id] >= support.crumble + 3)) state.crumbles[support.id] = state.time;
}

export function tick(state, dt = FIXED_STEP, input = {}) {
  if (state.won) return;
  const before = state.time;
  state.time += dt;
  for (const b of state.level.bombs || []) if (!bombStatus(b, before).exploding && bombStatus(b, state.time).exploding) state.events.push({ type: 'explosion', x: b.x, y: b.y, radius: b.radius });
  moveHero(state, dt, input, before);
  const priorSwitches = { ...state.switches };
  activateSwitches(state.level, state.hero.x, state.hero.y, HERO_RADIUS, state.switches);
  if (state.ball) {
    const result = advanceBall(state.ball, state.level, state.time, dt, state.crumbles, state.switches);
    if (result) {
      if (result.type === 'land') {
        const from = { ...state.hero };
        Object.assign(state.hero, { x: result.x, y: result.y, vx: 0, vy: 0, grounded: true, crouching: false }); state.support = result.support;
        state.controlLock = .17; state.coyote = 0; state.jumpBuffer = 0;
        checkpoint(state, platformAt(state.level.platforms.find(p => p.id === result.support), state.time));
        const landed = state.level.platforms.find(p => p.id === result.support);
        if (landed.crumble && (state.crumbles[landed.id] == null || state.time - state.crumbles[landed.id] >= landed.crumble + 3)) state.crumbles[landed.id] = state.time;
        state.lastLanding = { ...result }; state.ball = null;
        state.events.push({ ...result, type: 'teleport', from });
      } else if (result.type === 'miss') {
        state.ball = null; state.misses++; state.events.push(result);
      } else state.events.push(result);
    }
  }
  for (const button of state.level.switches || []) if (state.switches[button.id] && !priorSwitches[button.id]) state.events.push({ type: 'switch', x: button.x, y: button.y });
  // A ball can land beside thorns and place the wider slime on them. Resolve
  // that immediately, even during the short teleport input lock.
  if (hitsHazard(state.level, state.hero.x, state.hero.y, 16, 22)) respawn(state, 'spikes');
  else if (blastAt(state.level, state.hero.x, state.hero.y, 16, state.time)) respawn(state, 'blast');
  const goal = state.level.goal;
  if (state.hero.grounded && Math.abs(state.hero.x - goal.x) < 43 && Math.abs(state.hero.y - (goal.y - 24)) < 40) {
    state.hero.vx = 0; state.hero.vy = 0; state.ball = null;
    state.won = true; state.events.push({ type: 'win', x: goal.x, y: goal.y - 30 });
  }
}

export function trajectory(state, velocity, seconds = .9) {
  const b = { x: state.hero.x, y: state.hero.y - 8, ...velocity, age: 0, bounces: 0 };
  const points = [], switches = { ...state.switches };
  for (let i = 0; i < seconds / FIXED_STEP; i++) {
    const hit = advanceBall(b, state.level, state.time + i * FIXED_STEP, FIXED_STEP, state.crumbles, switches);
    if (i % 6 === 0) points.push({ x: b.x, y: b.y });
    if (hit?.type === 'land' || hit?.type === 'miss') break;
  }
  return points;
}
