import { BUILD } from './build-config.js';

const SDK_URLS = Object.freeze({
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
  poki: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js'
});
export function loadSDK(target, document = globalThis.document) {
  if (!SDK_URLS[target]) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URLS[target]; script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Platform SDK could not load.'));
    document.head.append(script);
  });
}

// An explicitly selected build loads only its own SDK. Initialization failures
// must not make the game unplayable outside a portal or with blocked resources.
export function createPlatform({ target = BUILD.target, host = globalThis,
  load = () => loadSDK(target), timeoutMs = 6000,
  onMute = () => {}, onBusy = () => {} } = {}) {
  let sdk, ready = false, active = false, loaded = false, busy = false, platformMute = false;
  const call = (object, name) => { try { object?.[name]?.(); } catch {} };
  const gameplay = playing => {
    if (!ready || busy && playing || playing === active) return;
    active = playing;
    call(target === 'crazygames' ? sdk.game : sdk, playing ? 'gameplayStart' : 'gameplayStop');
  };
  function settings(value) { platformMute = value?.muteAudio === true; onMute(platformMute || busy); }
  async function init() {
    if (target === 'local') return false;
    let timer, expired = false;
    try {
      await Promise.race([
        (async () => {
          await load();
          const candidate = target === 'crazygames' ? host.CrazyGames?.SDK : host.PokiSDK;
          if (!candidate?.init) throw new Error('SDK unavailable.');
          await candidate.init();
          if (!expired) sdk = candidate;
        })(),
        new Promise((_, reject) => { timer = setTimeout(() => { expired = true; reject(new Error('SDK initialization timed out.')); }, timeoutMs); })
      ]);
      ready = true;
      if (target === 'crazygames') {
        call(sdk.game, 'loadingStart');
        settings(sdk.game?.settings);
        sdk.game?.addSettingsChangeListener?.(settings);
      }
      return true;
    } catch { ready = false; sdk = undefined; return false; }
    finally { clearTimeout(timer); }
  }
  function loadingFinished() {
    if (!ready || loaded) return;
    loaded = true;
    call(target === 'crazygames' ? sdk.game : sdk, target === 'crazygames' ? 'loadingStop' : 'gameLoadingFinished');
  }
  async function continueAtBreak(action) {
    if (busy) return;
    gameplay(false);
    if (target !== 'poki' || !ready || !sdk.commercialBreak) { action(); return; }
    busy = true; onBusy(true);
    try {
      // No timeout here: never resume gameplay over a still-visible advert.
      await sdk.commercialBreak(() => onMute(true));
    } catch { /* An ad blocker or failed ad is not a gameplay blocker. */ }
    finally { busy = false; onMute(platformMute); onBusy(false); }
    action();
  }
  return { init, loadingFinished, start: () => gameplay(true), stop: () => gameplay(false),
    continueAtBreak, get ready() { return ready; }, get busy() { return busy; } };
}
