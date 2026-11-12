'use strict';
// Страховка прогресса: резервная копия сохранения, перенос кодом или файлом и журнал ошибок.

const Backup = (() => {
  const BAK_KEY = SAVE_KEY + '-bak';
  const ERR_KEY = 'astana-errors';
  const PREFIX = 'ASTANA1:';
  const inApk = () => typeof AndroidBridge !== 'undefined';

  /* ---------- резервная копия ---------- */

  const valid = (d) => !!d && typeof d === 'object' && d.v === 1 && typeof d.name === 'string' && d.name.length > 0
    && Number.isFinite(d.day) && Number.isFinite(d.min) && !!d.base && typeof d.base === 'object';

  // Копия делается раз в игровой день и хранит состояние на утро — к ней можно вернуться
  function keep(state) {
    const b = Store.get(BAK_KEY);
    if (b && b.day === state.day && b.name === state.name) return;
    Store.set(BAK_KEY, state);
  }
  function get() { const b = Store.get(BAK_KEY); return valid(b) ? b : null; }
  function label() { const b = get(); return b ? `${b.name} · ${fmtDate(b.day)}` : ''; }
  function restore() {
    const b = get();
    if (!b) return false;
    return Store.set(SAVE_KEY, b);
  }

  /* ---------- перенос сохранения ---------- */

  function encode(state) {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return PREFIX + btoa(bin);
  }
  // Принимает и код, и содержимое файла; возвращает сохранение или null
  function decode(text) {
    try {
      let t = String(text || '').trim();
      if (!t) return null;
      if (t[0] !== '{') {
        if (t.startsWith(PREFIX)) t = t.slice(PREFIX.length);
        const bin = atob(t.replace(/\s+/g, ''));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        t = new TextDecoder().decode(bytes);
      }
      const d = JSON.parse(t);
      return valid(d) ? d : null;
    } catch (e) { return null; }
  }

  async function copyText(text, area) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* пробуем по-старому */ }
    try { area.focus(); area.select(); return document.execCommand('copy'); } catch (e) { return false; }
  }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function sheet(html) {
    const t = document.createElement('template');
    t.innerHTML = `<div class="sheet backup fx-panel" role="dialog">${html}</div>`;
    const el = t.content.firstElementChild;
    UI.pushModal(el);
    return el;
  }

  // Окно с кодом сохранения: скопировать или скачать файлом
  function exportDialog() {
    return new Promise((resolve) => {
      G.save();
      const code = encode(G.s);
      const el = sheet(`<div class="sheet-head"><span class="fx-btn">Перенос сохранения</span><small>${escapeHtml(G.s.name)} · ${escapeHtml(fmtDate(G.s.day))}</small></div>
        <div class="backup-body">
          <p class="note">Это твоя игра в виде кода. Скопируй его и сохрани в заметках или отправь себе в мессенджере. На другом телефоне или после переустановки вставь код в «Загрузить из кода».</p>
          <textarea readonly rows="5" spellcheck="false"></textarea>
          <div class="backup-btns">
            <button class="btn fx-gold" data-copy>Скопировать код</button>
            ${inApk() ? '' : '<button class="btn fx-btn" data-file>Скачать файл</button>'}
            <button class="btn fx-tile" data-close>Закрыть</button>
          </div>
        </div>`);
      const area = el.querySelector('textarea');
      area.value = code;
      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-copy]')) {
          const ok = await copyText(code, area);
          UI.toast(ok ? 'Код скопирован' : 'Не получилось скопировать — выдели код и скопируй вручную', ok ? 'good' : 'bad');
        } else if (e.target.closest('[data-file]')) {
          download(`astana-${G.s.day}.txt`, code);
        } else if (e.target.closest('[data-close]')) { UI.popModal(el); resolve(); }
      });
    });
  }

  // Окно загрузки: вставить код или выбрать файл. Возвращает true, если сохранение заменено
  function importDialog() {
    return new Promise((resolve) => {
      const el = sheet(`<div class="sheet-head"><span class="fx-btn">Загрузить из кода</span></div>
        <div class="backup-body">
          <p class="note">Вставь код сохранения${inApk() ? '' : ' или выбери файл'}. Текущая игра на этом устройстве будет заменена.</p>
          <textarea rows="5" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="ASTANA1:…"></textarea>
          <p class="backup-msg" hidden></p>
          <div class="backup-btns">
            <button class="btn fx-gold" data-load>Загрузить</button>
            ${inApk() ? '' : '<label class="btn fx-btn">Выбрать файл<input type="file" accept=".txt,.json,text/plain,application/json" hidden></label>'}
            <button class="btn fx-tile" data-close>Отмена</button>
          </div>
        </div>`);
      const area = el.querySelector('textarea');
      const msg = el.querySelector('.backup-msg');
      const say = (t) => { msg.textContent = t; msg.hidden = false; };
      const file = el.querySelector('input[type=file]');
      if (file) file.addEventListener('change', async () => {
        if (!file.files[0]) return;
        try { area.value = await file.files[0].text(); msg.hidden = true; } catch (e) { say('Не получилось прочитать файл.'); }
      });
      let armed = null;
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) { UI.popModal(el); resolve(false); return; }
        const btn = e.target.closest('[data-load]');
        if (!btn) return;
        const d = decode(area.value);
        if (!d) { armed = null; btn.textContent = 'Загрузить'; say('Код не подходит: он неполный или повреждён. Скопируй его целиком.'); return; }
        const cur = Store.get(SAVE_KEY);
        if (valid(cur) && armed !== area.value) {
          armed = area.value; btn.textContent = 'Заменить';
          say(`В коде: ${d.name}, ${fmtDate(d.day)}. Сейчас на устройстве: ${cur.name}, ${fmtDate(cur.day)} — она будет заменена. Нажми «Заменить».`);
          return;
        }
        if (!Store.set(SAVE_KEY, d)) { say('Не получилось записать: память устройства недоступна или переполнена.'); return; }
        UI.popModal(el);
        resolve(true);
      });
    });
  }

  /* ---------- журнал ошибок ---------- */

  let lastToast = 0;
  function note(err, where) {
    const e = err && err.reason !== undefined ? err.reason : err;
    const rec = {
      at: new Date().toISOString(), where: where || '',
      msg: String((e && e.message) || e || 'неизвестная ошибка').slice(0, 300),
      stack: String((e && e.stack) || '').split('\n').slice(0, 6).join('\n').slice(0, 900),
      day: typeof G !== 'undefined' && G.s ? G.s.day : null, min: typeof G !== 'undefined' && G.s ? Math.floor(G.s.min) : null,
    };
    const list = Store.get(ERR_KEY) || [];
    list.push(rec);
    Store.set(ERR_KEY, list.slice(-20));
    const now = Date.now();
    if (now - lastToast > 8000 && typeof UI !== 'undefined') {
      lastToast = now;
      UI.toast('Что-то пошло не так. Игра сохранена, а ошибка записана: Настройки → «Журнал ошибок».', 'bad');
    }
  }
  const errors = () => Store.get(ERR_KEY) || [];
  function report() {
    return errors().map((r) => `[${r.at}] день ${r.day}, ${r.min} мин · ${r.where}\n${r.msg}\n${r.stack}`).join('\n\n');
  }

  function errorsDialog() {
    return new Promise((resolve) => {
      const text = report();
      const el = sheet(`<div class="sheet-head"><span class="fx-btn">Журнал ошибок</span><small>последние ${errors().length}</small></div>
        <div class="backup-body">
          <p class="note">Если игра повела себя странно, скопируй этот текст и отправь разработчику — по нему видно, что сломалось.</p>
          <textarea readonly rows="8" spellcheck="false"></textarea>
          <div class="backup-btns">
            <button class="btn fx-gold" data-copy>Скопировать</button>
            <button class="btn fx-red" data-clear>Очистить</button>
            <button class="btn fx-tile" data-close>Закрыть</button>
          </div>
        </div>`);
      const area = el.querySelector('textarea');
      area.value = text;
      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-copy]')) {
          const ok = await copyText(text, area);
          UI.toast(ok ? 'Журнал скопирован' : 'Не получилось скопировать — выдели текст вручную', ok ? 'good' : 'bad');
        } else if (e.target.closest('[data-clear]')) { Store.del(ERR_KEY); UI.popModal(el); resolve(); }
        else if (e.target.closest('[data-close]')) { UI.popModal(el); resolve(); }
      });
    });
  }

  window.addEventListener('error', (e) => note(e.error || e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => note(e, 'promise'));

  return { keep, get, label, restore, valid, encode, decode, exportDialog, importDialog, note, errors, errorsDialog };
})();
