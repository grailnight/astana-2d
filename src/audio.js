'use strict';
// Звуки на WebAudio: эффекты интерфейса и тихая «домбровая» музыка.

const Sfx = (() => {
  let ac = null, master = null, musicGain = null, musicTimer = 0;
  const prefs = Store.get('astana-audio') || { sfx: true, music: true };

  function ensure() {
    if (ac) return ac;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      musicGain = ac.createGain(); musicGain.gain.value = 0.18; musicGain.connect(master);
    } catch (e) { ac = null; }
    return ac;
  }

  // Щипковый звук, похожий на домбру: короткая атака, быстрое затухание
  function pluck(freq, dur, dest, vol = 0.3, when = 0) {
    if (!ensure()) return;
    const t = ac.currentTime + when;
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o1.type = 'triangle'; o1.frequency.value = freq;
    o2.type = 'sawtooth'; o2.frequency.value = freq * 1.003;
    f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 6, t); f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ac.createGain(); g2.gain.value = 0.25;
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(f); f.connect(dest || master);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  function beep(freq, dur, type = 'square', vol = 0.12, when = 0, slide = 0) {
    if (!ensure()) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  const SOUNDS = {
    click: () => beep(660, 0.05, 'square', 0.06),
    tick: () => beep(880, 0.04, 'triangle', 0.08),
    coin: () => { beep(988, 0.07, 'square', 0.07); beep(1319, 0.12, 'square', 0.07, 0.06); },
    error: () => beep(180, 0.18, 'sawtooth', 0.08, 0, 0.7),
    door: () => { beep(320, 0.08, 'triangle', 0.1); beep(240, 0.1, 'triangle', 0.08, 0.07); },
    success: () => { pluck(587, 0.4, null, 0.25); pluck(740, 0.4, null, 0.22, 0.09); pluck(880, 0.6, null, 0.22, 0.18); },
    quest: () => { pluck(440, 0.35, null, 0.22); pluck(659, 0.5, null, 0.2, 0.12); },
    honk: () => { beep(415, 0.16, 'square', 0.06); beep(415, 0.2, 'square', 0.06, 0.2); },
    ring: () => { for (let i = 0; i < 3; i++) beep(1046, 0.08, 'sine', 0.08, i * 0.12); },
  };

  const BUZZ = { coin: 15, error: [30, 40, 30], honk: 25, success: [15, 30, 15], ring: [40, 60, 40] };

  function play(name) {
    if (BUZZ[name]) Device.buzz(BUZZ[name]);
    if (!prefs.sfx || !SOUNDS[name]) return;
    try { SOUNDS[name](); } catch (e) { /* звук не критичен */ }
  }

  function tone(freq, dur) { if (prefs.sfx) pluck(freq, dur, null, 0.22); }

  // Музыка: случайные фразы в ладу ре-минорной пентатоники, как наигрыш на домбре
  const SCALE = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0];
  function musicLoop() {
    if (!prefs.music || !ac) return;
    const beat = 0.32;
    let deg = randi(2, 5);
    for (let i = 0; i < 16; i++) {
      if (i % 4 === 0) pluck(SCALE[0] / (i % 8 ? 1 : 2) * 1, beat * 3, musicGain, 0.16, i * beat);
      if (chance(0.78)) {
        deg = clamp(deg + pick([-2, -1, -1, 0, 1, 1, 2]), 1, SCALE.length - 1);
        pluck(SCALE[deg], beat * 1.6, musicGain, 0.2, i * beat + (i % 2 ? 0.02 : 0));
        if (chance(0.2)) pluck(SCALE[deg], beat * 0.8, musicGain, 0.12, i * beat + beat / 2);
      }
    }
    musicTimer = setTimeout(musicLoop, 16 * beat * 1000 + randi(1500, 5000));
  }

  function unlock() {
    if (!ensure()) return;
    if (ac.state === 'suspended') ac.resume();
    if (prefs.music && !musicTimer) musicLoop();
  }

  function setPref(k, v) {
    prefs[k] = v;
    Store.set('astana-audio', prefs);
    if (k === 'music') {
      if (v) { if (!musicTimer) { ensure(); musicLoop(); } }
      else { clearTimeout(musicTimer); musicTimer = 0; }
    }
  }

  return { play, tone, unlock, prefs, setPref };
})();
