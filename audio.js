// Original Web Audio effects: soft jelly transients rather than sharp beeps.
// No downloads, music loop, or sound before the first player gesture.
const tone = (hz, end, length, volume, at = 0, type = 'sine', echo = false) => ({ hz, end, length, volume, at, type, echo });
const air = (length, volume, at = 0) => ({ type: 'noise', length, volume, at });

export function soundVoices(kind, detail = {}) {
  switch (kind) {
    case 'ui': return [tone(420, 670, .09, .046), tone(840, 780, .12, .014, .025)];
    case 'throw': return [tone(170, 110, .11, .06), tone(280, 640, .22, .042, .025, 'triangle'), air(.09, .014)];
    case 'jump': return [tone(190, 460, .17, .047), tone(380, 620, .13, .014, .04)];
    case 'landing': {
      const impact = Math.max(0, Math.min(1, (Number(detail.impact) || 180) / 650));
      return [tone(125, 65, .14, .02 + impact * .035), tone(270, 150, .11, .012 + impact * .01, .015)];
    }
    case 'respawn': return [tone(260, 410, .2, .03), tone(520, 650, .24, .019, .1)];
    case 'death': return [tone(300, 95, .24, .045), air(.1, .019), tone(220, 440, .24, .023, .23)];
    case 'teleport': return [tone(160, 540, .24, .048, 0, 'triangle', true), tone(660, 990, .3, .027, .08, 'sine', true), tone(330, 495, .26, .016, .12)];
    case 'portal': return [tone(330, 660, .26, .031, 0, 'sine', true), tone(880, 440, .32, .022, .06, 'sine', true)];
    case 'bounce': return [tone(115, 760, .31, .057, 0, 'triangle'), tone(380, 900, .19, .02, .035)];
    case 'ricochet': return [tone(420, 240, .12, .03), tone(840, 560, .09, .01, .02)];
    case 'miss': return [tone(260, 150, .2, .024), tone(390, 290, .19, .012, .035)];
    case 'switch': return [tone(440, 660, .2, .03, 0, 'sine', true), tone(880, 880, .25, .02, .08)];
    case 'explosion': return [tone(120, 48, .3, .05), air(.14, .027), tone(220, 90, .25, .025, .04, 'triangle')];
    case 'win': return [523.25, 659.25, 783.99, 1046.5].flatMap((hz, i) => [
      tone(hz, hz, .43, .035, i * .105, 'sine', true),
      tone(hz / 2, hz / 2, .34, .013, i * .105, 'triangle')
    ]);
    default: return [];
  }
}

// Rounded attack and a smooth tail that reaches genuine zero, avoiding the
// tiny clicks produced by stopping a still-audible oscillator.
export function soundEnvelope(length, volume, samples = 384) {
  const curve = new Float32Array(samples);
  const attack = Math.min(.024, length * .22) / length;
  for (let i = 1; i < samples - 1; i++) {
    const phase = i / (samples - 1);
    const level = phase < attack ? .5 - .5 * Math.cos(Math.PI * phase / attack) : Math.exp(-5 * (phase - attack) / (1 - attack)) * (1 - phase) / (1 - attack);
    curve[i] = volume * level;
  }
  return curve;
}

export function createSound({ createContext = () => new (window.AudioContext || window.webkitAudioContext)() } = {}) {
  let ctx, master, mix, shimmer, muted = false, suspendTimer, noise;
  const voices = new Set(), lastPlayed = new Map();
  const cooldown = { ui: .055, ricochet: .09, landing: .1, portal: .12, death: .3 };
  function buildMix() {
    const filter = ctx.createBiquadFilter(), compressor = ctx.createDynamicsCompressor();
    master = ctx.createGain(); mix = filter; shimmer = ctx.createDelay(.3);
    const echoGain = ctx.createGain(), feedback = ctx.createGain(), echoFilter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 3200; filter.Q.value = .5;
    compressor.threshold.value = -18; compressor.knee.value = 12; compressor.ratio.value = 3;
    compressor.attack.value = .004; compressor.release.value = .16;
    master.gain.value = .7;
    filter.connect(compressor); compressor.connect(master); master.connect(ctx.destination);
    shimmer.delayTime.value = .095; echoGain.gain.value = .16; feedback.gain.value = .16;
    echoFilter.type = 'lowpass'; echoFilter.frequency.value = 1800;
    shimmer.connect(echoFilter); echoFilter.connect(echoGain); echoGain.connect(filter);
    echoFilter.connect(feedback); feedback.connect(shimmer);
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .15), ctx.sampleRate);
    const data = noise.getChannelData(0);
    let seed = 17, smooth = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      smooth = smooth * .65 + ((seed / 4294967296) * 2 - 1) * .35;
      data[i] = smooth;
    }
  }
  function unlock() {
    if (muted) return;
    clearTimeout(suspendTimer);
    try {
      if (!ctx) { ctx = createContext(); buildMix(); }
      master.gain.setTargetAtTime(.7, ctx.currentTime, .015);
      if (ctx.state === 'suspended' || ctx.state === 'interrupted') void ctx.resume().catch(() => {});
    } catch { ctx = null; }
  }
  function quiet() {
    clearTimeout(suspendTimer);
    if (!ctx) return;
    master.gain.setTargetAtTime(0, ctx.currentTime, .012);
    for (const source of voices) { try { source.stop(ctx.currentTime + .06); } catch {} }
    // Fade before suspending, rather than cutting a waveform mid-cycle.
    suspendTimer = setTimeout(() => { if (ctx) void ctx.suspend().catch(() => {}); }, 75);
    lastPlayed.clear();
  }
  function voice(part, time) {
    const source = part.type === 'noise' ? ctx.createBufferSource() : ctx.createOscillator();
    const gain = ctx.createGain(), at = time + part.at;
    if (part.type === 'noise') source.buffer = noise;
    else {
      source.type = part.type;
      source.frequency.setValueAtTime(part.hz, at);
      source.frequency.exponentialRampToValueAtTime(part.end, at + part.length);
    }
    gain.gain.setValueCurveAtTime(soundEnvelope(part.length, part.volume), at, part.length);
    source.connect(gain); gain.connect(mix); if (part.echo) gain.connect(shimmer);
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
    source.start(at); source.stop(at + part.length + .005);
  }
  return {
    unlock,
    setMuted(value) { muted = !!value; if (muted) quiet(); else unlock(); },
    suspend: quiet,
    play(kind, detail) {
      if (!ctx || muted || ctx.state !== 'running') return;
      const t = ctx.currentTime, parts = soundVoices(kind, detail);
      if (!parts.length || voices.size + parts.length > 24 || t - (lastPlayed.get(kind) ?? -Infinity) < (cooldown[kind] || 0)) return;
      lastPlayed.set(kind, t);
      for (const part of parts) voice(part, t);
    }
  };
}
