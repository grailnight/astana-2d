'use strict';
// Персонажи живут своей жизнью: дни рождения, ребёнок у Даурена и Мадины, кофейня Айгерим,
// выставка Тимура, стартап Армана, внук Гульнар-апай. Новости приходят в телефон, события — в итоги дня.

const Lives = (() => {
  const s = () => G.s;
  function state() {
    const st = s();
    if (!st.lives) st.lives = { beats: {}, bday: {} };
    return st.lives;
  }
  const knows = (id) => !!(s().met[id] || (s().rel[id] || 0) > 0 || (id === 'aigerim' && s().flags.metAigerim) || (id === 'dauren' && s().flags.joinedCourier) || id === 'gulnar' && s().flags.metGulnar);
  const fem = (id) => NPCS[id] && NPCS[id].look.female;

  /* ---------- дни рождения ---------- */

  // день игры, место праздника, часы
  const BDAYS = {
    gulnar: { day: 10, loc: 'home', from: 17, to: 22, where: 'дома, на чай с баурсаками' },
    saule: { day: 12, loc: 'lang', from: 17, to: 20, where: 'в Тілдер орталығы после уроков' },
    dauren: { day: 15, loc: 'shawarma', from: 19, to: 24, where: 'в «Шаурме №1»' },
    aigerim: { day: 17, loc: 'karaoke', from: 19, to: 24, where: 'в караоке «Әнші»' },
    erzhan: { day: 19, loc: 'market', from: 12, to: 18, where: 'на базаре, у его прилавка' },
    timur: { day: 21, loc: 'wheel', from: 17, to: 21, where: 'у колеса обозрения' },
    arman: { day: 23, loc: 'office', from: 17, to: 19, where: 'в офисе Steppe Digital' },
    zhanel: { day: 25, loc: 'khan', from: 18, to: 22, where: 'в Хан Шатыре' },
    alikhan: { day: 27, loc: 'expo', from: 18, to: 20, where: 'в EXPO' },
  };
  const isBirthday = (id) => BDAYS[id] && BDAYS[id].day === s().day;
  const partyNow = (id) => isBirthday(id) && G.hour() >= BDAYS[id].from && G.hour() < BDAYS[id].to;

  async function congratulate(id) {
    const st = s(), L = state();
    L.bday[id] = st.day;
    const gifts = Object.keys(st.inv).filter((g) => ITEMS[g] && ITEMS[g].gift && st.inv[g] > 0);
    let gave = null;
    if (gifts.length) {
      const c = await UI.ask(null, `Подарить что-нибудь ${NPCS[id].name}?`, [...gifts.map((g) => ITEMS[g].name), 'Просто поздравить']);
      if (c < gifts.length) { gave = gifts[c]; G.take(gave); Day.note('gift'); }
    }
    await UI.say(null, `— Туған күніңмен! С днём рождения! ${gave ? `Ты протягиваешь подарок: ${ITEMS[gave].name.toLowerCase()}.` : 'Ты жмёшь руку и желаешь всего самого лучшего.'}`);
    await UI.say(id, gave ? pick(['Ой, это мне?! Рақмет, рақмет! Ты лучше всех!', 'Как ты угадал(а)?! Я о таком мечтал(а)!', 'Ну зачем было тратиться… Но мне очень приятно!']).replace(/\(а\)/g, fem(id) ? 'а' : '') : pick(['Спасибо, что не забыл' + gx('', 'а') + '! Это очень важно.', 'Рақмет! Ты пришёл' + gx('', 'а') + ' — это лучший подарок.']));
    G.addRel(id, gave ? 12 : 5); G.add('mood', 6);
    Life.checkMedals();
  }

  // действие «Поздравить» в разговоре
  function socialExtras(id) {
    if (!isBirthday(id) || state().bday[id] === s().day) return [];
    return [{ label: 'Поздравить с днём рождения', icon: 'gift', run: () => congratulate(id) }];
  }

  // именинник появляется на празднике
  function extraNpcs(locId) {
    return Object.keys(BDAYS).filter((id) => BDAYS[id].loc === locId && partyNow(id) && knows(id));
  }

  /* ---------- сюжетные линии ---------- */

  // каждый шаг срабатывает один раз в начале дня
  const BEATS = [
    {
      id: 'madina_news', when: (st) => st.flags.toyDone && st.day >= st.flags.toyDay + 4,
      run: () => Life.msg('dauren', `${gx('Брат', 'Сестрёнка')}, новость!!! Мадина ждёт ребёнка! Я буду папой! Мама Мадины уже вяжет пинетки.`),
    },
    {
      id: 'baby', after: 'madina_news', when: (st) => st.day >= st.flags.toyDay + 11,
      run: (st) => { st.flags.shildeDay = st.day + 1; Life.msg('dauren', 'Родился сын!!! 3 800 грамм, кричит как я на матче. Назвали Арсен. Завтра вечером — шілдехана в «Алтын Сарае», с 18:00. Ждём тебя обязательно!'); },
    },
    {
      id: 'aigerim_dream', when: (st) => st.flags.metAigerim && st.day >= 9 && (st.rel.aigerim || 0) >= 25,
      run: () => Life.msg('aigerim', 'Можно секрет? Я коплю на свою кофейню. Маленькую, с войлочными лампами и моими плакатами про Астану. Пока это просто мечта.'),
    },
    {
      id: 'aigerim_offer', after: 'aigerim_dream', when: (st) => st.day >= 14 && (st.rel.aigerim || 0) >= 40,
      run: (st) => { st.flags.coffeeOffer = st.day; Life.msg('aigerim', `Нашла помещение в новом ЖК на левом берегу! Не хватает ${fmtMoney(Dreams.COFFEE_INVEST)}… Может, станешь совладельцем? Прибыль — пополам. Подумай, ладно? Поговорим в «Дала».`); },
    },
    {
      id: 'aigerim_loan', after: 'aigerim_offer', when: (st) => !st.flags.coffeeShare && st.day >= st.flags.coffeeOffer + 12,
      run: (st) => { st.flags.coffeeOpen = st.day; Life.msg('aigerim', 'Я взяла кредит и всё-таки открываюсь! Приходи на кофе — для тебя всегда бесплатно ☕'); },
    },
    {
      id: 'coffee_open', when: (st) => st.flags.coffeeShare && st.day >= st.flags.coffeeShare + 3,
      run: (st) => { st.flags.coffeeOpen = st.day; Life.msg('aigerim', 'МЫ ОТКРЫЛИСЬ!!! Первые гости, первая выручка — и всё благодаря тебе. Твоя доля будет приходить каждое утро. Рақмет, серіктес!'); G.add('mood', 15); Life.checkMedals(); },
    },
    {
      id: 'timur_expo', when: (st) => (st.met.timur || st.rel.timur) && st.day >= 15,
      run: (st) => { st.flags.timurExpoDay = st.day + 2; Life.msg('timur', `Моя первая фотовыставка — «Астана в минус тридцать»! ${fmtDate(st.day + 2)}, в EXPO, с 18:00. Придёшь?`); },
    },
    {
      id: 'arman_hack', when: (st) => st.job.hired && st.day >= 18,
      run: (st) => { let d = st.day + 1; while (weekday(d) !== 6) d++; st.flags.hackDay = d; Life.msg('arman', `Я ухожу в свой стартап — сервис доставки баурсаков, не смейся! А пока зову на хакатон в университете, ${fmtDate(st.flags.hackDay)}. Код, пицца, призы.`); },
    },
    {
      id: 'gulnar_grandson', when: (st) => st.flags.metGulnar && st.day >= 8 && !st.flags.ownFlat,
      run: (st) => { st.flags.baursakDay = st.day; Life.msg('gulnar', 'Внучок из Шымкента приехал! Я баурсаков напекла целый таз — на кухне на столе, угощайся, не стесняйся.'); },
    },
    {
      id: 'kittens', when: (st) => G.flag('catQuest') === 'done' && st.day >= 6 && !Pet.has(),
      run: (st) => { st.flags.kittens = st.day; Life.msg('gulnar', 'Представляешь, Барсик у соседей стал папой! Аружан раздаёт котят у подъезда. Может, возьмёшь одного?'); },
    },
  ];

  function onNewDay() {
    const st = s(), L = state();
    for (const b of BEATS) {
      if (L.beats[b.id] || (b.after && !L.beats[b.after]) || !b.when(st)) continue;
      L.beats[b.id] = st.day;
      b.run(st);
    }
    // приглашения на день рождения
    for (const [id, b] of Object.entries(BDAYS)) {
      if (b.day === st.day && knows(id)) Life.msg(id, id === 'gulnar' ? 'Сегодня мой день рождения, балам. Вечером заходи на чай, я баурсаков напеку.' : `Сегодня мой день рождения! Отмечаем ${b.where}, с ${b.from}:00. Приходи!`);
    }
  }

  // что сообщить в итогах дня: дни рождения, праздники, выставки
  function hooks(day) {
    const st = s(), out = [];
    const w = day === st.day ? 'Сегодня' : 'Завтра';
    for (const [id, b] of Object.entries(BDAYS)) if (b.day === day && knows(id)) out.push(['gift', `${w} день рождения у ${NPCS[id].name}! Праздник ${b.where}, с ${b.from}:00. Подарок не помешает.`]);
    if (st.flags.shildeDay === day) out.push(['ring', `${w} шілдехана у Даурена — праздник в честь малыша Арсена, «Алтын Сарай», с 18:00.`]);
    if (st.flags.timurExpoDay === day) out.push(['camera', `${w} фотовыставка Тимура в EXPO, с 18:00.`]);
    if (st.flags.hackDay === day) out.push(['laptop', `${w} хакатон с Арманом в университете.`]);
    return out;
  }

  // дополнительные действия в местах
  function locActions(locId) {
    const st = s(), out = [];
    const h = G.hour();
    for (const id of extraNpcs(locId)) {
      out.push({
        label: `Отметить день рождения: ${NPCS[id].name}`, icon: 'gift', time: 90, sub: 'настроение +10 · отношения +',
        disabled: st.daily['party_' + id] ? 'уже отметили' : null,
        run: async () => {
          st.daily['party_' + id] = true;
          await UI.fade(`Тосты, торт со свечами и песни под домбру — ${NPCS[id].name} сияет…`, async () => G.advance(90));
          G.add('mood', 10); G.addRel(id, 4);
          if (state().bday[id] !== st.day) await congratulate(id);
        },
      });
    }
    if (locId === 'toyhana' && st.flags.shildeDay === st.day && h >= 17.5) out.unshift({
      label: 'Шілдехана у Даурена', icon: 'ring', time: 150, sub: 'праздник в честь малыша · подарок приветствуется',
      disabled: st.daily.shilde ? 'праздник уже позади' : null,
      run: async () => {
        st.daily.shilde = true;
        await UI.say('dauren', 'Пришёл' + gx('', 'а') + '! Смотри, вот он — Арсен! Нос мой, характер — тоже мой, бедная Мадина.');
        await UI.say('madina', 'Он уже держит палец так крепко! Садись, сейчас будет «бесікке салу» — укладываем в колыбель.');
        const gifts = Object.keys(st.inv).filter((g) => ITEMS[g] && ITEMS[g].gift && st.inv[g] > 0);
        if (gifts.length) { const g = gifts[0]; G.take(g); G.addRel('dauren', 6); await UI.say(null, `Ты даришь малышу подарок (${ITEMS[g].name.toLowerCase()}). Мадина растрогана.`); }
        await UI.fade('Бабушки поют колыбельную, аксакал даёт малышу благословение — бата…', async () => G.advance(150));
        G.add('mood', 15); G.addRel('dauren', 8); st.stats.toys = (st.stats.toys || 0) + 1;
        await UI.say('dauren', 'Слушай… Будешь ему как старший брат? Ну, или крёстный по-нашему. Ты же свой.');
      },
    });
    if (locId === 'expo' && st.flags.timurExpoDay === st.day && h >= 18 && h < 21) out.unshift({
      label: 'Фотовыставка Тимура', icon: 'camera', time: 60, sub: '«Астана в минус тридцать»', disabled: st.daily.timurExpo ? 'уже был' + gx('', 'а') : null,
      run: async () => {
        st.daily.timurExpo = true;
        await UI.fade('Чёрно-белые снимки: Байтерек в тумане, бабушка с санками на мосту, пар над Есилем…', async () => G.advance(60));
        await UI.say('timur', (st.love.partner === 'timur' ? 'Самое главное фото я не повесил. Оно — с тобой, и оно только моё.' : 'Ты пришёл' + gx('', 'а') + '! На одном фото, кстати, есть ты — вон там, у остановки, в снегу. Случайно поймал.'));
        G.add('mood', 10); G.addRel('timur', 8);
      },
    });
    if (locId === 'university' && st.flags.hackDay === st.day && h >= 9 && h < 14) out.unshift({
      label: 'Хакатон с Арманом', icon: 'laptop', time: 480, sub: 'код + · призы', disabled: st.daily.hack ? 'хакатон окончен' : st.energy < 35 ? gx('слишком устал', 'слишком устала') : null,
      run: async () => {
        st.daily.hack = true;
        await UI.fade('Восемь часов кода, пицца и кофе. Ваша команда делает приложение «Где мой автобус в буран»…', async () => G.advance(480, { work: 3 }));
        const win = G.lv('code') >= 4 || chance(0.4);
        G.addXp('code', 0.8); G.addRel('arman', 6);
        if (win) { G.earn(50000, 'хакатон — первое место'); await UI.say('arman', 'ПЕРВОЕ МЕСТО!!! Я же говорил, что мы сделаем это!'); }
        else await UI.say('arman', 'Третье место — тоже результат! Зато какое приложение получилось.');
      },
    });
    return out;
  }

  // Аружан раздаёт котят у дома 12
  const kittensNow = () => !!s().flags.kittens && !Pet.has();

  return { BDAYS, isBirthday, socialExtras, extraNpcs, onNewDay, hooks, locActions, kittensNow, congratulate, state };
})();
