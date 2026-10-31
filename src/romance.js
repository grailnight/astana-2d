'use strict';
// Отношения: знакомство, подарки, свидания, признание, предложение и свой той.

const DATERS = {
  aigerim: {
    loc: 'coffee', hours: [8, 21], job: 'бариста, учится на дизайнера',
    gift: 'sketchbook', date: 'wheel', topic: 'art',
  },
  timur: {
    loc: 'wheel', hours: [12, 19], job: 'фотограф, снимает город',
    gift: 'film', date: 'river', topic: 'photo',
  },
  zhanel: {
    loc: 'hospital', hours: [8, 20], job: 'врач-интерн',
    gift: 'chocolate', date: 'dinner', topic: 'travel',
  },
  alikhan: {
    loc: 'expo', hours: [10, 19], job: 'архитектор, ведёт экскурсии в EXPO',
    gift: 'book', date: 'cinema', topic: 'city',
  },
};

const DATE_SPOTS = {
  river: { name: 'Прогулка по набережной Есиля', price: 0, mins: 120, place: 'baiterek', text: 'Вы идёте вдоль Есиля. Фонари отражаются в воде, где-то играет домбра.' },
  wheel: { name: 'Колесо обозрения', price: 4000, mins: 60, place: 'wheel', text: 'Кабинка медленно поднимается. Внизу — весь левый берег, золотой шар Байтерека и шатёр Хан Шатыра.' },
  cinema: { name: 'Кино в Хан Шатыре', price: 5000, mins: 150, place: 'khan', text: 'Попкорн на двоих, последний ряд и фильм, который вы почти не смотрите.' },
  dinner: { name: 'Ужин в ресторане национальной кухни', price: 12000, mins: 120, place: 'baiterek', text: 'Бешбармак, баурсаки, чай с молоком. Официант приносит десерт «от заведения».' },
  beach: { name: 'Пляж в Хан Шатыре', price: 12000, mins: 150, place: 'khan', text: 'Песок, пальмы и +30 под куполом, пока за стеклом метёт снег.' },
  skating: { name: 'Каток на Есиле', price: 3000, mins: 90, place: 'baiterek', text: 'Лёд хрустит, играет музыка, вы держитесь за руки, чтобы не упасть. Почти не помогает.', winter: true },
};

const DATE_TOPICS = {
  art: 'Про дизайн и рисование', photo: 'Про фотографию и город через объектив', travel: 'Про путешествия и мечты',
  city: 'Про архитектуру Астаны', food: 'Про любимую еду', family: 'Про семью и родной город',
};

