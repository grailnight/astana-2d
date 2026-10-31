'use strict';
// Мечты: большие цели со шкалой прогресса в телефоне. Своя квартира, карьера, свой той,
// мама в гостях, своя машина, доля в кофейне, свободный казахский, уютный дом, пушистый друг.

const Dreams = (() => {
  const s = () => G.s;
  const CAR_PRICE = 450000, MAMA_TICKET = 30000, COFFEE_INVEST = 200000, COFFEE_INCOME = 5000;
  const WISH = ['career', 'flat', 'love', 'mama']; // желание у Байтерека → главная мечта

  const pct = (a, b) => clamp(a / b, 0, 1);
  const LIST = [
    { id: 'flat', title: 'Своя квартира', icon: 'door', done: (st) => st.flags.ownFlat, progress: (st) => pct(st.money, Content.FLAT_PRICE), hint: () => `Первый взнос ${fmtMoney(Content.FLAT_PRICE)} — в агентстве «Жаңа Үй».`, target: 'realty' },
    { id: 'career', title: 'Карьера в IT', icon: 'laptop', done: (st) => st.job.level >= 3, progress: (st) => (st.job.hired ? st.job.level / 3 : G.lv('code') / 12), hint: (st) => (st.job.hired ? `Сейчас: ${Content.OFFICE_TITLES[st.job.level]}. Хорошие смены ведут к повышению.` : 'Учи код в библиотеке университета и пройди собеседование в Steppe Digital.'), target: 'office' },
    { id: 'love', title: 'Свой той', icon: 'ring', done: (st) => st.love.married, progress: (st) => (st.love.married ? 1 : st.love.engaged ? 0.8 : st.love.partner ? 0.5 : Math.max(0, ...Object.keys(st.rel).filter((id) => Romance.isDater(id)).map((id) => st.rel[id] / 200))), hint: () => 'Знакомства, свидания, признание, кольцо — и той в «Алтын Сарае».', target: null },
    { id: 'mama', title: 'Мама в гостях', icon: 'heart', done: (st) => !!st.flags.mamaVisited, progress: (st) => (st.flags.mamaTicket ? 0.9 : pct(st.money, MAMA_TICKET) * 0.8), hint: (st) => (st.flags.mamaTicket ? `Мама приезжает ${fmtDate(st.flags.mamaTicket)} на вокзал «Астана-1».` : `Билет для мамы — ${fmtMoney(MAMA_TICKET)} в кассе вокзала «Астана-1».`), target: 'station1' },
    { id: 'car', title: 'Своя машина', icon: 'car', done: (st) => !!st.flags.car, progress: (st) => pct(st.money, CAR_PRICE), hint: () => `Автосалон на первом этаже «Самал Плазы». ${fmtMoney(CAR_PRICE)}. Поездки по городу — бесплатно и быстрее такси.`, target: 'mall' },
    { id: 'coffee', title: 'Доля в кофейне Айгерим', icon: 'cup', visible: (st) => !!st.flags.coffeeOffer, done: (st) => !!st.flags.coffeeShare, progress: (st) => pct(st.money, COFFEE_INVEST), hint: (st) => (st.flags.coffeeOpen && !st.flags.coffeeShare ? 'Айгерим открылась без тебя — но кофе для тебя бесплатный.' : `Вложить ${fmtMoney(COFFEE_INVEST)} — поговори с Айгерим в «Дала Кофе». Доход ${fmtMoney(COFFEE_INCOME)} каждый день.`), target: 'coffee' },
    { id: 'kaz', title: 'Свободный казахский', icon: 'talk', done: () => G.lv('kaz') >= 10, progress: () => G.lv('kaz') / 10, hint: () => 'Уроки в Тілдер орталығы, разговоры, экскурсии у Байтерека.', target: 'lang' },
    { id: 'home', title: 'Уютный дом', icon: 'star', done: () => Decor.comfort() >= 75, progress: () => Decor.comfort() / 75, hint: () => 'Мебель и декор в «Самал Плазе». Полный уют — только в своей квартире.', target: 'mall' },
    { id: 'pet', title: 'Пушистый друг', icon: 'cat', done: (st) => Pet.has() && st.pet.happy >= 80, progress: (st) => (Pet.has() ? 0.4 + st.pet.happy / 80 * 0.6 : 0), hint: (st) => (Pet.has() ? `${st.pet.name}: корми каждый день, играй и гладь.` : 'Котята бывают у Аружан у дома 12, в приюте в «Самал Плазе» и даже на деревьях.'), target: null },
  ];

  const visible = () => LIST.filter((d) => !d.visible || d.visible(s()));
  const doneCount = () => visible().filter((d) => d.done(s())).length;

  function mainWish() { const w = s().flags.wish; return w == null ? null : WISH[w]; }

  /* ---------- телефон ---------- */

  function phoneHtml() {
    const st = s();
    const main = mainWish();
    const list = visible().slice().sort((a, b) => (b.id === main) - (a.id === main) || a.done(st) - b.done(st));
    return `<p class="note">Сбылось: ${doneCount()} из ${visible().length}. ${main ? 'Звезда — мечта, загаданная у Байтерека.' : 'Загадай желание у отпечатка ладони в Байтереке.'}</p>
      ${list.map((d) => {
        const done = d.done(st), p = done ? 1 : clamp(d.progress(st), 0, 0.99);
        return `<div class="dream ${done ? 'ok' : ''} ${d.id === main ? 'main' : ''} fx-tile">
          ${UIKit.img(d.icon)}<div class="dr-main"><b>${d.id === main ? '★ ' : ''}${escapeHtml(d.title)}</b><span class="dr-bar"><i style="width:${Math.round(p * 100)}%"></i></span><small>${escapeHtml(done ? 'Сбылось!' : d.hint(st))}</small></div>
          ${!done && d.target ? `<button class="btn small ${st.dreamTrack === d.id ? 'fx-btn on' : 'fx-tile'}" data-dream="${d.id}">${UIKit.img('pin')}</button>` : ''}
        </div>`;
      }).join('')}`;
  }

  function track(id) {
    const st = s();
    st.dreamTrack = st.dreamTrack === id ? null : id;
    const d = LIST.find((x) => x.id === id);
    if (st.dreamTrack && d && d.target) UI.toast(`Стрелка ведёт: «${World.byId[d.target].name}»`, 'info');
  }

  function objective() {
    const st = s();
    if (st.flags.mamaTicket === st.day && !st.flags.mamaVisited && G.hour() >= 9) return { title: 'Мама приезжает!', text: 'Встреть маму на вокзале «Астана-1»', target: 'station1' };
    if (!st.dreamTrack) return null;
    const d = LIST.find((x) => x.id === st.dreamTrack);
    if (!d || d.done(st) || !d.target) { st.dreamTrack = null; return null; }
    return { title: 'Мечта: ' + d.title, text: d.hint(st), target: d.target };
  }

  /* ---------- машина ---------- */

  const CAR_COLORS = [['#e9e9e9', 'белую'], ['#2b2b2b', 'чёрную'], ['#8c1c1c', 'вишнёвую'], ['#1f4e8c', 'синюю']];
  function carAction() {
    const st = s();
    return {
      label: st.flags.car ? 'Автосалон: помыть машину' : 'Автосалон: своя машина', icon: 'car', price: st.flags.car ? 1500 : CAR_PRICE,
      sub: st.flags.car ? 'блестит как новая · настроение +3' : 'подержанный седан · поездки бесплатно',
      run: async () => {
        if (st.flags.car) { if (G.pay(1500)) { G.add('mood', 3); UI.toast('Машина сияет', 'good'); } return; }
        const c = await UI.ask(null, `Продавец: «Отличный седан, один хозяин, пробег честный. Бери, не пожалеешь!» Какой цвет?`, [...CAR_COLORS.map(([, n]) => n[0].toUpperCase() + n.slice(1)), 'Передумал' + gx('', 'а')]);
        if (c >= CAR_COLORS.length || !G.pay(CAR_PRICE)) return;
        st.flags.car = { color: CAR_COLORS[c][0] };
        placeCar();
        G.add('mood', 20); Sfx.play('success');
        UI.toast('Своя машина! Теперь в телефоне на карте — «Поехать на своей машине».', 'medal');
        Life.msg('mama', `Ты ${gx('купил', 'купила')} машину?! Пристёгивайся всегда, слышишь! И не гоняй на Кабанбай батыра!`);
        Life.msg('dauren', 'Тачка!!! Подкинешь до базара? Шучу. Но вообще подкинешь?');
        Life.checkMedals();
      },
    };
  }

  // машина стоит у дома
  function placeCar() {
    const st = s();
    if (!st.flags.car) return;
    const b = World.byId[st.flags.ownFlat ? 'realty' : 'home'];
    if (!b) return;
    for (let i = World.decor.length - 1; i >= 0; i--) if (World.decor[i].mine) World.decor.splice(i, 1);
    for (let dx = 2; dx < 7; dx++) for (const sgn of [1, -1]) {
      const tx = b.doorX + dx * sgn, ty = b.doorY + 1;
      if (World.isPedTile(tx, ty) && !World.decor.some((d) => Math.hypot(d.x - (tx * TILE + 8), d.y - (ty * TILE + 12)) < 18)) {
        World.decor.push({ kind: 'parked', x: tx * TILE + 8, y: ty * TILE + 12, color: st.flags.car.color, mine: true });
        return;
      }
    }
  }

  /* ---------- мама в гостях ---------- */

  function ticketAction() {
    const st = s();
    if (st.flags.mamaVisited) return null;
    return {
      label: st.flags.mamaTicket ? 'Мама приезжает ' + fmtDate(st.flags.mamaTicket) : 'Купить билет маме в Астану', icon: 'heart', price: st.flags.mamaTicket ? 0 : MAMA_TICKET,
      sub: st.flags.mamaTicket ? 'поезд прибывает утром' : 'туда и обратно · она приедет послезавтра',
      disabled: st.flags.mamaTicket ? 'билет уже куплен' : null,
      run: async () => {
        if (!G.pay(MAMA_TICKET)) return;
        st.flags.mamaTicket = st.day + 2;
        Sfx.play('ring');
        await UI.say('mama', `Алло? Билет?! В Астану?! Ой, балам… Я же ничего не успею… Ладно, напеку баурсаков в дорогу. ${fmtDate(st.day + 2)} встречай!`);
        G.add('mood', 10);
      },
    };
  }

  function meetMamaAction() {
    const st = s();
    if (st.flags.mamaTicket !== st.day || st.flags.mamaVisited || G.hour() < 9 || G.hour() >= 20) return null;
    return { label: 'Встретить маму с поезда', icon: 'heart', time: 0, sub: 'целый день с мамой', run: mamaVisit };
  }

  async function mamaVisit() {
    const st = s();
    st.flags.mamaVisited = st.day;
    await UI.fade('Поезд медленно подходит к перрону. В окне третьего вагона — знакомый платок…');
    await UI.say('mama', `Балам! Айналайын! Дай посмотреть на тебя… ${st.food < 40 ? 'Похудел' + gx('', 'а') + '! Я так и знала.' : 'Хорошо выглядишь, слава богу.'}`);
    await UI.say('mama', 'Вот — баурсаки, казы, курт и банка варенья. Нет, это не много. Это на первое время.');
    G.give('baursak', 3); G.give('kazy', 1); G.give('kurt', 2);
    await UI.fade('Вы едете на бульвар Нұржол. Мама держит тебя под руку и всё время останавливается сфотографировать…', async () => G.advance(90, { walking: true }));
    await UI.say('mama', 'Байтерек… По телевизору он меньше. Говоришь, наверху ладонь? Пойдём, загадаю, чтобы у тебя всё было хорошо.');
    // мама видит, как ты живёшь
    const lines = [];
    if (st.flags.ownFlat) lines.push('Своя квартира… Ты понимаешь, что ты сделал' + gx('', 'а') + '? Папа будет плакать, я знаю.');
    else lines.push('Гульнар-апай — хорошая женщина. Я ей банку варенья оставила, пусть присматривает за тобой.');
    if (st.job.hired) lines.push(`${Content.OFFICE_TITLES[st.job.level]} в IT-компании! Я соседкам всем расскажу.`);
    else if (st.flags.joinedCourier) lines.push('Курьер — тоже работа, честная. Главное — одевайся теплее, когда развозишь.');
    if (st.love.partner) lines.push(`А ${NPCS[st.love.partner].name}… ${st.love.married ? 'Теперь ты семья. Береги.' : 'Хороший человек? Вижу по глазам, что хороший.'}`);
    if (G.lv('kaz') >= 4) lines.push('И по-казахски говоришь! Әкең естісе, қуанар еді…');
    if (Pet.has()) lines.push(`${st.pet.name}! Ой, какой! Его надо кормить, а не колбасой баловать.`);
    for (const l of lines.slice(0, 3)) await UI.say('mama', l);
    await UI.fade('Вечером вы пьёте шай, мама рассказывает новости из дома, а ты понимаешь, как скучал' + gx('', 'а') + '…', async () => { G.advance(240); });
    await UI.say('mama', 'Я горжусь тобой. Слышишь? Горжусь. Звони чаще. И шапку носи!');
    G.add('mood', 35); G.add('food', 30); G.earn(20000, 'мама «на пуховик»');
    Life.msg('mama', 'Доехала. Всё хорошо. Папе показала фотографии — он полчаса молчал, а потом сказал: «Молодец». Это много, ты знаешь.');
    Life.checkMedals();
  }

  /* ---------- кофейня Айгерим ---------- */

  function socialExtras(id) {
    const st = s();
    if (id !== 'aigerim' || !st.flags.coffeeOffer || st.flags.coffeeShare || st.flags.coffeeOpen) return [];
    return [{
      label: `Вложить ${fmtMoney(COFFEE_INVEST)} в кофейню`, icon: 'cup', disabled: !G.canPay(COFFEE_INVEST) ? 'не хватает денег' : null, end: true,
      run: async () => {
        if (!G.pay(COFFEE_INVEST)) return;
        st.flags.coffeeShare = st.day;
        await UI.say('aigerim', 'Правда?! Ты… ты серьёзно?! Ой-ой-ой. Обещаю, это будет лучшая кофейня на левом берегу. Через три дня открываемся!');
        G.addRel('aigerim', 15); G.add('mood', 12);
      },
    }];
  }

  function onNewDay() {
    const st = s();
    if (st.flags.coffeeShare && st.flags.coffeeOpen && st.day > st.flags.coffeeOpen) {
      const inc = COFFEE_INCOME + (G.isWeekend() ? 2000 : 0);
      G.earn(inc, 'доля в кофейне');
      st.stats.coffeeIncome = (st.stats.coffeeIncome || 0) + inc;
      if (weekday(st.day) === 1) Life.msg('aigerim', `Отчёт за неделю: всё отлично, гости возвращаются! Твоя доля уже ${fmtMoney(st.stats.coffeeIncome)} ☕`);
    }
    if (st.flags.mamaTicket === st.day && !st.flags.mamaVisited) Life.msg('mama', 'Я в поезде! Соседка по купе — из Астаны, всю дорогу рассказывает про ваши морозы. Встречай на «Астана-1»!');
  }

  function hooks(day) {
    const st = s(), out = [];
    const w = day === st.day ? 'Сегодня' : 'Завтра';
    if (st.flags.mamaTicket === day && !st.flags.mamaVisited) out.push(['heart', `${w} приезжает мама! Встреть её на вокзале «Астана-1».`]);
    if (st.flags.coffeeShare && st.flags.coffeeOpen) out.push(['cup', `Доля в кофейне Айгерим: +${fmtMoney(COFFEE_INCOME)} каждое утро.`]);
    return out;
  }

  return {
    LIST, CAR_PRICE, MAMA_TICKET, COFFEE_INVEST, phoneHtml, track, objective, carAction, placeCar, ticketAction, meetMamaAction, socialExtras, onNewDay, hooks, doneCount, mainWish,
  };
})();
