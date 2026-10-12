import { LEVELS, WORLDS, worldLevels } from './levels.js';
import { createState, aimVector, launch, tick, FIXED_STEP } from './physics.js';
import { createRenderer } from './renderer.js';
import { createSound } from './audio.js';
import { createInput, movementCode } from './input.js';
import { readProgress, formatTime, beginWorldRun, finishRunLevel, recordWorldTime, personalRecords } from './progress.js';
import { guidance, tutorialMotion } from './tutorial.js';
import { BUILD } from './build-config.js';
import { createPlatform } from './platform.js';
import { journeyLayout, tripFrame, journeyView, easeSlide, swipeWorld } from './journey.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), renderer = createRenderer(canvas), sound = createSound();
const input = createInput();
function clearInput() { input.clear(); }
let index = 0, state = createState(LEVELS[0]), accumulator = 0, last = performance.now(), elapsed = 0, blocked = false, toastTime = 0;
let progress = readProgress({ getItem: key => { try { return localStorage.getItem(key); } catch { return null; } } });
const personalOnly = BUILD.records === 'personal';
if (!personalOnly) progress.playerId ||= globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let worldRun = beginWorldRun(0), lastScore = null, returnMode = 'welcome', boardRequest = 0, started = false;
const ui = { mode: 'welcome', aim: null, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches, muted: false, trail: [], particles: [], rings: [], footprints: [], springHits: {}, teleport: null, squash: 0, shake: 0, firstAim: true, winDelay: 0, runPhase: 0, footTimer: 0, animationTime: 0, arrival: 0, progress };
let platformMuted = false;
const platform = createPlatform({
  onMute(muted) { platformMuted = muted; sound.setMuted(ui.muted || platformMuted); },
  onBusy(busy) {
    clearInput(); clearAim(); accumulator = 0; last = performance.now();
    $('adStatus').hidden = !busy;
    for (const id of ['welcome', 'hud', 'menu', 'result', 'worldScreen', 'boardScreen', 'journeyScreen', 'touchControls']) $(id).inert = busy || blocked;
    canvas.inert = busy || blocked || ui.mode !== 'playing';
  }
});
await platform.init();
$('loading').hidden = true;
function beginPlaying() { started = true; platform.start(); }
function continueGame(action) { void platform.continueAtBreak(() => { action(); if (document.hidden && ui.mode === 'playing') modal('paused'); }); }
if (personalOnly) {
  $('leaderboard').textContent = 'Personal bests ↗'; $('resultLeaderboard').textContent = 'Personal bests ↗';
  $('boardTitle').textContent = 'Your best times.';
  document.querySelector('.board-scope').textContent = 'Saved on this device · no online ranking';
  document.querySelector('.atlas-note').textContent = 'Explore any world. Finish its levels in order to record your world best.';
}
function save() { try { localStorage.setItem('slime-shift-v2', JSON.stringify(progress)); } catch {} }
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); toastTime = 2.2; }
function burst(x, y, big = false) {
  if (ui.reduced) return;
  const count = big ? 55 : 16;
  for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2, speed = big ? 80 + Math.random() * 230 : 30 + Math.random() * 95; ui.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (big ? 140 : 10), age: 0, life: big ? 1.6 : .5, size: 3 + Math.random() * (big ? 6 : 4), color: ['#92d19a', '#c4abe3', '#f9ffde', '#60b988'][i % 4] }); }
}
function updateHud() {
  $('levelName').textContent = `${LEVELS[index].label} / ${LEVELS[index].name}`;
  $('shotCount').textContent = state.shots;
  $('hintText').textContent = index === 0 && window.matchMedia('(any-pointer: coarse)').matches ? 'Use the arrows to move and jump' : LEVELS[index].hint; $('lesson').textContent = LEVELS[index].lesson;
  $('dots').replaceChildren(...worldLevels(state.level.world).map(({ index: i }) => { const d = document.createElement('span'); d.className = `level-dot${i === index ? ' active' : i < index ? ' done' : ''}`; return d; }));
  $('timer').textContent = formatTime(0);
}
function clearAim() { ui.aim = null; }
function modal(mode) {
  if (mode !== 'journey') cancelMapGesture();
  if (mode !== 'playing') platform.stop();
  clearAim(); clearInput(); ui.mode = mode; accumulator = 0; last = performance.now();
  $('welcome').hidden = mode !== 'welcome'; $('menu').hidden = mode !== 'paused'; $('result').hidden = mode !== 'result';
  $('worldScreen').hidden = mode !== 'worlds'; $('boardScreen').hidden = mode !== 'board';
  $('journeyScreen').hidden = mode !== 'journey';
  $('hud').hidden = mode !== 'playing'; $('hint').hidden = true; $('tutorial').hidden = mode !== 'playing';
  $('hud').inert = mode !== 'playing'; canvas.inert = mode !== 'playing';
  $('touchControls').hidden = mode !== 'playing';
  $('touchControls').inert = blocked || mode !== 'playing';
  if (mode === 'paused') { fillLevels(); $('resume').focus({ preventScroll: true }); }
  if (mode === 'result') $('next').focus({ preventScroll: true });
  if (mode === 'welcome') $('play').focus({ preventScroll: true });
  if (mode === 'worlds') { fillWorlds(); $('closeWorlds').focus({ preventScroll: true }); }
  if (mode === 'board') $('closeBoard').focus({ preventScroll: true });
  if (mode === 'journey') $('holdJourney').focus({ preventScroll: true });
  if (mode === 'playing' && started && !blocked && !document.hidden && !state.won) platform.start();
}
function start(i, continuing = false, retry = false) {
  platform.stop();
  if (!continuing && (!retry || worldRun.completed)) worldRun = beginWorldRun(i);
  index = i; state = createState(LEVELS[index]); elapsed = 0; started = false;
  Object.assign(ui, { trail: [], particles: [], rings: [], footprints: [], springHits: {}, teleport: null, squash: .7, shake: 0, firstAim: index === 0, winDelay: 0, runPhase: 0, footTimer: 0, arrival: .35 });
  toastTime = 0; $('toast').classList.remove('visible'); modal('playing'); updateHud(); $('play').blur();
  ui.guideStep = 0; ui.guideAge = 0; ui.guideTitle = ''; ui.transition = .45; ui.visualHero = { x: state.hero.x, y: state.hero.y };
  $('transition').classList.toggle('reduced', ui.reduced); $('transition').animate([{ opacity: 1 }, { opacity: 0 }], { duration: ui.reduced ? 0 : 450 });
  updateGuide(0);
  $('transition').style.opacity = 0;
}
function openJourney(from = index, to = index, auto = false) {
  ui.journey = { from, to, auto, world: LEVELS[auto ? from : to].world, view: LEVELS[auto ? from : to].world, age: 0, thrown: false, landed: false, finishing: false };
  if (ui.mode !== 'journey') returnMode = ui.mode === 'welcome' ? 'welcome' : state.won ? 'result' : ui.mode;
  modal('journey');
  $('journeyEyebrow').textContent = auto ? `LEVEL ${LEVELS[from].label} COMPLETE` : 'YOUR LITTLE ADVENTURE';
  $('journeyStats').textContent = auto ? $('resultStats').textContent : `${Object.keys(progress.times).length} / ${LEVELS.length} explored`;
  updateJourney();
}
function fillJourneyNodes() {
  const trip = ui.journey;
  $('journeyNodes').replaceChildren(...journeyLayout(trip.world).map(n => {
    const b = document.createElement('button');
    b.className = 'journey-node'; b.dataset.level = n.index;
    b.style.top = `${(n.y - 172) / 720 * 100}%`;
    b.style.width = `${n.w / 1280 * 100}%`; b.style.height = `${290 / 720 * 100}%`;
    b.textContent = `Level ${n.index + 1}: ${LEVELS[n.index].name}`;
    b.title = `${n.index + 1}. ${LEVELS[n.index].name}`;
    b.setAttribute('aria-label', `${b.textContent}${progress.times[n.index] != null ? ', completed' : ''}`);
    b.onclick = () => {
      if (performance.now() < mapIgnoreClickUntil || ui.journey.slide || ui.journey.drag) return;
      sound.unlock(); sound.play('ui'); ui.journey.auto = false; ui.journey.to = n.index;
      $('transition').style.opacity = 0; updateJourney();
    };
    return b;
  }));
  positionJourneyNodes();
}
function positionJourneyNodes() {
  const trip = ui.journey, nodes = journeyLayout(trip.world);
  for (const [i, b] of [...$('journeyNodes').children].entries()) {
    const n = nodes[i]; b.style.left = `${(n.x - n.w / 2 + (trip.world - journeyView(trip, ui.reduced)) * 1280) / 1280 * 100}%`;
    b.inert = !!trip.slide || !!trip.drag || trip.auto;
    b.setAttribute('aria-pressed', String(n.index === trip.to));
  }
}
function updateJourney() {
  const trip = ui.journey, level = LEVELS[trip.to], world = WORLDS[trip.world];
  $('journeyTitle').textContent = world.name;
  $('journeyWorldNumber').textContent = `${trip.world + 1} / ${WORLDS.length}`;
  $('journeyDetail').textContent = `${level.label} · ${level.name}`;
  $('journeyPlay').hidden = trip.auto; $('holdJourney').hidden = !trip.auto;
  $('journeyPlay').disabled = !!trip.slide || !!trip.drag;
  $('previousWorld').disabled = trip.world === 0; $('nextWorld').disabled = trip.world === WORLDS.length - 1;
  $('journeyNodes').hidden = trip.auto;
  if (!trip.auto) {
    const entries = worldLevels(trip.world), complete = entries.filter(e => progress.times[e.index] != null).length;
    $('journeyStats').textContent = `${complete} / ${entries.length} explored`;
    $('journeyEyebrow').textContent = 'YOUR LITTLE ADVENTURE';
  }
  $('journeyPager').replaceChildren(...WORLDS.map((w, i) => {
    const b = document.createElement('button'); b.className = `world-dot${i === trip.world ? ' active' : ''}`;
    b.setAttribute('aria-label', `World ${i + 1}: ${w.name}`); b.setAttribute('aria-current', i === trip.world ? 'true' : 'false');
    b.onclick = () => changeJourneyWorld(i); return b;
  }));
  fillJourneyNodes();
}
function stopJourney(focus = true) {
  const trip = ui.journey, view = journeyView(trip, ui.reduced);
  trip.auto = false; trip.view = Math.round(view); trip.world = trip.view;
  trip.slide = null;
  if (LEVELS[trip.to].world !== trip.world) trip.to = LEVELS[trip.from].world === trip.world ? trip.from : worldLevels(trip.world)[0].index;
  $('transition').style.opacity = 0; updateJourney();
  if (focus) $('journeyPlay').focus({ preventScroll: true });
}
function changeJourneyWorld(world) {
  if (ui.mode !== 'journey' || blocked || platform.busy || ui.journey.finishing) return;
  world = Math.max(0, Math.min(WORLDS.length - 1, world));
  const trip = ui.journey, from = journeyView(trip, ui.reduced);
  mapGesture = null;
  sound.unlock(); sound.play('ui'); trip.auto = false; trip.drag = null;
  trip.world = world;
  if (LEVELS[trip.to].world !== world) trip.to = worldLevels(world)[0].index;
  trip.slide = ui.reduced || Math.abs(world - from) < .001 ? null : { from, to: world, age: 0 };
  trip.view = trip.slide ? from : world;
  $('transition').style.opacity = 0; updateJourney();
}
// Pointer events cover mouse dragging and touch. A tap still selects an island;
// a horizontal swipe captures the pointer and must never click the passing island.
let mapGesture = null, mapIgnoreClickUntil = 0;
function cancelMapGesture() {
  if (!mapGesture) return;
  const gesture = mapGesture; mapGesture = null;
  if (ui.journey?.drag) { mapIgnoreClickUntil = performance.now() + 350; changeJourneyWorld(gesture.world); }
}
$('journeyScreen').addEventListener('pointerdown', e => {
  if (ui.mode !== 'journey' || blocked || platform.busy || ui.journey.finishing || mapGesture || e.button !== 0) return;
  if (e.target?.tagName === 'BUTTON' && e.target.className !== 'journey-node') return;
  mapGesture = { id: e.pointerId, x: e.clientX, y: e.clientY, world: Math.round(journeyView(ui.journey, ui.reduced)), dx: 0, dy: 0 };
});
$('journeyScreen').addEventListener('pointermove', e => {
  if (!mapGesture || mapGesture.id !== e.pointerId || ui.mode !== 'journey') return;
  const g = mapGesture; g.dx = e.clientX - g.x; g.dy = e.clientY - g.y;
  if (!ui.journey.drag && (Math.abs(g.dx) < 10 || Math.abs(g.dx) <= Math.abs(g.dy) * 1.2)) return;
  e.preventDefault();
  if (!ui.journey.drag) {
    stopJourney(false); ui.journey.slide = null; ui.journey.drag = g;
    $('journeyScreen').setPointerCapture(e.pointerId);
  }
  const pageWidth = Math.min(window.innerWidth, window.innerHeight * 1280 / 720);
  const next = Math.max(0, Math.min(WORLDS.length - 1, g.world - g.dx / pageWidth));
  ui.journey.view = ui.reduced ? g.world : next;
  $('journeyPlay').disabled = true; positionJourneyNodes();
});
$('journeyScreen').addEventListener('pointerup', e => {
  if (!mapGesture || mapGesture.id !== e.pointerId) return;
  const g = mapGesture; mapGesture = null;
  if (ui.journey.drag) {
    mapIgnoreClickUntil = performance.now() + 350;
    const width = Math.min(window.innerWidth, window.innerHeight * 1280 / 720);
    changeJourneyWorld(swipeWorld(g.world, e.clientX - g.x, e.clientY - g.y, width));
    if ($('journeyScreen').hasPointerCapture(e.pointerId)) $('journeyScreen').releasePointerCapture(e.pointerId);
  }
});
$('journeyScreen').addEventListener('pointercancel', cancelMapGesture);
$('journeyScreen').addEventListener('lostpointercapture', cancelMapGesture);
function fillLevels() {
  $('levelSelect').replaceChildren(...worldLevels(state.level.world).map(({ level: l, index: i }, number) => { const b = document.createElement('button'); b.textContent = number + 1; b.title = l.name; b.setAttribute('aria-label', `Level ${i + 1}: ${l.name}`); b.className = i === index ? 'active' : ''; b.onclick = () => { sound.unlock(); sound.play('ui'); start(i); }; return b; }));
}
function fillWorlds() {
  $('worldGrid').replaceChildren(...WORLDS.map((world, i) => {
    const card = document.createElement('button'); card.className = 'world-card'; card.style.setProperty('--world', world.color); card.dataset.theme = world.theme;
    const picture = document.createElement('div'); picture.className = 'world-picture'; picture.setAttribute('aria-hidden', 'true');
    const symbol = document.createElement('span'); symbol.className = 'world-symbol'; symbol.textContent = world.icon;
    const island = document.createElement('span'); island.className = 'mini-island';
    const blob = document.createElement('span'); blob.className = 'mini-slime';
    const door = document.createElement('span'); door.className = 'mini-door';
    picture.append(symbol, island, blob, door);
    const title = document.createElement('strong'); title.textContent = world.name;
    const detail = document.createElement('small'); detail.textContent = world.feature;
    const time = document.createElement('span'); time.className = 'world-best';
    const entries = worldLevels(i), completed = entries.filter(e => progress.times[e.index] != null).length;
    time.textContent = `${completed}/${entries.length} explored · ${entries.length} levels`;
    card.append(picture, title, detail, time); card.onclick = () => { sound.unlock(); sound.play('ui'); start(entries[0].index); }; return card;
  }));
}
function updateGuide(dt) {
  const guide = guidance(state, ui.guideStep, window.matchMedia('(any-pointer: coarse)').matches);
  ui.guideStep = guide.step;
  if (guide.title !== ui.guideTitle) {
    ui.guideTitle = guide.title; ui.guideAge = 0;
    $('tutorialTitle').textContent = guide.title; $('tutorialText').textContent = guide.text;
    $('tutorialKeys').textContent = index === 0 && guide.step === 0 ? 'A  ←   →  D' : index === 0 && guide.step === 1 ? 'W / SPACE  ↑' : index === 1 && guide.step === 0 ? '↙  PULL BACK · RELEASE  ↗' : '';
  }
  ui.guideAge += dt;
  const motion = tutorialMotion(ui.guideAge, window.innerWidth, window.innerHeight, ui.reduced);
  $('tutorial').style.top = `${motion.y}px`; $('tutorialTitle').style.fontSize = `${motion.size}px`;
  const persist = index < 2;
  $('tutorial').style.opacity = motion.opacity * (persist ? 1 : Math.max(0, Math.min(1, 7 - ui.guideAge)));
  $('tutorial').classList.toggle('docked', motion.docked);
  $('tutorialKeys').hidden = motion.docked;
  $('tutorial').hidden = !persist && ui.guideAge > 7;
}
function win() {
  platform.stop();
  ui.winDelay = .85; $('hint').hidden = true; $('tutorial').hidden = true;
  ui.visualHero = { x: state.hero.x, y: state.hero.y };
  progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length - 1, index + 1));
  const previous = Number.isFinite(progress.best[index]) ? progress.best[index] : Infinity, oldTime = progress.times[index] ?? Infinity;
  progress.best[index] = Math.min(previous, state.shots); progress.times[index] = Math.min(oldTime, Math.round(elapsed * 1000));
  if (index === 1) progress.tutorialDone = true;
  const ranked = finishRunLevel(worldRun, index);
  lastScore = ranked ? { world: state.level.world + 1, totalMs: Math.round(worldRun.ms) } : null;
  const worldBest = ranked && recordWorldTime(progress, state.level.world, worldRun.ms);
  save();
  const final = index === LEVELS.length - 1;
  $('resultEyebrow').textContent = worldRun.completed ? `${WORLDS[state.level.world].name.toUpperCase()} COMPLETE` : `LEVEL ${LEVELS[index].label} COMPLETE`;
  $('resultTitle').textContent = final ? 'Little slime. Big adventure.' : worldRun.completed ? 'A world of little wins.' : ['Lovely little leap.', 'Beautiful landing.', 'Nicely done.'][index % 3];
  const medal = elapsed <= state.level.par ? 'gold' : elapsed <= state.level.par * 1.6 ? 'silver' : 'bronze';
  $('resultMedal').dataset.medal = medal; $('resultMedal').textContent = medal === 'gold' ? '★' : '✦';
  $('resultStats').textContent = `${formatTime(elapsed * 1000)} · ${state.shots} ${state.shots === 1 ? 'throw' : 'throws'} · ${medal} medal${elapsed * 1000 < oldTime && oldTime !== Infinity ? ' · New personal best!' : ''}`;
  $('worldTime').hidden = !worldRun.completed; $('worldTime').textContent = ranked ? `World time ${formatTime(worldRun.ms)}${personalOnly ? worldBest ? ' — new personal best!' : ' — saved on this device' : ' — ready for local Top 10'}` : 'Start from the first level to record a full world time.';
  $('resultLeaderboard').hidden = !ranked;
  $('next').firstChild.textContent = final ? 'Explore the worlds ' : worldRun.completed ? 'Next world ' : 'Next adventure ';
  clearAim(); clearInput(); ui.trail = []; $('touchControls').hidden = true;
  burst(state.level.goal.x, state.level.goal.y - 50, true);
}
function processEvents() {
  for (const event of state.events.splice(0)) {
    sound.play(event.type === 'respawn' && ['spikes', 'blast'].includes(event.cause) ? 'death' : event.type, event);
    if (event.type === 'throw') { burst(event.x, event.y); ui.squash = .7; ui.firstAim = false; ui.trail = []; }
    if (event.type === 'jump') { burst(event.x, event.y); ui.squash = -.7; ui.firstAim = false; }
    if (event.type === 'landing') { ui.squash = Math.min(1.15, event.impact / 650); ui.rings.push({ x: event.x, y: event.y, age: 0 }); if (event.impact > 250) burst(event.x, event.y); }
    if (event.type === 'respawn') { clearAim(); ui.trail = []; ui.teleport = null; ui.visualHero = { x: event.x, y: event.y }; ui.squash = .9; ui.arrival = .35; burst(event.x, event.y); toast(['spikes', 'blast'].includes(event.cause) ? 'Ouch! Back to the start.' : 'Back on solid ground.'); }
    if (event.type === 'explosion') { burst(event.x, event.y, true); ui.shake = .7; }
    if (event.type === 'switch') { burst(event.x, event.y); ui.rings.push({ x: event.x, y: event.y, age: 0 }); }
    if (event.type === 'teleport') { ui.teleport = { from: event.from, age: 0 }; ui.squash = 1; ui.shake = .5; burst(event.from.x, event.from.y); burst(event.x, event.y); ui.rings.push({ x: event.x, y: event.y + 24, age: 0 }); ui.trail = []; }
    if (event.type === 'bounce') { burst(event.x, event.y); ui.rings.push({ x: event.x, y: event.y, age: 0 }); ui.springHits[event.support] = .45; }
    if (event.type === 'portal') { burst(event.from.x, event.from.y); burst(event.x, event.y); ui.rings.push({ x: event.x, y: event.y, age: 0 }); ui.trail = []; }
    if (event.type === 'miss') { ui.trail = []; toast('Still here. Try another angle.'); }
    if (event.type === 'win') win();
  }
  $('shotCount').textContent = state.shots;
}

canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || ui.mode !== 'playing' || blocked || platform.busy || state.ball || state.won || ui.teleport?.age < .18) return;
  sound.unlock(); e.preventDefault(); canvas.setPointerCapture(e.pointerId); beginPlaying();
  ui.aim = { pointer: e.pointerId, start: renderer.toWorld(e.clientX, e.clientY), moved: false, velocity: { vx: 0, vy: 0, power: 0 } };
});
canvas.addEventListener('pointermove', e => {
  if (!ui.aim || ui.aim.pointer !== e.pointerId) return;
  const target = renderer.toWorld(e.clientX, e.clientY);
  ui.aim.moved = Math.hypot(target.x - ui.aim.start.x, target.y - ui.aim.start.y) > 6;
  ui.aim.velocity = aimVector(ui.aim.start, target);
});
canvas.addEventListener('pointerup', e => {
  if (!ui.aim || ui.aim.pointer !== e.pointerId) return;
  const aim = ui.aim; clearAim();
  if (aim.moved && ui.mode === 'playing' && !blocked) { launch(state, aim.velocity); processEvents(); }
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener('pointercancel', clearAim); canvas.addEventListener('lostpointercapture', clearAim);
canvas.addEventListener('contextmenu', e => { e.preventDefault(); clearAim(); });
canvas.addEventListener('wheel', e => e.preventDefault(), { passive: false });
window.addEventListener('keydown', e => {
  const field = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
  if (!field && (e.key.startsWith('Arrow') || e.key === ' ' && e.target?.tagName !== 'BUTTON')) e.preventDefault();
  if (blocked || platform.busy) return;
  if (movementCode(e) && ui.mode === 'playing' && !state.won) { e.preventDefault(); input.keyDown(e); sound.unlock(); beginPlaying(); return; }
  if (e.repeat) return;
  if (ui.mode === 'journey' && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); changeJourneyWorld(ui.journey.world + (e.key === 'ArrowRight' ? 1 : -1)); return; }
  if (e.key === 'Escape' && ui.mode === 'journey') { e.preventDefault(); if (ui.journey.auto) stopJourney(); else { $('transition').style.opacity = 0; modal(returnMode); } return; }
  if (e.key === 'Escape') { e.preventDefault(); if (ui.aim) clearAim(); else if (ui.mode === 'playing' && !state.won) modal('paused'); else if (ui.mode === 'paused') { sound.unlock(); continueGame(() => modal('playing')); } }
  if (e.key === 'Escape' && ['worlds', 'board'].includes(ui.mode)) modal(returnMode);
  if (e.key.toLowerCase() === 'r' && ui.mode === 'playing') { e.preventDefault(); sound.unlock(); start(index, false, true); }
});
window.addEventListener('keyup', e => { input.keyUp(e); });
window.addEventListener('blur', () => { clearInput(); clearAim(); cancelMapGesture(); if (!platform.busy && ui.mode === 'playing' && !state.won) modal('paused'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelMapGesture(); if (!platform.busy && ui.mode === 'playing' && !state.won) modal('paused'); clearAim(); clearInput(); sound.suspend(); } });
for (const button of $('touchControls').querySelectorAll('button')) {
  button.addEventListener('pointerdown', e => {
    if (ui.mode !== 'playing' || blocked || platform.busy || state.won) return;
    e.preventDefault(); sound.unlock(); button.setPointerCapture(e.pointerId);
    input.touchDown(e.pointerId, button.dataset.control); beginPlaying();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, e => input.touchUp(e.pointerId));
}
for (const id of ['play', 'restart', 'pause', 'resume', 'menuRestart', 'next', 'again', 'sound', 'motion']) $(id).addEventListener('click', () => { sound.unlock(); sound.play('ui'); });
$('play').addEventListener('click', () => start(progress.unlocked)); $('restart').addEventListener('click', () => start(index, false, true));
$('pause').addEventListener('click', () => { if (!state.won) modal('paused'); }); $('resume').addEventListener('click', () => continueGame(() => modal('playing')));
$('menuRestart').addEventListener('click', () => continueGame(() => start(index, false, true))); $('again').addEventListener('click', () => continueGame(() => start(index, false, true))); $('next').addEventListener('click', () => { if (index === LEVELS.length - 1) { returnMode = 'welcome'; modal('worlds'); } else continueGame(() => start(index + 1, !worldRun.completed)); });
$('replayTutorial').onclick = () => { sound.unlock(); start(0); };
for (const id of ['worlds', 'menuWorlds']) $(id).onclick = () => { sound.unlock(); sound.play('ui'); openJourney(); };
$('worlds').textContent = 'Adventure map'; $('menuWorlds').textContent = 'Levels';
$('adventureCount').textContent = `${WORLDS.length} worlds · ${LEVELS.length} little adventures`;
$('holdJourney').onclick = () => { sound.unlock(); sound.play('ui'); stopJourney(); };
$('previousWorld').onclick = () => changeJourneyWorld(ui.journey.world - 1);
$('nextWorld').onclick = () => changeJourneyWorld(ui.journey.world + 1);
$('closeJourney').onclick = () => { sound.unlock(); sound.play('ui'); $('transition').style.opacity = 0; modal(returnMode); };
$('journeyPlay').onclick = () => { sound.unlock(); sound.play('ui'); const next = ui.journey.to; continueGame(() => start(next, state.won && next === index + 1 && !worldRun.completed)); };
$('closeWorlds').onclick = () => modal(returnMode);
$('menuHome').onclick = () => { sound.unlock(); sound.play('ui'); modal('welcome'); };
WORLDS.forEach((world, i) => { const option = document.createElement('option'); option.value = i + 1; option.textContent = world.name; $('boardWorld').append(option); });
async function loadBoard() {
  const request = ++boardRequest; $('boardRows').replaceChildren(); $('boardStatus').textContent = 'Finding the fastest little slimes…';
  if (personalOnly) {
    $('scoreForm').hidden = true;
    const rows = personalRecords(progress, Number($('boardWorld').value) - 1);
    $('boardStatus').textContent = rows.length ? 'Complete worlds in order to improve your world best.' : 'Finish a level to record your first personal best.';
    $('boardRows').replaceChildren(...rows.map(row => { const li = document.createElement('li'), name = document.createElement('span'), time = document.createElement('b'); name.textContent = row.name; time.textContent = formatTime(row.ms); li.append(name, time); return li; }));
    return;
  }
  $('scoreForm').hidden = !lastScore || lastScore.world !== Number($('boardWorld').value);
  if (lastScore) $('scoreTime').textContent = `Your complete world run: ${formatTime(lastScore.totalMs)}. Names and times are stored on this local server.`;
  try {
    const response = await fetch(`/api/leaderboards?world=${$('boardWorld').value}`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('The leaderboard server is unavailable.');
    const data = await response.json(); if (request !== boardRequest) return;
    $('boardStatus').textContent = data.scores.length ? '' : 'No times yet. Be the first to finish this world!';
    $('boardRows').replaceChildren(...data.scores.map(row => { const li = document.createElement('li'); const name = document.createElement('span'), time = document.createElement('b'); name.textContent = `${row.rank}. ${row.name}`; time.textContent = formatTime(row.totalMs); li.append(name, time); return li; }));
  } catch (error) { if (request === boardRequest) $('boardStatus').textContent = error.name === 'TimeoutError' ? 'The leaderboard took too long. Please try again.' : 'Leaderboard unavailable. Your personal times are still saved.'; }
}
function openBoard(world = state.level.world + 1) { sound.unlock(); sound.play('ui'); returnMode = ui.mode; $('boardWorld').value = world; $('playerName').value = progress.name; modal('board'); void loadBoard(); }
$('leaderboard').onclick = () => openBoard(); $('resultLeaderboard').onclick = () => openBoard(lastScore.world);
$('closeBoard').onclick = () => { boardRequest++; modal(returnMode); }; $('boardWorld').onchange = loadBoard;
$('scoreForm').onsubmit = async event => {
  event.preventDefault(); if (personalOnly || !lastScore || lastScore.world !== Number($('boardWorld').value)) return;
  $('postScore').disabled = true; const score = { ...lastScore, name: $('playerName').value, playerId: progress.playerId };
  try {
    const response = await fetch('/api/leaderboards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(score), signal: AbortSignal.timeout(5000) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    progress.name = score.name; save(); await loadBoard(); $('boardStatus').textContent = result.accepted ? 'Your time is posted!' : 'Your earlier time was faster — we kept that one.';
  } catch (error) { $('boardStatus').textContent = error.message || 'Could not post your time. Please try again.'; }
  finally { $('postScore').disabled = false; }
};
$('sound').addEventListener('click', () => { ui.muted = !ui.muted; sound.setMuted(ui.muted || platformMuted); $('sound').textContent = ui.muted ? 'Sound off' : 'Sound on'; });
$('motion').addEventListener('click', () => { ui.reduced = !ui.reduced; $('motion').textContent = ui.reduced ? 'Motion off' : 'Motion on'; });
$('motion').textContent = ui.reduced ? 'Motion off' : 'Motion on';
function resize() {
  cancelMapGesture();
  renderer.resize();
  blocked = window.matchMedia('(any-pointer: coarse)').matches && window.innerHeight > window.innerWidth;
  if (blocked) platform.stop();
  $('rotate').hidden = !blocked; clearAim(); clearInput(); accumulator = 0;
  for (const id of ['welcome', 'hud', 'menu', 'result', 'worldScreen', 'boardScreen', 'journeyScreen']) $(id).inert = blocked || (id === 'hud' && ui.mode !== 'playing');
  canvas.inert = blocked || ui.mode !== 'playing';
  $('touchControls').inert = blocked || ui.mode !== 'playing';
}
window.addEventListener('resize', resize); resize();
// Keep keyboard navigation inside a modal without interfering with gameplay keys.
document.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const section = ({ paused: 'menu', result: 'result', worlds: 'worldScreen', board: 'boardScreen', journey: 'journeyScreen' })[ui.mode];
  if (!section) return;
  const controls = [...$(section).querySelectorAll('button:not(:disabled), select, input')].filter(el => el.getClientRects().length);
  const first = controls[0], end = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); end?.focus(); }
  else if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); first?.focus(); }
});
function frame(now) {
  const realDt = Math.max(0, (now - last) / 1000), dt = Math.min(realDt, .05); last = now;
  if (!blocked && !platform.busy && !document.hidden) {
    if (ui.mode === 'journey') {
      ui.animationTime += dt;
      const trip = ui.journey;
      if (trip.slide) {
        trip.slide.age += dt;
        trip.view = trip.slide.from + (trip.slide.to - trip.slide.from) * easeSlide(trip.slide.age / .48);
        if (trip.slide.age >= .48) { trip.view = trip.slide.to; trip.slide = null; $('journeyPlay').disabled = false; }
        positionJourneyNodes();
      }
      if (trip.auto && !trip.finishing) {
        trip.age += dt; const motion = tripFrame(trip.age, ui.reduced);
        const world = Math.round(journeyView(trip, ui.reduced));
        if (trip.world !== world) { trip.world = world; updateJourney(); }
        if (trip.age >= .65 && !trip.thrown) { trip.thrown = true; sound.play('throw'); }
        if (motion.arrival > 0 && !trip.landed) { trip.landed = true; sound.play('teleport'); }
        $('transition').style.opacity = motion.fade;
        if (motion.done) { trip.finishing = true; continueGame(() => start(trip.to, !worldRun.completed)); }
      }
    }
    const active = ui.mode === 'playing' || ui.mode === 'welcome';
    if (active) {
      ui.animationTime += dt;
      if (ui.mode === 'playing' && !state.won) {
        if (started) { elapsed += realDt; worldRun.ms += realDt * 1000; }
        if (started) { accumulator += dt; while (accumulator >= FIXED_STEP) { tick(state, FIXED_STEP, input.sample(FIXED_STEP)); accumulator -= FIXED_STEP; } }
        processEvents(); if (!state.won) updateGuide(dt); $('timer').textContent = formatTime(elapsed * 1000);
        const blend = ui.reduced ? 1 : 1 - Math.exp(-dt * 38);
        ui.visualHero.x += (state.hero.x - ui.visualHero.x) * blend; ui.visualHero.y += (state.hero.y - ui.visualHero.y) * blend;
      }
      if (ui.mode === 'playing' && state.hero.grounded && Math.abs(state.hero.vx) > 40 && !state.won) {
        ui.runPhase += Math.abs(state.hero.vx) * dt / 22;
        ui.footTimer += dt;
        if (ui.footTimer > .13 && !ui.reduced) {
          ui.footTimer = 0;
          ui.footprints.push({ x: state.hero.x - state.hero.facing * 14, y: state.hero.y + 24, age: 0 });
          if (ui.footprints.length > 20) ui.footprints.shift();
        }
      } else ui.footTimer = 0;
      ui.footprints.forEach(p => p.age += dt); ui.footprints = ui.footprints.filter(p => p.age < .65);
      for (const id of Object.keys(ui.springHits)) { ui.springHits[id] -= dt; if (ui.springHits[id] <= 0) delete ui.springHits[id]; }
      ui.arrival = Math.max(0, ui.arrival - dt);
      if (state.ball) { ui.trail.push({ x: state.ball.x, y: state.ball.y }); if (ui.trail.length > 16) ui.trail.shift(); }
      ui.particles.forEach(p => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; }); ui.particles = ui.particles.filter(p => p.age < p.life);
      ui.rings.forEach(r => r.age += dt); ui.rings = ui.rings.filter(r => r.age < .5);
      if (ui.teleport) { ui.teleport.age += dt; if (ui.teleport.age > .25) ui.teleport = null; }
      ui.squash *= Math.exp(-dt * 12); ui.shake *= Math.exp(-dt * 14);
      if (toastTime > 0) { toastTime -= dt; if (toastTime <= 0) $('toast').classList.remove('visible'); }
      if (ui.winDelay > 0) { ui.winDelay -= dt; if (ui.winDelay <= 0) openJourney(index, Math.min(index + 1, LEVELS.length - 1), index < LEVELS.length - 1); }
    }
    renderer.draw(state, ui, ui.animationTime, dt);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
platform.loadingFinished();
if (!progress.tutorialDone) start(0);
else { modal('welcome'); $('play').firstChild.textContent = progress.unlocked ? 'Continue adventure ' : "Let's leap "; }
