import { WIDTH, HEIGHT, LEVELS, WORLDS } from './levels.js';
import { platformAt, trajectory, wallActive, platformActive, bombStatus, trapStatus } from './physics.js';
import { journeyLayout, tripFrame, tripBall, journeyView, journeyAnchor, blendColor } from './journey.js';

const palette = {
  meadow: { sky: '#eaf2e3', mist: '#f5f7e9', mountain: '#c5d9c4', grass: '#90bb8b', stone: '#719782', edge: '#b9d6a0' },
  orchid: { sky: '#eeeaf3', mist: '#f5f1ee', mountain: '#d7cfdf', grass: '#b3a3c7', stone: '#8c82a4', edge: '#d6c6e2' },
  bluebell: { sky: '#e4eef0', mist: '#f0f5eb', mountain: '#bdd3d8', grass: '#8ab5b1', stone: '#759a9d', edge: '#b4d7cb' },
  bramble: { sky: '#f0e9e4', mist: '#f6eee5', mountain: '#c5c0b0', grass: '#a5b387', stone: '#818d7a', edge: '#d5d9ae' },
  cloud: { sky: '#e2eff5', mist: '#f3f9fa', mountain: '#bdd6e3', grass: '#8fbcb7', stone: '#7d9fad', edge: '#c7e3d7' },
  ice: { sky: '#e3edf5', mist: '#f1f6fa', mountain: '#b8ccdf', grass: '#9fc6d3', stone: '#829eaf', edge: '#d6f0f4' },
  clock: { sky: '#eeece0', mist: '#f5f4e9', mountain: '#d1ccb3', grass: '#b8ba91', stone: '#99977c', edge: '#e0ddb4' },
  moon: { sky: '#e6e0f0', mist: '#f0ebf6', mountain: '#bcb0d5', grass: '#aaa0c8', stone: '#897baf', edge: '#d5c9e9' },
  orchard: { sky: '#f0e9d8', mist: '#faf2e1', mountain: '#d3c5a6', grass: '#b4b08b', stone: '#a0987d', edge: '#e1d9ab' },
  quarry: { sky: '#f3e5e8', mist: '#fcf2ed', mountain: '#d9bfc7', grass: '#bba0a0', stone: '#a08091', edge: '#e7c8c4' },
  ravine: { sky: '#deefeb', mist: '#f0f8ee', mountain: '#b8d1ca', grass: '#89b4a4', stone: '#6e9993', edge: '#bae1c7' },
  garden: { sky: '#e8eedb', mist: '#f7fae8', mountain: '#c5d3af', grass: '#a4b989', stone: '#849f77', edge: '#d7e2b2' },
  summit: { sky: '#e6e4f3', mist: '#f2eefb', mountain: '#c4beda', grass: '#aaa3ca', stone: '#8b83ac', edge: '#d9d1ec' }
};
const TAU = Math.PI * 2;
const random = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function path(ctx, points, fill) { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
function ellipse(ctx, x, y, rx, ry, color) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); ctx.fillStyle = color; ctx.fill(); }
function rounded(ctx, x, y, w, h, r, color) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); }

// Decoration belongs to the island, not its changing world position.
export function platformVegetation(p) {
  const seed = [...(p.id || 'welcome')].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  return {
    vines: Array.from({ length: Math.floor(p.w / 85) }, (_, i) => ({ x: 37 + i * 84, height: 15 + random(i + seed) * 15 })),
    grass: Array.from({ length: 4 }, (_, i) => ({ x: 20 + random(i + seed) * (p.w - 40) }))
  };
}

export function drawAim(ctx, state, velocity) {
  const points = trajectory(state, velocity, .95);
  points.forEach((p, i) => ellipse(ctx, p.x, p.y, 3.2 - i / points.length * 1.4, 3.2 - i / points.length * 1.4, `rgba(68,126,88,${.6 - i / points.length * .35})`));
}

