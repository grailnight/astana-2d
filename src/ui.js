'use strict';
// Интерфейс: HUD, диалоги, локации, телефон, карта, гардероб, титры.

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
    document.body.classList.toggle('focus', modals.some((m) => m.matches('.mg, .ending, .creator, .title-screen')));
    document.body.classList.toggle('modal', modals.length > 0);
  }
  function pushModal(el) { layer().appendChild(el); modals.push(el); Input.clear(); syncFocus(); }
  function popModal(el) {
    const i = modals.indexOf(el);
    if (i >= 0) modals.splice(i, 1);
    el.remove();
    Input.clear();
    syncFocus();
  }
  function blocking() { return modals.length > 0; }

  function nameOf(who) {
    if (!who) return '';
    if (who === 'me') return G.s.name;
    return NPCS[who] ? NPCS[who].name : who;
  }
  function lookOf(who) {
    if (who === 'me') return G.look();
    return NPCS[who] ? NPCS[who].look : null;
  }

  function portraitEl(who, size = 72) {
    const L = lookOf(who);
    if (!L) return '';
    const cv = Art.portrait(L, 64);
    return `<img class="portrait" width="${size}" height="${size}" alt="" src="${cv.toDataURL()}">`;
  }

  /* ---------- диалоги ---------- */

  function dialog(who, text, options) {
    return new Promise((resolve) => {
      const opts = (options || []).map((o) => (typeof o === 'string' ? { text: o } : o));
      const el = h(`
        <div class="dlg ${who ? '' : 'narr'}" role="dialog" aria-live="polite">
          ${who ? `<div class="dlg-face">${portraitEl(who)}</div>` : ''}
          <div class="dlg-body">
            ${who ? `<div class="dlg-name">${escapeHtml(nameOf(who))}</div>` : ''}
            <div class="dlg-text"></div>
            ${opts.length ? `<div class="dlg-opts">${opts.map((o, i) => `<button class="opt" data-i="${i}" ${o.disabled ? 'disabled' : ''}><span class="kbd">${i + 1}</span><span>${escapeHtml(o.text)}${o.note ? `<small>${escapeHtml(o.note)}</small>` : ''}</span></button>`).join('')}</div>` : '<div class="dlg-next" aria-hidden="true">▼</div>'}
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
        if (modals[modals.length - 1] !== el || e.repeat) return;
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

  function toast(text, kind = 'info') {
    const box = $('#toasts');
    if (!box) return;
    const el = h(`<div class="toast ${kind}">${escapeHtml(text)}</div>`);
    box.appendChild(el);
    const max = window.innerWidth < 520 ? 2 : 4;
    while (box.children.length > max) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 3400);
    setTimeout(() => el.remove(), 3900);
  }

  let bannerTimer = 0;
  function banner(text) {
    const el = $('#area-banner');
    el.textContent = text;
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

  function initHud() {
    $('#bar-energy img').src = Art.icon('energy');
    $('#bar-food img').src = Art.icon('food');
    $('#bar-mood img').src = Art.icon('mood');
    $('#btn-phone img').src = Art.icon('phone', 4);
    $('#btn-phone').addEventListener('click', () => { Sfx.play('click'); openPhone('quests'); });
    $('#objective').addEventListener('click', () => { Sfx.play('click'); openPhone('quests'); });
  }

  function updateHud() {
    const s = G.s;
    if (!s) return;
    setText('#hud-date', fmtDate(s.day));
    setText('#hud-clock', fmtClock(s.min));
    const t = G.temp();
    setText('#hud-temp', (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t) + '°');
    const wx = s.weather.kind;
    const wi = G.isNight() && (wx === 'clear') ? 'moon' : { clear: 'sun', cloudy: 'cloud', rain: 'rain', snow: 'snow', buran: 'snow' }[wx];
    if (hudCache.wx !== wi) { hudCache.wx = wi; $('#hud-wx').src = Art.icon(wi); $('#hud-wx').alt = Content.WEATHER_NAMES[wx]; }
    setText('#hud-money', fmtMoney(s.money));
    const bars = [['energy', s.energy / s.maxEnergy], ['food', s.food / 100], ['mood', s.mood / 100]];
    for (const [k, v] of bars) {
      const key = '#bar-' + k;
      const pct = Math.round(v * 100);
      if (hudCache[key] !== pct) {
        hudCache[key] = pct;
        const el = $(key);
        el.querySelector('b').style.width = pct + '%';
        el.classList.toggle('low', pct < 25);
      }
    }
    const cold = G.coldDeficit() > 0;
    $('#hud-time').classList.toggle('cold', cold);
    const hh = $('#hud').offsetHeight;
    if (hudCache.hh !== hh) { hudCache.hh = hh; document.documentElement.style.setProperty('--hud-h', hh + 'px'); }
    const o = Quests.objective();
    setHtml('#objective', o ? `<img alt="" src="${Art.icon('star', 2)}"><span><b>${escapeHtml(o.title)}</b>${escapeHtml(o.text)}</span>` : '');
    $('#objective').hidden = !o;
  }

  // Короткое слово для круглой кнопки действия на телефоне
  const ACT_WORDS = [['Войти', 'ВОЙТИ'], ['Говорить', 'ПРИВЕТ'], ['Заговорить', 'ПРИВЕТ'], ['Забрать', 'ВЗЯТЬ'], ['Доставить', 'ОТДАТЬ'],
    ['Подъезд', 'ДВЕРЬ'], ['Смотреть', 'ГЛЯНУТЬ'], ['Автобус', 'АВТОБУС'], ['Погладить', 'ГЛАДИТЬ'], ['Посидеть', 'СЕСТЬ'], ['Бросить', 'МОНЕТКА'], ['Юрта', 'ЮРТА']];
  function actLabel(text) {
    const w = ACT_WORDS.find(([k]) => text.startsWith(k));
    return w ? w[1] : 'E';
  }

  function hint(text) {
    const el = $('#hint');
    if (!text) { el.hidden = true; $('#btn-act').classList.remove('live'); hudCache.hint = null; return; }
    if (hudCache.hint !== text) {
      hudCache.hint = text;
      el.innerHTML = `<span class="kbd">E</span>${escapeHtml(text)}`;
      $('#btn-act').textContent = actLabel(text);
    }
    el.hidden = false;
    $('#btn-act').classList.add('live');
  }

  /* ---------- локации ---------- */

  const TONES = { home: '#c97b4a', shop: '#2a8f5a', market: '#d9433a', food: '#e8a317', study: '#3b5998', cafe: '#8a6a45', work: '#2a6f97', calm: '#2fa3b5', night: '#b0397a', gold: '#d9a53a', office: '#4f86b0' };

  function buildingArt(id) {
    const b = World.byId[id];
    if (!b) return '';
    const maxH = 120, maxW = 300;
    const sc = Math.max(1, Math.min(4, Math.floor(Math.min(maxH / b.sh, maxW / b.sw) * 2) / 2 || 1));
    const cv = makeCanvas(b.sw * sc, Math.min(b.sh * sc, 160));
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(b.sprite, 0, Math.max(0, b.sh - 160 / sc), b.sw, Math.min(b.sh, 160 / sc), 0, 0, b.sw * sc, Math.min(b.sh * sc, 160));
    return `<img class="loc-art" alt="" src="${cv.toDataURL()}">`;
  }

  function openLocation(id) {
    closeLocation();
    locId = id;
    locEl = h(`<div class="sheet loc" role="dialog" aria-label="${escapeHtml(Content.locName(id))}"></div>`);
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
    const npcs = (L.npcs ? L.npcs() : []).filter((n) => !(n === 'gulnar' && s.homeId !== 'home'));
    const acts = L.actions().filter(Boolean);
    locEl.style.setProperty('--tone', TONES[L.tone] || '#2ec4e6');
    locEl.innerHTML = `
      <div class="loc-hero">${buildingArt(locId)}<div class="orn"></div></div>
      <header class="loc-head">
        <div class="eyebrow">${escapeHtml(L.kz || '')}</div>
        <h2>${escapeHtml(Content.locName(locId))}</h2>
        <div class="loc-meta"><span>${hours}</span><span>${fmtDate(s.day)}, ${fmtClock(s.min)}</span><span class="money">${fmtMoney(s.money)}</span></div>
      </header>
      <p class="loc-desc">${escapeHtml(L.desc())}</p>
      ${npcs.length ? `<div class="loc-npcs">${npcs.map((n) => `<button class="npc" data-npc="${n}">${portraitEl(n, 48)}<span><b>${escapeHtml(NPCS[n].name)}</b><small>${relLabel(n)}</small></span></button>`).join('')}</div>` : ''}
      <div class="loc-actions">${acts.map((x, i) => actRow(x, i)).join('') || '<p class="empty">Здесь пока нечего делать.</p>'}</div>
      <footer class="loc-foot"><button class="btn ghost" data-close>Выйти на улицу</button></footer>`;
    locEl._acts = acts;
  }

  function relLabel(id) {
    const r = G.s.rel[id] || 0;
    const t = Romance.isDater(id) ? Romance.stage(id) : r >= 80 ? 'близкие люди' : r >= 50 ? 'друзья' : r >= 25 ? 'приятели' : r > 0 ? 'знакомые' : 'незнакомы';
    return `${t} · ${r}`;
  }

  function actRow(x, i) {
    const side = [];
    if (x.price) side.push(`<em class="price">${fmtMoney(x.price)}</em>`);
    if (x.time) side.push(`<em class="time">${x.time >= 60 ? (x.time / 60).toString().replace('.', ',') + ' ч' : x.time + ' мин'}</em>`);
    const cant = x.price && !G.canPay(x.price) ? 'не хватает денег' : null;
    const dis = x.disabled || cant;
    return `<button class="act" data-i="${i}" ${dis ? 'aria-disabled="true"' : ''}>
      <span class="a-main"><b>${escapeHtml(x.label)}</b><small>${escapeHtml(dis || x.sub || '')}</small></span>
      <span class="a-side">${side.join('')}</span></button>`;
  }

  let actBusy = false;
  async function onLocClick(e) {
    if (actBusy || modals[modals.length - 1] !== locEl) return;
    if (e.target.closest('[data-close]')) { Sfx.play('door'); closeLocation(); return; }
    const npc = e.target.closest('[data-npc]');
    if (npc) {
      actBusy = true;
      try { await Content.Talk[npc.dataset.npc](); } finally { actBusy = false; }
      afterAction();
      return;
    }
    const row = e.target.closest('.act');
    if (!row) return;
    const x = locEl._acts[+row.dataset.i];
    if (row.getAttribute('aria-disabled') === 'true') { Sfx.play('error'); toast(x.disabled || 'Не хватает денег', 'bad'); return; }
    Sfx.play('click');
    actBusy = true;
    try { await x.run(); } finally { actBusy = false; }
    afterAction();
  }

  function afterAction() {
    if (!locEl) return;
    Quests.tick();
    if (!Content.isOpen(locId)) { toast(`«${Content.locName(locId)}» закрывается`, 'info'); closeLocation(); return; }
    renderLocation();
  }

  function closeLocation() {
    if (locEl) { popModal(locEl); locEl = null; locId = null; }
  }
  function refreshLocation() { renderLocation(); }
  function currentLoc() { return locId; }

  // Esc закрывает верхнее окно, если это локация, телефон или гардероб
  function escape() {
    const top = modals[modals.length - 1];
    if (!top) return;
    if (top === locEl) { Sfx.play('door'); closeLocation(); }
    else if (top === phoneEl) { popModal(phoneEl); phoneEl = null; }
    else if (top.classList.contains('wardrobe')) { const b = top.querySelector('[data-close]'); if (b) b.click(); }
  }

  // Системная кнопка «Назад» на Android: true — если что-то закрыли в игре
  function back() {
    const top = modals[modals.length - 1];
    if (!top) return false;
    if (top === locEl || top === phoneEl || top.classList.contains('wardrobe')) { escape(); return true; }
    if (top.classList.contains('title-screen') || top.classList.contains('creator')) return false;
    return true; // диалоги и мини-игры назад не закрываем, просто не выходим из игры
  }

  function closeAll() {
    closeLocation();
    if (phoneEl) { popModal(phoneEl); phoneEl = null; }
  }

  /* ---------- гардероб ---------- */

  function wardrobe() {
    return new Promise((resolve) => {
      const s = G.s;
      const el = h('<div class="sheet wardrobe" role="dialog" aria-label="Гардероб"></div>');
      pushModal(el);
      const render = () => {
        const c = s.clothes;
        const slot = (title, key, allowNone) => {
          const owned = c.owned.filter((id) => CLOTHES[id].slot === key);
          const items = (allowNone ? [null] : []).concat(owned);
          return `<section><h3>${title}</h3><div class="chips">${items.map((id) => `<button class="chip-btn ${c[key] === id ? 'on' : ''}" data-slot="${key}" data-id="${id || ''}">${id ? escapeHtml(CLOTHES[id].name) : 'Без'}${id && CLOTHES[id].warm ? ` <small>+${CLOTHES[id].warm}°</small>` : ''}</button>`).join('')}</div></section>`;
        };
        const sheetCv = Art.charSheet(G.look());
        const big = makeCanvas(96, Art.FH * 6);
        const g = big.getContext('2d'); g.imageSmoothingEnabled = false;
        g.drawImage(sheetCv, 0, 0, 16, Art.FH, 0, 0, 96, Art.FH * 6);
        el.innerHTML = `<div class="orn"></div><header class="loc-head"><div class="eyebrow">Киім</div><h2>Гардероб</h2>
          <div class="loc-meta"><span>Тепло: ${G.warmth()}</span><span>Нужно сейчас: ${G.needWarmth()}</span></div></header>
          <div class="wr-body"><img class="wr-prev" alt="" src="${big.toDataURL()}"><div class="wr-slots">
          ${slot('Одежда', 'outfit', false)}${slot('Верхняя одежда', 'outer', true)}${slot('Головной убор', 'hat', true)}</div></div>
          <footer class="loc-foot"><button class="btn" data-close>Готово</button></footer>`;
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

  const TABS = [['quests', 'Задания'], ['map', 'Карта'], ['contacts', 'Контакты'], ['bag', 'Сумка'], ['me', 'Я'], ['settings', 'Ещё']];

  function openPhone(tab = 'quests') {
    if (phoneEl) popModal(phoneEl);
    phoneEl = h('<div class="sheet phone" role="dialog" aria-label="Телефон"></div>');
    pushModal(phoneEl);
    phoneEl.addEventListener('click', onPhoneClick);
    renderPhone(tab);
  }

  function renderPhone(tab) {
    const el = phoneEl;
    if (!el) return;
    el.dataset.tab = tab;
    el.innerHTML = `<div class="ph-top"><span>${fmtClock(G.s.min)}</span><b>${escapeHtml(G.s.name)}</b><button class="x" data-close aria-label="Закрыть">✕</button></div>
      <nav class="ph-tabs">${TABS.map(([k, n]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</nav>
      <div class="ph-body">${phoneTab(tab)}</div>`;
    if (tab === 'map') drawMap($('.map-cv', el));
  }

  function bar(v, max = 1) { return `<i class="pbar"><b style="width:${Math.round(clamp(v / max, 0, 1) * 100)}%"></b></i>`; }

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
        return `<button class="q-row ${s.track === q.id ? 'on' : ''}" data-track="${q.id}"><b>${escapeHtml(q.title)}</b><small>${escapeHtml(txt)}</small><span class="q-steps">${q.steps.map((_, i) => `<i class="${i < r.step ? 'd' : i === r.step ? 'c' : ''}"></i>`).join('')}</span></button>`;
      };
      return `${s.delivery ? `<div class="note"><b>${escapeHtml(side.title)}</b> ${escapeHtml(side.text)}</div>` : ''}
        <h3>Активные</h3>${act.map(row).join('') || '<p class="empty">Нет активных заданий.</p>'}
        <p class="hint-small">Нажми на задание, чтобы следить за ним — стрелка на экране укажет путь.</p>
        ${fin.length ? `<h3>Завершённые</h3>${fin.map((q) => `<div class="q-row done"><b>${escapeHtml(q.title)}</b><small>${Quests.status(q.id) === 'failed' ? 'провалено' : 'выполнено'}</small></div>`).join('')}` : ''}`;
    }
    if (tab === 'map') {
      return `<div class="map-wrap"><canvas class="map-cv"></canvas></div><p class="hint-small">Нажми на здание, чтобы вызвать такси. Синие значки — остановки автобуса (${fmtMoney(BUS_FARE)}).</p>`;
    }
    if (tab === 'contacts') {
      return Content.CONTACTS.filter((c) => c.when()).map((c) => `<div class="contact">${portraitEl(c.id, 48)}<span><b>${escapeHtml(NPCS[c.id].name)}</b>${bar(s.rel[c.id] || 0, 100)}<small>${relLabel(c.id)}</small></span><button class="btn small" data-call="${c.id}">Позвонить</button></div>`).join('')
        + '<p class="hint-small">Мама подскажет, что делать дальше. Новые контакты появятся по мере знакомства.</p>';
    }
    if (tab === 'bag') {
      const items = Object.entries(s.inv).filter(([, n]) => n > 0);
      const c = s.clothes;
      const worn = [c.outfit, c.outer, c.hat].filter(Boolean).map((id) => CLOTHES[id].name).join(', ');
      return `<h3>Предметы</h3>${items.map(([id, n]) => `<div class="item"><span><b>${escapeHtml(ITEMS[id].name)}${n > 1 ? ` ×${n}` : ''}</b><small>${escapeHtml(ITEMS[id].desc)}</small></span>${ITEMS[id].food ? `<button class="btn small" data-eat="${id}">Съесть</button>` : ''}</div>`).join('') || '<p class="empty">Сумка пуста.</p>'}
        <h3>Одежда</h3><p class="note">Надето: ${escapeHtml(worn)}. Тепло: ${G.warmth()} (сейчас нужно ${G.needWarmth()}). Переодеться можно дома в гардеробе.</p>`;
    }
    if (tab === 'me') {
      const sk = Object.entries(SKILLS).map(([k, v]) => `<div class="skill"><img alt="" src="${Art.icon(v.icon, 2)}"><b>${v.name}</b><span>ур. ${G.lv(k)}</span>${bar(s.xp[k] - G.lv(k), 1)}</div>`).join('');
      const job = s.job.hired ? Content.OFFICE_TITLES[s.job.level] + ' в Steppe Digital' : s.flags.joinedCourier ? 'Курьер «Жылдам»' : 'Ищу работу';
      return `<div class="me-head">${portraitEl('me', 64)}<span><b>${escapeHtml(s.name)}</b><small>${escapeHtml(job)}</small><small>Из: ${escapeHtml(s.base.from || 'родного посёлка')} · день ${s.day} в Астане</small></span></div>
        <div class="stats">
          <div><span>Энергия</span>${bar(s.energy, s.maxEnergy)}<em>${Math.round(s.energy)}/${s.maxEnergy}</em></div>
          <div><span>Сытость</span>${bar(s.food, 100)}<em>${Math.round(s.food)}</em></div>
          <div><span>Настроение</span>${bar(s.mood, 100)}<em>${Math.round(s.mood)}</em></div>
        </div>
        <h3>Навыки</h3>${sk}
        <h3>Жильё</h3><p class="note">${s.flags.ownFlat ? 'Своя квартира на левом берегу.' : `Комната у Гульнар-апай. Аренда ${fmtMoney(s.rent.amount)} — оплачено до конца дня ${s.rent.due}.${s.rent.locked ? ' Комната закрыта за долг!' : ''}`}</p>
        <p class="note">Доставок: ${s.stats.deliveries} · смен бариста: ${s.stats.baristaShifts} · смен в офисе: ${s.stats.officeShifts}</p>`;
    }
    if (tab === 'settings') {
      return `<div class="set-row"><span>Звуки</span><button class="btn small ${Sfx.prefs.sfx ? '' : 'ghost'}" data-pref="sfx">${Sfx.prefs.sfx ? 'Вкл' : 'Выкл'}</button></div>
        <div class="set-row"><span>Музыка (домбра)</span><button class="btn small ${Sfx.prefs.music ? '' : 'ghost'}" data-pref="music">${Sfx.prefs.music ? 'Вкл' : 'Выкл'}</button></div>
        ${Device.touch() ? `<div class="set-row"><span>Вибрация</span><button class="btn small ${Device.prefs.vibrate ? '' : 'ghost'}" data-vib>${Device.prefs.vibrate ? 'Вкл' : 'Выкл'}</button></div>` : ''}
        ${Device.canFullscreen() ? `<div class="set-row"><span>Полный экран</span><button class="btn small ${Device.isFullscreen() ? '' : 'ghost'}" data-fs>${Device.isFullscreen() ? 'Вкл' : 'Выкл'}</button></div>` : ''}
        <div class="set-row"><span>Сохранить игру</span><button class="btn small" data-save>Сохранить</button></div>
        <div class="set-row"><span>Начать заново</span><button class="btn small danger" data-reset>Новая игра</button></div>
        <h3>Управление</h3>
        <p class="note">Клавиатура: WASD или стрелки — ходить, E / пробел — действие, Tab или Q — телефон, M — карта, Esc — закрыть.<br>Телефон: левая часть экрана — джойстик, кнопка справа — действие.</p>
        <p class="note">Игра сохраняется автоматически, когда ты спишь. Сохранение хранится только в этом браузере.</p>`;
    }
    return '';
  }

  let resetArm = false;
  async function onPhoneClick(e) {
    if (modals[modals.length - 1] !== phoneEl) return;
    const t = e.target;
    if (t.closest('[data-close]')) { popModal(phoneEl); phoneEl = null; return; }
    const tab = t.closest('[data-tab]');
    if (tab) { Sfx.play('click'); renderPhone(tab.dataset.tab); return; }
    const tr = t.closest('[data-track]');
    if (tr) { G.s.track = tr.dataset.track; Sfx.play('click'); renderPhone('quests'); return; }
    const call = t.closest('[data-call]');
    if (call) { await Content.call(call.dataset.call); Quests.tick(); renderPhone('contacts'); return; }
    const eat = t.closest('[data-eat]');
    if (eat) { await Content.eat(eat.dataset.eat); renderPhone('bag'); return; }
    const pref = t.closest('[data-pref]');
    if (pref) { Sfx.setPref(pref.dataset.pref, !Sfx.prefs[pref.dataset.pref]); renderPhone('settings'); return; }
    if (t.closest('[data-save]')) { G.save(); toast('Игра сохранена', 'good'); return; }
    if (t.closest('[data-vib]')) { Device.setPref('vibrate', !Device.prefs.vibrate); Device.buzz(30); renderPhone('settings'); return; }
    if (t.closest('[data-fs]')) { if (!await Device.toggleFullscreen()) toast('Браузер не разрешил полный экран. Добавь игру на главный экран — там она открывается без рамок.', 'info'); setTimeout(() => phoneEl && renderPhone('settings'), 300); return; }
    const rs = t.closest('[data-reset]');
    if (rs) {
      if (!resetArm) { resetArm = true; rs.textContent = 'Точно? Нажми ещё раз'; setTimeout(() => { resetArm = false; }, 3000); return; }
      G.wipe(); location.reload(); return;
    }
    const cv = t.closest('.map-cv');
    if (cv) { mapClick(cv, e); }
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
    const W = wrap.clientWidth || 320;
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
    if (phoneEl) renderPhone('map');
  }

  /* ---------- титульный экран и создание персонажа ---------- */

  function title(hasSave) {
    return new Promise((resolve) => {
      const el = h(`<div class="title-screen">
        <canvas class="title-sky"></canvas>
        <div class="title-card">
          <div class="eyebrow">Жаңа өмір · Новая жизнь</div>
          <h1>АСТАНА</h1>
          <p>Ты приезжаешь в столицу с одной сумкой и 15 000 тенге. Найди работу, друзей и свой дом — и переживи первую зиму.</p>
          <div class="title-btns">
            ${hasSave ? '<button class="btn big" data-go="load">Продолжить</button>' : ''}
            <button class="btn big ${hasSave ? 'ghost' : ''}" data-go="new">Новая игра</button>
            ${Device.touch() && Device.canFullscreen() && !Device.isFullscreen() ? '<button class="btn ghost" data-fs>На весь экран</button>' : ''}
          </div>
        </div></div>`);
      pushModal(el);
      const cv = $('.title-sky', el);
      let raf = 0;
      const t0 = performance.now();
      const draw = () => {
        const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
        if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
        const g = cv.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        Render.skyline(g, W, H, (performance.now() - t0) / 1000);
        raf = requestAnimationFrame(draw);
      };
      draw();
      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-fs]')) {
          const fs = e.target.closest('[data-fs]');
          if (await Device.toggleFullscreen()) fs.remove(); else fs.textContent = 'Полный экран недоступен здесь';
          return;
        }
        const b = e.target.closest('[data-go]');
        if (!b) return;
        Sfx.unlock(); Sfx.play('click');
        cancelAnimationFrame(raf);
        popModal(el);
        resolve(b.dataset.go);
      });
    });
  }

  const SKINS = ['#f1c9a5', '#e0b38c', '#d4a07a', '#c68c63', '#a8714f'];
  const HAIRS = ['#1d1612', '#3b2a20', '#5a3d28', '#8a5a2b', '#b08a5a', '#7a1f1f'];
  const SPORT = ['#2f6fd1', '#c0392b', '#27ae60', '#8e44ad', '#16a085', '#2b2b2b', '#e67e22'];
  const STYLES_M = [['short', 'Короткая'], ['buzz', 'Ёжик'], ['bob', 'Каре'], ['long', 'Длинные']];
  const STYLES_F = [['long', 'Длинные'], ['pony', 'Хвост'], ['bun', 'Пучок'], ['bob', 'Каре'], ['short', 'Короткая']];
  const TOWNS = ['Шымкент', 'Караганда', 'Актобе', 'Павлодар', 'Кызылорда', 'Уральск', 'Семей', 'аул под Туркестаном'];

  function creator() {
    return new Promise((resolve) => {
      const st = { name: '', female: false, skin: SKINS[1], hair: HAIRS[0], hairStyle: 'short', sport: SPORT[0], from: TOWNS[0], glasses: false };
      const el = h('<div class="sheet creator" role="dialog" aria-label="Создание персонажа"></div>');
      pushModal(el);
      let spin = 0, raf = 0;
      const look = () => ({ female: st.female, skin: st.skin, hair: st.hair, hairStyle: st.hairStyle, outfit: 'sport', top: st.sport, bottom: shade(st.sport, -0.3), shoes: '#2a2420', glasses: st.glasses });
      const sw = (key, list) => `<div class="swatches">${list.map((c) => `<button class="sw ${st[key] === c ? 'on' : ''}" data-k="${key}" data-v="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div>`;
      const render = () => {
        const styles = st.female ? STYLES_F : STYLES_M;
        el.innerHTML = `<div class="orn"></div><header class="loc-head"><div class="eyebrow">Кто ты?</div><h2>Новый житель столицы</h2></header>
          <div class="cr-body">
            <div class="cr-prev"><canvas width="96" height="162"></canvas></div>
            <div class="cr-form">
              <label class="fld"><span>Имя</span><input id="cr-name" maxlength="16" placeholder="${st.female ? 'Например, Дана' : 'Например, Нурлан'}" value="${escapeHtml(st.name)}" autocomplete="off"></label>
              <div class="fld"><span>Пол</span><div class="chips"><button class="chip-btn ${!st.female ? 'on' : ''}" data-sex="m">Парень</button><button class="chip-btn ${st.female ? 'on' : ''}" data-sex="f">Девушка</button></div></div>
              <div class="fld"><span>Откуда приехал${st.female ? 'а' : ''}</span><select id="cr-from">${TOWNS.map((t) => `<option ${t === st.from ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
              <div class="fld"><span>Кожа</span>${sw('skin', SKINS)}</div>
              <div class="fld"><span>Волосы</span>${sw('hair', HAIRS)}</div>
              <div class="fld"><span>Причёска</span><div class="chips">${styles.map(([k, n]) => `<button class="chip-btn ${st.hairStyle === k ? 'on' : ''}" data-hs="${k}">${n}</button>`).join('')}<button class="chip-btn ${st.glasses ? 'on' : ''}" data-gl>Очки</button></div></div>
              <div class="fld"><span>Спортивный костюм</span>${sw('sport', SPORT)}</div>
            </div>
          </div>
          <footer class="loc-foot"><button class="btn big" data-go>Поехали в Астану</button></footer>`;
        $('#cr-name', el).addEventListener('input', (e) => { st.name = e.target.value; });
        $('#cr-from', el).addEventListener('change', (e) => { st.from = e.target.value; });
      };
      const draw = () => {
        const cv = $('.cr-prev canvas', el);
        if (cv) {
          const g = cv.getContext('2d');
          g.imageSmoothingEnabled = false;
          g.clearRect(0, 0, 96, 162);
          const sheetCv = Art.charSheet(look());
          spin += 1;
          const dir = [0, 2, 3, 1][Math.floor(spin / 50) % 4];
          const f = [1, 0, 2, 0][Math.floor(spin / 8) % 4];
          g.drawImage(sheetCv, f * 16, dir * Art.FH, 16, Art.FH, 0, 0, 96, Art.FH * 6);
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
        if (t.closest('[data-go]')) {
          const name = (st.name || '').trim() || (st.female ? 'Дана' : 'Нурлан');
          cancelAnimationFrame(raf);
          popModal(el);
          Sfx.play('success');
          resolve({ name, sportColor: st.sport, base: { female: st.female, skin: st.skin, hair: st.hair, hairStyle: st.hairStyle, glasses: st.glasses, from: st.from } });
        }
      });
    });
  }

  function ending(sum) {
    return new Promise((resolve) => {
      const el = h(`<div class="sheet ending" role="dialog" aria-label="Финал">
        <div class="orn"></div>
        <header class="loc-head"><div class="eyebrow">Сен — астаналықсың</div><h2>Теперь ты ${gx('житель', 'жительница')} Астаны</h2></header>
        <p class="loc-desc">За ${sum.days} дн. ты прошёл путь от вокзала «Нұрлы Жол» до собственной квартиры на левом берегу.</p>
        <div class="end-grid">
          <div><b>${sum.deliveries}</b><span>доставок</span></div>
          <div><b>${sum.shifts}</b><span>рабочих смен</span></div>
          <div><b>${sum.kaz}</b><span>уровень казахского</span></div>
          <div><b>${escapeHtml(sum.title)}</b><span>должность</span></div>
        </div>
        <p class="loc-desc">${sum.partner ? (sum.married ? 'Дома тебя ждёт ' : 'Рядом с тобой — ') + escapeHtml(sum.partner) + '. ' : ''}${sum.friends.length ? 'Друзья: ' + escapeHtml(sum.friends.join(', ')) + '.' : 'Друзей пока немного — но город большой.'}</p>
        <footer class="loc-foot"><button class="btn big" data-close>Продолжить жить в Астане</button></footer></div>`);
      if (G.s.base.female) el.querySelector('.loc-desc').textContent = `За ${sum.days} дн. ты прошла путь от вокзала «Нұрлы Жол» до собственной квартиры на левом берегу.`;
      pushModal(el);
      el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { popModal(el); resolve(); } });
    });
  }

  return {
    say, ask, toast, banner, fade, initHud, updateHud, hint, openLocation, closeLocation, refreshLocation, currentLoc, closeAll,
    wardrobe, openPhone, title, creator, ending, pushModal, popModal, blocking, drawMap, escape, back,
  };
})();
