// Adapted from Echo Raid's centre-to-top instruction motion, with monotonic steps.
export function tutorialMotion(age, width, height, reduced = false) {
  const compact = height < 520, slide = reduced ? 1 : Math.max(0, Math.min(1, (age - 1.25) / .85));
  const eased = slide * slide * (3 - 2 * slide), mix = (a, b) => a + (b - a) * eased;
  return { y: mix(height * .38, compact ? 77 : 108), size: mix(compact ? 32 : 48, compact ? 19 : 26), opacity: reduced ? 1 : Math.min(1, age / .2), docked: slide === 1 };
}
export function guidance(state, step = 0, touch = false) {
  const level = state.level;
  if (level.label === '01') {
    const next = Math.max(step, state.support === 'finish' ? 2 : state.hero.x > 275 ? 1 : 0);
    return { step: next, title: ['A little slime. A big adventure.', 'Give it a little hop.', 'That glowing door is home.'][next], text: [touch ? 'Use the left and right arrows to move.' : 'Hold A / D or the arrow keys to move.', touch ? 'Tap ↑ near the edge to jump across the gap.' : 'Press W or Space near the edge to jump across.', 'Walk into the purple door to finish the level.'][next] };
  }
  if (level.label === '02') {
    const next = Math.max(step, state.shots > 0 ? 1 : 0, state.support === 'high' || state.support === 'finish' ? 2 : 0);
    return { step: next, title: ['Your secret is a little teleport.', 'Where it lands, you follow.', 'Nice! Find your way home.'][next], text: ['Drag left and down, then release to throw right and up. Try it anywhere on screen.', 'Aim for the next island. The dots show your path; longer pulls fly further.', 'The highest ledges need a throw, not a jump.'][next] };
  }
  return { step: 0, title: level.hint, text: level.lesson };
}
