const MOVEMENT = new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
const FALLBACK = { a: 'KeyA', d: 'KeyD', w: 'KeyW', s: 'KeyS', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', arrowup: 'ArrowUp', arrowdown: 'ArrowDown', ' ': 'Space', space: 'Space' };
const JUMP = new Set(['KeyW', 'ArrowUp', 'Space']);
export function movementCode(event) { return MOVEMENT.has(event.code) ? event.code : FALLBACK[(event.key || '').toLowerCase()] || null; }

export function createInput() {
  const keys = new Set(), touch = new Map();
  let jumpQueued = false, tapAxis = 0, tapTime = 0;
  return {
    keyDown(event) {
      const code = movementCode(event); if (!code) return false;
      if (JUMP.has(code) && !keys.has(code) && !event.repeat) jumpQueued = true;
      if (code === 'KeyD' || code === 'ArrowRight') { tapAxis = 1; tapTime = .065; }
      if (code === 'KeyA' || code === 'ArrowLeft') { tapAxis = -1; tapTime = .065; }
      keys.add(code); return true;
    },
    keyUp(event) { keys.delete(movementCode(event)); },
    touchDown(id, control) { touch.set(id, control); if (control === 'jump') jumpQueued = true; },
    touchUp(id) { touch.delete(id); },
    clear() { keys.clear(); touch.clear(); jumpQueued = false; tapAxis = 0; tapTime = 0; },
    sample(dt) {
      const buttons = [...touch.values()];
      const right = keys.has('KeyD') || keys.has('ArrowRight') || buttons.includes('right');
      const left = keys.has('KeyA') || keys.has('ArrowLeft') || buttons.includes('left');
      const held = Number(right) - Number(left);
      const move = right || left ? held : tapTime > 0 ? tapAxis : 0;
      const jump = jumpQueued || keys.has('KeyW') || keys.has('ArrowUp') || keys.has('Space') || buttons.includes('jump');
      const crouch = keys.has('KeyS') || keys.has('ArrowDown');
      tapTime = Math.max(0, tapTime - dt); jumpQueued = false;
      return { move, jump, crouch };
    }
  };
}
