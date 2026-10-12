import { LEVELS, worldLevels } from './levels.js';
export const formatTime = ms => { const hundredths = Math.round(Math.max(0, ms) / 10); return `${Math.floor(hundredths / 6000)}:${(hundredths % 6000 / 100).toFixed(2).padStart(5, '0')}`; };
export function readProgress(storage) {
  let saved;
  try { saved = JSON.parse(storage.getItem('slime-shift-v2') || storage.getItem('slime-shift-v1') || 'null'); } catch {}
  return { unlocked: Math.max(0, Math.min(LEVELS.length - 1, Number.isInteger(saved?.unlocked) ? saved.unlocked : 0)), best: saved?.best && typeof saved.best === 'object' ? saved.best : {}, times: saved?.times && typeof saved.times === 'object' ? saved.times : {}, worldTimes: cleanTimes(saved?.worldTimes), tutorialDone: saved?.tutorialDone === true, playerId: typeof saved?.playerId === 'string' ? saved.playerId : null, name: typeof saved?.name === 'string' ? saved.name : '' };
}
function cleanTimes(times) {
  return Object.fromEntries(Object.entries(times && typeof times === 'object' ? times : {}).filter(([, ms]) => Number.isFinite(ms) && ms > 0));
}
export function recordWorldTime(progress, world, ms) {
  if (!Number.isFinite(ms) || ms <= 0) return false;
  const old = progress.worldTimes[world] ?? Infinity;
  progress.worldTimes[world] = Math.min(old, Math.round(ms));
  return ms < old;
}
export function personalRecords(progress, world) {
  const rows = [];
  if (progress.worldTimes[world] != null) rows.push({ name: 'Complete world', ms: progress.worldTimes[world] });
  for (const { index, level } of worldLevels(world)) {
    const ms = progress.times[index];
    if (Number.isFinite(ms) && ms >= 0) rows.push({ name: level.name, ms });
  }
  return rows;
}
export function beginWorldRun(index) {
  const levels = worldLevels(LEVELS[index].world);
  return { world: LEVELS[index].world, next: index, ms: 0, valid: index === levels[0].index, completed: false };
}
export function finishRunLevel(run, index) {
  if (run.world !== LEVELS[index].world || run.next !== index) run.valid = false;
  run.next = index + 1;
  run.completed = worldLevels(run.world).at(-1).index === index;
  return run.valid && run.completed;
}
