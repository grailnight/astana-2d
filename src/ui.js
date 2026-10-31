'use strict';
// Интерфейс: HUD, диалоги, сцены локаций, телефон, карта, гардероб, титульный экран.

const UI = (() => {
  const $ = (q, root = document) => root.querySelector(q);
  const layer = () => $('#layer');
  const modals = [];
  let locId = null, locEl = null, phoneEl = null;

  function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  // Во время мини-игр и полноэкранных сцен уведомления прячем, чтобы не мешали
  function syncFocus() {
    document.body.classList.toggle('focus', modals.some((m) => m.matches('.mg, .ending, .creator, .title-screen, .talk')));
    document.body.classList.toggle('modal', modals.length > 0);
    document.body.classList.toggle('phone-open', modals.length > 0 && modals[modals.length - 1].classList.contains('phone-wrap'));
  }
  function pushModal(el) { el._openedAt = performance.now(); layer().appendChild(el); modals.push(el); Input.clear(); syncFocus(); }

  // Защита от «проскока» нажатия: палец ещё на кнопке действия, а меню уже открылось —
  // отпускание пальца не должно нажимать плитку под ним. Клик в новом окне засчитываем,
  // только если касание началось после его открытия и окно открыто хотя бы 250 мс.
  let lastDown = 0;
  document.addEventListener('pointerdown', () => { lastDown = performance.now(); }, true);
  document.addEventListener('click', (e) => {
    if (e.detail === 0) return; // клавиатура и программные клики
    const m = modals.find((x) => x.contains(e.target));
    if (!m || !m._openedAt) return;
    if (lastDown < m._openedAt || performance.now() - m._openedAt < 250) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  function popModal(el) {
    const i = modals.indexOf(el);
    if (i >= 0) modals.splice(i, 1);
    el.remove();
    Input.clear();
    syncFocus();
  }
  const blocking = () => modals.length > 0;
  const topModal = () => modals[modals.length - 1];

  function nameOf(who) {
    if (!who) return '';
    if (who === 'me') return G.s.name;
    return NPCS[who] ? NPCS[who].name : who;
  }
  function lookOf(who) {
    if (who === 'me') return G.look();
    return NPCS[who] ? NPCS[who].look : null;
  }
  const portraitCache = new Map();
  function portraitSrc(who) {
    const L = lookOf(who);
    if (!L) return '';
    const key = JSON.stringify(L);
    if (!portraitCache.has(key)) portraitCache.set(key, Art.portrait(L, 64).toDataURL());
    return portraitCache.get(key);
  }
  function portraitEl(who, size = 72) {
    const src = portraitSrc(who);
    return src ? `<img class="portrait" width="${size}" height="${size}" alt="" src="${src}">` : '';
  }
  const spriteSrc = (L, dir = 0, scale = 2) => Art.sprite(L, dir, scale).toDataURL();

  /* ---------- диалоги ---------- */

  function dialog(who, text, options) {
    return new Promise((resolve) => {
      const opts = (options || []).map((o) => (typeof o === 'string' ? { text: o } : o));
      const el = h(`
        <div class="dlg fx-paper ${who ? '' : 'narr'}" role="dialog" aria-live="polite">
          ${who ? `<div class="dlg-face fx-panel">${portraitEl(who)}</div><div class="dlg-name fx-gold">${escapeHtml(nameOf(who))}</div>` : ''}
          <div class="dlg-body">
            <div class="dlg-text"></div>
            ${opts.length ? `<div class="dlg-opts">${opts.map((o, i) => `<button class="opt ${o.disabled ? 'fx-off' : 'fx-btn'}" data-i="${i}" ${o.disabled ? 'disabled' : ''}><span class="kbd">${i + 1}</span><span>${escapeHtml(o.text)}${o.note ? `<small>${escapeHtml(o.note)}</small>` : ''}</span></button>`).join('')}</div>` : '<div class="dlg-next" aria-hidden="true">▼</div>'}
          </div>
        </div>`);
      pushModal(el);
      const tEl = $('.dlg-text', el);
      let shown = 0, typing = true;
      const full = text;
      const openedAt = performance.now();
      const step = () => {
        if (!typing) return;
        shown = Math.min(full.length, shown + 2);
        tEl.textContent = full.slice(0, shown);
        if (shown >= full.length) { typing = false; el.classList.add('ready'); return; }
        requestAnimationFrame(step);
      };
      step();
      const finishType = () => { typing = false; tEl.textContent = full; el.classList.add('ready'); };
      const close = (v) => {
        window.removeEventListener('keydown', onKey);
        popModal(el);
        resolve(v);
      };
      const advance = () => {
        if (performance.now() - openedAt < 120) return;
        if (typing) { finishType(); return; }
        if (!opts.length) { Sfx.play('click'); close(0); }
      };
      const onKey = (e) => {
        if (topModal() !== el || e.repeat) return;
        if (opts.length) {
          const n = parseInt(e.key, 10);
          if (n >= 1 && n <= opts.length && !opts[n - 1].disabled) { e.preventDefault(); if (typing) finishType(); Sfx.play('click'); close(n - 1); }
          else if (['Enter', ' ', 'e', 'E', 'у', 'У'].includes(e.key) && typing) { e.preventDefault(); finishType(); }
        } else if (['Enter', ' ', 'e', 'E', 'у', 'У', 'Escape'].includes(e.key)) { e.preventDefault(); advance(); }
      };
      window.addEventListener('keydown', onKey);
      el.addEventListener('click', (e) => {
        const b = e.target.closest('.opt');
        if (b) { if (b.disabled) return; if (typing) finishType(); Sfx.play('click'); close(+b.dataset.i); return; }
        advance();
      });
    });
  }
  const say = (who, text) => dialog(who, text, null);
  const ask = (who, text, options) => dialog(who, text, options);

  /* ---------- уведомления ---------- */

  const TOAST_ICON = { info: 'chat', good: 'star', bad: 'bolt', quest: 'quest', mail: 'mail', medal: 'medal' };
  function toast(text, kind = 'info') {
    const box = $('#toasts');
    if (!box) return;
    const el = h(`<div class="toast fx-panel ${kind}">${UIKit.img(TOAST_ICON[kind] || 'chat')}<span>${escapeHtml(text)}</span></div>`);
    box.appendChild(el);
    const max = window.innerWidth < 520 ? 2 : 4;
    while (box.children.length > max) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 3400);
    setTimeout(() => el.remove(), 3900);
    if (phoneEl && kind === 'mail') renderPhone();
  }

  let bannerTimer = 0;
  function banner(text) {
    const el = $('#area-banner');
    el.innerHTML = `<span class="fx-gold">${escapeHtml(text)}</span>`;
    el.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  async function fade(text, fn) {
    const el = $('#fade');
    el.innerHTML = `<div>${escapeHtml(text || '')}</div>`;
    el.classList.add('on');
    const guard = h('<div class="guard"></div>');
    pushModal(guard);
    await wait(450);
    if (fn) await fn();
    await wait(650);
    el.classList.remove('on');
    popModal(guard);
    await wait(250);
  }

  /* ---------- HUD ---------- */

  const hudCache = {};
  function setText(sel, v) { if (hudCache[sel] !== v) { hudCache[sel] = v; const el = $(sel); if (el) el.textContent = v; } }
  function setHtml(sel, v) { if (hudCache[sel] !== v) { hudCache[sel] = v; const el = $(sel); if (el) el.innerHTML = v; } }

  const NEEDS = [['energy', 'bolt', '#f6c343'], ['food', 'bowl', '#6cc35a'], ['mood', 'mood', '#2ec4e6'], ['hyg', 'drop', '#9be8f7']];

  function initHud() {
    UIKit.install();
    for (const [k, ic] of NEEDS) $(`#need-${k} img`).src = UIKit.icon(ic, 2);
    $('#btn-phone img').src = UIKit.icon('phone', 3);
    $('#btn-phone').addEventListener('click', () => { Sfx.play('click'); openPhone(); });
    $('#objective').addEventListener('click', () => { Sfx.play('click'); openPhone('quests'); });
  }

  function updateHud() {
    const s = G.s;
    if (!s) return;
    const lookKey = JSON.stringify(G.look());
    if (hudCache.face !== lookKey) { hudCache.face = lookKey; $('#hud-face').src = portraitSrc('me'); }
    setText('#hud-date', fmtDate(s.day));
    setText('#hud-clock', fmtClock(s.min));
    const t = G.temp();
    setText('#hud-temp', (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t) + '°');
    const wx = s.weather.kind;
    const wi = G.isNight() && (wx === 'clear') ? 'moon' : { clear: 'sun', cloudy: 'cloud', rain: 'rain', snow: 'snow', buran: 'snow' }[wx];
    if (hudCache.wx !== wi) { hudCache.wx = wi; $('#hud-wx').src = Art.icon(wi); $('#hud-wx').alt = Content.WEATHER_NAMES[wx]; }
    setText('#hud-money', fmtMoney(s.money));
    for (const [k, , col] of NEEDS) {
      const v = k === 'energy' ? s.energy / s.maxEnergy : s[k] / 100;
      const pct = Math.round(v * 100);
      const key = '#need-' + k;
      if (hudCache[key] !== pct) {
        hudCache[key] = pct;
        const el = $(key);
        el.style.setProperty('--v', pct);
        el.style.setProperty('--c', pct < 25 ? '#e5533d' : col);
        el.classList.toggle('low', pct < 25);
        el.title = pct + '%';
      }
    }
    $('#hud-status').classList.toggle('cold', G.coldDeficit() > 0);
    const un = Life.unread();
    if (hudCache.unread !== un) { hudCache.unread = un; const b = $('#phone-badge'); b.hidden = !un; b.textContent = un; }
    const hh = $('#hud').offsetHeight;
    if (hudCache.hh !== hh) { hudCache.hh = hh; document.documentElement.style.setProperty('--hud-h', hh + 'px'); }
    const o = Quests.objective();
    setHtml('#objective', o ? `${UIKit.img('star')}<span><b>${escapeHtml(o.title)}</b>${escapeHtml(o.text)}</span>` : '');
    $('#objective').hidden = !o;
  }

  // Слово и иконка для круглой кнопки действия
  const ACTS = [['Войти', 'ВОЙТИ', 'door'], ['Говорить', 'ГОВОРИТЬ', 'talk'], ['Заговорить', 'ПРИВЕТ', 'talk'], ['Забрать', 'ВЗЯТЬ', 'bag'], ['Доставить', 'ОТДАТЬ', 'gift'],
    ['Подъезд', 'ДВЕРЬ', 'door'], ['Смотреть', 'СМОТРЕТЬ', 'camera'], ['Автобус', 'АВТОБУС', 'bus'], ['Погладить', 'ГЛАДИТЬ', 'heart'], ['Посидеть', 'СЕСТЬ', 'clock'],
    ['Бросить', 'МОНЕТКА', 'coin'], ['Юрта', 'ЮРТА', 'cup'], ['Поднять', 'ВЗЯТЬ', 'mail']];
  function hint(text, word) {
    const el = $('#hint');
    const btn = $('#btn-act');
    if (!text) { el.hidden = true; btn.classList.remove('live'); hudCache.hint = null; return; }
    if (hudCache.hint !== text) {
      hudCache.hint = text;
      el.innerHTML = `<span class="kbd">E</span>${escapeHtml(text)}`;
      const a = word ? ['', word[0], word[1]] : ACTS.find(([k]) => text.startsWith(k)) || ['', 'ДЕЙСТВИЕ', 'star'];
      btn.innerHTML = `${UIKit.img(a[2])}<span>${a[1]}</span>`;
    }
    el.hidden = false;
    btn.classList.add('live');
  }

  /* ---------- локации: сцена + плитки действий ---------- */

  const TONES = { home: '#c97b4a', shop: '#2a8f5a', market: '#d9433a', food: '#e8a317', study: '#3b5998', cafe: '#8a6a45', work: '#2a6f97', calm: '#2fa3b5', night: '#b0397a', gold: '#d9a53a', office: '#4f86b0' };
  const toneOf = (id) => (id && Content.LOCS[id] ? TONES[Content.LOCS[id].tone] : null);

  function skyColors() {
    const h = G.hour();
    if (h >= 7.5 && h < 16) return ['#7fc4e8', '#d9f0fa'];
    if (h >= 16 && h < 18.5) return ['#4a5f9e', '#f2a65a'];
    if (h >= 5.5 && h < 7.5) return ['#5a6fa8', '#f7c08a'];
    return ['#08142b', '#1d3557'];
  }

  // Рисует сцену локации: небо по времени суток, земля, здание, ночные огни
  function sceneCanvas(id) {
    const W = 220, H = 110;
    const cv = makeCanvas(W, H);
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const [top, bot] = skyColors();
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, top); sky.addColorStop(1, bot);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const night = G.isNight();
    if (night) for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(hash2(i, 1) * W | 0, hash2(i, 2) * H * 0.5 | 0, 1, 1); }
    const winter = G.season() === 'winter';
    const groundY = H - 16;
    g.fillStyle = winter ? '#e6eef3' : '#7f9a48'; g.fillRect(0, groundY, W, 16);
    g.fillStyle = winter ? '#cfdce5' : '#c9c2b4'; g.fillRect(0, groundY + 6, W, 10);
    const b = World.byId[id];
    if (b) {
      const sc = Math.min(1, (groundY - 6) / b.sh, (W - 20) / b.sw);
      const w = Math.round(b.sw * sc), hh = Math.round(b.sh * sc);
      const x = Math.round((W - w) / 2), y = groundY + 6 - hh;
      g.drawImage(b.sprite, x, y, w, hh);
      if (night) { g.fillStyle = 'rgba(10,16,44,0.45)'; g.fillRect(0, 0, W, H); g.globalAlpha = 0.95; g.drawImage(b.lights, x, y, w, hh); g.globalAlpha = 1; }
    } else if (id === 'wheel') {
      g.strokeStyle = '#eef6fa'; g.lineWidth = 1;
      g.beginPath(); g.arc(110, 46, 34, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(110, 46); g.lineTo(110 + Math.cos(a) * 34, 46 + Math.sin(a) * 34); g.stroke(); g.fillStyle = ['#e5533d', '#f6c343', '#2ec4e6', '#6cc35a'][i % 4]; g.fillRect(110 + Math.cos(a) * 34 - 2, 46 + Math.sin(a) * 34, 4, 4); }
      g.beginPath(); g.moveTo(90, groundY + 6); g.lineTo(110, 46); g.lineTo(130, groundY + 6); g.stroke();
      for (const tx of [20, 45, 170, 195]) g.drawImage(Art.tree(tx % 2 ? 'pine' : 'leaf', G.season(), tx % 4), tx, groundY - 28);
      if (night) { g.fillStyle = 'rgba(10,16,44,0.45)'; g.fillRect(0, 0, W, H); }
    }
    cv.className = 'scene-cv';
    return cv;
  }

  // Иконка действия по названию, если не задана явно
  const ACT_ICONS = [
    [/Спать|Вздремнуть|скамейке/, 'bed'], [/душ|Умыться|Сауна/i, 'shower'], [/Кофе|Капучино|Шай|Чай/, 'cup'],
    [/ужин|Шаурма|Лагман|Самса|Беляш|Фудкорт|Кумыс/, 'bowl'], [/Урок|Библиотека|Интенсив|Учить|студентами/, 'book'],
    [/Музей|Экскурсия|орнамент/, 'star'], [/Смена|смена|заказ|Собеседование/, 'case'], [/Тренировка|Пробежка/, 'dumbbell'],
    [/Кино|сериал/, 'film'], [/Пляж/, 'sun'], [/Спеть/, 'mic'], [/матч/, 'ball'], [/колесе/, 'wheel'], [/Прогулка/, 'leaf'],
    [/тишине/, 'moon'], [/фото|Фото/, 'camera'], [/Гардероб/, 'shirt'], [/квартиры/, 'door'], [/Капельница/, 'cross'],
    [/шар/, 'star'], [/табло/, 'clock'], [/той|зал/i, 'ring'], [/Кофе-брейк/, 'cup'], [/Отменить/, 'back'],
  ];
  function actIcon(x) {
    if (x.icon) return x.icon;
    const m = ACT_ICONS.find(([re]) => re.test(x.label));
    return m ? m[1] : 'star';
  }

  // opts: { only: RegExp — оставить действия по названию, title, compact — без сцены (мебель в интерьере), extra: () => [] }
  let locOpts = {};
  function openLocation(id, opts = {}) {
    closeLocation();
    locId = id;
    locOpts = opts;
    locEl = h(`<div class="loc ${opts.compact ? 'compact' : ''}" role="dialog" aria-label="${escapeHtml(opts.title || Content.locName(id))}"></div>`);
    pushModal(locEl);
    locEl.addEventListener('click', onLocClick);
    renderLocation();
    return Promise.resolve();
  }

  function renderLocation() {
    if (!locEl) return;
    const L = Content.LOCS[locId];
    const s = G.s;
    const [a, b] = Content.locHours(locId);
    const hours = a === 0 && b === 24 ? 'круглосуточно' : `${fmtClock(a * 60)}–${fmtClock((b % 24) * 60)}`;
    const o = locOpts;
    const npcs = o.compact ? [] : (L.npcs ? L.npcs() : []).filter((n) => !(n === 'gulnar' && s.homeId !== 'home'));
    let acts = L.actions().filter(Boolean);
    if (o.only) acts = acts.filter((x) => o.only.test(x.label));
    if (o.extra) acts = acts.concat(o.extra());
    locEl.style.setProperty('--tone', TONES[L.tone] || '#2ec4e6');
    locEl.innerHTML = `
      <div class="loc-card fx-panel">
        <div class="loc-scene">
          <div class="loc-title"><span class="fx-gold">${o.icon ? UIKit.img(o.icon) : ''}${escapeHtml(o.title || Content.locName(locId))}</span><small>${escapeHtml(o.compact ? Content.locName(locId) : L.kz || '')}</small></div>
          <div class="loc-chips"><span>${UIKit.img('clock')}${fmtClock(s.min)}</span><span>${UIKit.img('coin')}${fmtMoney(s.money)}</span></div>
          <div class="loc-people">${npcs.map((n) => `<button class="person" data-npc="${n}" aria-label="Поговорить: ${escapeHtml(NPCS[n].name)}"><img alt="" src="${spriteSrc(NPCS[n].look, 0, 2)}"><span class="fx-paper">${escapeHtml(NPCS[n].name)}</span></button>`).join('')}</div>
        </div>
        ${o.compact ? '' : `<p class="loc-desc">${escapeHtml(L.desc())} <em>${hours}</em></p>`}
        <div class="tiles">${acts.map((x, i) => actTile(x, i)).join('') || '<p class="empty">Здесь пока нечего делать.</p>'}</div>
        <footer class="loc-foot"><button class="btn fx-red" data-close>${UIKit.img(o.compact ? 'back' : 'door')}${o.compact ? 'Отойти' : 'Выйти'}</button></footer>
      </div>`;
    if (!o.compact) $('.loc-scene', locEl).prepend(sceneCanvas(locId));
    locEl._acts = acts;
  }

  function relLabel(id) {
    const r = G.s.rel[id] || 0;
    const t = Romance.isDater(id) ? Romance.stage(id) : r >= 80 ? 'близкие люди' : r >= 50 ? 'друзья' : r >= 25 ? 'приятели' : r > 0 ? 'знакомые' : 'незнакомы';
    return `${t} · ${r}`;
  }

  function actTile(x, i) {
    const cant = x.price && !G.canPay(x.price) ? 'не хватает денег' : null;
    const dis = x.disabled || cant;
    const badges = [];
    if (x.price) badges.push(`<em class="price">${fmtMoney(x.price)}</em>`);
    if (x.time) badges.push(`<em class="time">${x.time >= 60 ? (x.time / 60).toString().replace('.', ',') + ' ч' : x.time + ' мин'}</em>`);
    return `<button class="tile ${dis ? 'is-off' : ''}" data-i="${i}" ${dis ? 'aria-disabled="true"' : ''}>
      ${UIKit.img(actIcon(x))}
      <span class="t-main"><b>${escapeHtml(x.label)}</b><small>${escapeHtml(dis || x.sub || '')}</small>${badges.length ? `<span class="t-badges">${badges.join('')}</span>` : ''}</span></button>`;
  }

  let actBusy = false;
  async function onLocClick(e) {
    if (actBusy || topModal() !== locEl) return;
    if (e.target.closest('[data-close]')) { Sfx.play(locOpts.compact ? 'click' : 'door'); closeLocation(); return; }
    const npc = e.target.closest('[data-npc]');
    if (npc) {
      actBusy = true;
      try { await Content.Talk[npc.dataset.npc](); } finally { actBusy = false; }
      afterAction();
      return;
    }
    const row = e.target.closest('.tile[data-i]');
    if (!row) return;
    const x = locEl._acts[+row.dataset.i];
    if (row.getAttribute('aria-disabled') === 'true') { Sfx.play('error'); toast(x.disabled || 'Не хватает денег', 'bad'); return; }
    Sfx.play('click');
    Device.buzz(10);
    actBusy = true;
    try { await x.run(); Day.note('act', x.label); } finally { actBusy = false; }
    afterAction();
  }

  function afterAction() {
    if (!locEl) return;
    Quests.tick();
    Day.tick();
    Life.checkMedals();
    if (!Content.isOpen(locId)) { toast(`«${Content.locName(locId)}» закрывается`, 'info'); closeLocation(); return; }
    renderLocation();
  }

  function closeLocation() {
    if (locEl) { popModal(locEl); locEl = null; locId = null; locOpts = {}; }
  }
  const refreshLocation = () => renderLocation();
  const currentLoc = () => locId || (typeof Inside !== 'undefined' ? Inside.locId() : null);

  // Esc закрывает верхнее окно, если это локация, телефон или гардероб
  function escape() {
    const top = topModal();
    if (!top) return;
    if (top === locEl) { Sfx.play('door'); closeLocation(); }
    else if (top === phoneEl) { if (phoneApp) { phoneApp = null; renderPhone(); } else closePhone(); }
    else if (top.matches('.wardrobe, .recap, .paper, .decor-shop, .decor-arrange')) { const b = top.querySelector('[data-close]'); if (b) b.click(); }
  }

  // Системная кнопка «Назад» на Android: true — если что-то закрыли в игре
  function back() {
    const top = topModal();
    if (!top) return false;
    if (top === locEl || top === phoneEl || top.matches('.wardrobe, .recap, .paper, .decor-shop, .decor-arrange')) { escape(); return true; }
    if (top.classList.contains('title-screen') || top.classList.contains('creator')) return false;
    return true; // диалоги и мини-игры назад не закрываем, просто не выходим из игры
  }

  function closePhone() { if (phoneEl) { popModal(phoneEl); phoneEl = null; phoneApp = null; } }
  function closeAll() { closeLocation(); closePhone(); }

  /* ---------- гардероб ---------- */

  function wardrobe() {
    return new Promise((resolve) => {
      const s = G.s;
      const el = h('<div class="sheet wardrobe fx-panel" role="dialog" aria-label="Гардероб"></div>');
      pushModal(el);
      const render = () => {
        const c = s.clothes;
        const slot = (title, key, allowNone) => {
          const owned = c.owned.filter((id) => CLOTHES[id].slot === key);
          const items = (allowNone ? [null] : []).concat(owned);
          return `<section><h3>${title}</h3><div class="chips">${items.map((id) => `<button class="chip-btn ${c[key] === id ? 'fx-btn on' : 'fx-tile'}" data-slot="${key}" data-id="${id || ''}">${id ? escapeHtml(CLOTHES[id].name) : 'Без'}${id && CLOTHES[id].warm ? ` <small>+${CLOTHES[id].warm}°</small>` : ''}</button>`).join('')}</div></section>`;
        };
        el.innerHTML = `<header class="sheet-head"><span class="fx-gold">Гардероб</span><small>Тепло: ${G.warmth()} · нужно сейчас: ${G.needWarmth()}</small></header>
          <div class="wr-body"><img class="wr-prev" alt="" src="${spriteSrc(G.look(), 0, 3)}"><div class="wr-slots">
          ${slot('Одежда', 'outfit', false)}${slot('Верхняя одежда', 'outer', true)}${slot('Головной убор', 'hat', true)}</div></div>
          <footer class="loc-foot"><button class="btn fx-btn" data-close>${UIKit.img('shirt')}Готово</button></footer>`;
      };
      render();
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-slot]');
        if (b) { s.clothes[b.dataset.slot] = b.dataset.id || null; Sfx.play('click'); render(); return; }
        if (e.target.closest('[data-close]')) { popModal(el); resolve(); }
      });
    });
  }

  /* ---------- телефон ---------- */

  const APPS = [
    ['quests', 'quest', 'Задания'], ['msgs', 'mail', 'Сообщения'], ['map', 'map', 'Карта'], ['contacts', 'phone', 'Контакты'],
    ['bag', 'bag', 'Сумка'], ['me', 'person', 'Профиль'], ['medals', 'medal', 'Медали'], ['settings', 'gear', 'Настройки'],
  ];
  let phoneApp = null;

  function openPhone(app = null) {
    if (phoneEl) popModal(phoneEl);
    phoneEl = h('<div class="phone-wrap" role="dialog" aria-label="Телефон"></div>');
    pushModal(phoneEl);
    phoneEl.addEventListener('click', onPhoneClick);
    phoneApp = app;
    renderPhone();
  }

  function renderPhone() {
    const el = phoneEl;
    if (!el) return;
    const s = G.s;
    const un = Life.unread();
    const app = APPS.find((a) => a[0] === phoneApp);
    el.innerHTML = `<div class="phone-dev">
      <div class="ph-status"><b>${fmtClock(s.min)}</b><span>KZ 4G · ${Math.round(40 + s.energy / 2)}%</span></div>
      <div class="ph-screen">
        ${app ? `<div class="ph-app-head"><button class="ph-back" data-home aria-label="Назад">${UIKit.img('back')}</button><b>${app[2]}</b><button class="ph-x" data-close aria-label="Закрыть телефон">✕</button></div>
          <div class="ph-body" data-app="${app[0]}">${phoneTab(app[0])}</div>`
        : `<div class="ph-home">
            <div class="ph-clock">${fmtClock(s.min)}<small>${fmtDate(s.day)} · ${G.temp()}°</small></div>
            <div class="ph-apps">${APPS.map(([k, ic, n]) => `<button class="ph-icon" data-app="${k}"><span class="fx-tile">${UIKit.img(ic, 'ico big')}${k === 'msgs' && un ? `<i class="badge">${un}</i>` : ''}</span><small>${n}</small></button>`).join('')}</div>
            ${phoneWidget()}
          </div>`}
      </div>
      <button class="ph-home-bar" data-${app ? 'home' : 'close'} aria-label="${app ? 'Домой' : 'Закрыть телефон'}"></button>
    </div>`;
    if (phoneApp === 'map') drawMap($('.map-cv', el));
    if (phoneApp === 'msgs') { for (const m of s.msgs) m.read = true; }
  }

  // Виджет на главном экране телефона: текущая цель, деньги, последнее сообщение
  function phoneWidget() {
    const s = G.s, o = Quests.objective(), last = s.msgs[0];
    return `<div class="ph-widget fx-paper" data-app="quests">
      ${o ? `<b>${UIKit.img('star')}${escapeHtml(o.title)}</b><p>${escapeHtml(o.text)}</p>` : '<b>Свободная жизнь в Астане</b>'}
      <div class="w-row"><span>${UIKit.img('quest')}дела ${Day.progress().join('/')}</span><span>${UIKit.img('coin')}${fmtMoney(s.money)}</span><span>${UIKit.img('medal')}${s.medals.length}/${Life.MEDALS.length}</span><span>${UIKit.img('mail')}${s.cards.length}/${Life.CARDS.length}</span></div>
      ${last ? `<p class="w-last"><em>${escapeHtml(Life.senderName(last.from))}:</em> ${escapeHtml(last.text)}</p>` : ''}
    </div>`;
  }

  function bar(v, max = 1) { return `<i class="pbar"><b style="width:${Math.round(clamp(v / max, 0, 1) * 100)}%"></b></i>`; }
  const ago = (m) => (m.day === G.s.day ? fmtClock(m.min) : fmtDate(m.day));

  function phoneTab(tab) {
    const s = G.s;
    if (tab === 'quests') {
      const act = Quests.LIST.filter((q) => Quests.status(q.id) === 'active');
      const fin = Quests.LIST.filter((q) => ['done', 'failed'].includes(Quests.status(q.id)));
      const side = Quests.objective();
      const row = (q) => {
        const r = s.quests[q.id];
        const step = q.steps[r.step];
        let txt = step ? Quests.textOf(step.text) : '';
        if (step && step.progress) { const [a, b] = step.progress(); txt += ` · ${a >= 1000 ? fmtMoney(a) : a} / ${b >= 1000 ? fmtMoney(b) : b}`; }
        return `<button class="q-row ${s.track === q.id ? 'fx-btn on' : 'fx-tile'}" data-track="${q.id}"><b>${escapeHtml(q.title)}</b><small>${escapeHtml(txt)}</small><span class="q-steps">${q.steps.map((_, i) => `<i class="${i < r.step ? 'd' : i === r.step ? 'c' : ''}"></i>`).join('')}</span></button>`;
      };
      return `${Day.phoneHtml()}
        <h3>Сюжет</h3>
        ${s.delivery ? `<div class="note"><b>${escapeHtml(side.title)}</b> ${escapeHtml(side.text)}</div>` : ''}
        ${act.map(row).join('') || '<p class="empty">Нет активных заданий.</p>'}
        <p class="hint-small">Нажми на задание, чтобы следить за ним — стрелка на экране укажет путь.</p>
        ${fin.length ? `<h3>Завершённые</h3>${fin.map((q) => `<div class="q-row done"><b>${escapeHtml(q.title)}</b><small>${Quests.status(q.id) === 'failed' ? 'провалено' : 'выполнено'}</small></div>`).join('')}` : ''}`;
    }
    if (tab === 'msgs') {
      if (!s.msgs.length) return '<p class="empty">Сообщений пока нет. Друзья напишут, когда что-то случится.</p>';
      return s.msgs.map((m) => `<div class="msg ${m.read ? '' : 'new'}">${NPCS[m.from] ? portraitEl(m.from, 40) : `<span class="msg-ico">${UIKit.img(m.from === 'dchs' ? 'bolt' : 'mail')}</span>`}<span><b>${escapeHtml(Life.senderName(m.from))}<em>${ago(m)}</em></b><p>${escapeHtml(m.text)}</p></span></div>`).join('');
    }
    if (tab === 'map') {
      return `<div class="map-wrap"><canvas class="map-cv"></canvas></div><p class="hint-small">Нажми на здание, чтобы вызвать такси. Синие точки — остановки автобуса (${fmtMoney(BUS_FARE)}).</p>`;
    }
    if (tab === 'contacts') {
      return Content.CONTACTS.filter((c) => c.when()).map((c) => `<div class="contact">${portraitEl(c.id, 44)}<span><b>${escapeHtml(NPCS[c.id].name)}</b>${bar(s.rel[c.id] || 0, 100)}<small>${relLabel(c.id)}</small></span><button class="btn small fx-green" data-call="${c.id}">${UIKit.img('phone')}</button></div>`).join('')
        + '<p class="hint-small">Мама подскажет, что делать дальше. Номера новых знакомых можно взять в разговоре.</p>';
    }
    if (tab === 'bag') {
      const items = Object.entries(s.inv).filter(([, n]) => n > 0);
      const c = s.clothes;
      const worn = [c.outfit, c.outer, c.hat].filter(Boolean).map((id) => CLOTHES[id].name).join(', ');
      const paper = s.paperDay === s.day ? `<div class="item"><span><b>Газета «${City.PAPER}»</b><small>Сегодняшний номер: новости и вакансии</small></span><button class="btn small fx-btn" data-paper>Читать</button></div>` : '';
      return `${paper}${items.map(([id, n]) => `<div class="item"><span><b>${escapeHtml(ITEMS[id].name)}${n > 1 ? ` ×${n}` : ''}</b><small>${escapeHtml(ITEMS[id].desc)}</small></span>${ITEMS[id].food ? `<button class="btn small fx-btn" data-eat="${id}">Съесть</button>` : ''}</div>`).join('') || (paper ? '' : '<p class="empty">Сумка пуста.</p>')}
        <h3>Одежда</h3><p class="note">Надето: ${escapeHtml(worn)}. Тепло: ${G.warmth()} (сейчас нужно ${G.needWarmth()}). Переодеться можно дома в гардеробе.</p>`;
    }
    if (tab === 'me') {
      const sk = Object.entries(SKILLS).map(([k, v]) => `<div class="skill"><img alt="" src="${Art.icon(v.icon, 2)}"><b>${v.name}</b><span>ур. ${G.lv(k)}</span>${bar(s.xp[k] - G.lv(k), 1)}</div>`).join('');
      const job = s.job.hired ? Content.OFFICE_TITLES[s.job.level] + ' в Steppe Digital' : s.flags.joinedCourier ? 'Курьер «Жылдам»' : s.stats.gigs ? 'Подработки' : 'Ищу работу';
      const friends = Object.entries(s.rel).filter(([k, v]) => k !== 'mama' && v >= 50).length;
      const partner = s.love.partner ? NPCS[s.love.partner].name : '—';
      return `<div class="me-head">${portraitEl('me', 56)}<span><b>${escapeHtml(s.name)}</b><small>${escapeHtml(job)}</small><small>Из: ${escapeHtml(s.base.from || 'родного посёлка')} · день ${s.day} в Астане</small></span></div>
        <div class="stats">
          <div><span>Энергия</span>${bar(s.energy, s.maxEnergy)}<em>${Math.round(s.energy)}</em></div>
          <div><span>Сытость</span>${bar(s.food, 100)}<em>${Math.round(s.food)}</em></div>
          <div><span>Настроение</span>${bar(s.mood, 100)}<em>${Math.round(s.mood)}</em></div>
          <div><span>Гигиена</span>${bar(s.hyg, 100)}<em>${Math.round(s.hyg)}</em></div>
        </div>
        <h3>Навыки</h3>${sk}
        <h3>Люди</h3><div class="counters"><div><b>${friends}</b><span>друзей</span></div><div><b>${escapeHtml(partner)}</b><span>любовь</span></div><div><b>${s.love.broken || 0}</b><span>разбитых сердец</span></div></div>
        <h3>Репутация</h3><div class="stats"><div><span>Нарушения</span>${bar(s.crime || 0, 100)}<em>${escapeHtml(City.crimeLabel())}</em></div><div><span>Чудачество</span>${bar(s.crazy || 0, 100)}<em>${escapeHtml(Fun.crazyLabel())}</em></div><div><span>Уют дома</span>${bar(Decor.comfort(), 100)}<em>${Decor.comfort()}/100</em></div></div>
        <h3>Жильё</h3><p class="note">${s.flags.ownFlat ? 'Своя квартира на левом берегу.' : `Комната у Гульнар-апай. Аренда ${fmtMoney(s.rent.amount)} — оплачено до конца дня ${s.rent.due}.${s.rent.locked ? ' Комната закрыта за долг!' : ''}`}</p>`;
    }
    if (tab === 'medals') {
      const got = s.medals;
      const cards = Life.CARDS;
      return `<div class="medals">${Life.MEDALS.map((m) => `<div class="medal ${got.includes(m.id) ? m.tier : 'locked'}">${UIKit.img('medal')}<b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.desc)}</small></div>`).join('')}</div>
        <h3>Открытки Астаны · ${s.cards.length}/${cards.length}</h3>
        <div class="cards">${cards.map((c) => `<div class="card ${s.cards.includes(c.id) ? 'got' : ''}"><b>${s.cards.includes(c.id) ? escapeHtml(c.name) : '?'}</b></div>`).join('')}</div>
        <p class="hint-small">Открытки спрятаны возле достопримечательностей — ищи блестящие конверты.</p>`;
    }
    if (tab === 'settings') {
      const tog = (on, attr) => `<button class="btn small ${on ? 'fx-green' : 'fx-off'}" ${attr}>${on ? 'Вкл' : 'Выкл'}</button>`;
      return `<div class="set-row"><span>Звуки</span>${tog(Sfx.prefs.sfx, 'data-pref="sfx"')}</div>
        <div class="set-row"><span>Музыка (домбра)</span>${tog(Sfx.prefs.music, 'data-pref="music"')}</div>
        ${Device.touch() ? `<div class="set-row"><span>Вибрация</span>${tog(Device.prefs.vibrate, 'data-vib')}</div>` : ''}
        ${Device.canFullscreen() ? `<div class="set-row"><span>Полный экран</span>${tog(Device.isFullscreen(), 'data-fs')}</div>` : ''}
        <div class="set-row"><span>Сохранить игру</span><button class="btn small fx-btn" data-save>Сохранить</button></div>
        <div class="set-row"><span>Начать заново</span><button class="btn small fx-red" data-reset>Новая игра</button></div>
        <h3>Управление</h3>
        <p class="note">Клавиатура: WASD или стрелки — ходить, E / пробел — действие, Tab или Q — телефон, M — карта, Esc — закрыть.<br>Телефон: левая часть экрана — джойстик, кнопка справа — действие.</p>`;
    }
    return '';
  }

  let resetArm = false;
  async function onPhoneClick(e) {
    if (topModal() !== phoneEl) return;
    const t = e.target;
    if (t === phoneEl || t.closest('[data-close]')) { closePhone(); return; }
    if (t.closest('[data-home]')) { Sfx.play('click'); phoneApp = null; renderPhone(); return; }
    const app = t.closest('.ph-icon[data-app], .ph-widget[data-app]');
    if (app) { Sfx.play('click'); phoneApp = app.dataset.app; renderPhone(); return; }
    const tr = t.closest('[data-track]');
    if (tr) { G.s.track = tr.dataset.track; Sfx.play('click'); renderPhone(); return; }
    if (t.closest('[data-paper]')) { Sfx.play('click'); closePhone(); City.openPaper(); return; }
    const call = t.closest('[data-call]');
    if (call) { await Content.call(call.dataset.call); Quests.tick(); renderPhone(); return; }
    const eat = t.closest('[data-eat]');
    if (eat) { await Content.eat(eat.dataset.eat); renderPhone(); return; }
    const pref = t.closest('[data-pref]');
    if (pref) { Sfx.setPref(pref.dataset.pref, !Sfx.prefs[pref.dataset.pref]); renderPhone(); return; }
    if (t.closest('[data-save]')) { G.save(); toast('Игра сохранена', 'good'); return; }
    if (t.closest('[data-vib]')) { Device.setPref('vibrate', !Device.prefs.vibrate); Device.buzz(30); renderPhone(); return; }
    if (t.closest('[data-fs]')) { if (!await Device.toggleFullscreen()) toast('Браузер не разрешил полный экран. Добавь игру на главный экран — там она открывается без рамок.', 'info'); setTimeout(() => phoneEl && renderPhone(), 300); return; }
    const rs = t.closest('[data-reset]');
    if (rs) {
      if (!resetArm) { resetArm = true; rs.textContent = 'Точно?'; setTimeout(() => { resetArm = false; }, 3000); return; }
      G.wipe(); location.reload(); return;
    }
    const cv = t.closest('.map-cv');
    if (cv) mapClick(cv, e);
  }

  /* ---------- карта ---------- */

  // короткие подписи для карты; мелкие места скрываются на узком экране, если они не цель
  const MAP_LABELS = {
    home: ['Дом', 1], courier: ['Жылдам', 1], coffee: ['Кофе', 1], market: ['Базар', 1], lang: ['Тіл', 0], gym: ['Спортзал', 0],
    mosque: ['Мечеть', 1], hospital: ['Больница', 1], karaoke: ['Караоке', 0], toyhana: ['Той-хана', 1], pyramid: ['Пирамида', 1],
    khan: ['Хан Шатыр', 1], baiterek: ['Байтерек', 1], akorda: ['Акорда', 1], arena: ['Арена', 1], university: ['Универ', 1],
    office: ['Офис', 0], expo: ['EXPO', 1], mall: ['ТРЦ', 1], station: ['Нұрлы Жол', 1], station1: ['Астана-1', 1], grandmosque: ['Бас мешіт', 1], realty: ['Жаңа Үй', 0], shawarma: ['Шаурма', 0], shop: ['24/7', 0],
  };

  function drawMap(cv) {
    const ground = Render.ground();
    const wrap = cv.parentElement;
    const W = wrap.clientWidth || 300;
    const sc = W / (MAP_W * TILE);
    const H = MAP_H * TILE * sc;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.height = H + 'px';
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(ground, 0, 0, W, H);
    g.fillStyle = 'rgba(13,27,42,0.25)'; g.fillRect(0, 0, W, H);
    const obj = Quests.objective();
    for (const b of World.buildings) {
      const x = b.x * TILE * sc, y = b.y * TILE * sc, w = b.w * TILE * sc, hh = b.h * TILE * sc;
      g.fillStyle = b.res ? 'rgba(200,205,210,0.75)' : b.landmark ? 'rgba(246,195,67,0.95)' : 'rgba(46,196,230,0.9)';
      if (obj && obj.target === b.id) g.fillStyle = '#e5533d';
      g.fillRect(x, y, w, hh);
    }
    // названия улиц и реки, как на городской карте
    g.font = `500 ${Math.max(8, Math.round(W / 60))}px Onest, system-ui, sans-serif`;
    g.fillStyle = 'rgba(238,246,250,0.55)';
    for (const st of World.streets) {
      if (st.dir === 'h') { g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(st.name, ((st.x0 + st.x1) / 2 + 3) * TILE * sc, st.y * TILE * sc - 1); }
      else if (st.y1 - st.y0 > 16) { g.save(); g.translate((st.x + 2) * TILE * sc + 1, ((st.y0 + st.y1) / 2) * TILE * sc); g.rotate(Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(st.name, 0, 0); g.restore(); }
    }
    g.font = `italic 600 ${Math.max(9, Math.round(W / 44))}px Onest, system-ui, sans-serif`;
    g.fillStyle = 'rgba(160,215,245,0.9)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('р. Есіл', 8 * TILE * sc, World.riverC(8) * TILE * sc + 1);
    g.font = `600 ${Math.max(9, Math.round(W / 42))}px Onest, system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'top';
    const wide = W >= 440;
    for (const [id, [short, major]] of Object.entries(MAP_LABELS)) {
      const b = World.byId[id];
      const isTarget = obj && obj.target === id;
      if (!major && !wide && !isTarget) continue;
      const label = id === 'realty' && G.s.flags.ownFlat ? 'Мой дом' : short;
      const x = (b.x + b.w / 2) * TILE * sc, y = (b.y + b.h) * TILE * sc + 1;
      g.lineWidth = 3; g.strokeStyle = 'rgba(13,27,42,0.9)'; g.strokeText(label, x, y);
      g.fillStyle = '#eef6fa'; g.fillText(label, x, y);
    }
    for (const st of World.busStops) {
      g.fillStyle = '#2ec4e6'; g.beginPath(); g.arc(st.x * sc, st.y * sc, 3.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#0d1b2a'; g.lineWidth = 1.5; g.stroke();
    }
    const p = Ents.player;
    g.fillStyle = '#f6c343'; g.strokeStyle = '#0d1b2a'; g.lineWidth = 2;
    g.beginPath(); g.arc(p.x * sc, p.y * sc, 5, 0, Math.PI * 2); g.fill(); g.stroke();
    cv._sc = sc;
  }

  async function mapClick(cv, e) {
    const r = cv.getBoundingClientRect();
    const sc = cv._sc;
    const wx = (e.clientX - r.left) / sc / TILE, wy = (e.clientY - r.top) / sc / TILE;
    const b = World.buildings.find((bb) => wx >= bb.x - 0.5 && wx <= bb.x + bb.w + 0.5 && wy >= bb.y - 0.5 && wy <= bb.y + bb.h + 1);
    if (!b) return;
    await Content.taxi(b);
    if (phoneEl) renderPhone();
  }

  /* ---------- титульный экран: коллаж из открыток ---------- */

  // кадры коллажа в пикселях мира: Байтерек и EXPO ночью, Хан Шатыр, Хазрет Султан, старый вокзал
  const POSTCARDS = [
    { cx: 736, cy: 800, w: 100, h: 170, r: -6, night: true },
    { cx: 320, cy: 868, w: 230, h: 150, r: 5 },
    { cx: 1520, cy: 500, w: 230, h: 150, r: -4 },
    { cx: 696, cy: 1390, w: 180, h: 150, r: 6, night: true },
    { cx: 344, cy: 100, w: 250, h: 150, r: 3 },
  ];

  function title(hasSave) {
    return new Promise((resolve) => {
      const el = h(`<div class="title-screen">
        <div class="collage"></div>
        <div class="logo"><span class="logo-a" data-t="АСТАНА">АСТАНА</span><span class="logo-b fx-btn">Жаңа өмір</span></div>
        <div class="title-card fx-panel">
          <p>Ты приезжаешь в столицу с одной сумкой и 15&nbsp;000 тенге. Найди работу, друзей, любовь и свой дом — и переживи первую зиму.</p>
          <div class="title-btns">
            ${hasSave ? `<button class="btn big fx-gold" data-go="load">${UIKit.img('door')}Продолжить</button>` : ''}
            <button class="btn big ${hasSave ? 'fx-btn' : 'fx-gold'}" data-go="new">${UIKit.img('star')}Новая игра</button>
            ${Device.touch() && Device.canFullscreen() && !Device.isFullscreen() ? '<button class="btn fx-tile" data-fs>На весь экран</button>' : ''}
          </div>
        </div></div>`);
      pushModal(el);
      const col = $('.collage', el);
      POSTCARDS.forEach((c, i) => {
        const cv = Render.postcard(c.cx, c.cy, c.w, c.h, { night: c.night });
        cv.className = 'pc';
        const fig = document.createElement('div');
        fig.className = 'pc-wrap pc' + i;
        fig.style.setProperty('--r', c.r + 'deg');
        fig.appendChild(cv);
        col.appendChild(fig);
      });
      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-fs]')) {
          const fs = e.target.closest('[data-fs]');
          if (await Device.toggleFullscreen()) fs.remove(); else fs.textContent = 'Полный экран недоступен здесь';
          return;
        }
        const b = e.target.closest('[data-go]');
        if (!b) return;
        Sfx.unlock(); Sfx.play('click');
        popModal(el);
        resolve(b.dataset.go);
      });
    });
  }

  /* ---------- создание персонажа ---------- */

  const SKINS = ['#f1c9a5', '#e0b38c', '#d4a07a', '#c68c63', '#a8714f'];
  const HAIRS = ['#1d1612', '#3b2a20', '#5a3d28', '#8a5a2b', '#b08a5a', '#7a1f1f'];
  const SPORT = ['#2f6fd1', '#c0392b', '#27ae60', '#8e44ad', '#16a085', '#2b2b2b', '#e67e22'];
  const STYLES_M = [['short', 'Короткая'], ['side', 'Набок'], ['buzz', 'Ёжик'], ['long', 'Длинные']];
  const FACE_M = [['', 'Без'], ['mustache', 'Усы'], ['beard', 'Борода']];
  const STYLES_F = [['long', 'Длинные'], ['pony', 'Хвост'], ['bun', 'Пучок'], ['bob', 'Каре'], ['short', 'Короткая']];
  const TOWNS = ['Шымкент', 'Караганда', 'Актобе', 'Павлодар', 'Кызылорда', 'Уральск', 'Семей', 'аул под Туркестаном'];

  function creator() {
    return new Promise((resolve) => {
      const st = { name: '', female: false, skin: SKINS[1], hair: HAIRS[0], hairStyle: 'short', sport: SPORT[0], from: TOWNS[0], glasses: false, face: '', earrings: true };
      const el = h('<div class="sheet creator fx-panel" role="dialog" aria-label="Создание персонажа"></div>');
      pushModal(el);
      let spin = 0, raf = 0;
      const look = () => ({ female: st.female, skin: st.skin, hair: st.hair, hairStyle: st.hairStyle, outfit: 'sport', top: st.sport, bottom: shade(st.sport, -0.3), shoes: '#2a2420', glasses: st.glasses, ...feat() });
      const feat = () => st.female ? { earrings: st.earrings } : { beard: st.face === 'beard', mustache: st.face === 'mustache' };
      const sw = (key, list) => `<div class="swatches">${list.map((c) => `<button class="sw ${st[key] === c ? 'on' : ''}" data-k="${key}" data-v="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div>`;
      const chip = (on, attr, text) => `<button class="chip-btn ${on ? 'fx-btn on' : 'fx-tile'}" ${attr}>${text}</button>`;
      const render = () => {
        const styles = st.female ? STYLES_F : STYLES_M;
        el.innerHTML = `<header class="sheet-head"><span class="fx-gold">Кто ты?</span><small>Новый житель столицы</small></header>
          <div class="cr-body">
            <div class="cr-prev fx-plain"><canvas width="96" height="171"></canvas></div>
            <div class="cr-form">
              <label class="fld"><span>Имя</span><input id="cr-name" class="fx-paper" maxlength="16" placeholder="${st.female ? 'Например, Дана' : 'Например, Нурлан'}" value="${escapeHtml(st.name)}" autocomplete="off"></label>
              <div class="fld"><span>Пол</span><div class="chips">${chip(!st.female, 'data-sex="m"', 'Парень')}${chip(st.female, 'data-sex="f"', 'Девушка')}</div></div>
              <div class="fld"><span>Откуда приехал${st.female ? 'а' : ''}</span><select id="cr-from" class="fx-paper">${TOWNS.map((t) => `<option ${t === st.from ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
              <div class="fld"><span>Кожа</span>${sw('skin', SKINS)}</div>
              <div class="fld"><span>Волосы</span>${sw('hair', HAIRS)}</div>
              <div class="fld"><span>Причёска</span><div class="chips">${styles.map(([k, n]) => chip(st.hairStyle === k, `data-hs="${k}"`, n)).join('')}${chip(st.glasses, 'data-gl', 'Очки')}</div></div>
              <div class="fld"><span>${st.female ? 'Украшения' : 'Лицо'}</span><div class="chips">${st.female ? chip(st.earrings, 'data-ear', 'Серьги') : FACE_M.map(([k, n]) => chip(st.face === k, `data-face="${k}"`, n)).join('')}</div></div>
              <div class="fld"><span>Спортивный костюм</span>${sw('sport', SPORT)}</div>
            </div>
          </div>
          <footer class="loc-foot"><button class="btn big fx-gold" data-go>${UIKit.img('bus')}Поехали в Астану</button></footer>`;
        $('#cr-name', el).addEventListener('input', (e) => { st.name = e.target.value; });
        $('#cr-from', el).addEventListener('change', (e) => { st.from = e.target.value; });
      };
      const draw = () => {
        const cv = $('.cr-prev canvas', el);
        if (cv) {
          const g = cv.getContext('2d');
          g.imageSmoothingEnabled = false;
          g.clearRect(0, 0, 96, 171);
          const sheetCv = Art.charSheet(look());
          spin += 1;
          const dir = [0, 2, 3, 1][Math.floor(spin / 50) % 4];
          const f = [1, 0, 2, 0][Math.floor(spin / 8) % 4];
          g.drawImage(sheetCv, f * Art.FW, dir * Art.FH, Art.FW, Art.FH, 0, 0, Art.FW * 3, Art.FH * 3);
        }
        raf = requestAnimationFrame(draw);
      };
      render(); draw();
      el.addEventListener('click', (e) => {
        const t = e.target;
        const s1 = t.closest('[data-k]');
        if (s1) { st[s1.dataset.k] = s1.dataset.v; Sfx.play('click'); render(); return; }
        const sx = t.closest('[data-sex]');
        if (sx) { st.female = sx.dataset.sex === 'f'; st.hairStyle = st.female ? 'long' : 'short'; Sfx.play('click'); render(); return; }
        const hs = t.closest('[data-hs]');
        if (hs) { st.hairStyle = hs.dataset.hs; Sfx.play('click'); render(); return; }
        if (t.closest('[data-gl]')) { st.glasses = !st.glasses; render(); return; }
        if (t.closest('[data-ear]')) { st.earrings = !st.earrings; Sfx.play('click'); render(); return; }
        const fc = t.closest('[data-face]');
        if (fc) { st.face = fc.dataset.face; Sfx.play('click'); render(); return; }
        if (t.closest('[data-go]')) {
          const name = (st.name || '').trim() || (st.female ? 'Дана' : 'Нурлан');
          cancelAnimationFrame(raf);
          popModal(el);
          Sfx.play('success');
          resolve({ name, sportColor: st.sport, base: { female: st.female, skin: st.skin, hair: st.hair, hairStyle: st.hairStyle, glasses: st.glasses, from: st.from, ...feat() } });
        }
      });
    });
  }

  function ending(sum) {
    return new Promise((resolve) => {
      const el = h(`<div class="sheet ending fx-panel" role="dialog" aria-label="Финал">
        <header class="sheet-head"><span class="fx-gold">Сен — астаналықсың</span><small>Теперь ты ${gx('житель', 'жительница')} Астаны</small></header>
        <p class="loc-desc">За ${sum.days} дн. ты ${gx('прошёл', 'прошла')} путь от вокзала «Астана-1» до собственной квартиры на левом берегу.</p>
        <div class="end-grid">
          <div class="fx-tile"><b>${sum.deliveries}</b><span>доставок</span></div>
          <div class="fx-tile"><b>${sum.shifts}</b><span>рабочих смен</span></div>
          <div class="fx-tile"><b>${sum.kaz}</b><span>уровень казахского</span></div>
          <div class="fx-tile"><b>${escapeHtml(sum.title)}</b><span>должность</span></div>
        </div>
        <p class="loc-desc">${sum.partner ? (sum.married ? 'Дома тебя ждёт ' : 'Рядом с тобой — ') + escapeHtml(sum.partner) + '. ' : ''}${sum.friends.length ? 'Друзья: ' + escapeHtml(sum.friends.join(', ')) + '.' : 'Друзей пока немного — но город большой.'}</p>
        <footer class="loc-foot"><button class="btn big fx-gold" data-close>${UIKit.img('star')}Продолжить жить в Астане</button></footer></div>`);
      pushModal(el);
      el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { popModal(el); resolve(); } });
    });
  }

  return {
    say, ask, toast, banner, fade, initHud, updateHud, hint, openLocation, closeLocation, refreshLocation, currentLoc, closeAll,
    wardrobe, openPhone, title, creator, ending, pushModal, popModal, blocking, topModal, drawMap, escape, back, relLabel, toneOf,
  };
})();
