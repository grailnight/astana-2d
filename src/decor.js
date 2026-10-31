'use strict';
// Обустройство дома: каталог мебели и декора, места под вещи в комнатах, уют.
// Уют делает сон и утро приятнее, растения просят полива — маленький повод заглядывать домой.

const Decor = (() => {
  const s = () => G.s;

  // cat: rug — ковёр, wall — обои, bed — покрывало, sofa — диван, deco — на стену (size — ширина в клетках), floor — на пол
  const CATALOG = {
    rug_red: { name: 'Красный ковёр с орнаментом', cat: 'rug', price: 0, comfort: 6, colors: ['#7a1f1f', '#f2c14e'] },
    rug_blue: { name: 'Синий текемет', cat: 'rug', price: 9000, comfort: 8, colors: ['#2a6f97', '#eef6fa'] },
    rug_syrmak: { name: 'Сырмак ручной работы', cat: 'rug', price: 18000, comfort: 12, colors: ['#c97a2e', '#3b2a20'] },
    rug_grey: { name: 'Серый ковёр', cat: 'rug', price: 6000, comfort: 5, colors: ['#8a95a0', '#d6dde3'] },
    wall_white: { name: 'Белые обои', cat: 'wall', price: 0, comfort: 3, wall: '#eef2f4', pat: '#e2e8ec', trim: '#9aa4ad' },
    wall_beige: { name: 'Бежевые обои', cat: 'wall', price: 0, comfort: 3, wall: '#e6d5b0', pat: '#d8c49a', trim: '#8a6a45' },
    wall_mint: { name: 'Мятные обои', cat: 'wall', price: 7000, comfort: 6, wall: '#cfe8dc', pat: '#b9dccb', trim: '#5e8a74' },
    wall_peach: { name: 'Персиковые обои', cat: 'wall', price: 7000, comfort: 6, wall: '#f4d3bd', pat: '#e8bfa3', trim: '#a8744a' },
    wall_orn: { name: 'Обои с казахским орнаментом', cat: 'wall', price: 14000, comfort: 10, wall: '#ece0c4', pat: '#c9a24a', trim: '#7a1f1f', ornament: true },
    bed_blue: { name: 'Синее покрывало', cat: 'bed', price: 0, comfort: 3, color: '#2a6f97' },
    bed_mustard: { name: 'Горчичное покрывало', cat: 'bed', price: 0, comfort: 3, color: '#e8a317' },
    bed_red: { name: 'Покрывало с орнаментом', cat: 'bed', price: 5000, comfort: 6, color: '#a3262a' },
    bed_pink: { name: 'Розовое покрывало', cat: 'bed', price: 4000, comfort: 5, color: '#d98ca8' },
    bed_green: { name: 'Зелёное покрывало', cat: 'bed', price: 4000, comfort: 5, color: '#3f8f4a' },
    sofa_dark: { name: 'Тёмный диван', cat: 'sofa', price: 0, comfort: 4, color: '#3a3f4a', pillow: '#2ec4e6' },
    sofa_blue: { name: 'Синий диван', cat: 'sofa', price: 25000, comfort: 8, color: '#2a6f97', pillow: '#f2c14e' },
    sofa_mustard: { name: 'Горчичный диван', cat: 'sofa', price: 25000, comfort: 8, color: '#c99a2e', pillow: '#3f6f8f' },
    sofa_velvet: { name: 'Бархатный диван', cat: 'sofa', price: 40000, comfort: 12, color: '#5b3a6e', pillow: '#f2c14e' },
    tuskiiz: { name: 'Тұскиіз — настенный ковёр', cat: 'deco', size: 2, price: 15000, comfort: 10, paint: 'kilim' },
    shelf: { name: 'Полка с книгами', cat: 'deco', size: 2, price: 6000, comfort: 5, paint: 'shelf' },
    kzmap: { name: 'Карта Казахстана', cat: 'deco', size: 2, price: 4000, comfort: 4, paint: 'kzmap' },
    baiterek_pic: { name: 'Картина «Байтерек»', cat: 'deco', size: 1, price: 5000, comfort: 5, paint: 'picture' },
    mama_photo: { name: 'Фото с мамой', cat: 'deco', size: 1, price: 1500, comfort: 6, paint: 'photo' },
    dombra: { name: 'Домбра на стену', cat: 'deco', size: 1, price: 12000, comfort: 7, paint: 'dombra' },
    poster: { name: 'Постер «Астана»', cat: 'deco', size: 1, price: 2500, comfort: 3, paint: 'poster' },
    ficus: { name: 'Фикус в горшке', cat: 'floor', price: 4500, comfort: 6, furn: 'plant', plant: true },
    monstera: { name: 'Монстера', cat: 'floor', price: 9000, comfort: 8, furn: 'bigplant', plant: true },
    aquarium: { name: 'Аквариум с рыбками', cat: 'floor', price: 30000, comfort: 12, furn: 'aquarium', w: 2 },
    console: { name: 'Игровая приставка', cat: 'floor', price: 60000, comfort: 8, furn: 'console', w: 2 },
    bike: { name: 'Велотренажёр', cat: 'floor', price: 35000, comfort: 4, furn: 'bike' },
    bookcase: { name: 'Книжный шкаф', cat: 'floor', price: 20000, comfort: 8, furn: 'bookcase' },
    shanyrak: { name: 'Торшер-шаңырақ', cat: 'floor', price: 16000, comfort: 9, furn: 'shanyrak' },
    lamp: { name: 'Торшер', cat: 'floor', price: 7000, comfort: 4, furn: 'lamp' },
    beanbag: { name: 'Кресло-мешок', cat: 'floor', price: 12000, comfort: 7, furn: 'beanbag' },
  };

  // Места под вещи. По умолчанию — то, что стоит в комнате изначально (вещи хозяйки или застройщика).
  const SLOTS = {
    home: {
      rug: { cat: 'rug', name: 'Ковёр на полу', def: 'rug_red' },
      bed: { cat: 'bed', name: 'Покрывало', def: 'bed_blue' },
      w1: { cat: 'deco', name: 'Стена над кроватью', x: 1, size: 2, def: 'tuskiiz' },
      w2: { cat: 'deco', name: 'Стена у часов', x: 3, size: 1, def: 'baiterek_pic' },
      w3: { cat: 'deco', name: 'Стена у шкафа', x: 9, size: 1, def: 'dombra' },
      f1: { cat: 'floor', name: 'Угол у кровати', x: 3, y: 3, def: null },
      f2: { cat: 'floor', name: 'Между ТВ и столом', x: 6, y: 3, def: null },
      f3: { cat: 'floor', name: 'Угол у душа', x: 1, y: 7, def: 'ficus' },
    },
    flat: {
      rug: { cat: 'rug', name: 'Ковёр в гостиной', def: 'rug_blue' },
      wall: { cat: 'wall', name: 'Обои', def: 'wall_white' },
      bed: { cat: 'bed', name: 'Покрывало', def: 'bed_mustard' },
      sofa: { cat: 'sofa', name: 'Диван', def: 'sofa_dark' },
      w1: { cat: 'deco', name: 'Стена над кроватью', x: 1, size: 2, def: 'baiterek_pic' },
      w2: { cat: 'deco', name: 'Стена над ТВ', x: 9, size: 2, def: 'shelf' },
      f1: { cat: 'floor', name: 'У окна', x: 7, y: 3, def: 'ficus' },
      f2: { cat: 'floor', name: 'Угол у кровати', x: 3, y: 3, def: null },
      f3: { cat: 'floor', name: 'Гостиная', x: 7, y: 9, def: null, w2: true },
    },
  };
  const BASE_COMFORT = { home: 8, flat: 16 };

  function state() {
    const st = s();
    if (!st.decor) st.decor = { owned: [], home: {}, flat: {}, water: {} };
    if (!st.decor.water) st.decor.water = {};
    return st.decor;
  }
  const homeRoom = () => (s().flags.ownFlat ? 'flat' : 'home');
  const fits = (slot, id) => {
    const it = CATALOG[id];
    if (!it || it.cat !== slot.cat) return false;
    if (it.cat === 'deco') return (it.size || 1) <= slot.size;
    if (it.cat === 'floor' && it.w === 2) return !!slot.w2;
    return true;
  };

  // что сейчас стоит в месте: id, null — пусто
  function placed(room, key) {
    const d = state(), slot = SLOTS[room][key];
    const v = d[room][key];
    if (v === undefined) return slot.def;
    if (v === 'none') return null;
    return v;
  }

  // Растения: полить раз в день; через три дня без воды вянут
  const plantKey = (room, key) => room + ':' + key;
  function lastWater(room, key) {
    const w = state().water;
    const k = plantKey(room, key);
    if (w[k] == null) w[k] = s().day; // новое растение считается политым в день появления
    return w[k];
  }
  const wilted = (room, key) => s().day - lastWater(room, key) >= 3;
  // сколько растений дома не поливали два дня и больше
  function thirsty() {
    const room = homeRoom();
    let n = 0;
    for (const key of Object.keys(SLOTS[room])) {
      const id = placed(room, key);
      if (id && CATALOG[id].plant && s().day - lastWater(room, key) >= 2) n++;
    }
    return n;
  }

  function comfort(room = homeRoom()) {
    let c = BASE_COMFORT[room] || 0;
    for (const key of Object.keys(SLOTS[room] || {})) {
      const id = placed(room, key);
      if (!id) continue;
      if (CATALOG[id].plant && wilted(room, key)) continue;
      c += CATALOG[id].comfort;
    }
    return Math.min(100, c);
  }

  /* ---------- сборка комнаты ---------- */

  function build(rid, base) {
    const def = { ...base, items: base.items.map((it) => ({ ...it, _cv: null })), deco: base.deco.slice() };
    const slots = SLOTS[rid];
    if (!slots) return def;
    for (const [key, slot] of Object.entries(slots)) {
      const id = placed(rid, key);
      if (!id) continue;
      const it = CATALOG[id];
      if (slot.cat === 'rug' && def.rug) def.rug = [...def.rug.slice(0, 4), ...it.colors];
      if (slot.cat === 'wall') Object.assign(def, { wall: it.wall, pat: it.pat, trim: it.trim, ornament: !!it.ornament });
      if (slot.cat === 'bed') { const b = def.items.find((x) => x.k === 'bed'); if (b) b.color = it.color; }
      if (slot.cat === 'sofa') { const b = def.items.find((x) => x.k === 'sofa'); if (b) { b.color = it.color; b.pillow = it.pillow; } }
      if (slot.cat === 'deco') def.deco.push([it.paint, slot.x + ((slot.size - (it.size || 1)) / 2), it.size || 1]);
      if (slot.cat === 'floor') {
        const w = it.w || 1;
        def.items.push({
          k: it.furn, x: slot.x, y: slot.y, w, h: 1, solid: true, name: it.name, wilted: it.plant && wilted(rid, key),
          btn: ITEM_BTN[id] || ['СМОТРЕТЬ', 'star'], custom: () => itemActs(rid, key, id), decorId: id,
        });
      }
    }
    return def;
  }

  const ITEM_BTN = {
    ficus: ['ПОЛИТЬ', 'leaf'], monstera: ['ПОЛИТЬ', 'leaf'], aquarium: ['РЫБКИ', 'star'], console: ['ИГРАТЬ', 'tv'],
    bike: ['КРУТИТЬ', 'dumbbell'], bookcase: ['ЧИТАТЬ', 'book'], beanbag: ['СЕСТЬ', 'clock'], shanyrak: ['СВЕТ', 'sun'], lamp: ['СВЕТ', 'sun'],
  };

  function itemActs(room, key, id) {
    const st = s();
    const it = CATALOG[id];
    const out = [];
    if (it.plant) {
      const watered = state().water[plantKey(room, key)] === st.day;
      out.push({
        label: 'Полить ' + (id === 'ficus' ? 'фикус' : 'монстеру'), icon: 'drop', time: 5, sub: watered ? 'уже полит сегодня' : wilted(room, key) ? 'совсем завял — спасай!' : 'раз в день · уют',
        disabled: watered ? 'сегодня уже полит' : null,
        run: async () => { state().water[plantKey(room, key)] = st.day; G.advance(5); G.add('mood', 2); UI.toast('Растение довольно. Уют дома сохраняется.', 'good'); Inside.refresh(); },
      });
    }
    if (id === 'aquarium') {
      out.push({ label: 'Смотреть на рыбок', icon: 'star', time: 20, sub: 'настроение +5', run: async () => { await UI.fade('Рыбки медленно плавают туда-сюда…', async () => G.advance(20)); G.add('mood', 5); } });
      out.push({ label: 'Покормить рыбок', icon: 'bowl', time: 5, sub: 'раз в день', disabled: st.daily.fish ? 'уже покормлены' : null, run: async () => { st.daily.fish = true; G.advance(5); G.add('mood', 2); UI.toast('Рыбки устроили толкучку у корма', 'good'); } });
    }
    if (id === 'console') out.push({ label: 'Поиграть в приставку', icon: 'tv', time: 60, sub: 'настроение +10 · энергия −3', run: async () => { await UI.fade('«Ещё один уровень — и спать»…', async () => G.advance(60)); G.add('mood', 10); G.add('energy', -3); } });
    if (id === 'bike') out.push({ label: 'Покрутить педали', icon: 'dumbbell', time: 30, sub: 'выносливость + · гигиена −10', disabled: st.energy < 15 ? gx('слишком устал', 'слишком устала') : null, run: async () => { await UI.fade('Двадцать километров, не выходя из дома…', async () => G.advance(30, { work: 5 })); G.addXp('fit', 0.12); G.add('hyg', -10); s().maxEnergy = 100 + G.lv('fit') * 4; } });
    if (id === 'bookcase') out.push({ label: 'Почитать книгу', icon: 'book', time: 45, sub: G.has('book') ? 'настроение +6 · казахский +' : 'настроение +6', run: async () => { await UI.fade('Страница за страницей…', async () => G.advance(45)); G.add('mood', 6); if (G.has('book')) G.addXp('kaz', 0.08); } });
    if (id === 'beanbag') out.push({ label: 'Плюхнуться в кресло-мешок', icon: 'clock', time: 15, sub: 'энергия +4 · настроение +2', run: async () => { G.advance(15); G.add('energy', 4); G.add('mood', 2); UI.toast('Пуф! Кресло-мешок принял тебя как родного.', 'good'); } });
    if (id === 'shanyrak' || id === 'lamp') out.push({ label: 'Посидеть в тёплом свете', icon: 'sun', time: 15, sub: 'настроение +3', run: async () => { G.advance(15); G.add('mood', 3); } });
    return out;
  }

  /* ---------- магазин и перестановка ---------- */

  const CATS = [['floor', 'Мебель'], ['deco', 'На стену'], ['rug', 'Ковры'], ['bed', 'Покрывала'], ['sofa', 'Диваны'], ['wall', 'Обои']];

  function preview(id) {
    const it = CATALOG[id];
    const cv = makeCanvas(36, 36), g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    if (it.cat === 'rug') { R(2, 8, 32, 20, it.colors[1]); R(4, 10, 28, 16, it.colors[0]); for (let x = 7; x < 30; x += 7) { R(x, 15, 4, 1, it.colors[1]); R(x + 1, 14, 2, 3, it.colors[1]); } }
    else if (it.cat === 'wall') { R(0, 0, 36, 36, it.wall); for (let y = 2; y < 36; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < 36; x += 6) R(x, y, 1, 2, it.pat); R(0, 32, 36, 4, it.trim); }
    else if (it.cat === 'bed' || it.cat === 'sofa') { R(4, 10, 28, 18, it.color); R(4, 10, 28, 3, shade(it.color, 0.25)); R(4, 25, 28, 3, shade(it.color, -0.3)); if (it.pillow) R(8, 12, 6, 4, it.pillow); }
    else if (it.cat === 'floor') {
      const src = Inside.furniture(it.furn, { color: '#e8a317' });
      const k = Math.min(1, 34 / Math.max(src.width, src.height));
      g.drawImage(src, Math.round((36 - src.width * k) / 2), Math.round(36 - src.height * k - 1), Math.round(src.width * k), Math.round(src.height * k));
    } else {
      const w = Inside.wallPreview(it.paint, it.size || 1);
      const k = Math.min(1, 36 / w.width);
      g.drawImage(w, Math.round((36 - w.width * k) / 2), 0, Math.round(w.width * k), Math.round(w.height * k));
    }
    return cv.toDataURL();
  }

  function autoPlace(id) {
    const room = homeRoom();
    const d = state();
    const it = CATALOG[id];
    const keys = Object.keys(SLOTS[room]).filter((k) => fits(SLOTS[room][k], id));
    if (!keys.length) return null;
    // большие категории (ковёр, обои, диван, покрывало) — заменяем сразу; мебель — в пустое место
    // сначала пустое место, потом место с вещью хозяйки похуже (и подходящего размера), свои вещи не трогаем
    const free = keys.find((k) => !placed(room, k));
    const replaceable = keys.filter((k) => placed(room, k) && !d.owned.includes(placed(room, k)))
      .sort((a, b) => ((SLOTS[room][a].size || 1) !== (it.size || 1)) - ((SLOTS[room][b].size || 1) !== (it.size || 1)) || CATALOG[placed(room, a)].comfort - CATALOG[placed(room, b)].comfort);
    const key = it.cat === 'floor' || it.cat === 'deco' ? free || replaceable[0] : keys[0];
    if (!key) return null;
    d[room][key] = id;
    return SLOTS[room][key].name;
  }

  function shop() {
    return new Promise((resolve) => {
      const st = s(), d = state();
      let cat = 'floor';
      const el = document.createElement('div');
      el.className = 'sheet decor-shop fx-panel';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Мебель и декор');
      const render = () => {
        const room = homeRoom();
        const list = Object.keys(CATALOG).filter((id) => CATALOG[id].cat === cat && CATALOG[id].price > 0);
        const cantRoom = (id) => !Object.values(SLOTS[room]).some((sl) => fits(sl, id));
        el.innerHTML = `<header class="sheet-head"><span class="fx-gold">Мебель и декор</span><small>${fmtMoney(st.money)} · уют дома ${comfort()}/100</small></header>
          <div class="chips ds-tabs">${CATS.map(([k, n]) => `<button class="chip-btn ${k === cat ? 'fx-btn on' : 'fx-tile'}" data-cat="${k}">${n}</button>`).join('')}</div>
          <div class="ds-grid">${list.map((id) => {
            const it = CATALOG[id], own = d.owned.includes(id);
            const no = cantRoom(id) ? (room === 'home' ? 'Гульнар-апай не разрешает' : 'некуда поставить') : null;
            return `<div class="ds-card fx-tile ${own ? 'own' : ''}"><img alt="" src="${preview(id)}"><b>${escapeHtml(it.name)}</b><small>уют +${it.comfort}</small>
              ${own ? '<em>куплено</em>' : no ? `<em class="no">${no}</em>` : `<button class="btn small ${G.canPay(it.price) ? 'fx-gold' : 'fx-off'}" data-buy="${id}">${fmtMoney(it.price)}</button>`}</div>`;
          }).join('')}</div>
          <p class="note">Покупки привозят домой и сразу ставят на свободное место. Переставить можно у шкафа: «Обустроить комнату».</p>
          <footer class="loc-foot"><button class="btn fx-red" data-close>${UIKit.img('back')}Назад</button></footer>`;
      };
      render();
      UI.pushModal(el);
      el.addEventListener('click', (e) => {
        const c = e.target.closest('[data-cat]');
        if (c) { cat = c.dataset.cat; Sfx.play('click'); render(); return; }
        const b = e.target.closest('[data-buy]');
        if (b) {
          const id = b.dataset.buy;
          if (!G.pay(CATALOG[id].price)) return;
          d.owned.push(id);
          const where = autoPlace(id);
          Sfx.play('coin');
          UI.toast(`${CATALOG[id].name} — ${where ? 'стоит дома: ' + where.toLowerCase() : 'ждёт дома'}`, 'good');
          Life.checkMedals();
          render();
          return;
        }
        if (e.target.closest('[data-close]')) { Sfx.play('click'); UI.popModal(el); resolve(); }
      });
    });
  }

  // Перестановка: для каждого места — что поставить из купленного
  function arrange() {
    return new Promise((resolve) => {
      const room = Inside.room() ? Inside.room().id : homeRoom();
      if (!SLOTS[room]) { resolve(); return; }
      const d = state();
      const el = document.createElement('div');
      el.className = 'sheet decor-arrange fx-panel';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Обустройство');
      const render = () => {
        el.innerHTML = `<header class="sheet-head"><span class="fx-gold">Обустройство</span><small>Уют: ${comfort(room)}/100${room === 'home' ? ' · комната у Гульнар-апай' : ' · своя квартира'}</small></header>
          <div class="da-body">${Object.entries(SLOTS[room]).map(([key, slot]) => {
            const cur = placed(room, key);
            const opts = [];
            if (slot.def) opts.push([slot.def, CATALOG[slot.def].name + (slot.def && !d.owned.includes(slot.def) && CATALOG[slot.def].price > 0 ? ' (было)' : '')]);
            if (slot.cat === 'floor' || slot.cat === 'deco') opts.push(['none', 'Пусто']);
            for (const id of d.owned) if (fits(slot, id) && id !== slot.def) opts.push([id, CATALOG[id].name]);
            return `<div class="fld"><span>${escapeHtml(slot.name)}</span><div class="chips">${opts.map(([id, n]) => `<button class="chip-btn ${(cur || 'none') === id ? 'fx-btn on' : 'fx-tile'}" data-slot="${key}" data-id="${id}">${escapeHtml(n)}</button>`).join('')}</div></div>`;
          }).join('')}</div>
          <p class="note">Новые вещи — в «Самал Плазе», отдел «Мебель и декор».</p>
          <footer class="loc-foot"><button class="btn fx-gold" data-close>${UIKit.img('door')}Готово</button></footer>`;
      };
      render();
      UI.pushModal(el);
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-slot]');
        if (b) {
          const key = b.dataset.slot, id = b.dataset.id;
          // вещь одна: убираем её из других мест во всех комнатах
          if (id !== 'none' && d.owned.includes(id)) for (const r of Object.keys(SLOTS)) for (const k of Object.keys(SLOTS[r])) if (d[r][k] === id && !(r === room && k === key)) d[r][k] = SLOTS[r][k].def ? undefined : 'none';
          d[room][key] = id === SLOTS[room][key].def ? undefined : id;
          Sfx.play('click');
          Inside.refresh();
          Life.checkMedals();
          render();
          return;
        }
        if (e.target.closest('[data-close]')) { Sfx.play('click'); UI.popModal(el); resolve(); }
      });
    });
  }

  // действия у шкафа дома
  function homeActs() {
    return [{ label: 'Обустроить комнату', icon: 'star', sub: `уют ${comfort()}/100 · переставить вещи`, run: async () => { UI.closeLocation(); await arrange(); } }];
  }

  function shopAction() {
    return { label: 'Мебель и декор', icon: 'star', sub: `ковры, растения, аквариум · уют дома ${comfort()}/100`, run: async () => { await shop(); } };
  }

  return { CATALOG, SLOTS, build, comfort, thirsty, shop, arrange, homeActs, shopAction, placed, state };
})();
