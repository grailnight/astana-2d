'use strict';
// Общие константы и помощники.

const TILE = 16;
const MAP_W = 120;
const MAP_H = 128;
const GAME_MIN_PER_SEC = 2; // 1 реальная секунда = 2 игровые минуты

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// f < 0 затемняет, f > 0 осветляет
function shade(hex, f) {
  let [r, g, b] = hexToRgb(hex);
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  const h = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const h = (i) => Math.round(lerp(A[i], B[i], t)).toString(16).padStart(2, '0');
  return '#' + h(0) + h(1) + h(2);
}

function fmtMoney(n) {
  const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (n < 0 ? '−' : '') + s + ' ₸';
}

function fmtClock(min) {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAYS_FULL = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

// День 1 — пятница, 30 октября 2026
function dayDate(day) { return new Date(2026, 9, 29 + day); }
function weekday(day) { return dayDate(day).getDay(); }
function fmtDate(day) {
  const d = dayDate(day);
  return WEEKDAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const Store = {
  get(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  },
  del(key) {
    try { localStorage.removeItem(key); } catch (e) { /* хранилище недоступно */ }
  },
};
