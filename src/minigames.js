'use strict';
// Мини-игры: бариста, тест по казахскому, ритм-игра (танец на тое и караоке).

const MG = (() => {
  function sheet(cls, html) {
    const el = document.createElement('div');
    el.className = 'mg ' + cls;
    el.innerHTML = html;
    UI.pushModal(el);
    return el;
  }

  /* ---------------- Бариста ---------------- */

  const ING = {
    espresso: { n: 'Эспрессо', c: '#4a2c1a' }, water: { n: 'Вода', c: '#7fbfe0' }, milk: { n: 'Молоко', c: '#f4efe4' },
    foam: { n: 'Пена', c: '#fffdf6' }, syrup: { n: 'Сироп', c: '#d98a1c' }, cream: { n: 'Сливки', c: '#f3e2bd' },
    ice: { n: 'Лёд', c: '#cfeefc' }, cocoa: { n: 'Какао', c: '#7b4a2a' }, tea: { n: 'Чай', c: '#b5651d' },
  };
  const DRINKS = [
    { n: 'Эспрессо', r: ['espresso'] },
    { n: 'Американо', r: ['espresso', 'water'] },
    { n: 'Капучино', r: ['espresso', 'milk', 'foam'] },
    { n: 'Латте с сиропом', r: ['espresso', 'milk', 'syrup'] },
    { n: 'Раф', r: ['espresso', 'cream', 'syrup'] },
    { n: 'Айс-латте', r: ['ice', 'espresso', 'milk'] },
    { n: 'Какао', r: ['cocoa', 'milk', 'foam'] },
    { n: 'Шай с молоком', r: ['tea', 'milk'] },
  ];
  const CUSTOMERS = ['Студентка', 'Чиновник в пальто', 'Курьер', 'Бабушка', 'Айтишник', 'Турист', 'Мама с коляской', 'Таксист'];

  function barista() {
    return new Promise((resolve) => {
      const TOTAL = 50;
      const el = sheet('barista', `
        <div class="mg-head"><div class="mg-title">Смена бариста</div><div class="mg-timer"><i></i></div><div class="mg-score">Заказов: <b>0</b></div></div>
        <div class="bar-main">
          <div class="order"><div class="who"></div><div class="drink"></div><div class="cup"><div class="layers"></div></div></div>
          <div class="recipes">${DRINKS.map((d) => `<div class="rcp"><b>${d.n}</b><span>${d.r.map((i) => ING[i].n).join(' → ')}</span></div>`).join('')}</div>
        </div>
        <div class="ings">${Object.entries(ING).map(([k, v]) => `<button class="ing" data-k="${k}"><i style="background:${v.c}"></i>${v.n}</button>`).join('')}</div>
      `);
      const $ = (q) => el.querySelector(q);
      let order, progress = 0, served = 0, tips = 0, orderStart = 0, done = false;
      const t0 = performance.now();
      function next() {
        order = pick(DRINKS); progress = 0; orderStart = performance.now();
        $('.who').textContent = pick(CUSTOMERS) + ' заказывает:';
        $('.drink').textContent = order.n;
        $('.layers').innerHTML = '';
      }
      function press(k) {
        if (done) return;
        if (order.r[progress] === k) {
          const L = document.createElement('i');
          L.style.background = ING[k].c;
          $('.layers').appendChild(L);
          progress++;
          Sfx.play('tick');
          if (progress === order.r.length) {
            served++;
            const sec = (performance.now() - orderStart) / 1000;
            tips += Math.max(0, Math.round((7 - sec) * 60 / 10) * 10);
            $('.mg-score b').textContent = served;
            Sfx.play('coin');
            el.classList.add('served');
            setTimeout(() => { el.classList.remove('served'); if (!done) next(); }, 350);
          }
        } else {
          Sfx.play('error');
          el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
          progress = 0; $('.layers').innerHTML = '';
        }
      }
      el.querySelectorAll('.ing').forEach((b) => b.addEventListener('click', () => press(b.dataset.k)));
      const keys = Object.keys(ING);
      const onKey = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= keys.length) press(keys[n - 1]); };
      window.addEventListener('keydown', onKey);
      next();
      const timer = setInterval(() => {
        const left = TOTAL - (performance.now() - t0) / 1000;
        $('.mg-timer i').style.width = Math.max(0, left / TOTAL * 100) + '%';
        if (left <= 0) {
          done = true; clearInterval(timer); window.removeEventListener('keydown', onKey);
          el.querySelector('.bar-main').innerHTML = `<div class="mg-result"><b>${served}</b> заказов<br>чаевые: ${fmtMoney(tips)}</div>`;
          setTimeout(() => { UI.popModal(el); resolve({ served, tips }); }, 1400);
        }
      }, 100);
    });
  }

  /* ---------------- Казахский ---------------- */

  const WORDS = [
    ['Сәлеметсіз бе', 'Здравствуйте', 0], ['Сәлем', 'Привет', 0], ['Рақмет', 'Спасибо', 0], ['Иә', 'Да', 0], ['Жоқ', 'Нет', 0],
    ['Кешіріңіз', 'Извините', 0], ['Сау болыңыз', 'До свидания', 0], ['Жақсы', 'Хорошо', 0], ['Су', 'Вода', 0], ['Нан', 'Хлеб', 0],
    ['Ақша', 'Деньги', 0], ['Үй', 'Дом', 0], ['Дос', 'Друг', 0], ['Ана', 'Мама', 0], ['Бір, екі, үш', 'Один, два, три', 0],
    ['Жұмыс', 'Работа', 1], ['Тамақ', 'Еда', 1], ['Қыс', 'Зима', 1], ['Күз', 'Осень', 1], ['Аяз', 'Мороз', 1], ['Қар', 'Снег', 1],
    ['Жел', 'Ветер', 1], ['Бүгін', 'Сегодня', 1], ['Ертең', 'Завтра', 1], ['Кеше', 'Вчера', 1], ['Қанша тұрады?', 'Сколько стоит?', 1],
    ['Атыңыз кім?', 'Как вас зовут?', 1], ['Қалыңыз қалай?', 'Как ваши дела?', 1], ['Ас болсын!', 'Приятного аппетита!', 1],
    ['Мен түсінбеймін', 'Я не понимаю', 2], ['Қош келдіңіз!', 'Добро пожаловать!', 2], ['Құттықтаймын!', 'Поздравляю!', 2],
    ['Бақытты болыңдар!', 'Будьте счастливы!', 2], ['Жолың болсын!', 'Счастливого пути!', 2], ['Көп рақмет', 'Большое спасибо', 2],
    ['Мен асығып жүрмін', 'Я тороплюсь', 2], ['Аялдама', 'Остановка', 2], ['Мың', 'Тысяча', 2], ['Жүз', 'Сто', 2], ['Көктем', 'Весна', 2],
  ];

  function quiz(level) {
    return new Promise((resolve) => {
      const tier = level < 1 ? 0 : level < 3 ? 1 : 2;
      const pool = WORDS.filter((w) => w[2] <= tier);
      const fresh = pool.filter((w) => w[2] === tier);
      const qs = [];
      while (qs.length < 5) {
        const w = chance(0.6) && fresh.length ? pick(fresh) : pick(pool);
        if (!qs.includes(w)) qs.push(w);
      }
      let i = 0, right = 0;
      const el = sheet('quiz', `
        <div class="mg-head"><div class="mg-title">Урок казахского</div><div class="mg-score"><b>1</b> / 5</div></div>
        <div class="q-prompt"><span class="q-dir"></span><div class="q-word"></div></div>
        <div class="q-opts"></div>
      `);
      const $ = (q) => el.querySelector(q);
      function show() {
        const w = qs[i];
        const kzToRu = chance(0.6);
        $('.mg-score b').textContent = i + 1;
        $('.q-dir').textContent = kzToRu ? 'Как перевести с казахского?' : 'Как сказать по-казахски?';
        $('.q-word').textContent = kzToRu ? w[0] : w[1];
        const ans = kzToRu ? w[1] : w[0];
        const opts = [ans];
        while (opts.length < 4) { const o = pick(WORDS)[kzToRu ? 1 : 0]; if (!opts.includes(o)) opts.push(o); }
        opts.sort(() => Math.random() - 0.5);
        const box = $('.q-opts');
        box.innerHTML = opts.map((o, k) => `<button class="btn q-opt" data-k="${k}"><span class="kbd">${k + 1}</span>${escapeHtml(o)}</button>`).join('');
        let locked = false;
        const choose = (k) => {
          if (locked) return; locked = true;
          const btns = box.querySelectorAll('button');
          const ok = opts[k] === ans;
          if (ok) { right++; Sfx.play('success'); } else Sfx.play('error');
          btns.forEach((b, j) => { if (opts[j] === ans) b.classList.add('ok'); else if (j === k) b.classList.add('bad'); });
          setTimeout(() => {
            i++;
            if (i < qs.length) show();
            else {
              window.removeEventListener('keydown', onKey);
              box.innerHTML = `<div class="mg-result"><b>${right}</b> из 5 верно</div>`;
              setTimeout(() => { UI.popModal(el); resolve(right); }, 1100);
            }
          }, ok ? 600 : 1300);
        };
        box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => choose(+b.dataset.k)));
        current = choose;
      }
      let current = null;
      const onKey = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 4 && current) current(n - 1); };
      window.addEventListener('keydown', onKey);
      show();
    });
  }

  /* ---------------- Ритм-игра ---------------- */

  const LANE_KEYS = [['ArrowLeft', 'd', 'D', 'в', 'В'], ['ArrowDown', 'f', 'F', 'а', 'А'], ['ArrowUp', 'j', 'J', 'о', 'О'], ['ArrowRight', 'k', 'K', 'л', 'Л']];
  const LANE_COL = ['#2ec4e6', '#f6c343', '#7cc66b', '#e5533d'];
  const LANE_SYM = ['◀', '▼', '▲', '▶'];
  const PENTA = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33];

  function rhythm({ title, bpm, beats }) {
    return new Promise((resolve) => {
      const el = sheet('rhythm', `
        <div class="mg-head"><div class="mg-title">${escapeHtml(title)}</div><div class="mg-score">Точность: <b>—</b></div></div>
        <div class="rh-stage"><canvas></canvas><div class="rh-judge"></div></div>
        <div class="rh-pads">${LANE_SYM.map((s, k) => `<button class="pad" data-k="${k}" style="--c:${LANE_COL[k]}">${s}</button>`).join('')}</div>
        <div class="rh-help">Жми, когда нота касается линии. Клавиши: ← ↓ ↑ → или D F J K</div>
      `);
      const cv = el.querySelector('canvas');
      const ctx = cv.getContext('2d');
      const judgeEl = el.querySelector('.rh-judge');
      const beat = 60 / bpm;
      const notes = [];
      let lane = 1;
      for (let b = 0; b < beats; b++) {
        const tt = 2 + b * beat;
        lane = (lane + pick([1, 1, 2, 3])) % 4;
        notes.push({ t: tt, lane, hit: null });
        if (b % 8 === 7) notes.push({ t: tt + beat / 2, lane: (lane + 2) % 4, hit: null });
      }
      const end = notes[notes.length - 1].t + 1.5;
      const t0 = performance.now();
      let perfect = 0, good = 0, miss = 0, done = false, raf = 0;
      const now = () => (performance.now() - t0) / 1000;
      function judge(text, col) {
        judgeEl.textContent = text; judgeEl.style.color = col;
        judgeEl.classList.remove('pop'); void judgeEl.offsetWidth; judgeEl.classList.add('pop');
      }
      function hit(k) {
        if (done) return;
        const t = now();
        let best = null, bd = 1;
        for (const n of notes) { if (n.hit || n.lane !== k) continue; const d = Math.abs(n.t - t); if (d < bd) { bd = d; best = n; } }
        const pad = el.querySelectorAll('.pad')[k];
        pad.classList.remove('on'); void pad.offsetWidth; pad.classList.add('on');
        if (best && bd < 0.09) { best.hit = 'p'; perfect++; judge('Керемет!', '#f6c343'); Sfx.tone(PENTA[k + 1], 0.25); }
        else if (best && bd < 0.18) { best.hit = 'g'; good++; judge('Жақсы', '#2ec4e6'); Sfx.tone(PENTA[k], 0.2); }
        else Sfx.play('tick');
      }
      el.querySelectorAll('.pad').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(+b.dataset.k); }));
      const onKey = (e) => { for (let k = 0; k < 4; k++) if (LANE_KEYS[k].includes(e.key)) { e.preventDefault(); hit(k); } };
      window.addEventListener('keydown', onKey);
      function frame() {
        const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
        if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const lw = W / 4, hy = H - 40, speed = H * 0.6;
        const t = now();
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = k % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
          ctx.fillRect(k * lw, 0, lw, H);
        }
        ctx.fillStyle = 'rgba(246,195,67,0.8)'; ctx.fillRect(0, hy - 2, W, 4);
        for (const n of notes) {
          if (n.hit) continue;
          const y = hy - (n.t - t) * speed;
          if (t - n.t > 0.18) { n.hit = 'm'; miss++; judge('Мимо', '#e5533d'); continue; }
          if (y < -20 || y > H + 20) continue;
          const x = n.lane * lw + lw / 2;
          ctx.fillStyle = LANE_COL[n.lane];
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - lw * 0.32, y - 10, lw * 0.64, 20, 6) : ctx.rect(x - lw * 0.32, y - 10, lw * 0.64, 20); ctx.fill();
          ctx.fillStyle = 'rgba(13,27,42,0.7)'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(LANE_SYM[n.lane], x, y + 1);
        }
        const total = perfect + good + miss;
        if (total) el.querySelector('.mg-score b').textContent = Math.round((perfect + good * 0.6) / total * 100) + '%';
        if (t > end) return finish();
        raf = requestAnimationFrame(frame);
      }
      function finish() {
        done = true; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey);
        const acc = (perfect + good * 0.6) / notes.length;
        el.querySelector('.rh-stage').innerHTML = `<div class="mg-result"><b>${Math.round(acc * 100)}%</b><br>идеально: ${perfect} · хорошо: ${good} · мимо: ${notes.length - perfect - good}</div>`;
        setTimeout(() => { UI.popModal(el); resolve(acc); }, 1500);
      }
      raf = requestAnimationFrame(frame);
    });
  }

  return { barista, quiz, rhythm };
})();