export function slime(ctx, x, y, time, opts = {}) {
  const scale = opts.scale || 1, squash = opts.squash || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  if (!opts.air) ellipse(ctx, 2, 25, 30, 7, '#27473318');
  ctx.translate(0, 24); ctx.rotate(opts.lean || 0); ctx.scale(1 + squash * .22, 1 - squash * .22); ctx.translate(0, -24);
  const body = ctx.createLinearGradient(-20, -35, 24, 30);
  body.addColorStop(0, '#b8f692'); body.addColorStop(.43, '#78d78a'); body.addColorStop(1, '#46ab7c');
  const wobble = opts.run ? Math.sin(opts.run) * 2 : 0;
  ctx.beginPath(); ctx.moveTo(-28, 18); ctx.bezierCurveTo(-35 - wobble, 2, -23 + wobble, -20, -14, -27); ctx.bezierCurveTo(-6, -35 + wobble, 9, -35 - wobble, 18, -24); ctx.bezierCurveTo(28 + wobble, -14, 36 - wobble, 11, 29, 20); ctx.bezierCurveTo(18, 30, -17, 30, -28, 18);
  ctx.fillStyle = body; ctx.shadowColor = '#60a76532'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#3b9a7135'; ctx.lineWidth = 1.3; ctx.stroke();
  ellipse(ctx, -12, -15, 8, 12, '#eaffbb77'); ellipse(ctx, -19, -2, 3, 4, '#f8ffd288');
  const blink = Math.sin(time * .65) > .995;
  const eyeX = Math.max(-3, Math.min(3, opts.lookX || 0));
  [-9, 11].forEach(ex => { ellipse(ctx, ex + eyeX, 0, 3.5, blink ? .8 : 4.8, '#254c3e'); if (!blink) ellipse(ctx, ex + eyeX + 1, -1.8, 1, 1.3, '#f7ffe9'); });
  ellipse(ctx, -17, 7, 4.5, 2.3, '#e7b5a34f'); ellipse(ctx, 18, 7, 4.5, 2.3, '#e7b5a34f');
  if (opts.air) ellipse(ctx, 2, 8, 2.7, 3.5, '#356d49');
  else { ctx.beginPath(); ctx.arc(2, 6, 4, .15, Math.PI - .15); ctx.strokeStyle = '#356d49'; ctx.lineWidth = 1.3; ctx.stroke(); }
  ellipse(ctx, 7, 20, 8, 3.5, '#beefa649');
  ctx.restore();
}

