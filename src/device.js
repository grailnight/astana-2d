'use strict';
// Возможности телефона: полный экран, вибрация, экран не гаснет во время игры.

const Device = (() => {
  const prefs = Object.assign({ vibrate: true }, Store.get('astana-device') || {});
  let wakeLock = null;
  const touch = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function buzz(pattern) {
    if (!prefs.vibrate || !touch() || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) { /* вибрация недоступна */ }
  }

  function canFullscreen() {
    const el = document.documentElement;
    return !!(document.fullscreenEnabled && el.requestFullscreen);
  }
  function isFullscreen() { return !!document.fullscreenElement; }

  async function toggleFullscreen() {
    try {
      if (isFullscreen()) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function keepAwake() {
    if (!('wakeLock' in navigator) || document.hidden) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) { wakeLock = null; }
  }

  function init() {
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !wakeLock) keepAwake(); });
    // долгое нажатие на телефоне не должно открывать меню браузера
    document.addEventListener('contextmenu', (e) => { if (!e.target.closest('input, select')) e.preventDefault(); });
  }

  function setPref(k, v) { prefs[k] = v; Store.set('astana-device', prefs); }

  return { init, buzz, canFullscreen, isFullscreen, toggleFullscreen, keepAwake, prefs, setPref, touch };
})();
