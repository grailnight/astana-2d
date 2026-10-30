'use strict';
// Клавиатура и сенсорное управление (джойстик + кнопка действия).

const Input = (() => {
  const keys = new Set();
  const q = { action: false, phone: false, map: false };
  const stick = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
  const MOVE = {
    up: ['ArrowUp', 'w', 'W', 'ц', 'Ц'], down: ['ArrowDown', 's', 'S', 'ы', 'Ы'],
    left: ['ArrowLeft', 'a', 'A', 'ф', 'Ф'], right: ['ArrowRight', 'd', 'D', 'в', 'В'],
  };

  function init() {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (UI.blocking()) {
        if (e.key === 'Escape') UI.escape();
        if (e.key === 'Tab') e.preventDefault();
        return;
      }
      keys.add(e.key);
      if (e.repeat) return;
      if (['e', 'E', 'у', 'У', ' ', 'Enter'].includes(e.key)) { q.action = true; e.preventDefault(); }
      if (['Tab', 'q', 'Q', 'й', 'Й', 'p', 'P', 'з', 'З'].includes(e.key)) { q.phone = true; e.preventDefault(); }
      if (['m', 'M', 'ь', 'Ь'].includes(e.key)) q.map = true;
      if (e.key.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => keys.delete(e.key));
    window.addEventListener('blur', clear);

    const zone = document.getElementById('touch');
    const base = document.getElementById('stick');
    const knob = document.getElementById('knob');
    const act = document.getElementById('btn-act');
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse || 'ontouchstart' in window) zone.hidden = false;
    window.addEventListener('touchstart', () => { zone.hidden = false; }, { once: true, passive: true });

    zone.addEventListener('pointerdown', (e) => {
      if (e.target === act || UI.blocking()) return;
      if (e.clientX > window.innerWidth * 0.6) return;
      stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY;
      base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px';
      base.classList.add('on');
      knob.style.transform = 'translate(-50%, -50%)';
      zone.setPointerCapture(e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== stick.id) return;
      let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
      const R = 46, L = Math.hypot(dx, dy);
      if (L > R) { dx = dx / L * R; dy = dy / L * R; }
      stick.x = Math.abs(dx) > 6 ? dx / R : 0; stick.y = Math.abs(dy) > 6 ? dy / R : 0;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const end = (e) => {
      if (e.pointerId !== stick.id) return;
      stick.id = null; stick.x = 0; stick.y = 0;
      base.classList.remove('on');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    act.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (!UI.blocking()) q.action = true; });
  }

  function vector() {
    let x = 0, y = 0;
    const any = (list) => list.some((k) => keys.has(k));
    if (any(MOVE.left)) x -= 1;
    if (any(MOVE.right)) x += 1;
    if (any(MOVE.up)) y -= 1;
    if (any(MOVE.down)) y += 1;
    if (x || y) return { x, y };
    return { x: stick.x, y: stick.y };
  }

  function take(name) { const v = q[name]; q[name] = false; return v; }
  function clear() {
    keys.clear(); q.action = q.phone = q.map = false;
    stick.x = stick.y = 0; stick.id = null;
    const base = document.getElementById('stick');
    if (base) base.classList.remove('on');
  }

  return { init, vector, take, clear };
})();
