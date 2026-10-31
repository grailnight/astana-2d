'use strict';
// Жизнь города: газета с вакансиями, подработки, мелкие нарушения и патрульные, голуби на площадях.

const City = (() => {
  const s = () => G.s;
  const PAPER = 'Елорда Жаршысы';
  const PAPER_PRICE = 150;
  const lvl = (k) => G.lv(k);

  function state() {
    const st = s();
    if (st.crime == null) st.crime = 0;
    if (!st.ads) st.ads = {};
    return st;
  }

  /* ---------- вакансии ---------- */

  const JOBS = [
    { id: 'courier', title: 'Курьеры в «Жылдам»', where: 'courier', pay: 'от 1 500 ₸ за заказ', req: 'без опыта', when: 'ежедневно 8:00–21:00', known: () => s().flags.joinedCourier },
    { id: 'barista', title: 'Бариста в «Дала Кофе»', where: 'coffee', pay: '3 000 ₸ за смену + чаевые', req: 'знакомство с Айгерим', when: 'смены с 8:00 до 17:00', known: () => s().flags.metAigerim },
    { id: 'waiter', title: 'Официанты на тои', where: 'toyhana', pay: '7 000 ₸ + чаевые', req: 'нарядная одежда', when: 'сб и вс, 17:00–20:00' },
    { id: 'host', title: 'Ведущий караоке-вечеров', where: 'karaoke', pay: '6 000 ₸ + бонус', req: 'обаяние 3+', when: 'каждый вечер, 19:00–22:00' },
    { id: 'guide', title: 'Гид у Байтерека', where: 'baiterek', pay: '5 000–10 000 ₸ за группу', req: 'казахский 3+', when: 'сб и вс, 11:00–16:00' },
    { id: 'office', title: 'Junior-разработчик в Steppe Digital', where: 'office', pay: 'от 12 000 ₸ в день', req: 'код и деловой костюм', when: 'будни', known: () => s().job.hired },
  ];

  const WAITER = {
    title: 'Той: официант',
    verb: ' просит:',
    ing: {
      besh: { n: 'Бешбармак', c: '#e8d3a8' }, baur: { n: 'Баурсаки', c: '#e8a317' }, shai: { n: 'Шай', c: '#b5651d' },
      kumys: { n: 'Кумыс', c: '#f4f0e6' }, kazy: { n: 'Казы', c: '#7a2e2e' }, salad: { n: 'Салат', c: '#6cc35a' },
      sorpa: { n: 'Сорпа', c: '#d9b25a' }, cake: { n: 'Торт', c: '#f08aa8' }, fruit: { n: 'Фрукты', c: '#e5533d' },
    },
    drinks: [
      { n: 'Стол молодожёнов', r: ['salad', 'besh', 'shai'] },
      { n: 'Стол аксакалов', r: ['kazy', 'besh', 'kumys'] },
      { n: 'Стол сватов', r: ['baur', 'shai'] },
      { n: 'Детский стол', r: ['fruit', 'cake'] },
      { n: 'Горячее', r: ['sorpa', 'besh'] },
      { n: 'Десерт', r: ['cake', 'shai', 'fruit'] },
      { n: 'Закуски', r: ['salad', 'kazy', 'baur'] },
    ],
    customers: ['Тамада', 'Апай в бархате', 'Сват из Тараза', 'Дядя невесты', 'Аксакал', 'Подружка невесты', 'Жених'],
  };

  function jobActions(locId) {
    const st = state();
    const h = G.hour();
    const tired = st.energy < 25 ? gx('слишком устал', 'слишком устала') : null;
    const ad = (id) => st.ads[id] ? null : `ищи вакансию в газете «${PAPER}»`;
    const done = (k) => st.daily[k] ? 'на сегодня смена окончена' : null;
    if (locId === 'toyhana') return [{
      label: 'Смена официанта', icon: 'tray', time: 180, sub: '3 часа · 7 000 ₸ + чаевые',
      disabled: ad('waiter') || (!G.isWeekend() ? 'тои — по выходным' : !(h >= 17 && h < 20) ? 'смена начинается с 17:00 до 20:00' : null)
        || (!G.wearsFormal() ? 'нужна нарядная одежда: костюм или чапан' : null) || done('waiter') || tired,
      run: async () => {
        st.daily.waiter = true;
        const r = await MG.barista(WAITER);
        G.advance(180, { work: 4 });
        const pay = 7000 + Math.round(r.tips * 1.5 / 10) * 10;
        G.earn(pay); st.stats.gigs = (st.stats.gigs || 0) + 1;
        G.addXp('charm', 0.12 + r.served * 0.01);
        await UI.say(null, r.served >= 8 ? `Гости довольны, тамада даже упомянул тебя в тосте! Заработано ${fmtMoney(pay)}.` : `Смена позади, ноги гудят. Заработано ${fmtMoney(pay)}.`);
      },
    }];
    if (locId === 'karaoke') return [{
      label: 'Вести караоке-вечер', icon: 'mic', time: 180, sub: '3 часа · 6 000 ₸ + бонус за зал',
      disabled: ad('host') || (lvl('charm') < 3 ? `нужно обаяние 3 (сейчас ${lvl('charm')})` : null) || (!(h >= 19 && h < 22) ? 'вечер начинается с 19:00 до 22:00' : null) || done('host') || tired,
      run: async () => {
        st.daily.host = true;
        const acc = await MG.rhythm({ title: 'Ведущий вечера', bpm: 112, beats: 40 });
        G.advance(180, { work: 3 });
        const pay = 6000 + Math.round(acc * 5000 / 100) * 100;
        G.earn(pay); st.stats.gigs = (st.stats.gigs || 0) + 1;
        G.addXp('charm', 0.2 + acc * 0.2); G.add('mood', 6);
        await UI.say(null, acc > 0.7 ? `Зал пел хором «Менің Қазақстаным»! Администратор доволен: ${fmtMoney(pay)}.` : `Вечер прошёл, микрофон жив. Оплата: ${fmtMoney(pay)}.`);
      },
    }];
    if (locId === 'baiterek') return [{
      label: 'Провести экскурсию', icon: 'star', time: 120, sub: '2 часа · 5 000 ₸ + за каждый верный ответ',
      disabled: ad('guide') || (lvl('kaz') < 3 ? `нужен казахский 3 (сейчас ${lvl('kaz')})` : null) || (!G.isWeekend() ? 'туристы бывают по выходным' : !(h >= 11 && h < 16) ? 'группы с 11:00 до 16:00' : null) || done('guide') || tired,
      run: async () => {
        st.daily.guide = true;
        await UI.say(null, 'Группа туристов из Алматы и Ташкента. Они спрашивают, как что называется по-казахски — не подведи!');
        const n = await MG.quiz(lvl('kaz'));
        G.advance(120, { work: 2, walking: true, outdoor: true });
        const pay = 5000 + n * 1000;
        G.earn(pay); st.stats.gigs = (st.stats.gigs || 0) + 1;
        G.addXp('kaz', 0.15 + n * 0.05); G.addXp('charm', 0.1);
        await UI.say(null, n >= 4 ? `Туристы в восторге и оставили отзыв «гид — огонь». Заработано ${fmtMoney(pay)}.` : `Пара вопросов поставила в тупик, но группа довольна. Заработано ${fmtMoney(pay)}.`);
      },
    }];
    return [];
  }

  /* ---------- газета ---------- */

  const NEWS = [
    ['На Есиле залили каток', 'Коньки можно взять напрокат прямо на набережной. Горячий шай — у входа.'],
    ['Хан Шатыр: снаружи −25, внутри +30', 'Пляж под куполом снова полон. Песок, напоминают, привезён издалека.'],
    ['В EXPO стартует хакатон', 'Студенты и айтишники 48 часов будут писать код для умного города.'],
    ['Новые автобусы вышли на маршрут', 'Электробусы с USB-зарядкой теперь ходят по левому берегу.'],
    ['Байтерек подсветят в цвета флага', 'Голубой и золотой — каждый вечер до конца месяца.'],
    ['«Астана» готовится к матчу', 'Билеты на выходные почти раскуплены. Крышу арены обещают закрыть.'],
    ['Бабушки с Абая испекли 500 баурсаков', 'Благотворительная ярмарка у подъезда собрала деньги на детскую площадку.'],
    ['Синоптики: ветер до 20 м/с', 'Держите шапки. Особенно на мосту.'],
    ['В библиотеке — бесплатные курсы казахского', 'Тілдер орталығы открыл вечерние группы для новичков.'],
    ['Голубей на площадях стало больше', 'Орнитологи просят не кормить их чипсами. Только зерном.'],
  ];

  function forecast() {
    const st = s();
    if (st.day < 7) return `Сегодня ${G.temp()}°. С ${fmtDate(7)} в столицу придёт настоящая зима: до −25° и метели. Пуховик — на базаре.`;
    return `Сегодня ${G.temp()}°. Морозы держатся, ночью до −30°. Синоптики советуют шапку и тёплую обувь.`;
  }

  function chronicle() {
    const c = state().crime;
    if (c >= 60) return 'Патрульные разыскивают молодого человека, который «ездит зайцем, ворует курт и бегает от полиции». Приметы совпадают с половиной города.';
    if (c >= 30) return 'Участились мелкие нарушения в центре: переход в неположенном месте, безбилетный проезд. Полиция усиливает патрули.';
    return 'Патрульная полиция напоминает: переходите дорогу только по зебре. Штраф за переход в неположенном месте — 1 500 ₸.';
  }

  function buyPaper() {
    return {
      label: `Газета «${PAPER}»`, price: PAPER_PRICE, time: 5, icon: 'news', sub: 'новости, погода и вакансии',
      run: async () => { if (!G.pay(PAPER_PRICE)) return; G.advance(5); state().paperDay = s().day; await openPaper(); },
    };
  }

  function openPaper() {
    return new Promise((resolve) => {
      const st = state();
      for (const j of JOBS) st.ads[j.id] = true;
      const news = [0, 1].map((i) => NEWS[Math.floor(hash2(st.day, i, 7) * NEWS.length + i * 3) % NEWS.length]);
      const el = document.createElement('div');
      el.className = 'sheet paper fx-paper';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Газета');
      const render = () => {
        el.innerHTML = `
          <header class="pp-mast"><b>${PAPER}</b><small>${fmtDate(st.day)} · №${300 + st.day} · ${fmtMoney(PAPER_PRICE)}</small></header>
          <div class="pp-body">
            <section class="pp-lead"><h3>Погода</h3><p>${escapeHtml(forecast())}</p></section>
            ${news.map(([t, x]) => `<section><h3>${escapeHtml(t)}</h3><p>${escapeHtml(x)}</p></section>`).join('')}
            <section><h3>Хроника</h3><p>${escapeHtml(chronicle())}</p></section>
            <section class="pp-jobs"><h3>Вакансии</h3>
              ${JOBS.map((j) => `<div class="pp-job">
                <div><b>${escapeHtml(j.title)}</b><small>${escapeHtml(j.when)} · ${escapeHtml(j.pay)} · требования: ${escapeHtml(j.req)}</small></div>
                ${j.known && j.known() ? '<em>ты здесь работаешь</em>' : `<button class="btn small ${st.jobTrack === j.where ? 'fx-btn on' : 'fx-tile'}" data-track="${j.where}">${UIKit.img('pin')}${st.jobTrack === j.where ? 'На карте' : 'Отметить'}</button>`}
              </div>`).join('')}
            </section>
          </div>
          <footer class="loc-foot"><button class="btn fx-red" data-close>${UIKit.img('back')}Сложить газету</button></footer>`;
      };
      render();
      UI.pushModal(el);
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-track]');
        if (t) {
          st.jobTrack = st.jobTrack === t.dataset.track ? null : t.dataset.track;
          Sfx.play('click');
          if (st.jobTrack) UI.toast(`Отмечено на карте: «${World.byId[st.jobTrack].name}»`, 'info');
          render();
          return;
        }
        if (e.target.closest('[data-close]')) { Sfx.play('click'); UI.popModal(el); resolve(); }
      });
    });
  }

  /* ---------- нарушения и полиция ---------- */

  function addCrime(n) {
    const st = state();
    const before = st.crime;
    st.crime = clamp(st.crime + n, 0, 100);
    if (n > 0 && before < 30 && st.crime >= 30) UI.toast('Полиция начинает тебя замечать…', 'bad');
    if (n > 0 && before < 60 && st.crime >= 60) UI.toast('Ты в розыске за мелкие нарушения! Патрульные остановят при встрече.', 'bad');
  }

  function crimeLabel() {
    const c = state().crime;
    return c >= 60 ? 'в розыске' : c >= 30 ? 'на заметке' : c > 0 ? 'мелкие грешки' : 'чист перед законом';
  }

  function onNewDay() { const st = state(); st.crime = Math.max(0, st.crime - 4); }

  // Проезд без билета: только если денег не хватает на 100 ₸, а ехать надо
  async function dodgeFare() {
    const c = await UI.ask(null, 'Денег на проезд не хватает. Водитель смотрит в другую сторону…', ['Проехать зайцем', 'Пойти пешком']);
    if (c !== 0) return false;
    if (chance(0.35)) {
      Sfx.play('error');
      await UI.say(null, 'На следующей остановке заходит контролёр. «Билетик?» Тебя высаживают и записывают данные.');
      addCrime(10);
      if (G.canPay(2000)) { G.pay(2000); UI.toast('Штраф 2 000 ₸', 'bad'); }
      return false;
    }
    addCrime(4);
    return true;
  }

  // Кража на базаре: маленький шанс выгоды, большой шанс позора
  function stealAction() {
    const st = state();
    return {
      label: 'Стащить курт с прилавка', icon: 'hand', time: 5, sub: 'рискованно · нарушение',
      disabled: st.daily.steal ? 'продавцы теперь следят за тобой' : null,
      run: async () => {
        st.daily.steal = true;
        G.advance(5);
        if (chance(0.55)) {
          Sfx.play('error');
          await UI.say('erzhan', `Эй-эй! ${gx('Балам', 'Қызым')}, ты что делаешь?! Положи на место! Я думал, ты хороший человек…`);
          G.addRel('erzhan', -12); G.add('mood', -8); addCrime(14);
        } else {
          G.give('kurt', 1); G.add('mood', -3); addCrime(8);
          UI.toast('Курт в кармане. Почему-то совсем не радостно.', 'bad');
        }
      },
    };
  }

  const POLICE_LINES = ['Проходите, не задерживайтесь.', 'Документы с собой? Шучу, хорошего дня.', 'Переходите только по зебре!', 'Тихо сегодня. Это хорошо.', 'Сәлеметсіз бе! Всё в порядке?'];

  function isCrossing(tx, ty) {
    const d = World.roadDir(tx, ty);
    if (d === 3) return true;
    if (d === 1 && (World.roadDir(tx + 1, ty) === 3 || World.roadDir(tx - 1, ty) === 3)) return true;
    if (d === 2 && (World.roadDir(tx, ty + 1) === 3 || World.roadDir(tx, ty - 1) === 3)) return true;
    return false;
  }

  let policeCd = 0, wantedCd = 0;
  // Проверка улицы: переход в неположенном месте рядом с патрулём и встреча с полицией в розыске
  function patrol(dt) {
    policeCd -= dt; wantedCd -= dt;
    const p = Ents.player;
    const cop = Ents.peds.find((q) => q.police && Math.hypot(q.x - p.x, q.y - p.y) < 110);
    if (!cop) return null;
    const tx = Math.floor(p.x / TILE), ty = Math.floor((p.y - 3) / TILE);
    const st = state();
    if (policeCd <= 0 && World.tile(tx, ty) === World.T.ROAD && !isCrossing(tx, ty)) {
      policeCd = 90;
      return () => jaywalk(cop);
    }
    if (wantedCd <= 0 && st.crime >= 60 && Math.hypot(cop.x - p.x, cop.y - p.y) < 50) {
      wantedCd = 120;
      return () => arrest(cop);
    }
    return null;
  }

  function face(cop) {
    const p = Ents.player;
    cop.pause = 6;
    cop.dir = Math.abs(p.x - cop.x) > Math.abs(p.y - cop.y) ? (p.x < cop.x ? 1 : 2) : (p.y < cop.y ? 3 : 0);
  }

  async function jaywalk(cop) {
    face(cop);
    Sfx.play('honk');
    Device.buzz(40);
    const st = state();
    await UI.say(null, '«Фьють!» Свисток. Патрульный машет тебе рукой.');
    const opts = ['Заплатить штраф 1 500 ₸', 'Извиниться: «Кешіріңіз, больше не буду»', 'Убежать'];
    const c = await UI.ask(null, '«Гражданин! Переход в неположенном месте. Зебра — в двадцати метрах. Штраф — 1 500 тенге».', opts);
    if (c === 0) {
      if (G.pay(1500)) { addCrime(2); await UI.say(null, '«Спасибо. Берегите себя — водители у нас быстрые».'); }
      else { addCrime(6); await UI.say(null, '«Денег нет? Выпишу протокол. Оплатите потом».'); }
    } else if (c === 1) {
      if ((lvl('charm') >= 3 || lvl('kaz') >= 3) && st.crime < 30) { G.addXp('charm', 0.05); await UI.say(null, '«Жарайды, отпускаю с предупреждением. Только по зебре!»'); }
      else { G.pay(Math.min(1500, st.money)); addCrime(3); await UI.say(null, '«Извинения приняты. Штраф — тоже». Патрульный выписывает квитанцию.'); }
    } else {
      addCrime(15); G.add('energy', -5);
      await UI.say(null, 'Ты срываешься с места и ныряешь за угол. Сердце колотится. Патрульный что-то кричит в рацию…');
    }
  }

  async function arrest(cop) {
    face(cop);
    Sfx.play('error');
    const st = state();
    await UI.say(null, '«Стоять! Нам на вас пожаловались: зайцем ездите, на базаре курт пропадает, от патруля бегаете. Пройдёмте».');
    const c = await UI.ask(null, 'Патрульный ждёт ответа.', [`Оплатить все штрафы — ${fmtMoney(8000)}`, 'Провести ночь в участке']);
    if (c === 0 && G.pay(8000)) {
      st.crime = 15;
      await UI.say(null, '«Квитанции оплачены. Начните с чистого листа — Астана любит честных».');
      return;
    }
    await UI.fade('Ночь в отделении на скамейке. Лампа гудит, сосед по камере храпит…', async () => {
      const h = G.hour();
      G.advance(Math.round(h >= 7 ? (24 - h + 7) * 60 : (7 - h) * 60), { asleep: true });
      st.energy = Math.min(st.energy, 45);
    });
    st.crime = 10; G.add('mood', -20);
    Life.msg('mama', 'Балам, мне приснился плохой сон. У тебя всё хорошо? Ты же не хулиганишь там?');
    UI.toast('Утро. Тебя отпустили с предупреждением.', 'bad');
  }

  function policeLook() {
    const female = chance(0.3);
    return {
      female, skin: pick(['#f1c9a5', '#e0b38c', '#d4a07a', '#c68c63']), hair: pick(['#1d1612', '#2b1d16', '#3b2a20']),
      hairStyle: female ? 'bun' : 'short', outfit: 'police', top: '#2a4a7a', bottom: '#1f2a44', shoes: '#141414',
      hat: 'police', lips: '#b03a48', mustache: !female && chance(0.3),
    };
  }

  /* ---------- голуби ---------- */

  const pigeons = [];
  let flocksInit = false;
  function initPigeons() {
    flocksInit = true;
    pigeons.length = 0;
    const spots = [];
    for (const id of ['baiterek', 'station1', 'khan', 'mosque', 'akorda']) {
      const b = World.byId[id];
      if (b) spots.push([b.doorX, b.doorY + 2]);
    }
    for (const d of World.decor) if (d.kind === 'fountain') spots.push([Math.floor(d.x / TILE) + 2, Math.floor(d.y / TILE) + 1]);
    spots.forEach(([tx, ty], fi) => {
      // ищем пешеходную клетку рядом
      let ok = null;
      for (let r = 0; r < 4 && !ok; r++) for (let dy = -r; dy <= r && !ok; dy++) for (let dx = -r; dx <= r && !ok; dx++) if (World.isPedTile(tx + dx, ty + dy)) ok = [tx + dx, ty + dy];
      if (!ok) return;
      const n = 4 + (fi % 3);
      for (let i = 0; i < n; i++) {
        const hx = ok[0] * TILE + 8 + (hash2(fi, i, 1) - 0.5) * 34, hy = ok[1] * TILE + 8 + (hash2(fi, i, 2) - 0.5) * 18;
        pigeons.push({ flock: fi, hx, hy, x: hx, y: hy, z: 0, vx: 0, vy: 0, fly: 0, away: 0, peck: hash2(fi, i, 3) * 6, dir: hash2(fi, i, 4) > 0.5 ? 1 : -1, white: hash2(fi, i, 5) > 0.85 });
      }
    });
  }

  let fedUntil = 0;
  function updatePigeons(dt, t) {
    if (!flocksInit) initPigeons();
    if (G.season() === 'winter' && G.s.weather.kind === 'buran') return;
    const p = Ents.player;
    for (const g of pigeons) {
      if (g.fly > 0) {
        g.fly -= dt; g.x += g.vx * dt; g.y += g.vy * dt; g.z += 26 * dt;
        if (g.fly <= 0) { g.away = 25 + hash2(g.hx, g.hy) * 20; }
        continue;
      }
      if (g.away > 0) { g.away -= dt; if (g.away <= 0) { g.x = g.hx; g.y = g.hy; g.z = 0; } continue; }
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      if (d < 24 && t > fedUntil && Ents.player.moving) {
        const a = Math.atan2(g.y - p.y, g.x - p.x) + (Math.random() - 0.5);
        g.vx = Math.cos(a) * 70; g.vy = Math.sin(a) * 40 - 20; g.fly = 2.5; g.dir = g.vx < 0 ? -1 : 1;
        if (chance(0.2)) Sfx.play('tick');
        continue;
      }
      g.peck -= dt;
      if (g.peck < -0.4) { g.peck = 1 + Math.random() * 4; if (chance(0.5)) g.dir *= -1; g.x = clamp(g.x + g.dir * 2, g.hx - 18, g.hx + 18); }
      if (t < fedUntil) { g.x += (p.x + (g.hx - g.x) * 0.1 - g.x) * dt * 0.3; g.y += (p.y + 6 - g.y) * dt * 0.3; }
    }
  }

  // пугнуть ближайшую стаю
  function scarePigeons() {
    const p = Ents.player;
    for (const g of pigeons) {
      if (g.fly > 0 || g.away > 0 || Math.hypot(p.x - g.x, p.y - g.y) > 60) continue;
      const a = Math.atan2(g.y - p.y, g.x - p.x) + (Math.random() - 0.5);
      g.vx = Math.cos(a) * 80; g.vy = Math.sin(a) * 40 - 25; g.fly = 2.5; g.dir = g.vx < 0 ? -1 : 1;
    }
  }

  function flockNear(x, y) {
    return pigeons.find((g) => g.fly <= 0 && g.away <= 0 && Math.hypot(g.x - x, g.y - y) < 26);
  }

  function feedPigeons(t) {
    return async () => {
      if (!G.once('pigeons')) { await UI.say(null, `Голуби смотрят с надеждой, но ты уже ${gx('кормил', 'кормила')} их сегодня.`); return; }
      fedUntil = t + 12;
      G.add('mood', 4);
      UI.toast('Голуби слетаются к тебе. Настроение +4', 'good');
    };
  }

  return {
    PAPER, JOBS, jobActions, buyPaper, openPaper, addCrime, crimeLabel, onNewDay, dodgeFare, stealAction,
    patrol, policeLook, POLICE_LINES, pigeons, updatePigeons, flockNear, feedPigeons, scarePigeons, isCrossing,
  };
})();
