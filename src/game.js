'use strict';
// Состояние игры, время, характеристики, погода, сохранения.

const SAVE_KEY = 'astana-zhana-omir-v1';

// Форма слова по полу игрока: gx('пришёл', 'пришла')
function gx(m, f) { return G.s && G.s.base && G.s.base.female ? f : m; }

const G = {
  s: null,
  busy: 0,          // >0 — открыт диалог/меню, время стоит
  events: [],       // очередь асинхронных событий
  groundDirty: true,

  newState(profile) {
    return {
      v: 1,
      name: profile.name,
      base: profile.base,          // внешность: кожа, волосы, причёска, пол
      sportColor: profile.sportColor,
      day: 1, min: 9 * 60 + 40,
      money: 15000,
      energy: 85, food: 65, mood: 65, hyg: 80, maxEnergy: 100,
      xp: { kaz: 0, code: 0, charm: 0, fit: 0 },
      rel: { gulnar: 0, dauren: 25, aigerim: 0, arman: 0, saule: 0, erzhan: 0, mama: 60, timur: 0, zhanel: 0, alikhan: 0 },
      met: { mama: true, dauren: true },
      inv: {},
      clothes: { owned: ['sport'], outfit: 'sport', outer: null, hat: null },
      flags: {},
      daily: {},
      stats: { deliveries: 0, baristaShifts: 0, officeShifts: 0, goodShifts: 0, lessons: 0, toys: 0, gigs: 0 },
      crime: 0, ads: {}, jobTrack: null, paperDay: -1, crazy: 0, today: null, lastDay: null,
      quests: {},
      job: { hired: false, level: 0 },
      rent: { due: 7, amount: 20000, locked: false },
      delivery: null,
      weather: { kind: 'clear', until: 1440 + 9 * 60 + 40 + 240 },
      pos: { x: 21, y: 11, dir: 0 },
      love: { partner: null, dates: {}, engaged: false, married: false, lastSeen: {}, weddingDay: null, broken: 0 },
      known: {},          // что выяснил про вкусы персонажей
      msgs: [],           // сообщения в телефоне
      cards: [],          // найденные открытки
      medals: [],         // полученные медали
      talks3: 0,          // разговоров на три звезды
      homeId: 'home',
      ended: false,
    };
  },

  start(profile) {
    this.s = this.newState(profile);
    this.groundDirty = true;
  },

  save() {
    if (!this.s) return;
    const p = Ents.player;
    // в помещении сохраняем позицию у двери на улице
    this.s.pos = (typeof Inside !== 'undefined' && Inside.outsidePos()) || { x: p.x / TILE, y: p.y / TILE, dir: p.dir };
    Store.set(SAVE_KEY, this.s);
  },
  hasSave() { return !!Store.get(SAVE_KEY); },
  load(data) {
    const d = data || Store.get(SAVE_KEY);
    if (!d || d.v !== 1) return false;
    this.s = Object.assign(this.newState({ name: d.name, base: d.base, sportColor: d.sportColor }), d);
    this.groundDirty = true;
    return true;
  },
  wipe() { Store.del(SAVE_KEY); },

  /* ---------- время ---------- */
  now() { return this.s.day * 1440 + this.s.min; },
  hour() { return this.s.min / 60; },
  isNight() { const h = this.hour(); return h < 6.5 || h >= 18.5; },
  weekday() { return weekday(this.s.day); },
  isWeekend() { const w = this.weekday(); return w === 0 || w === 6; },
  season() { return this.s.day >= 7 ? 'winter' : 'autumn'; },

  // Мягкая «температура дня» с суточными колебаниями
  temp() {
    const d = this.s.day;
    const base = clamp(3 - (d - 1) * 1.6, -27, 3) + Math.sin(d * 1.7) * 2.5;
    const h = this.hour();
    let t = base + 3.5 * Math.cos(((h - 15) / 24) * Math.PI * 2);
    if (this.s.weather.kind === 'buran') t -= 6;
    return Math.round(t);
  },

  rollWeather() {
    const s = this.s, winter = this.season() === 'winter';
    const r = Math.random();
    let k;
    if (!winter) k = r < 0.4 ? 'clear' : r < 0.75 ? 'cloudy' : 'rain';
    else if (s.day >= 10) k = r < 0.35 ? 'clear' : r < 0.62 ? 'cloudy' : r < 0.88 ? 'snow' : 'buran';
    else k = r < 0.4 ? 'clear' : r < 0.65 ? 'cloudy' : 'snow';
    if (k === 'rain' && this.temp() < 0) k = 'snow';
    const prev = s.weather.kind;
    s.weather = { kind: k, until: this.now() + randi(180, 360) };
    if (k === 'buran' && prev !== 'buran') { UI.toast('Буран! На улице сильный ветер и мороз — лучше переждать в тепле.', 'bad'); Life.weatherAlert(k); }
  },

  warmth() {
    const c = this.s.clothes;
    let w = 0;
    for (const id of [c.outfit, c.outer, c.hat]) if (id && CLOTHES[id]) w += CLOTHES[id].warm || 0;
    return w;
  },
  needWarmth() {
    const t = this.temp();
    let n = t > -5 ? 0 : t > -12 ? 1 : t > -20 ? 2 : t > -28 ? 3 : 4;
    if (this.s.weather.kind === 'buran') n += 1;
    return n;
  },
  coldDeficit() { return Math.max(0, this.needWarmth() - this.warmth()); },

  // Продвигает время на m минут. opts.asleep, opts.outdoor, opts.walking
  advance(m, opts = {}) {
    const s = this.s;
    let left = m;
    while (left > 0) {
      const step = Math.min(left, 15);
      left -= step;
      const k = step / 60;
      if (opts.asleep) {
        s.energy += (s.food > 15 ? 13 : 7) * k;
        s.food -= 2.2 * k;
        s.hyg -= 1 * k;
      } else {
        s.hyg -= (2.6 + (opts.work || 0) * 0.6 + (opts.walking ? 0.6 : 0)) * k;
        s.energy -= (3 + (opts.walking ? 1.5 : 0) + (opts.work || 0)) * k;
        s.food -= 4 * k;
        if (opts.outdoor) {
          const def = this.coldDeficit();
          if (def > 0) { s.energy -= 5 * def * k; s.mood -= 3 * def * k; }
          if (s.weather.kind === 'rain') s.mood -= 1.5 * k;
        }
      }
      if (s.food <= 0) { s.energy -= 3 * k; s.mood -= 4 * k; }
      if (s.energy < 15 && !opts.asleep) s.mood -= 2 * k;
      s.mood += Math.sign(55 - s.mood) * Math.min(Math.abs(55 - s.mood), 1.5 * k);
      s.energy = clamp(s.energy, 0, s.maxEnergy);
      s.food = clamp(s.food, 0, 100);
      s.hyg = clamp(s.hyg, 0, 100);
      s.mood = clamp(s.mood, 0, 100);
      s.min += step;
      if (s.min >= 1440) { s.min -= 1440; s.day++; this.onNewDay(); }
      if (this.now() >= s.weather.until) this.rollWeather();
    }
    Life.needWarnings();
    if (s.energy <= 0 && !opts.asleep && !s.flags.fainting) {
      s.flags.fainting = true;
      this.events.push(() => Content.faint());
    }
    if (s.delivery && s.delivery.stage === 'drop' && this.now() > s.delivery.deadline && !s.delivery.late) {
      s.delivery.late = true;
      UI.toast('Заказ опаздывает — клиент недоволен, оплата будет меньше.', 'bad');
    }
  },

  onNewDay() {
    const s = this.s;
    s.daily = {};
    if (s.day === 7) { this.groundDirty = true; UI.toast('Выпал первый снег! В Астане начинается зима.', 'info'); }
    const over = s.day - s.rent.due;
    if (over === 0) UI.toast(`Сегодня последний день оплаты аренды (${fmtMoney(s.rent.amount)}).`, 'bad');
    if (over === 1) UI.toast('Аренда просрочена! Гульнар-апай ждёт оплату.', 'bad');
    if (over >= 3 && !s.rent.locked && s.homeId === 'home') { s.rent.locked = true; UI.toast('Гульнар-апай закрыла комнату до оплаты долга.', 'bad'); }
    if (s.delivery && s.delivery.stage === 'drop' && this.now() - s.delivery.deadline > 600) { s.delivery = null; UI.toast(`Заказ отменён: ты не ${gx('успел', 'успела')} его доставить.`, 'bad'); }
    Romance.onNewDay();
    Life.onNewDay();
    City.onNewDay();
    Fun.onNewDay();
    Day.onNewDay();
    this.events.push(() => Quests.onNewDay());
  },

  /* ---------- характеристики ---------- */
  add(stat, v) {
    const s = this.s;
    const max = stat === 'energy' ? s.maxEnergy : 100;
    s[stat] = clamp(s[stat] + v, 0, max);
  },
  earn(n, why) {
    this.s.money += n;
    Day.note('earn', n);
    UI.toast(`+${fmtMoney(n)}${why ? ' · ' + why : ''}`, 'good');
    Sfx.play('coin');
  },
  canPay(n) { return this.s.money >= n; },
  pay(n) {
    if (this.s.money < n) { UI.toast(`Не хватает денег: нужно ${fmtMoney(n)}`, 'bad'); Sfx.play('error'); return false; }
    this.s.money -= n;
    Day.note('spend', n);
    return true;
  },
  lv(skill) { return Math.floor(this.s.xp[skill] + 1e-6); },
  addXp(skill, v) {
    const before = this.lv(skill);
    this.s.xp[skill] = clamp(this.s.xp[skill] + v, 0, 10);
    const after = this.lv(skill);
    if (after > before) { UI.toast(`${SKILLS[skill].name}: уровень ${after}!`, 'quest'); Sfx.play('success'); }
  },
  addRel(id, v) {
    const s = this.s;
    s.rel[id] = clamp((s.rel[id] || 0) + v, 0, 100);
    Day.note('rel', id, v);
    if (v > 0) UI.toast(`${NPCS[id].name}: отношения +${v}`, 'info');
    if (v < 0) UI.toast(`${NPCS[id].name}: отношения ${v}`, 'bad');
  },
  flag(k, v) { if (v === undefined) return this.s.flags[k]; this.s.flags[k] = v; return v; },
  once(k) { if (this.s.daily[k]) return false; this.s.daily[k] = true; return true; },
  has(item) { return (this.s.inv[item] || 0) > 0; },
  give(item, n = 1) { this.s.inv[item] = (this.s.inv[item] || 0) + n; },
  take(item, n = 1) { this.s.inv[item] = Math.max(0, (this.s.inv[item] || 0) - n); if (!this.s.inv[item]) delete this.s.inv[item]; },
  owns(cloth) { return this.s.clothes.owned.includes(cloth); },
  wearsFormal() { const c = CLOTHES[this.s.clothes.outfit]; return !!(c && c.formal); },
  speedMul() {
    let m = this.has('scooter') ? 1.55 : 1;
    if (this.s.energy < 12) m *= 0.7;
    if (this.s.weather.kind === 'buran') m *= 0.8;
    return m;
  },

  look() {
    const s = this.s, c = s.clothes, b = s.base;
    const o = CLOTHES[c.outfit] || CLOTHES.sport;
    const L = {
      female: b.female, skin: b.skin, hair: b.hair, hairStyle: b.hairStyle,
      outfit: o.outfit, top: o.top || s.sportColor, bottom: o.bottom || shade(s.sportColor, -0.35), shoes: o.shoes || '#2a2420',
      outer: null, outerColor: null, hat: null, hatColor: null, glasses: b.glasses, bag: !!s.delivery,
      beard: !!b.beard, mustache: !!b.mustache, earrings: !!b.earrings, tights: b.female && this.season() === 'winter' ? '#2b2b2b' : null,
    };
    if (c.outfit === 'sport') { L.top = s.sportColor; L.bottom = shade(s.sportColor, -0.3); }
    if (c.outfit === 'gala' && b.female) { L.top = '#7a1f3d'; }
    if (c.outer) { const w = CLOTHES[c.outer]; L.outer = 'puffer'; L.outerColor = w.color; }
    if (c.hat) { const h = CLOTHES[c.hat]; L.hat = h.hat; L.hatColor = h.color; }
    return L;
  },
};
