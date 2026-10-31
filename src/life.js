'use strict';
// Жизнь вокруг: сообщения в телефоне, предупреждения о потребностях, открытки-коллекция и медали.

const Life = (() => {
  const s = () => G.s;
  const SENDERS = { dchs: 'ДЧС Астаны', zhyldam: 'Жылдам', bank: 'Банк' };
  const senderName = (from) => (NPCS[from] ? NPCS[from].name : SENDERS[from] || from);

  /* ---------- сообщения ---------- */

  function msg(from, text) {
    const st = s();
    if (!st) return;
    st.msgs.unshift({ id: Math.floor(Math.random() * 1e9), from, text, day: st.day, min: Math.floor(st.min), read: false });
    if (st.msgs.length > 40) st.msgs.length = 40;
    UI.toast(`Новое сообщение: ${senderName(from)}`, 'mail');
    Sfx.play('ring');
  }
  function msgOnce(key, from, text) {
    const st = s();
    if (st.flags['m_' + key]) return;
    st.flags['m_' + key] = true;
    msg(from, text);
  }
  const unread = () => (s() ? s().msgs.filter((m) => !m.read).length : 0);

  const QUEST_MSG = {
    firstjob: ['dauren', 'Заходи в «Жылдам» на Кенесары, я там с 8 до 18. Работа есть, не переживай!'],
    rent: ['gulnar', 'Балам, аренда — до четверга. Заходи вечером, чай попьём.'],
    wish: ['mama', 'Сходи на Байтерек, загадай желание. Я всю жизнь мечтала там побывать.'],
    coffee: ['dauren', 'Слышал, в «Дала Кофе» ищут бариста. Работа в тепле — бери, пока зима!'],
    kazakh: ['gulnar', 'В «Тілдер орталығы» хорошие курсы. Сауле-апай — моя соседка, скажи, что ты от меня.'],
    career: ['aigerim', 'Не забудь про Steppe Digital! Код подтяни в библиотеке, костюм — в Хан Шатыре.'],
    promo: ['arman', 'Хорошо работаешь. Ещё несколько удачных смен — и поговорим о повышении.'],
    flat: ['mama', 'Видела в новостях: в агентстве «Жаңа Үй» на левом берегу продают квартиры. Вдруг пригодится!'],
  };
  function questStarted(id) {
    const m = QUEST_MSG[id];
    if (m) msgOnce('q_' + id, m[0], m[1]);
  }

  function onNewDay() {
    const st = s();
    if (st.rent.due - st.day === 1 && st.homeId === 'home') msg('gulnar', `Балам, завтра последний день оплаты аренды — ${fmtMoney(st.rent.amount)}.`);
    if (st.day % 3 === 0 && chance(0.6)) msg('dauren', pick(['Как ты там? Если что — вечером я в шаурмичной.', 'Видел сегодня, как автобус застрял в сугробе на Кенесары. Астана!', 'Братан, не забывай есть нормально. Курьеры без шаурмы не выживают.'].map((t) => t.replace('Братан', gx('Братан', 'Сестрёнка')))));
    // приглашения на свидание от тех, кто неравнодушен
    for (const id of Object.keys(DATERS)) {
      const r = st.rel[id] || 0;
      if (r >= 55 && (!st.love.partner || st.love.partner === id) && chance(0.35)) {
        msg(id, pick(['Свободен вечером? Можно сходить на колесо обозрения.', 'Сегодня красиво будет на набережной. Пойдём?', 'Скучаю по нашим разговорам. Позвони!']).replace('Свободен', gx('Свободен', 'Свободна')));
        break;
      }
    }
    checkMedals();
  }

  function weatherAlert(kind) {
    if (kind === 'buran') msg('dchs', 'Внимание! Ожидается буран, видимость до 100 метров. Без необходимости не выходите из дома.');
  }

  /* ---------- предупреждения о потребностях ---------- */

  const WARN = [
    ['food', 25, 10, 'Живот урчит — пора поесть.', 'Ещё немного — и упадёшь в обморок от голода!'],
    ['energy', 25, 10, 'Глаза слипаются… Скоро нужно поспать.', 'Ты засыпаешь на ходу! Найди, где поспать.'],
    ['hyg', 30, 15, 'Пора в душ — люди начинают коситься.', 'От тебя пахнет! Разговаривать с людьми будет сложнее.'],
  ];
  function needWarnings() {
    const st = s();
    if (!st) return;
    st.warn = st.warn || {};
    for (const [k, a, b, t1, t2] of WARN) {
      const v = st[k], lvl = st.warn[k] || 0;
      if (v > a + 15) st.warn[k] = 0;
      else if (v <= b && lvl < 2) { st.warn[k] = 2; UI.toast(t2, 'bad'); Device.buzz([40, 60, 40]); }
      else if (v <= a && lvl < 1) { st.warn[k] = 1; UI.toast(t1, 'info'); }
    }
  }

  /* ---------- открытки ---------- */

  const CARDS = [
    { id: 'baiterek', name: 'Байтерек', tx: 49, ty: 60, fact: '97 метров — в честь 1997 года, когда столица переехала в Астану.' },
    { id: 'khan', name: 'Хан Шатыр', tx: 12, ty: 62, fact: 'Самый большой шатёр в мире. Внутри круглый год лето.' },
    { id: 'akorda', name: 'Ақорда', tx: 76, ty: 62, fact: 'Резиденция президента с голубым куполом и золотым шпилем.' },
    { id: 'mosque', name: 'Әзірет Сұлтан', tx: 88, ty: 39, fact: 'Одна из крупнейших мечетей Центральной Азии.' },
    { id: 'eli', name: 'Қазақ Елі', tx: 99, ty: 39, fact: 'Стела высотой 91 метр в честь независимости 1991 года.' },
    { id: 'pyramid', name: 'Пирамида', tx: 102, ty: 47, fact: 'Дворец мира и согласия, архитектор Норман Фостер.' },
    { id: 'bridge', name: 'Пешеходный мост', tx: 44, ty: 33, fact: 'С моста виден поворот Есиля и оба берега.' },
    { id: 'wheel', name: 'Колесо обозрения', tx: 23, ty: 43, fact: 'С кабинки видно и старый, и новый город.' },
    { id: 'station1', name: 'Вокзал «Астана-1»', tx: 13, ty: 11, fact: 'Старый вокзал с часами — отсюда начинают все приезжие.' },
    { id: 'expo', name: 'Нұр Әлем', tx: 52, ty: 94, fact: 'Шар EXPO-2017, внутри — музей энергии будущего.' },
    { id: 'arena', name: 'Астана Арена', tx: 11, ty: 79, fact: 'Стадион с раздвижной крышей — футбол даже в −30.' },
    { id: 'grand', name: 'Бас мешіт', tx: 35, ty: 110, fact: 'Новая главная мечеть страны, открыта в 2022 году.' },
  ];
  let placed = false;
  function placeCards() {
    if (placed) return;
    placed = true;
    for (const c of CARDS) {
      if (!World.isSolidTile(c.tx, c.ty)) continue;
      outer: for (let r = 1; r < 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (!World.isSolidTile(c.tx + dx, c.ty + dy)) { c.tx += dx; c.ty += dy; break outer; }
      }
    }
  }
  function cardsLeft() { placeCards(); return CARDS.filter((c) => !s().cards.includes(c.id)); }
  function cardNear(px, py) {
    for (const c of cardsLeft()) if (Math.hypot(c.tx * TILE + 8 - px, c.ty * TILE + 10 - py) < 14) return c;
    return null;
  }
  function collect(c) {
    const st = s();
    if (st.cards.includes(c.id)) return;
    st.cards.push(c.id);
    Day.note('card');
    Sfx.play('success');
    UI.toast(`Открытка «${c.name}» (${st.cards.length}/${CARDS.length}). ${c.fact}`, 'quest');
    if (st.cards.length === 6) msg('mama', 'Ты прислал(а) мне уже шесть открыток! Повесила их на холодильник.'.replace('прислал(а)', gx('прислал', 'прислала')));
    if (st.cards.length === CARDS.length) { G.earn(10000, 'приз за все открытки'); }
    checkMedals();
  }

  /* ---------- медали ---------- */

  const MEDALS = [
    { id: 'courier1', tier: 'bronze', name: 'Первая доставка', desc: 'Доставить первый заказ', check: (st) => st.stats.deliveries >= 1 },
    { id: 'courier25', tier: 'silver', name: 'Курьер-ас', desc: '25 доставок', check: (st) => st.stats.deliveries >= 25 },
    { id: 'barista', tier: 'bronze', name: 'Бариста', desc: '5 смен в «Дала Кофе»', check: (st) => st.stats.baristaShifts >= 5 },
    { id: 'hired', tier: 'silver', name: 'Айтишник', desc: 'Устроиться в Steppe Digital', check: (st) => st.job.hired },
    { id: 'senior', tier: 'gold', name: 'Сеньор', desc: 'Дорасти до Senior', check: (st) => st.job.level >= 3 },
    { id: 'kaz', tier: 'silver', name: 'Тіл білемін', desc: 'Казахский 5 уровня', check: (st) => G.lv('kaz') >= 5 },
    { id: 'social', tier: 'bronze', name: 'Душа компании', desc: '5 разговоров на три звезды', check: (st) => st.talks3 >= 5 },
    { id: 'toy', tier: 'silver', name: 'Той-бала', desc: 'Побывать на тое у Даурена', check: (st) => st.flags.toyDone },
    { id: 'love', tier: 'silver', name: 'Вместе', desc: 'Начать встречаться', check: (st) => !!st.love.partner },
    { id: 'married', tier: 'gold', name: 'Свой шаңырақ', desc: 'Сыграть свой той', check: (st) => st.love.married },
    { id: 'flat', tier: 'gold', name: 'Свой дом', desc: 'Купить квартиру', check: (st) => st.flags.ownFlat },
    { id: 'cards6', tier: 'bronze', name: 'Турист', desc: 'Собрать 6 открыток', check: (st) => st.cards.length >= 6 },
    { id: 'cards', tier: 'gold', name: 'Знаток Астаны', desc: 'Собрать все открытки', check: (st) => st.cards.length >= CARDS.length },
    { id: 'winter', tier: 'silver', name: 'Перезимовал', desc: 'Прожить в Астане 20 дней', check: (st) => st.day >= 20 },
    { id: 'days5', tier: 'bronze', name: 'Деловой человек', desc: 'Пять дней со всеми тремя делами', check: (st) => (st.stats.fullDays || 0) >= 5 },
    { id: 'cozy', tier: 'silver', name: 'Уютный дом', desc: 'Уют дома 75 и больше', check: () => Decor.comfort('home') >= 75 || Decor.comfort('flat') >= 75 },
    { id: 'weird', tier: 'bronze', name: 'Городской чудак', desc: '15 странных поступков', check: (st) => (st.stats.absurd || 0) >= 15 },
    { id: 'legend', tier: 'gold', name: 'Легенда Астаны', desc: 'Чудачество 75 и выше', check: (st) => (st.crazy || 0) >= 75 },
    { id: 'lick', tier: 'bronze', name: 'Примёрз', desc: 'Лизнуть столб на морозе', check: (st) => !!(st.fun && st.fun.licked) },
    { id: 'pet', tier: 'silver', name: 'Пушистый друг', desc: 'Котёнок счастлив (80+)', check: (st) => !!(st.pet && st.pet.happy >= 80) },
    { id: 'mama', tier: 'gold', name: 'Мама гордится', desc: 'Привезти маму в Астану', check: (st) => !!st.flags.mamaVisited },
    { id: 'car', tier: 'silver', name: 'Свой руль', desc: 'Купить машину', check: (st) => !!st.flags.car },
    { id: 'coffee', tier: 'gold', name: 'Совладелец', desc: 'Открыть кофейню вместе с Айгерим', check: (st) => !!(st.flags.coffeeShare && st.flags.coffeeOpen) },
    { id: 'dreamer', tier: 'gold', name: 'Мечты сбываются', desc: 'Пять сбывшихся мечт', check: () => Dreams.doneCount() >= 5 },
    { id: 'helper', tier: 'bronze', name: 'Добрый горожанин', desc: 'Помочь на улице 5 раз', check: (st) => !!(st.events && st.events.helped >= 5) },
    { id: 'bdays', tier: 'bronze', name: 'Помню о друзьях', desc: 'Поздравить троих с днём рождения', check: (st) => !!(st.lives && Object.keys(st.lives.bday).length >= 3) },
    { id: 'snow', tier: 'silver', name: 'Снеговик-мастер', desc: 'Слепить 5 снеговиков', check: (st) => !!(st.fun && st.fun.made >= 5) },
  ];
  function checkMedals() {
    const st = s();
    if (!st) return;
    for (const m of MEDALS) {
      if (st.medals.includes(m.id) || !m.check(st)) continue;
      st.medals.push(m.id);
      Day.note('medal', m.name);
      UI.toast(`Медаль «${m.name}»!`, 'medal');
      Sfx.play('success');
    }
  }

  return { msg, msgOnce, unread, senderName, questStarted, onNewDay, weatherAlert, needWarnings, CARDS, cardsLeft, cardNear, collect, MEDALS, checkMedals, placeCards };
})();