const Romance = (() => {
  const say = (...a) => UI.say(...a);
  const ask = (...a) => UI.ask(...a);
  const s = () => G.s;
  const L = () => { const st = s(); if (!st.love) st.love = { partner: null, dates: {}, engaged: false, married: false, lastSeen: {}, weddingDay: null }; return st.love; };
  const name = (id) => NPCS[id].name;
  const fem = (id) => NPCS[id].look.female;
  const gn = (id, m, f) => (fem(id) ? f : m);

  function isDater(id) { return !!DATERS[id]; }

  function stage(id) {
    const r = s().rel[id] || 0, l = L();
    if (l.married && l.partner === id) return 'супруги';
    if (l.engaged && l.partner === id) return 'помолвлены';
    if (l.partner === id) return 'встречаетесь';
    if (r >= 50) return 'симпатия';
    if (r >= 25) return 'друзья';
    return r > 0 ? 'знакомые' : 'незнакомы';
  }

  function present(id) {
    const d = DATERS[id];
    const h = G.hour();
    return h >= d.hours[0] && h < d.hours[1];
  }

  function canDateNow() {
    const h = G.hour();
    return (h >= 17 && h < 23) || (G.isWeekend() && h >= 11 && h < 23);
  }

  function styleScore() {
    const c = s().clothes;
    let st = 0;
    for (const id of [c.outfit, c.outer, c.hat]) if (id && CLOTHES[id]) st += CLOTHES[id].style || 0;
    return st;
  }

  /* ---------- знакомство ---------- */

  const INTROS = {
    timur: [
      'Ой, извини — ты попал в кадр. Хотя… знаешь, получилось даже лучше. Я Тимур, снимаю город для своего фотоблога.',
      'Колесо — моя любимая точка. Отсюда Хан Шатыр на закате выглядит как настоящий золотой шатёр.',
    ],
    zhanel: [
      'Здравствуйте! Я Жанель, интерн. Вам к кому? А, просто зашли… Тогда хотя бы витамины попейте, вы бледный.',
      'Шучу. Ну, наполовину. Зимой тут все бледные — солнца-то мало.',
    ],
    alikhan: [
      'Добро пожаловать в «Нұр Әлем»! Я Алихан, архитектор, по выходным вожу экскурсии. Знаете, что этот шар — самое большое сферическое здание в мире?',
      'Я обожаю этот город. Его построили почти с нуля — как будто нарисовали.',
    ],
  };

  function fixGender(id, text) {
    if (id === 'timur') return text.replace('ты попал', gx('ты попал', 'ты попала'));
    if (id === 'zhanel') return text.replace('вы бледный', gx('вы бледный', 'вы бледная'));
    return text;
  }

  async function intro(id) {
    const st = s();
    for (const line of INTROS[id]) await say(id, fixGender(id, line));
    st.met[id] = true;
    st.rel[id] = Math.max(st.rel[id] || 0, 5);
    UI.toast(`Новое знакомство: ${name(id)} (${DATERS[id].job})`, 'info');
  }

  async function giveGift(id, gifts) {
    const opts = gifts.map((g) => ({ text: ITEMS[g].name, note: `в сумке: ${s().inv[g]}` }));
    opts.push('Передумать');
    const c = await ask(null, `Что подарить: ${name(id)}?`, opts);
    if (c >= gifts.length) return;
    const g = gifts[c];
    G.take(g);
    const fav = DATERS[id].gift === g;
    let v = g === 'ring' ? 0 : fav ? 14 : g === 'flowers' ? 9 : 6;
    if (G.once('gift_' + id)) v += 0; else v = Math.round(v / 2);
    G.addRel(id, v);
    Day.note('gift');
    Sfx.play('success');
    await say(id, fav ? pick(['Не может быть! Это же именно то, что я хотел' + (fem(id) ? 'а' : '') + '! Как ты догадал' + gx('ся', 'ась') + '?', 'Ой… Я тронут' + (fem(id) ? 'а' : '') + '. Правда. Рақмет!'])
      : g === 'flowers' ? pick(['Цветы? Зимой в Астане это почти подвиг. Рақмет!', 'Какие красивые! Поставлю в воду.']) : pick(['Ой, спасибо! Приятно.', 'Рақмет! Не стоило, но мне приятно.']));
  }

  /* ---------- свидание ---------- */

  async function goOnDate(id) {
    const st = s(), l = L();
    const winter = G.season() === 'winter';
    const spots = Object.entries(DATE_SPOTS).filter(([, v]) => !v.winter || winter);
    const opts = spots.map(([k, v]) => ({ text: v.name, note: v.price ? `${fmtMoney(v.price)} на двоих · ${v.mins >= 60 ? (v.mins / 60).toString().replace('.', ',') + ' ч' : v.mins + ' мин'}` : `бесплатно · ${v.mins / 60} ч`, disabled: v.price > st.money }));
    opts.push('Не сегодня');
    const c = await ask(null, `Куда пригласить: ${name(id)}?`, opts);
    if (c >= spots.length) return;
    const [spotId, spot] = spots[c];
    if (spot.price && !G.pay(spot.price)) return;
    // ревность: свидание с другим человеком при отношениях
    if (l.partner && l.partner !== id) {
      G.addRel(l.partner, -15);
      UI.toast(`Кажется, ${name(l.partner)} узнал${fem(l.partner) ? 'а' : ''} про свидание…`, 'bad');
      if (st.rel[l.partner] < 40) {
        UI.toast(`${name(l.partner)}: «Между нами всё кончено».`, 'bad');
        l.partner = null; l.engaged = false;
      }
    }
    await say(id, pick(['С радостью! Пошли.', 'Наконец-то ты позвал' + gx('', 'а') + '! Идём.', 'Давай! Только я ненадолго… шучу, на сколько угодно.']));
    await UI.fade(spot.name + '…', async () => {
      G.advance(spot.mins, { walking: spotId === 'river' || spotId === 'skating' });
      const b = World.byId[spot.place];
      if (b) { Ents.placePlayer(b.doorX, b.doorY + 1); Ents.player.dir = 0; }
      else if (spot.place === 'wheel') { const w = World.decor.find((d) => d.kind === 'wheel'); Ents.placePlayer(w.tx, w.ty + 2); }
    });
    UI.closeAll();
    await say(null, spot.text);
    // разговор
    const keys = Object.keys(DATE_TOPICS);
    const liked = DATERS[id].topic;
    const offer = [liked];
    while (offer.length < 3) { const t = pick(keys); if (!offer.includes(t)) offer.push(t); }
    offer.sort(() => Math.random() - 0.5);
    const t = await ask(null, 'О чём заговорить?', offer.map((k) => DATE_TOPICS[k]));
    const topicHit = offer[t] === liked;
    await say(id, topicHit ? pick(['О, это моя любимая тема! Слушай…', 'Ты как будто мысли мои читаешь.']) : pick(['Интересно. Хотя я в этом не очень разбираюсь.', 'Ага… А давай про что-нибудь другое?']));
    let score = 3 + Math.min(3, G.lv('charm')) + Math.min(3, styleScore()) + (topicHit ? 4 : 0) + (spotId === DATERS[id].date ? 4 : 0) + (st.mood > 60 ? 1 : st.mood < 30 ? -3 : 0);
    if (spot.price >= 12000) score += 2;
    l.dates[id] = (l.dates[id] || 0) + 1;
    st.stats.dates = (st.stats.dates || 0) + 1;
    l.lastSeen[id] = st.day;
    G.addRel(id, score);
    G.add('mood', 15 + Math.round(score / 2));
    const r = st.rel[id];
    await say(id, r >= 80 ? 'Знаешь… с тобой всё как-то по-настоящему. Не хочу, чтобы вечер заканчивался.' : r >= 60 ? 'Было очень здорово. Давай повторим?' : 'Спасибо за вечер! Было мило.');
    if (r >= 70 && !l.partner && l.dates[id] >= 2) UI.toast('Похоже, пора признаться в чувствах…', 'quest');
  }

  async function confess(id) {
    const st = s(), l = L();
    const c = await ask(null, 'Сердце колотится. Как сказать?', [
      'Ты мне очень нравишься. Давай встречаться?',
      G.lv('kaz') >= 2 ? 'Мен сені ұнатамын. (Ты мне нравишься.)' : { text: 'Признаться по-казахски', disabled: true, note: 'нужен казахский 2' },
      'Э-э… ты не хочешь… ну… как бы… это самое?',
    ]);
    const bonus = c === 1 ? 10 : c === 2 ? -8 : 0;
    const ok = st.rel[id] + bonus + G.lv('charm') * 2 >= 72;
    if (ok) {
      l.partner = id;
      G.addRel(id, 8);
      Sfx.play('success');
      await say(id, c === 1 ? 'Ой… қазақша… Мен де сені ұнатамын. Я тоже. Да! Конечно, да!' : 'Я думал' + (fem(id) ? 'а' : '') + ', ты никогда не спросишь. Да!');
      UI.toast(`Теперь вы с ${id === 'aigerim' ? 'Айгерим' : id === 'zhanel' ? 'Жанель' : id === 'timur' ? 'Тимуром' : 'Алиханом'} — пара!`, 'quest');
      G.add('mood', 30);
    } else {
      G.addRel(id, -5);
      await say(id, 'Ты мне правда нравишься… Но давай не будем спешить. Узнаем друг друга получше?');
    }
  }

  async function propose(id) {
    const st = s(), l = L();
    await say(null, 'Ты достаёшь коробочку с кольцом. Руки чуть дрожат.');
    const c = await ask(null, 'Что скажешь?', [fem(id) ? 'Будь со мной всегда. Выходи за меня?' : 'Будь со мной всегда. Давай поженимся?', `Это… тебе. Ну, ты ${gn(id, 'понял', 'поняла')}. В общем, да.`]);
    G.take('ring');
    l.engaged = true;
    let d = st.day + 3;
    while (weekday(d) !== 6) d++;
    l.weddingDay = d;
    G.addRel(id, c === 0 ? 10 : 5);
    Sfx.play('success');
    await say(id, 'Да! Да, да, да! Мама будет плакать. Обе мамы будут плакать!');
    await say(id, `Той сделаем в «Алтын Сарае»? Давай в ${WEEKDAYS_FULL[weekday(d)]}, ${dayDate(d).getDate()} ${MONTHS_GEN[dayDate(d).getMonth()]}, вечером. Позовём всех!`);
    G.add('mood', 40);
  }

  async function ownWedding() {
    const st = s(), l = L();
    const id = l.partner;
    if (!G.wearsFormal()) { await say(null, 'Жених или невеста в спортивках?! Тёти у входа хватаются за сердце. Переоденься во что-то нарядное.'); return; }
    await say(null, `Зал «Алтын Сарая» полон. Здесь мама, Гульнар-апай, Даурен с Мадиной, коллеги и половина ${st.base.from === 'аул под Туркестаном' ? 'аула' : 'родного города'}.`);
    if (fem(id) || st.base.female) await say(null, 'Под звуки «Беташара» невесте открывают лицо — старинный обряд, чтобы новую семью приняли в доме.');
    await say('dauren', `Я сегодня тамада! ${gx('Братан', 'Сестрёнка')}, ${name(id)} — бақытты болыңдар! Пусть ваш шаңырақ будет высоким!`);
    await say('mama', 'Балам… Я столько ждала этого дня. Бақытты болыңдар, жаным.');
    await say('dauren', 'А теперь — первый танец молодых!');
    const acc = await MG.rhythm({ title: 'Той жыры', bpm: 104, beats: 40 });
    await say(null, acc > 0.6 ? 'Танец получился идеальным. Гости аплодируют стоя.' : 'Вы немного сбились, но смеялись так заразительно, что весь зал пустился в пляс.');
    await UI.fade('Той гремит до поздней ночи…', async () => { const h = G.hour(); G.advance(Math.max(30, Math.round((23.5 - h) * 60))); });
    l.married = true;
    st.flags.ownToy = true;
    G.addRel(id, 10); G.add('mood', 50);
    await say(id, 'Ну что… пойдём домой? В наш дом.');
    UI.toast(`${name(id)} переезжает к тебе. Теперь дома вас двое.`, 'quest');
  }

  /* ---------- телефон и ежедневные события ---------- */

  async function call(id) {
    const st = s(), l = L();
    l.lastSeen[id] = st.day;
    const opts = ['Просто поболтать'];
    if ((st.rel[id] >= 50 || l.partner === id) && canDateNow()) opts.push('Пригласить на свидание прямо сейчас');
    opts.push('Пока!');
    const c = await ask(id, l.partner === id ? 'Алло, жаным? Соскучил' + (fem(id) ? 'ась' : 'ся') + '!' : 'Алло? О, привет!', opts);
    if (opts[c] === 'Просто поболтать') {
      if (G.once('call_' + id)) G.addRel(id, 3);
      await say(id, pick(CALL_LINES[id] || ['Как день прошёл? У меня — бесконечный.']));
    } else if (opts[c].startsWith('Пригласить')) await goOnDate(id);
  }

  const CALL_LINES = {
    aigerim: ['Я тут рисую плакат с шаром EXPO. Он как планета, правда?', 'У нас сегодня было столько заказов — руки до сих пор пахнут кофе.'],
    timur: ['Поймал сегодня кадр: Байтерек в тумане. Покажу при встрече!', 'Обещают буран. Для фотографа — праздник.'],
    zhanel: ['Двенадцать часов смены… Расскажи что-нибудь хорошее, мне надо.', 'Пей витамины. Это врачебное назначение!'],
    alikhan: ['Знаешь, что пирамиду проектировал Норман Фостер? И Хан Шатыр тоже.', 'Сегодня на экскурсии был школьный класс. Я охрип.'],
  };

  function onNewDay() {
    const st = s(), l = L();
    if (!l.partner) return;
    const id = l.partner;
    const gap = st.day - (l.lastSeen[id] || st.day);
    if (gap >= 3 && !l.married) { G.addRel(id, -4); Life.msg(id, `Ты совсем ${gx('пропал', 'пропала')}… Всё хорошо?`); }
    else if (l.married) { G.add('mood', 6); G.add('food', 20); UI.toast(`${name(id)} приготовил${fem(id) ? 'а' : ''} завтрак. Настроение +6`, 'good'); }
    else Life.msg(id, pick(['Доброе утро! Хорошего дня.', 'Как спалось? Я уже скучаю.', 'Не забудь позавтракать!']));
  }

  function weddingToday() {
    const l = L();
    return l.engaged && !l.married && s().day === l.weddingDay && G.hour() >= 17.5;
  }

  return { isDater, stage, present, intro, call, goOnDate, giveGift, confess, propose, canDateNow, styleScore, onNewDay, ownWedding, weddingToday, love: L };
})();
