'use strict';
// Котёнок: живёт дома, встречает у двери, просит еды и ласки. Сытый и довольный — дома уютнее.

const Pet = (() => {
  const s = () => G.s;
  const COLORS = {
    ginger: { name: 'рыжий', c: ['#e08a3a', '#c06a2a', '#f3b878'] },
    grey: { name: 'серый', c: ['#8a95a0', '#6d7780', '#d6dde3'] },
    black: { name: 'чёрный с белой грудкой', c: ['#2b2b33', '#1b1b22', '#f4f7f8'] },
    calico: { name: 'трёхцветный', c: ['#f4f0e6', '#e08a3a', '#3a3f48'] },
  };
  const NAMES = ['Мырза', 'Пушок', 'Тоқа', 'Сары', 'Ақтабан', 'Барсик-младший'];

  const has = () => !!(s() && s().pet);
  const pet = () => s().pet;
  const homeRoom = () => (s().flags.ownFlat ? 'flat' : 'home');

  /* ---------- спрайты ---------- */

  const cache = {};
  // кадры: 0 — сидит, 1/2 — идёт, 3 — спит клубком
  function sprite(color, f) {
    const key = color + f;
    if (cache[key]) return cache[key];
    const [a, d, l] = (COLORS[color] || COLORS.ginger).c;
    const cv = makeCanvas(14, 11), g = cv.getContext('2d');
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    if (f === 3) {
      R(2, 5, 10, 5, a); R(1, 6, 12, 3, a); R(3, 4, 4, 2, a); R(10, 7, 3, 2, d); R(4, 8, 6, 1, d); R(3, 5, 2, 1, d);
      R(4, 4, 1, 1, a); R(6, 4, 1, 1, a); R(5, 6, 1, 1, '#1a1622');
    } else {
      const leg = f === 1 ? 1 : f === 2 ? -1 : 0;
      R(3, 4, 7, 4, a); R(9, 1, 1, 4, a); R(10, 0, 1, 2, a); // тело и хвост
      R(1, 1, 4, 4, a); R(1, 0, 1, 1, a); R(4, 0, 1, 1, a); // голова и ушки
      R(2, 2, 1, 1, '#1a1622'); R(4, 2, 1, 1, '#1a1622'); R(3, 3, 1, 1, '#e8a0a8');
      R(2, 5, 3, 2, l); R(5, 5, 3, 1, d);
      R(3 + leg, 8, 1, 2, a); R(8 - leg, 8, 1, 2, a); R(3 + leg, 10, 1, 1, l); R(8 - leg, 10, 1, 1, l);
      if (color === 'calico') { R(6, 4, 3, 2, d); R(1, 1, 2, 1, '#3a3f48'); }
    }
    Art.outline(cv);
    cache[key] = cv;
    return cv;
  }

  /* ---------- взять котёнка ---------- */

  async function adopt(color = 'ginger', from = '') {
    const st = s();
    if (has()) { await UI.say(null, `У тебя уже есть ${pet().name}. Двое — это уже зоопарк.`); return false; }
    if (!st.flags.ownFlat && st.homeId === 'home') {
      await UI.say('gulnar', 'Котёнка? Ой-бай… Ладно, пусть живёт. Только шторы чтобы не драл, и лоток сам убирай!');
    }
    const names = NAMES.slice(0, 4).concat([pick(NAMES.slice(4))]);
    const i = await UI.ask(null, `${COLORS[color].name[0].toUpperCase() + COLORS[color].name.slice(1)} котёнок смотрит на тебя круглыми глазами. Как назовёшь?`, names);
    const name = names[i] || names[0];
    st.pet = { name, color, day: st.day, fed: st.day, happy: 70, from };
    G.give('catfood', 3);
    G.add('mood', 15);
    Sfx.play('success');
    UI.toast(`${name} теперь живёт у тебя! В сумке 3 пакетика корма.`, 'medal');
    Life.msg('mama', `Ты ${gx('завёл', 'завела')} котёнка?! Пришли фото! Только корми нормально, не одной колбасой.`);
    Life.checkMedals();
    return true;
  }

  /* ---------- жизнь в комнате ---------- */

  let R0 = null; // { x, y, tx, ty, mode, t, dir, f, say, until }
  function enter(def) {
    R0 = null;
    if (!has()) return;
    const room = Inside.room();
    if (!room || room.id !== homeRoom()) return;
    const night = G.hour() >= 23 || G.hour() < 6;
    const sx = def.rug ? def.rug[0] + 1 : 4, sy = def.rug ? def.rug[1] + 1 : 5;
    R0 = { x: sx * TILE + 8, y: sy * TILE + 10, tx: sx, ty: sy, mode: night ? 'sleep' : 'greet', t: 2, dir: 1, f: 0, say: night ? null : pick(['Мяу!', 'Мррр-мяу!', 'Мяяяу!']), until: Render.now() + 3 };
    if (pet().fed < s().day && !night) { R0.say = 'МЯУ! (еда где?)'; R0.until = Render.now() + 4; }
  }

  function free(tx, ty) { return !Inside.solidAt(tx, ty) && ty < Inside.room().def.H - 1; }

  function update(dt) {
    if (!R0 || !Inside.active()) return;
    const p = Ents.player;
    R0.t -= dt;
    const tgt = R0.goal;
    if (tgt) {
      const gx0 = tgt[0] * TILE + 8, gy0 = tgt[1] * TILE + 10;
      const dx = gx0 - R0.x, dy = gy0 - R0.y, L = Math.hypot(dx, dy);
      if (L < 1) { R0.goal = null; R0.tx = tgt[0]; R0.ty = tgt[1]; }
      else { const v = 26 * dt; R0.x += dx / L * Math.min(v, L); R0.y += dy / L * Math.min(v, L); if (Math.abs(dx) > 0.5) R0.dir = dx < 0 ? -1 : 1; R0.f = (R0.f + dt * 8) % 2; return; }
    }
    if (R0.t > 0) return;
    // выбор следующего шага: к игроку при встрече, иначе гуляет, сидит или спит
    const h = G.hour();
    if (h >= 23 || h < 6) { R0.mode = 'sleep'; R0.t = 5; return; }
    const ptx = Math.floor(p.x / TILE), pty = Math.floor((p.y - 4) / TILE);
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [R0.tx + a, R0.ty + b]).filter(([x, y]) => free(x, y));
    if (!opts.length) { R0.t = 2; return; }
    if (R0.mode === 'greet') {
      opts.sort((a, b) => Math.hypot(a[0] - ptx, a[1] - pty) - Math.hypot(b[0] - ptx, b[1] - pty));
      R0.goal = opts[0];
      if (Math.hypot(R0.tx - ptx, R0.ty - pty) <= 1.5) { R0.mode = 'sit'; R0.t = 4; R0.goal = null; }
      return;
    }
    if (chance(0.35)) { R0.mode = 'sit'; R0.t = rand(3, 7); return; }
    if (chance(0.08)) { R0.mode = 'sleep'; R0.t = rand(8, 15); return; }
    R0.mode = 'walk';
    R0.goal = pick(opts);
    R0.t = rand(0.2, 1.2);
  }

  function drawable() {
    if (!R0) return null;
    const moving = !!R0.goal;
    const f = R0.mode === 'sleep' && !moving ? 3 : moving ? 1 + Math.floor(R0.f) : 0;
    let img = sprite(pet().color, f);
    if (R0.dir > 0 && f !== 3) img = flipped(img);
    return { y: R0.y + 1, img, x: Math.round(R0.x - 7), top: Math.round(R0.y - 10), say: R0.say && Render.now() < R0.until ? R0.say : null, sayX: R0.x, sayY: R0.y - 12 };
  }

  const flipCache = new Map();
  function flipped(cv) {
    let f = flipCache.get(cv);
    if (!f) { f = makeCanvas(cv.width, cv.height); const g = f.getContext('2d'); g.translate(cv.width, 0); g.scale(-1, 1); g.drawImage(cv, 0, 0); flipCache.set(cv, f); }
    return f;
  }

  function meow(text) { if (R0) { R0.say = text; R0.until = Render.now() + 3; } }

  /* ---------- взаимодействие ---------- */

  function interactable(fx, fy) {
    if (!R0) return null;
    const d = Math.hypot(fx - R0.x, fy - R0.y + 2);
    if (d > 16) return null;
    return { pri: 0, d, label: pet().name, btn: ['КОТИК', 'cat'], x: R0.x, y: R0.y - 18, run: () => UI.openLocation(Inside.locId(), { only: /^$/, title: pet().name, compact: true, extra: acts, icon: 'cat' }) };
  }

  function acts() {
    const st = s(), pt = pet();
    return [
      { label: 'Погладить', icon: 'heart', time: 5, sub: 'настроение +3', run: async () => { G.advance(5); G.add('mood', 3); pt.happy = Math.min(100, pt.happy + 6); meow('Мррррр…'); UI.toast(`${pt.name} мурчит как трактор`, 'good'); } },
      {
        label: 'Покормить', icon: 'bowl', time: 5, sub: G.has('catfood') ? `корм: ${st.inv.catfood} шт.` : 'корм — в магазине 24/7',
        disabled: pt.fed === st.day ? 'сегодня уже ел' : !G.has('catfood') ? 'нет корма' : null,
        run: async () => { G.take('catfood'); pt.fed = st.day; pt.happy = Math.min(100, pt.happy + 15); G.advance(5); meow('Ням!'); UI.toast(`${pt.name} съел всё и вылизал миску`, 'good'); },
      },
      {
        label: 'Поиграть с бантиком', icon: 'joke', time: 15, sub: 'настроение +5', disabled: st.daily.petPlay ? 'котёнок устал и спит' : null,
        run: async () => { st.daily.petPlay = true; await UI.fade(`${pt.name} охотится на бантик, врезается в диван и делает вид, что так и задумано…`, async () => G.advance(15)); G.add('mood', 5); pt.happy = Math.min(100, pt.happy + 12); },
      },
      {
        label: 'Сфотографировать для мамы', icon: 'camera', time: 5, sub: 'раз в день', disabled: st.daily.petPhoto ? 'мама уже получила фото' : null,
        run: async () => { st.daily.petPhoto = true; G.advance(5); G.add('mood', 2); Life.msg('mama', pick([`Ой, какой хорошенький! Как ${pt.name} вырос!`, 'Папа поставил фото котика на заставку телефона.', 'Котик спит как ты в детстве — на спине, лапы кверху!'])); } },
      { label: 'Мяукнуть в ответ', icon: 'talk', time: 2, sub: 'чудачество', run: async () => { G.advance(2); meow('…?'); await UI.say(null, `Ты говоришь «мяу». ${pt.name} смотрит на тебя долго и с подозрением. Потом отвечает «мяу». Кажется, вы договорились о чём-то важном.`); Fun.absurd('meow', 1, 3); } },
    ];
  }

  /* ---------- день ---------- */

  function onNewDay() {
    if (!has()) return;
    const st = s(), pt = pet();
    pt.happy = Math.max(0, pt.happy - 8);
    if (pt.fed < st.day - 1) {
      pt.happy = Math.max(0, pt.happy - 15);
      Life.msg(st.flags.ownFlat ? 'mama' : 'gulnar', st.flags.ownFlat ? `Ты ${pt.name} кормишь? Котята растут, им есть надо!` : `${pt.name} всю ночь мяукал у моей двери. Кажется, голодный!`);
    }
  }

  const comfort = () => (has() && pet().happy >= 50 ? 8 : 0);
  function hooks(day) {
    if (!has()) return [];
    const pt = pet();
    const out = [];
    if (!G.has('catfood')) out.push(['cat', `У ${pt.name} закончился корм — купи в магазине 24/7.`]);
    else if (pt.happy < 40) out.push(['cat', `${pt.name} скучает. Поиграй с ним бантиком.`]);
    void day;
    return out;
  }

  return { has, pet, adopt, enter, update, drawable, interactable, onNewDay, comfort, hooks, meow, sprite, COLORS };
})();