function background(ctx, time, theme, world = 0) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT); sky.addColorStop(0, theme.sky); sky.addColorStop(1, theme.mist); ctx.fillStyle = sky; ctx.fillRect(-1600, -1000, 4480, 2720);
  const sun = ctx.createRadialGradient(985, 180, 5, 985, 180, 220); sun.addColorStop(0, '#fffdf4ad'); sun.addColorStop(1, '#fffdf400'); ctx.fillStyle = sun; ctx.fillRect(740, -70, 500, 500);
  ellipse(ctx, 985, 180, 65, 65, '#fffef660');
  for (let layer = 0; layer < 3; layer++) {
    const y = 370 + layer * 80, color = layer ? theme.mountain + (layer === 1 ? '65' : '37') : theme.mountain + '45';
    ctx.beginPath(); ctx.moveTo(-150, HEIGHT + 500); ctx.lineTo(-150, y);
    for (let i = 0; i < 14; i++) ctx.bezierCurveTo(i * 130 - 100, y - random(i + layer * 20) * 110, i * 130 - 50, y + random(i * 3 + 7) * 80, i * 130 + 50, y);
    ctx.lineTo(1500, HEIGHT + 500); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  for (let i = 0; i < 22; i++) {
    const x = (random(i + 90) * 1480 + time * (2 + random(i) * 3)) % 1480 - 100;
    const y = 110 + random(i + 11) * 510 + Math.sin(time * .6 + i) * 15;
    ellipse(ctx, x, y, 1 + random(i + 4) * 2, 1 + random(i + 4) * 2, '#ffffff85');
  }
  for (let i = 0; i < 5; i++) { const x = random(i + 66) * 1400 - 60, y = 690 + Math.sin(time * .2 + i) * 12; ellipse(ctx, x, y, 210, 28, '#ffffff4b'); }
  for (let i = 0; i < 9; i++) {
    const x = i * 160 - 40, y = 430 + random(i + 31) * 190;
    if (world === 1 || world === 6) {
      rounded(ctx, x + 20, y - 90, 12, 180, 6, theme.mountain + '40');
      ellipse(ctx, x + 25, y - 70, 70, 53, theme.mountain + '42'); ellipse(ctx, x + 60, y - 100, 40, 40, world === 6 ? '#d8c18538' : '#bc93ab27');
    }
    if (world === 3) path(ctx, [[x, y + 30], [x + 25, y - 100], [x + 48, y - 25], [x + 58, y + 30]], '#c8e2ec66');
    if (world === 4) {
      ctx.save(); ctx.translate(x + 40, y); ctx.rotate(time * .06 * (i % 2 ? 1 : -1)); ctx.strokeStyle = '#9f987323'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.stroke();
      for (let j = 0; j < 8; j++) { ctx.rotate(TAU / 8); rounded(ctx, 40, -6, 18, 12, 3, '#a9a17725'); } ctx.restore();
    }
    if (world === 5) { ctx.strokeStyle = '#ac91c83a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 230); ctx.lineTo(x + 7, y - 223); ctx.lineTo(x, y - 216); ctx.lineTo(x - 7, y - 223); ctx.closePath(); ctx.stroke(); }
    if (world === 2) ellipse(ctx, x + Math.sin(time * .1 + i) * 25, y - 230, 90, 16, '#ffffff65');
  }
}

function platform(ctx, p, theme, time, hit = 0) {
  ctx.save();
  const depth = p.w > 300 ? 130 : 100;
  ctx.shadowColor = '#456c4220'; ctx.shadowBlur = 35; ctx.shadowOffsetY = 26;
  path(ctx, [[p.x + 5, p.y + 16], [p.x + p.w - 4, p.y + 16], [p.x + p.w - 19, p.y + 54], [p.x + p.w * .74, p.y + depth * .68], [p.x + p.w * .53, p.y + depth], [p.x + p.w * .23, p.y + depth * .62], [p.x + 17, p.y + 48]], theme.stone);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  path(ctx, [[p.x + p.w * .53, p.y + depth], [p.x + p.w * .47, p.y + 27], [p.x + p.w - 4, p.y + 16], [p.x + p.w - 19, p.y + 54], [p.x + p.w * .74, p.y + depth * .68]], '#ffffff11');
  path(ctx, [[p.x + 17, p.y + 48], [p.x + p.w * .23, p.y + depth * .62], [p.x + p.w * .53, p.y + depth], [p.x + p.w * .29, p.y + 22]], '#263d4315');
  rounded(ctx, p.x, p.y, p.w, 26, 10, theme.grass);
  rounded(ctx, p.x + 3, p.y, p.w - 6, 8, 6, theme.edge);
  if (p.ice) { rounded(ctx, p.x + 2, p.y, p.w - 4, 9, 6, '#efffffab'); for (let i = 0; i < p.w / 60; i++) path(ctx, [[p.x + i * 60 + 10, p.y + 25], [p.x + i * 60 + 19, p.y + 46], [p.x + i * 60 + 24, p.y + 25]], '#b9e4f5a0'); }
  if (p.conveyor) {
    for (let i = 0; i < p.w / 40 - 1; i++) {
      const x = p.x + 15 + ((i * 40 + time * Math.abs(p.conveyor)) % Math.max(40, p.w - 30));
      ctx.fillStyle = '#faffef70'; ctx.font = '14px sans-serif'; ctx.fillText(p.conveyor > 0 ? '›' : '‹', x, p.y + 19);
    }
  }
  if (p.crumble) { ctx.beginPath(); ctx.moveTo(p.x + p.w * .4, p.y + 3); ctx.lineTo(p.x + p.w * .46, p.y + 10); ctx.lineTo(p.x + p.w * .42, p.y + 20); ctx.lineTo(p.x + p.w * .52, p.y + 26); ctx.strokeStyle = '#655e6180'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.strokeStyle = '#f0f8d958'; ctx.lineWidth = 1.2;
  for (let i = 0; i < p.w / 35; i++) { const x = p.x + 12 + i * 33; ctx.beginPath(); ctx.moveTo(x, p.y + 15); ctx.lineTo(x + 9, p.y + 15); ctx.stroke(); }
  const vegetation = platformVegetation(p);
  for (const [i, vine] of vegetation.vines.entries()) {
    const x = p.x + vine.x, h = vine.height;
    ctx.beginPath(); ctx.moveTo(x, p.y + 45); ctx.quadraticCurveTo(x - 5 + Math.sin(time + i) * 3, p.y + 70, x - 3, p.y + 58 + h); ctx.strokeStyle = '#527c6670'; ctx.lineWidth = 2; ctx.stroke();
    ellipse(ctx, x - 7, p.y + 62, 5, 2.5, theme.grass); ellipse(ctx, x + 1, p.y + 71, 5, 2.5, theme.grass);
  }
  for (const blade of vegetation.grass) {
    const x = p.x + blade.x;
    ctx.strokeStyle = theme.grass; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, p.y); ctx.quadraticCurveTo(x - 3, p.y - 12, x - 9, p.y - 14); ctx.moveTo(x, p.y); ctx.quadraticCurveTo(x + 2, p.y - 13, x + 7, p.y - 9); ctx.stroke();
  }
  if (p.spring) {
    const pulse = hit ? Math.sin((.45 - hit) * 20) * hit * 22 : Math.sin(time * 4) * 2;
    rounded(ctx, p.x + 10, p.y - 8 + pulse, p.w - 20, 12, 6, '#b777c8'); rounded(ctx, p.x + 16, p.y - 8 + pulse, p.w - 32, 4, 3, '#e1b2eb');
    for (let i = 0; i < 3; i++) { const x = p.x + p.w / 2 - 42 + i * 42; ctx.beginPath(); ctx.moveTo(x - 5, p.y + 1); ctx.lineTo(x, p.y - 3); ctx.lineTo(x + 5, p.y + 1); ctx.strokeStyle = '#f5e4fa'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#9b69ac'; ctx.fillText('BOUNCE', p.x + p.w / 2, p.y - 28);
  }
  if (p.moving) {
    ellipse(ctx, p.x + p.w / 2, p.y + 55, 21, 10, '#d8f1e993'); ctx.fillStyle = '#dffaf1'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('↔', p.x + p.w / 2, p.y + 61);
  }
  ctx.restore();
}

function gate(ctx, goal, time, label = true) {
  const x = goal.x, y = goal.y;
  const glow = ctx.createRadialGradient(x, y - 43, 6, x, y - 43, 105); glow.addColorStop(0, '#dab4e652'); glow.addColorStop(1, '#e7b5ee00'); ctx.fillStyle = glow; ctx.fillRect(x - 110, y - 155, 220, 220);
  ellipse(ctx, x, y + 2, 51, 8, '#405b4521');
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(-35, 0); ctx.lineTo(-35, -49); ctx.bezierCurveTo(-35, -95, 35, -95, 35, -49); ctx.lineTo(35, 0); ctx.closePath(); ctx.fillStyle = '#c9bad7'; ctx.fill(); ctx.strokeStyle = '#f8eefb'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(-25, -48); ctx.bezierCurveTo(-25, -80, 25, -80, 25, -48); ctx.lineTo(25, 0); ctx.closePath(); const inner = ctx.createLinearGradient(0, -80, 0, 0); inner.addColorStop(0, '#a684c7'); inner.addColorStop(.6, '#ccafe6'); inner.addColorStop(1, '#f2dbf3'); ctx.fillStyle = inner; ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 6; i++) { const py = -((time * 24 + i * 18) % 100); ellipse(ctx, Math.sin(i * 14 + time) * 18, py, 2, 2, '#fff7'); }
  ctx.restore();
  rounded(ctx, -42, -1, 84, 7, 4, '#dbcbe5'); rounded(ctx, -46, 6, 92, 5, 3, '#c1b5d0');
  ctx.strokeStyle = '#f8edff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-7, -90); ctx.lineTo(0, -99); ctx.lineTo(7, -90); ctx.lineTo(0, -81); ctx.closePath(); ctx.stroke();
  if (label) { ctx.font = 'bold 10px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#987aac'; ctx.fillText('HOME', 0, -118 + Math.sin(time * 2) * 3); }
  ctx.restore();
}

export function drawJourney(ctx, trip, progress, time, reduced = false) {
  const view = journeyView(trip, reduced), motion = tripFrame(trip.age, reduced);
  const first = Math.max(0, Math.floor(view)), last = Math.min(WORLDS.length - 1, Math.ceil(view));
  const a = palette[WORLDS[first].theme], b = palette[WORLDS[last].theme];
  const theme = Object.fromEntries(Object.keys(a).map(key => [key, blendColor(a[key], b[key], view - first)]));
  ctx.save();
  background(ctx, reduced ? 0 : time, theme, Math.round(view));
  for (let world = first; world <= last; world++) {
    const nodes = journeyLayout(world), theme = palette[WORLDS[world].theme];
    ctx.save();
    ctx.translate((world - view) * WIDTH, 0);
    ctx.strokeStyle = theme.stone + '45'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([3, 11]);
    ctx.beginPath(); nodes.forEach((n, i) => i ? ctx.lineTo(n.x, n.y + 62) : ctx.moveTo(n.x, n.y + 62)); ctx.stroke(); ctx.setLineDash([]);
    for (const n of nodes) {
      const level = LEVELS[n.index], complete = progress.times[n.index] != null, active = n.index === trip.to;
      ellipse(ctx, n.x, n.y + 143, n.w * .4, 11, theme.stone + '13');
      if (active) {
        const glow = ctx.createRadialGradient(n.x, n.y, 10, n.x, n.y, n.w);
        glow.addColorStop(0, '#fffefac0'); glow.addColorStop(1, '#fffefa00'); ctx.fillStyle = glow; ctx.fillRect(n.x - n.w, n.y - n.w, n.w * 2, n.w * 2);
      }
      // A large floating island carries the actual level's ledges and obstacles.
      platform(ctx, { id: `map-${n.index}`, x: n.x - n.w / 2, y: n.y + 72, w: n.w, h: 28 }, theme, time);
      ctx.save(); ctx.translate(n.x - n.w / 2 + 10, n.y - 102); ctx.scale((n.w - 20) / WIDTH, (n.w - 20) / WIDTH);
      for (const p of level.platforms) {
        path(ctx, [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w - 18, p.y + 65], [p.x + p.w / 2, p.y + 110], [p.x + 15, p.y + 50]], theme.stone);
        rounded(ctx, p.x, p.y - 5, p.w, 18, 8, p.trap ? '#c5ad82' : p.ice ? '#b8e0ea' : theme.edge);
      }
      for (const w of level.walls) rounded(ctx, w.x, w.y, w.w, w.h, 6, '#a196b2');
      for (const h of level.hazards || []) path(ctx, [[h.x, h.y + h.h], [h.x + h.w / 2, h.y - 20], [h.x + h.w, h.y + h.h]], '#c689a1');
      for (const bomb of level.bombs || []) ellipse(ctx, bomb.x, bomb.y, 25, 25, '#9e6b81');
      gate(ctx, level.goal, time, false); ctx.restore();
      // A doorway at map scale keeps the destination readable on a phone, too.
      ctx.save(); ctx.translate(n.x + n.w * .25, n.y + 72); ctx.scale(.5, .5); gate(ctx, { x: 0, y: 0 }, time, false); ctx.restore();
      ellipse(ctx, n.x, n.y - 145, 24, 24, complete ? '#579574' : active ? '#8c6dab' : '#ffffffdb');
      ctx.font = 'bold 22px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = complete || active ? '#fffef7' : '#567960'; ctx.fillText(n.index + 1, n.x, n.y - 137);
      if (complete) { ctx.beginPath(); ctx.moveTo(n.x + 28, n.y - 146); ctx.lineTo(n.x + 33, n.y - 140); ctx.lineTo(n.x + 43, n.y - 153); ctx.strokeStyle = '#63957a'; ctx.lineWidth = 3; ctx.stroke(); }
    }
    ctx.restore();
  }
  const from = journeyAnchor(trip.from), to = journeyAnchor(trip.to);
  const hero = (position, alpha, squash = 0) => {
    ctx.save(); ctx.globalAlpha = alpha; slime(ctx, position.x - view * WIDTH, position.y, time, { scale: 1.15, squash, lookX: 2 }); ctx.restore();
  };
  if (!trip.auto) hero(to, 1, reduced ? 0 : Math.sin(time * 3) * .07);
  else {
    hero(from, motion.source, motion.phase === 'windup' ? Math.sin(trip.age / .65 * Math.PI) * .7 : -.2);
    if (motion.flight > 0 && motion.flight < 1 && !reduced) {
      ctx.save(); ctx.translate(-view * WIDTH, 0);
      for (let i = 0; i < 7; i++) { const t = motion.flight - i * .018; if (t > 0) { const b = tripBall(from, to, t); ellipse(ctx, b.x, b.y, 9 - i, 9 - i, `rgba(101,186,133,${.6 - i * .07})`); } }
      const b = tripBall(from, to, motion.flight); ellipse(ctx, b.x, b.y, 13, 12, '#5fb580'); ellipse(ctx, b.x - 3, b.y - 4, 4, 3, '#d2f5b8'); ctx.restore();
    }
    if (motion.arrival > 0) { hero(to, motion.arrival, (1 - motion.arrival) * .8); if (!reduced) { ctx.strokeStyle = `rgba(112,171,133,${1 - motion.arrival})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(to.x - view * WIDTH, to.y + 27, 20 + motion.arrival * 55, 8 + motion.arrival * 20, 0, 0, TAU); ctx.stroke(); } }
  }
  ctx.restore();
}

// Store art uses exactly the game's Canvas artwork, not an unrelated render.
export function drawCover(ctx, width, height, { title = true, time = 0 } = {}) {
  const scale = width / 1000, h = height / scale, tall = h > 800;
  const theme = palette.meadow;
  ctx.save(); ctx.setTransform(width / WIDTH, 0, 0, height / HEIGHT, 0, 0);
  background(ctx, time, theme, 0); ctx.restore();
  ctx.save(); ctx.scale(scale, scale);
  const floor = h * .84, heroX = tall ? 435 : 700, heroScale = !title ? 12.6 : h > 1200 ? 11 : tall ? 6.5 : 4.5;
  platform(ctx, { id: 'cover-island', x: tall ? 180 : 505, y: floor, w: tall ? 750 : 450, h: 28 }, theme, time);
  platform(ctx, { id: 'cover-step', x: tall ? 60 : 440, y: floor - (tall ? 330 : 155), w: 105, h: 28 }, theme, time);
  gate(ctx, { x: 925, y: floor }, time, false);
  const bob = Math.sin(time * 2) * 5;
  slime(ctx, heroX, floor - 24 * heroScale - 10 + bob, time, { scale: heroScale, squash: Math.sin(time * 2) * .05, lookX: 2 });
  const ballX = !title ? 840 : h > 1200 ? 775 : tall ? 665 : 835, ballY = floor - (!title ? 630 : h > 1200 ? 550 : tall ? 330 : 220) + Math.sin(time * 2) * 8;
  ellipse(ctx, ballX, ballY, 19, 18, '#60b984'); ellipse(ctx, ballX - 6, ballY - 7, 7, 6, '#d5f4bd');
  if (title) {
    const x = tall ? 105 : 60, y = tall ? 235 : h * .38;
    ctx.fillStyle = '#284e3d'; ctx.font = '900 138px "Arial Rounded MT Bold", "Arial", sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('slime', x, y); ctx.fillStyle = '#8d6da8'; ctx.fillText('shift.', x, y + 126);
  }
  ctx.restore();
}

export function createRenderer(canvas, viewport = globalThis.window) {
  const ctx = canvas.getContext('2d'); let view = { scale: 1, x: 0, y: 0 }, width = 0, height = 0;
  function resize() {
    width = viewport.innerWidth; height = viewport.innerHeight;
    const dpr = Math.min(viewport.devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    view = { scale: Math.min(width / WIDTH, height / HEIGHT), x: (width - WIDTH * Math.min(width / WIDTH, height / HEIGHT)) / 2, y: (height - HEIGHT * Math.min(width / WIDTH, height / HEIGHT)) / 2, dpr };
  }
  resize();
  return {
    resize,
    toWorld(x, y) { return { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale }; },
    draw(state, ui, time, dt) {
      if (ui.reduced) time = 0;
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      ctx.translate(view.x, view.y); ctx.scale(view.scale, view.scale);
      const theme = palette[state.level.theme]; background(ctx, time, theme, state.level.world);
      if (ui.mode === 'journey') { drawJourney(ctx, ui.journey, ui.progress, time, ui.reduced); return; }
      if (ui.mode === 'welcome') {
        platform(ctx, { x: 755, y: 575, w: 450, h: 28 }, theme, time);
        gate(ctx, { x: 1150, y: 575 }, time);
        for (let i = 0; i < 8; i++) { const t = i / 7; ellipse(ctx, 780 + t * 315, 270 - Math.sin(t * Math.PI) * 65, 3 + t * 2, 3 + t * 2, '#75bb8560'); }
        const hop = ui.reduced ? 0 : Math.max(0, Math.sin(time * 1.5)) ** 3 * 18;
        slime(ctx, 950, 480 - hop, time, { scale: 3.3, squash: Math.sin(time * 2) * .17 - hop / 140, lookX: Math.sin(time * .8) * 2 });
        platform(ctx, { id: 'tiny', x: 745, y: 400 + Math.sin(time * .5) * 5, w: 100, h: 28 }, theme, time);
        ellipse(ctx, 1180, 360 + Math.sin(time * .8) * 18, 7, 9, '#d9acd29a'); ellipse(ctx, 1191, 360 + Math.sin(time * .8) * 18, 7, 9, '#ebcbe79a');
        ellipse(ctx, 1110, 267 + Math.sin(time * 2) * 5, 12, 12, '#7ccd89'); ellipse(ctx, 1107, 264 + Math.sin(time * 2) * 5, 4, 4, '#d0f6bd');
        return;
      }
      if (!ui.reduced && ui.shake > 0) ctx.translate(Math.sin(time * 85) * ui.shake * 3, Math.cos(time * 71) * ui.shake * 2);
      for (const wall of state.level.walls) {
        ctx.save(); if (!wallActive(wall, state.time, state.switches)) ctx.globalAlpha = .16;
        rounded(ctx, wall.x + 6, wall.y + 7, wall.w, wall.h, 8, '#55675318'); rounded(ctx, wall.x, wall.y, wall.w, wall.h, 7, '#a99fb7'); rounded(ctx, wall.x + 3, wall.y, 5, wall.h - 3, 3, '#dcd4e6');
        for (let j = 0; j < wall.h / 32; j++) { ctx.strokeStyle = '#80748d40'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wall.x + 4, wall.y + j * 32 + 18); ctx.lineTo(wall.x + wall.w - 4, wall.y + j * 32 + 18); ctx.stroke(); }
        if (wall.timed) { ctx.fillStyle = '#faf6eb'; ctx.font = '17px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(wallActive(wall, state.time) ? '◷' : '↔', wall.x + wall.w / 2, wall.y + 25); } ctx.restore();
      }
      state.level.platforms.map(p => platformAt(p, state.time)).forEach(p => {
        ctx.save();
        if (!platformActive(p, state.time, state.crumbles)) { ctx.globalAlpha = .13; ctx.translate(0, ui.reduced ? 0 : 25); }
        else if (p.crumble && state.crumbles[p.id] != null && !ui.reduced) { const age = state.time - state.crumbles[p.id]; if (age < p.crumble) ctx.translate(Math.sin(age * 65) * age * 1.3, 0); }
        platform(ctx, p, theme, time, ui.reduced ? 0 : ui.springHits[p.id] || 0); ctx.restore();
        if (p.trap) {
          const status = trapStatus(p, state.time);
          ctx.save(); ctx.strokeStyle = status.open ? '#7a9d8b40' : status.warning ? '#bb7b8d' : '#8eaa95'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
          ctx.strokeRect(p.x + 5, p.y - 7, p.w - 10, 19); ctx.setLineDash([]);
          for (let i = 0; i < 4; i++) ellipse(ctx, p.x + p.w / 2 - 24 + i * 16, p.y + 15, 3, 3, status.warning > i / 4 ? '#d59b99' : '#edf8d7');
          if (status.warning && !status.open) { ctx.beginPath(); ctx.moveTo(p.x + p.w / 2 - 10, p.y); ctx.lineTo(p.x + p.w / 2 + 3, p.y + 9); ctx.lineTo(p.x + p.w / 2 - 6, p.y + 25); ctx.stroke(); }
          ctx.restore();
        }
      });
      for (const [i, button] of (state.level.switches || []).entries()) {
        const on = state.switches[button.id], color = on ? '#72af82' : i % 2 ? '#83b6ca' : '#bf91bf';
        ctx.save(); ctx.translate(button.x, button.y);
        for (let petal = 0; petal < 6; petal++) { const a = petal * TAU / 6 + (ui.reduced ? 0 : time * .2); ellipse(ctx, Math.cos(a) * 16, Math.sin(a) * 16, 10, 10, color + 'b0'); }
        ellipse(ctx, 0, 0, 14, 14, on ? '#f3fae1' : '#f9eecd');
        ctx.fillStyle = color; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(on ? '✓' : i + 1, 0, 5); ctx.restore();
      }
      for (const b of state.level.bombs || []) {
        const status = bombStatus(b, state.time);
        ctx.save();
        if (status.fuse || status.exploding) {
          ctx.strokeStyle = status.exploding ? '#e898a880' : '#c57e9950'; ctx.lineWidth = status.exploding ? 5 : 2; ctx.setLineDash(status.exploding ? [] : [6, 7]);
          ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          if (status.exploding) {
            const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius); glow.addColorStop(0, '#ffe8bba0'); glow.addColorStop(1, '#d78b9e12'); ctx.fillStyle = glow; ctx.fill();
          }
        }
        if (!status.exploding) {
          const wobble = !ui.reduced && status.fuse ? Math.sin(time * 30) * status.fuse * 2 : 0;
          ellipse(ctx, b.x, b.y + 18, 22, 5, '#87637623');
          ellipse(ctx, b.x + wobble, b.y, 18, 18, status.fuse ? '#b66e8d' : '#896d86'); ellipse(ctx, b.x - 5 + wobble, b.y - 5, 6, 6, '#ead4df55');
          ctx.strokeStyle = '#8e7764'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x + 5, b.y - 15); ctx.quadraticCurveTo(b.x + 8, b.y - 31, b.x + 18, b.y - 28); ctx.stroke();
          ellipse(ctx, b.x + 18, b.y - 28, status.fuse ? 4 : 2, status.fuse ? 4 : 2, status.fuse ? '#fff0bc' : '#ca9d96');
          ctx.fillStyle = '#faedf0'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(status.fuse ? '!' : '•', b.x, b.y + 5);
        }
        ctx.restore();
      }
      for (const hazard of state.level.hazards || []) {
        for (let x = hazard.x; x < hazard.x + hazard.w; x += 16) { const w = Math.min(16, hazard.x + hazard.w - x); path(ctx, [[x, hazard.y + hazard.h], [x + w / 2, hazard.y], [x + w, hazard.y + hazard.h]], '#a36581'); path(ctx, [[x + w / 2, hazard.y], [x + w / 2 + 2, hazard.y + hazard.h], [x + w, hazard.y + hazard.h]], '#cf98b0'); }
      }
      for (const wind of state.level.wind || []) {
        for (let i = 0; i < 12; i++) { const fraction = (time * .16 + i / 12) % 1, x = wind.x + (wind.force >= 0 ? fraction : 1 - fraction) * wind.w, y = wind.y + 35 + random(i + 9) * (wind.h - 60); ctx.strokeStyle = '#71a8c63a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 18, y - (wind.lift ? 14 : 2), x + 30, y - (wind.lift ? 30 : 0)); ctx.stroke(); }
      }
      (state.level.portals || []).forEach((portal, i) => {
        ctx.save(); ctx.translate(portal.x, portal.y); ctx.strokeStyle = '#9b73d6'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, 24, 34, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#eadfff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 18, 28, 0, 0, TAU); ctx.stroke();
        for (let j = 0; j < 4; j++) { const angle = time * 1.5 + j * TAU / 4; ellipse(ctx, Math.cos(angle) * 28, Math.sin(angle) * 38, 3, 3, '#a886d7'); }
        ctx.fillStyle = '#9575ba'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(i === 0 ? 'A' : 'A', 0, 4); ctx.restore();
      });
      gate(ctx, state.level.goal, time);
      if (ui.aim?.moved && ui.aim.velocity.power > 0 && !state.ball) {
        drawAim(ctx, state, ui.aim.velocity);
      }
      ui.footprints.forEach(p => { ctx.save(); ctx.globalAlpha = Math.max(0, (.65 - p.age) * .32); ellipse(ctx, p.x, p.y + 2, 13 + p.age * 4, 3, '#559b71'); ctx.restore(); });
      ui.trail.forEach((p, i) => ellipse(ctx, p.x, p.y, 4.5 * i / Math.max(ui.trail.length, 1) + 1, 4.5 * i / Math.max(ui.trail.length, 1) + 1, '#6ab98745'));
      if (state.ball) { const b = state.ball; ctx.save(); ctx.translate(b.x, b.y); if (!ui.reduced) { ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.scale(1 + Math.min(.35, Math.hypot(b.vx, b.vy) / 2400), .94); } ellipse(ctx, 0, 0, 11, 10, '#62bd84'); ellipse(ctx, -3, -3, 4, 3, '#ceefb9'); ctx.restore(); }
      let hero = ui.visualHero || state.hero;
      if (ui.teleport && !ui.reduced) {
        const t = Math.min(1, ui.teleport.age / .17), f = 1 - (1 - t) ** 3;
        hero = { x: ui.teleport.from.x + (state.hero.x - ui.teleport.from.x) * f, y: ui.teleport.from.y + (state.hero.y - ui.teleport.from.y) * f - Math.sin(t * Math.PI) * 17 };
        ctx.beginPath(); ctx.moveTo(ui.teleport.from.x, ui.teleport.from.y); ctx.quadraticCurveTo((ui.teleport.from.x + hero.x) / 2, (ui.teleport.from.y + hero.y) / 2 - 32, hero.x, hero.y); ctx.strokeStyle = `rgba(106,190,132,${Math.max(0, .26 - ui.teleport.age)})`; ctx.lineWidth = 11 * (1 - t) + 2; ctx.lineCap = 'round'; ctx.stroke();
      }
      const h = state.hero, running = h.grounded && Math.abs(h.vx) > 30, charging = ui.aim?.velocity.power || 0;
      const floorBelow = state.level.platforms.map(p => platformAt(p, state.time)).find(p => hero.x > p.x && hero.x < p.x + p.w && p.y >= hero.y + 22);
      if (!h.grounded && floorBelow) { const distance = floorBelow.y - hero.y; ellipse(ctx, hero.x, floorBelow.y + 3, Math.max(9, 27 - distance / 10), 4, '#335a411c'); }
      let squash = ui.squash + (charging * .28) + (running ? Math.sin(ui.runPhase * 2) * .16 : Math.sin(time * 3) * .04);
      if (h.crouching) squash += 1.05;
      if (!h.grounded) squash -= Math.min(.5, Math.abs(h.vy) / 1700);
      const lean = charging ? -Math.sign(ui.aim.velocity.vx) * .12 * charging : (h.vx || 0) / 300 * .1;
      ctx.save(); if (!ui.reduced && ui.arrival > 0) ctx.globalAlpha = 1 - ui.arrival / .45;
      slime(ctx, hero.x, hero.y + (running && !ui.reduced ? -Math.abs(Math.sin(ui.runPhase)) * 3 : 0), time, { squash: ui.reduced ? 0 : squash, lookX: charging ? Math.sign(ui.aim.velocity.vx) * 3 : (h.facing || 1) * 1.5, lean: ui.reduced ? 0 : lean, run: running && !ui.reduced ? ui.runPhase : 0, air: !h.grounded });
      ctx.restore();
      ui.rings.forEach(r => { ctx.beginPath(); ctx.ellipse(r.x, r.y, 14 + r.age * 100, 7 + r.age * 45, 0, 0, TAU); ctx.strokeStyle = `rgba(94,165,114,${Math.max(0, .5 - r.age)})`; ctx.lineWidth = 2; ctx.stroke(); });
      ui.particles.forEach(p => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.age * 4); ctx.globalAlpha = Math.max(0, 1 - p.age / p.life); rounded(ctx, -p.size / 2, -p.size / 2, p.size, p.size * .75, 2, p.color); ctx.restore(); });
      if (ui.firstAim && state.shots === 0 && !ui.aim?.moved && state.level.label !== '01') {
        const x = state.hero.x, y = state.hero.y;
        ctx.beginPath(); ctx.ellipse(x, y + 8, 46 + Math.sin(time * 3) * 4, 44 + Math.sin(time * 3) * 4, 0, 0, TAU); ctx.strokeStyle = '#6fab8050'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 8]); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  };
}
