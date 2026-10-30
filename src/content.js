'use strict';
// Контент: навыки, одежда, предметы, персонажи, локации и их действия.

const SKILLS = {
  kaz: { name: 'Казахский', icon: 'kaz' },
  code: { name: 'Код', icon: 'code' },
  charm: { name: 'Обаяние', icon: 'charm' },
  fit: { name: 'Выносливость', icon: 'fit' },
};

const CLOTHES = {
  sport: { name: 'Спортивный костюм', slot: 'outfit', outfit: 'sport', warm: 0, style: 0 },
  hoodie: { name: 'Худи и джинсы', slot: 'outfit', outfit: 'hoodie', top: '#5b6c8f', bottom: '#2a3a5c', warm: 1, style: 1 },
  suit: { name: 'Деловой костюм', slot: 'outfit', outfit: 'suit', top: '#2b2f3a', bottom: '#2b2f3a', shoes: '#141414', warm: 0, style: 3, formal: true },
  chapan: { name: 'Чапан', slot: 'outfit', outfit: 'chapan', top: '#1f3f7a', bottom: '#2b2b2b', warm: 1, style: 3, formal: true },
  gala: { name: 'Вечерний образ', slot: 'outfit', outfit: 'gala', top: '#1d5c5a', bottom: '#1b1b1b', shoes: '#141414', warm: 0, style: 4, formal: true },
  puffer: { name: 'Пуховик', slot: 'outer', color: '#2d4f7c', warm: 3, style: 0 },
  pufferN: { name: 'Пуховик «Солтүстік»', slot: 'outer', color: '#c0392b', warm: 4, style: 1 },
  ushanka: { name: 'Ушанка', slot: 'hat', hat: 'ushanka', color: '#6b4a32', warm: 1, style: 0 },
  beanie: { name: 'Вязаная шапка', slot: 'hat', hat: 'beanie', color: '#c0392b', warm: 1, style: 1 },
  kalpak: { name: 'Калпак', slot: 'hat', hat: 'kalpak', color: '#f3f0e6', warm: 0, style: 2 },
};

const ITEMS = {
  groceries: { name: 'Набор продуктов', desc: 'Приготовить ужин дома' },
  baursak: { name: 'Баурсаки', desc: 'Пышные, ещё тёплые', food: 20, mood: 6 },
  kurt: { name: 'Курт', desc: 'Солёные шарики из сушёного творога', food: 8, mood: 2 },
  kazy: { name: 'Казы', desc: 'Конская колбаса, праздничная еда', food: 35, mood: 6 },
  kumys: { name: 'Кумыс', desc: 'Кобылье молоко, бодрит', food: 10, mood: 8, energy: 6 },
  samsa: { name: 'Самса', desc: 'Из тандыра, с мясом', food: 22, mood: 2 },
  chocolate: { name: 'Шоколад «Казахстан»', desc: 'Тот самый, с синей обёрткой', food: 8, mood: 8 },
  flowers: { name: 'Цветы', desc: 'Подарок — укрепляет отношения' },
  laptop: { name: 'Ноутбук', desc: 'Можно учить код дома', key: true },
  scooter: { name: 'Электросамокат', desc: 'Скорость передвижения +55%', key: true },
};

const NPCS = {
  mama: { name: 'Мама', look: { female: true, skin: '#d9a982', hair: '#5a3d28', hairStyle: 'bun', outfit: 'casual', top: '#3f6f8f', bottom: '#3b3b3b', hat: 'kerchief', hatColor: '#c0392b' } },
  gulnar: { name: 'Гульнар-апай', look: { female: true, skin: '#d9a982', hair: '#9a9a9a', hairStyle: 'bun', outfit: 'casual', top: '#7b2d4a', bottom: '#2b2b2b', hat: 'kerchief', hatColor: '#2a6f97' } },
  dauren: { name: 'Даурен', look: { female: false, skin: '#d4a07a', hair: '#1d1612', hairStyle: 'short', outfit: 'courier', top: '#f0b429', bottom: '#2a3550', hat: 'cap', hatColor: '#1d3a4a' } },
  aigerim: { name: 'Айгерим', look: { female: true, skin: '#e8bf98', hair: '#3b2a20', hairStyle: 'pony', outfit: 'apron', top: '#f2efe8', bottom: '#2b2b2b', apron: '#6b4a32' } },
  arman: { name: 'Арман', look: { female: false, skin: '#e0b38c', hair: '#1d1612', hairStyle: 'short', outfit: 'hoodie', top: '#3a3f4a', bottom: '#2a3550', glasses: true } },
  saule: { name: 'Сауле-апай', look: { female: true, skin: '#e0b38c', hair: '#2b1d16', hairStyle: 'bob', outfit: 'suit', top: '#3b5998', bottom: '#2b2b2b', tie: '#f2c14e', glasses: true } },
  erzhan: { name: 'Ержан-ага', look: { female: false, skin: '#c68c63', hair: '#3b3b3b', hairStyle: 'buzz', outfit: 'casual', top: '#4a7a3a', bottom: '#3b3b3b', hat: 'kalpak' } },
  madina: { name: 'Мадина', look: { female: true, skin: '#ecc6a2', hair: '#1d1612', hairStyle: 'long', outfit: 'gala', top: '#f4f0f0', bottom: '#f4f0f0', hat: 'saukele' } },
  tamada: { name: 'Тамада Болат', look: { female: false, skin: '#d4a07a', hair: '#2b1d16', hairStyle: 'short', outfit: 'gala', top: '#5a1f3d', bottom: '#1b1b1b' } },
  kid: { name: 'Аружан', look: { female: true, skin: '#f1c9a5', hair: '#2b1d16', hairStyle: 'pony', outfit: 'hoodie', top: '#e84393', bottom: '#3b3b3b' } },
  tourist: { name: 'Марат из Алматы', look: { female: false, skin: '#e0b38c', hair: '#3b2a20', hairStyle: 'short', outfit: 'casual', top: '#e67e22', bottom: '#2a3550', hat: 'cap', hatColor: '#16a085', glasses: true } },
  granny: { name: 'Әже Бибігүл', look: { female: true, skin: '#c68c63', hair: '#cfcfcf', hairStyle: 'bun', outfit: 'chapan', top: '#5b3a6e', bottom: '#2b2b2b', hat: 'kerchief', hatColor: '#f4f0f0' } },
  dombra: { name: 'Домбрист Ерлан', look: { female: false, skin: '#d4a07a', hair: '#1d1612', hairStyle: 'short', outfit: 'chapan', top: '#7a1f1f', bottom: '#1b1b1b', hat: 'kalpak' } },
};

const PED_LINES = [
  'Ветер сегодня такой, что шапку уносит до Караганды.',
  'Летом +35, зимой −40. Астана закаляет!',
  'Говорят, песок на пляже в Хан Шатыре привезли с Мальдив.',
  'Байтерек — 97 метров. В честь 1997 года, когда сюда перенесли столицу.',
  'Наверху Байтерека есть отпечаток ладони. Приложи руку и загадай желание!',
  'Я из Шымкента. Тут, конечно, холоднее… раз в десять.',
  'Сәлеметсіз бе! Ой, извините, обознался.',
  'Опять пробка на мосту. Как обычно.',
  'Мой дедушка помнит, когда город назывался Целиноград.',
  'Целиноград, Акмола, Астана, Нур-Султан, снова Астана… Я уже путаюсь в адресах.',
  'Вечером сходи на набережную, там всё светится.',
  'Говорят, шар EXPO — самое большое сферическое здание в мире.',
  'Зимой на Есиле заливают каток. Красота!',
  'Бешбармак лучше всего у мамы. Ну или на тое.',
  'Мен асығып жүрмін! Я тороплюсь, извини!',
  'Байтерек — это дерево жизни, а золотой шар — яйцо птицы Самрук.',
  'Ты не знаешь, где тут «Самал Плаза»? А, вон шар EXPO, значит рядом.',
  'Рақмет, бауырым, всё нормально!',
  'В Астане два сезона: зима и ремонт дорог.',
];
const PED_LINES_WINTER = [
  '−30 и ветер. Обычный вторник.',
  'Пуховик — лучшая инвестиция в Астане.',
  'Без шапки? Смелый ты человек.',
  'Буран обещали. Беги домой, пока автобусы ходят.',
  'Аяз! Мороз щиплет нос.',
];

const BUS_FARE = 100;

const Content = (() => {
  const say = (...a) => UI.say(...a);
  const ask = (...a) => UI.ask(...a);
  const s = () => G.s;
  const P = () => s().name;
  const lvl = (k) => G.lv(k);
  const TIRED = () => gx('слишком устал', 'слишком устала');

  /* ---------- общие сцены ---------- */

  async function faint() {
    await UI.fade(gx('Ты потерял сознание…', 'Ты потеряла сознание…'), async () => {
      const st = s();
      const b = World.byId.hospital;
      Ents.placePlayer(b.doorX, b.doorY + 1);
      Ents.player.dir = 0;
      G.advance(6 * 60, { asleep: true });
      st.energy = Math.max(st.energy, 45);
      st.food = Math.max(st.food, 30);
      st.mood = Math.max(0, st.mood - 15);
      const bill = Math.min(st.money, 5000);
      st.money -= bill;
      st.flags.fainting = false;
      st.flags.lastBill = bill;
    });
    await say(null, `${gx('Ты очнулся', 'Ты очнулась')} в больнице. Врач говорит: «Нельзя так себя загонять — ешь вовремя и высыпайся». Счёт за помощь: ${fmtMoney(s().flags.lastBill)}.`);
  }

  async function sleepUntilMorning(quality = 1) {
    const st = s();
    let mins;
    const h = G.hour();
    if (h >= 7) mins = (24 - h) * 60 + 7 * 60; else mins = (7 - h) * 60;
    mins = Math.round(mins);
    await UI.fade('Спокойной ночи…', async () => {
      G.advance(mins, { asleep: true });
      if (quality < 1) st.energy = Math.min(st.energy, 60);
      G.save();
    });
    const wx = WEATHER_NAMES[st.weather.kind];
    UI.toast(`Утро: ${fmtDate(st.day)}, ${G.temp()}°C, ${wx}`, 'info');
  }

  async function eat(itemId) {
    const it = ITEMS[itemId];
    if (!G.has(itemId) || !it.food) return;
    G.take(itemId);
    G.add('food', it.food); G.add('mood', it.mood || 0); if (it.energy) G.add('energy', it.energy);
    G.advance(10);
    UI.toast(`${it.name}: сытость +${it.food}`, 'good');
  }

  function buyFood(name, price, food, mood = 0, energy = 0, minutes = 20) {
    return {
      label: name, price, time: minutes,
      sub: [food ? `сытость +${food}` : '', energy ? `энергия +${energy}` : '', mood ? `настроение +${mood}` : ''].filter(Boolean).join(' · '),
      run: async () => {
        if (!G.pay(price)) return;
        G.add('food', food); G.add('mood', mood); G.add('energy', energy);
        G.advance(minutes);
        Sfx.play('coin');
        UI.toast(`${name} — вкусно!`, 'good');
      },
    };
  }

  function buyItem(id, price) {
    const it = ITEMS[id];
    return {
      label: it.name, price, sub: it.desc + (G.has(id) ? ` · в сумке: ${s().inv[id]}` : ''),
      disabled: it.key && G.has(id) ? 'уже есть' : null,
      run: async () => {
        if (!G.pay(price)) return;
        G.give(id);
        Sfx.play('coin');
        UI.toast(`Куплено: ${it.name}`, 'good');
      },
    };
  }

  function buyCloth(id, price) {
    const c = CLOTHES[id];
    const owned = G.owns(id);
    const tags = [];
    if (c.warm) tags.push(`тепло +${c.warm}`);
    if (c.formal) tags.push('нарядное');
    return {
      label: c.name, price: owned ? null : price, sub: tags.join(' · ') || 'повседневное',
      disabled: owned ? 'уже есть' : null,
      run: async () => {
        if (!G.pay(price)) return;
        s().clothes.owned.push(id);
        s().clothes[c.slot] = id;
        Sfx.play('coin');
        UI.toast(`Куплено и надето: ${c.name}`, 'good');
      },
    };
  }

  /* ---------- персонажи ---------- */

  const Talk = {};

  Talk.gulnar = async () => {
    const st = s();
    if (!st.flags.metGulnar) {
      await say('gulnar', `Сәлем, балам! Ты, значит, ${P()}? Даурен про тебя говорил. Проходи, проходи, не стой на сквозняке.`);
      await say('gulnar', 'Комната маленькая, но тёплая — батареи у нас в доме жарят, как в бане. Окно на двор, рядом остановка и магазин.');
      const c = await ask('gulnar', `Аренда — ${fmtMoney(st.rent.amount)} в неделю. Первую неделю отдашь до конца седьмого дня, до четверга. Договорились?`, [
        'Сәлеметсіз бе, апай! Рақмет!',
        'Договорились, спасибо большое!',
        'А можно подешевле?..',
      ]);
      if (c === 0) { await say('gulnar', `Ой, қазақша сөйлейсің бе? Молодец, балам! Сразу видно — ${gx('воспитанный', 'воспитанная')}.`); G.addRel('gulnar', 10); }
      else if (c === 2) { await say('gulnar', 'Подешевле только в палатке на берегу. Зимой там, правда, −40. Подумай.'); }
      else G.addRel('gulnar', 4);
      await say('gulnar', 'Вот ключи. Кровать, чайник, шкаф — всё твоё. Если что — стучи, я на первом этаже.');
      st.flags.metGulnar = true; st.met.gulnar = true;
      return;
    }
    const opts = ['Как ваши дела, апай?'];
    const canPay = st.rent.due - st.day < 7 && st.homeId === 'home';
    const fine = st.rent.locked ? 5000 : 0;
    if (canPay) opts.push({ text: `Заплатить аренду: ${fmtMoney(st.rent.amount + fine)}${fine ? ' (с пеней)' : ''}`, note: `срок: до конца дня ${st.rent.due}` });
    const kazStep = Quests.isStep('kazakh', 2);
    if (kazStep) opts.push('Поговорить по-казахски');
    opts.push('Ничего, до свидания');
    const c = await ask('gulnar', st.rent.locked ? 'Балам, долг по аренде! Пока не заплатишь — комнату не открою. Уж извини.' : pick([
      `Ну что, как тебе столица? ${gx('Не замёрз', 'Не замёрзла')} ещё?`,
      gx('Ты кушал сегодня? Худой какой-то стал.', 'Ты кушала сегодня? Худая какая-то стала.'),
      'Мой сын тоже в Астану приехал из аула, теперь у него своя фирма. И ты пробьёшься!',
    ]), opts);
    const pickd = opts[c];
    const label = typeof pickd === 'string' ? pickd : pickd.text;
    if (label.startsWith('Как ваши')) {
      if (G.once('talk_gulnar')) G.addRel('gulnar', 3);
      await say('gulnar', pick([
        'Слава богу, потихоньку. Давление скачет, когда погода меняется. А у нас она меняется каждый час!',
        'Внук в садик пошёл, уже поёт «Менің Қазақстаным». Я плачу каждый раз.',
        'Соседка с пятого опять затопила. Ничего, в Астане главное — тёплые батареи и тёплые люди.',
        'Сегодня баурсаки жарила. Заходи вечером, угощу.',
      ]));
    } else if (label.startsWith('Заплатить')) {
      if (!G.pay(st.rent.amount + fine)) return;
      st.rent.due += 7; st.rent.locked = false; st.flags.rentPaid = (st.flags.rentPaid || 0) + 1;
      Sfx.play('coin');
      await say('gulnar', `Рақмет, балам! Следующая оплата — до конца дня ${st.rent.due}, ${WEEKDAYS_FULL[weekday(st.rent.due)]}.`);
    } else if (label.startsWith('Поговорить')) {
      const q = await ask('gulnar', 'Қалың қалай, балам? Жұмыс қалай?', [
        'Жақсы, рақмет! Жұмыс та жақсы. Өзіңіз қалайсыз?',
        'Мен… э… жақсы?',
        'Апай, я не понял ничего.',
      ]);
      if (q === 0) {
        await say('gulnar', 'Ой, балам! Енді сен нағыз астаналықсың! Теперь ты настоящий житель столицы!');
        await say('gulnar', 'Держи баурсаки, свежие. И аренду сделаю 18 000 — для своих.');
        G.give('baursak', 3); st.rent.amount = 18000; st.flags.kazakhGulnar = true; G.addRel('gulnar', 15);
      } else if (q === 1) {
        await say('gulnar', 'Жақсы, жақсы! Почти. Ещё чуть-чуть позанимайся у Сауле-апай и приходи.');
      } else {
        await say('gulnar', 'Ничего, тіл үйрену — бұл марафон. Язык учить — это марафон, не спринт.');
      }
    }
  };

  Talk.dauren = async () => {
    const st = s();
    if (!st.flags.joinedCourier && World.byId.courier && UI.currentLoc() === 'courier') {
      await say('dauren', `${P()}! ${gx('Дошёл', 'Дошла')} всё-таки! Ну как тебе город? Ветер, да? Привыкнешь.`);
      await say('dauren', 'Короче, смотри. Берёшь заказ здесь, забираешь его в кафе или магазине, везёшь клиенту. Стрелка на экране покажет, куда идти.');
      await say('dauren', 'Чем быстрее довезёшь — тем больше заплатят. Опоздаешь — клиент срежет оплату. Всё просто!');
      await say('dauren', 'Ещё совет: купи самокат в «Самал Плазе», когда будут деньги. Летаешь как ветер. И пуховик, пока зима не пришла!');
      st.flags.joinedCourier = true;
      G.addRel('dauren', 5);
      return;
    }
    if (Quests.status('toy') === 'active' && !st.flags.toyDone) {
      await say('dauren', `Ты же помнишь? Той в «Алтын Сарае», ${WEEKDAYS_FULL[weekday(st.flags.toyDay)]}, с шести вечера! Мадина уже всех родственников обзвонила.`);
      return;
    }
    if (G.once('talk_dauren')) G.addRel('dauren', 3);
    await say('dauren', pick([
      'Когда буран, курьеры — герои. Ну или сумасшедшие. Я пока не решил, кто я.',
      'Мама говорит: «Женись!». Я говорю: «Сначала кредит закрою». Она говорит: «Это не ответ».',
      gx('Видел', 'Видела') + ', как ночью светится Байтерек? Я однажды так засмотрелся, что заказ не туда отвёз.',
      'Если устанешь — шаурма №1 спасает. Проверено.',
      'Знаешь, почему в Астане все быстро ходят? Потому что −30. Всё.',
      st.flags.toyDone ? 'До сих пор вспоминаю твой тост на тое. Мадина тебе привет передаёт!' : 'Мадина — лучшая. Я тебе её скоро покажу. В смысле познакомлю.',
    ]));
  };

  Talk.aigerim = async () => {
    const st = s();
    if (!st.flags.metAigerim) {
      await say('aigerim', `Сәлем! Добро пожаловать в «Дала Кофе». Ты ${gx('новенький', 'новенькая')} в городе? Видно по лицу — все приезжие так на Байтерек смотрят.`);
      await say('aigerim', 'Я Айгерим. Днём варю кофе, вечером учусь на дизайнера в университете.');
      const c = await ask('aigerim', 'Слушай, нам как раз нужен человек на подработку. Смена — 4 часа, 3 000 ₸ плюс бонус за каждый заказ и чаевые. Попробуешь?', ['Конечно, давай!', 'Я подумаю']);
      st.flags.metAigerim = true; st.met.aigerim = true;
      if (c === 0) { await say('aigerim', 'Отлично! Приходи с 8 утра до 5 вечера — нажми «Смена бариста». Рецепты я дам, не переживай.'); G.addRel('aigerim', 5); }
      else await say('aigerim', 'Хорошо, предложение в силе. Кофе пока за мой счёт — шучу, 1 400 ₸.');
      return;
    }
    if (Quests.status('coffee') === 'done' && !st.flags.heardJob) {
      await say('aigerim', 'Кстати! Мой однокурсник работает в Steppe Digital — это IT-компания на левом берегу, возле EXPO. Они ищут джуна.');
      await say('aigerim', 'Подтяни программирование в библиотеке университета, купи нормальный костюм в Хан Шатыре — и вперёд. Ты справишься!');
      st.flags.heardJob = true;
      return;
    }
    if (G.once('talk_aigerim')) G.addRel('aigerim', 4);
    const r = st.rel.aigerim;
    await say('aigerim', r < 30 ? pick([
      'Самый популярный заказ зимой — чай с молоком по-казахски. Холодно же!',
      'Утром здесь очередь из студентов и чиновников. Все невыспавшиеся одинаково.',
      'Ты уже был на набережной вечером? Очень красиво, когда всё светится.',
    ]) : r < 60 ? pick([
      'Я рисую серию плакатов про Астану: Байтерек, Хан Шатыр, пирамиду. Хочешь, покажу когда-нибудь?',
      'Мне нравится, что город молодой. Ему столько же лет, сколько многим из нас.',
      `${P()}, ты сегодня ${gx('какой-то задумчивый', 'какая-то задумчивая')}. Всё хорошо?`,
    ]) : pick([
      'Я рада, что ты заходишь. Правда.',
      'Если захочешь погулять вечером — звони. Номер у тебя есть.',
      'Знаешь, раньше я думала, что Астана — холодный город. А теперь — нет.',
    ]));
    if (r >= 25 && !st.met.aigerimPhone) { st.met.aigerimPhone = true; UI.toast('Айгерим дала свой номер — теперь можно позвонить', 'info'); }
  };

  Talk.arman = async () => {
    if (!s().job.hired) {
      await say('arman', 'Привет! Я Арман, тимлид. Если ты на собеседование — мы проводим их по будням с 9 до 17.');
      return;
    }
    if (G.once('talk_arman')) G.addRel('arman', 3);
    await say('arman', pick([
      'Прод упал? Нет? Ну и отлично. Хорошего дня!',
      'У нас в команде правило: пятничный деплой — только с баурсаками для всех.',
      'Растёшь! Продолжай в том же духе — и повышение не за горами.',
      'Кофе-машина опять сломалась. Сходи в «Дала Кофе», если что.',
    ]));
  };

  Talk.saule = async () => {
    const st = s();
    if (!st.met.saule) {
      st.met.saule = true;
      await say('saule', 'Қош келдіңіз! Добро пожаловать в «Тілдер орталығы». Я Сауле-апай, преподаю казахский.');
      await say('saule', 'Урок стоит 3 000 ₸ и длится полтора часа. После урока — маленький тест. Чем лучше ответишь, тем быстрее растёт навык.');
      await say('saule', 'Тіл — ұлттың жаны. Язык — душа народа. Начнём?');
      return;
    }
    if (G.once('talk_saule')) G.addRel('saule', 3);
    await say('saule', pick([
      'Совет: говорите «Рақмет» вместо «спасибо» — люди сразу улыбаются.',
      'В казахском девять особых букв: ә, ғ, қ, ң, ө, ұ, ү, һ, і. Не бойтесь их!',
      'Апа, апай, аға — так уважительно обращаются к старшим. Очень важно.',
      '«Ас болсын!» — желают перед едой. Как «приятного аппетита».',
    ]));
  };

  Talk.erzhan = async () => {
    if (G.once('talk_erzhan')) G.addRel('erzhan', 3);
    await say('erzhan', pick([
      'Пуховик бери, зима близко! У нас не холодно, у нас — свежо. Минус сорок — это свежо.',
      'Казы — сам делал! Ну, почти сам. Брат делал. Но я рядом стоял.',
      'Курт пробовал? Солёный, твёрдый — в дорогу самое то.',
      'Калпак — это не просто шапка, это стиль! Летом не жарко, на тое — красиво.',
      'Торговаться будешь? Давай. Цена та же, но разговор приятный.',
    ]));
  };

  /* ---------- побочные персонажи на улице ---------- */

  const worldNpcs = [
    {
      id: 'kid', tx: 12, ty: 18,
      visible: () => G.flag('catQuest') !== 'done' && G.hour() >= 9 && G.hour() < 20 && Quests.status('arrival') === 'done',
      talk: async () => {
        const q = G.flag('catQuest');
        if (!q) {
          await say('kid', `${gx('Ағай', 'Апай')}, сіз мысықты көрдіңіз бе? Ой… Вы не видели кота? Рыжий, Барсик зовут. Он убежал в парк на правом берегу, у реки!`);
          G.flag('catQuest', 'asked');
          UI.toast('Новое побочное задание: найти кота Барсика', 'quest');
        } else if (q === 'asked') {
          await say('kid', 'Барсик рыжий, он любит сидеть на дорожке в парке, рядом с юртой. Пожалуйста, найдите его!');
        } else if (q === 'found') {
          await say('kid', 'БАРСИК! Ты нашёлся! Рақмет, рақмет! Вот, мама дала денег на мороженое, но вам нужнее.');
          G.flag('catQuest', 'done');
          G.earn(3000, 'награда'); G.add('mood', 15); G.addXp('charm', 0.3);
        }
      },
    },
    {
      id: 'tourist', tx: 45, ty: 55,
      visible: () => !G.flag('touristDone') && G.hour() >= 10 && G.hour() < 19,
      talk: async () => {
        await say('tourist', 'Сәлем! Я из Алматы, первый раз в столице. Сфоткай меня на фоне Байтерека, а?');
        const c = await ask('tourist', 'Как будешь снимать?', ['Снизу, чтобы Байтерек влез целиком', 'Крупно — только лицо', 'Селфи с собой на фоне']);
        if (c === 0) {
          await say('tourist', 'Идеально! И шар в кадре, и я. Мама будет в восторге. Держи на кофе!');
          G.earn(1000, 'чаевые'); G.addXp('charm', 0.3);
        } else if (c === 1) {
          await say('tourist', 'Э-э… а где Байтерек? Ладно, лицо красивое получилось. Рақмет!');
        } else {
          await say('tourist', 'Ха-ха, ну ладно, теперь у меня есть фото с местным! Рақмет!');
          G.addXp('charm', 0.15);
        }
        const d = await ask('tourist', 'А как пройти к Хан Шатыру?', ['По бульвару на запад, до огромного шатра', 'Через мост на правый берег', 'На восток, к Акорде']);
        if (d === 0) { await say('tourist', 'Точно, его же отсюда видно! Спасибо, бауырым!'); G.add('mood', 6); }
        else await say('tourist', 'Хм… кажется, я вижу шатёр в другой стороне. Ну ладно, разберусь!');
        G.flag('touristDone', true);
      },
    },
    {
      id: 'granny', tx: 25, ty: 17,
      visible: () => G.flag('grannyQuest') !== 'done' && G.flag('grannyQuest') !== 'carrying' && G.hour() >= 9 && G.hour() < 16,
      talk: async () => {
        const c = await ask('granny', 'Балам, сумки тяжёлые, а внук на работе… Поможешь донести до дома на Абая, 3? Это наверху, у первой дороги.', ['Конечно, әже, давайте!', 'Извините, тороплюсь']);
        if (c === 0) {
          G.flag('grannyQuest', 'carrying');
          UI.toast('Отнеси сумки к дому на Абая, 3', 'quest');
          await say('granny', 'Рақмет, айналайын! Я пойду потихоньку, а ты беги вперёд, отдашь сумки внучке у подъезда.');
        }
      },
    },
    {
      id: 'dombra', tx: 40, ty: 54,
      visible: () => G.hour() >= 17 && G.hour() < 22 && s().weather.kind !== 'buran',
      talk: async () => {
        await say('dombra', 'Играю кюй «Адай» Курмангазы. Говорят, в нём слышен топот коней по степи.');
        const c = await ask('dombra', 'Нравится?', ['Послушать (+настроение)', `Оставить ${fmtMoney(200)}`, 'Пойти дальше']);
        if (c === 0 && G.once('dombra')) { G.add('mood', 8); G.advance(15); UI.toast('Музыка степи. Настроение +8', 'good'); }
        else if (c === 1 && G.pay(200)) { G.add('mood', 5); await say('dombra', 'Рақмет! Пусть дорога будет лёгкой — жолың болсын!'); }
      },
    },
  ];

  /* ---------- курьерская работа ---------- */

  const PICKUPS = ['shawarma', 'coffee', 'market', 'shop', 'mall', 'khan'];
  const DROPS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'university', 'office', 'hospital', 'station', 'gym', 'lang', 'realty'];
  const GOODS = { shawarma: 'шаурму', coffee: 'кофе и круассаны', market: 'пакет с базара', shop: 'продукты', mall: 'коробку из магазина', khan: 'покупки из Хан Шатыра' };

  function tilesBetween(a, b) {
    const A = World.byId[a], B = World.byId[b];
    return Math.abs(A.doorX - B.doorX) + Math.abs(A.doorY - B.doorY);
  }

  function newDelivery() {
    const from = pick(PICKUPS);
    let to = pick(DROPS);
    while (tilesBetween(from, to) < 18) to = pick(DROPS);
    const d = tilesBetween(from, to);
    return { stage: 'pickup', from, to, reward: Math.round((600 + d * 11) / 50) * 50, deadline: 0, late: false, id: randi(100, 999) };
  }

  async function deliveryAt(bid) {
    const st = s(), d = st.delivery;
    if (!d) return false;
    if (d.stage === 'pickup' && bid === d.from) {
      d.stage = 'drop';
      const dist = tilesBetween(d.from, d.to);
      d.deadline = G.now() + 25 + dist * 0.9;
      Sfx.play('success');
      UI.toast(`Заказ #${d.id} забран: ${GOODS[d.from]}. Доставь в «${World.byId[d.to].name}» до ${fmtClock(d.deadline % 1440)}`, 'quest');
      return true;
    }
    if (d.stage === 'drop' && bid === d.to) {
      let pay = d.reward;
      const left = d.deadline - G.now();
      let note = 'вовремя';
      if (left < 0) { pay = Math.round(pay * 0.6); note = 'с опозданием'; }
      else if (left > 25) { pay = Math.round(pay * 1.25); note = 'быстро, +чаевые'; }
      st.delivery = null;
      st.stats.deliveries++;
      st.daily.deliveries = (st.daily.deliveries || 0) + 1;
      G.earn(pay, `доставка ${note}`);
      G.add('mood', left < 0 ? -3 : 3);
      if (st.daily.deliveries === 5) { G.earn(2000, 'бонус «Курьер дня»'); }
      return true;
    }
    return false;
  }

  /* ---------- транспорт ---------- */

  async function busTravel(stop) {
    const opts = World.busStops.filter((b) => b.id !== stop.id);
    const items = opts.map((b) => ({ text: b.name, note: `${Math.round(10 + (Math.abs(b.tx - stop.tx) + Math.abs(b.ty - stop.ty)) * 0.35)} мин` }));
    items.push('Не ехать');
    const c = await ask(null, `Аялдама «${stop.name}». Проезд — ${fmtMoney(BUS_FARE)}. Куда едем?`, items);
    if (c >= opts.length) return;
    const to = opts[c];
    if (!G.pay(BUS_FARE)) return;
    const mins = Math.round(10 + (Math.abs(to.tx - stop.tx) + Math.abs(to.ty - stop.ty)) * 0.35);
    await UI.fade(`Автобус едет до «${to.name}»…`, async () => {
      G.advance(mins);
      Ents.placePlayer(to.tx, to.ty);
      Ents.player.dir = 0;
    });
  }

  function taxiQuote(b) {
    const p = Ents.player;
    const d = Math.abs(p.x / TILE - b.doorX) + Math.abs(p.y / TILE - b.doorY);
    return { cost: Math.round((700 + d * 18) / 50) * 50, mins: Math.round(6 + d * 0.3) };
  }

  async function taxi(b) {
    const q = taxiQuote(b);
    const c = await ask(null, `Такси до «${b.name}»: ${fmtMoney(q.cost)}, около ${q.mins} мин.`, ['Поехали', 'Отмена']);
    if (c !== 0) return false;
    if (!G.pay(q.cost)) return false;
    UI.closeAll();
    await UI.fade('Такси везёт тебя по городу…', async () => {
      G.advance(q.mins);
      Ents.placePlayer(b.doorX, b.doorY + 1);
      Ents.player.dir = 3;
    });
    return true;
  }

  /* ---------- звонки ---------- */

  const CONTACTS = [
    { id: 'mama', when: () => true },
    { id: 'dauren', when: () => true },
    { id: 'gulnar', when: () => s().met.gulnar },
    { id: 'aigerim', when: () => s().met.aigerimPhone },
  ];

  async function call(id) {
    const st = s();
    Sfx.play('ring');
    if (id === 'mama') {
      await say('mama', `Алло, балам! ${pick(['Как ты там, кушаешь нормально?', 'Тепло одеваешься? Там же ветер!', 'Папа передаёт привет. Говорит, гордится тобой.'])}`);
      const hint = Quests.mamaHint();
      if (hint) await say('mama', hint);
      if (G.once('call_mama')) { G.add('mood', 6); UI.toast(gx('Поговорил', 'Поговорила') + ' с мамой. Настроение +6', 'good'); }
      await say('mama', 'Ну всё, не трачу твои деньги. Сау бол, жаным!');
      return;
    }
    if (id === 'dauren') {
      if (G.once('call_dauren')) G.addRel('dauren', 2);
      await say('dauren', pick([
        'Алло! Я на заказе, на мосту пробка. Что хотел? А, просто так? Красава! Давай, на связи.',
        gx('Братишка', 'Сестрёнка') + ', если что — я вечером в шаурмичной. Подходи!',
        'Слышал прогноз? Обещают буран. Купи нормальный пуховик, не геройствуй.',
      ]));
      return;
    }
    if (id === 'gulnar') {
      const left = st.rent.due - st.day;
      await say('gulnar', left >= 0 ? `Алло, балам. Аренда — до конца дня ${st.rent.due}, это через ${left} дн. Не забудь!` : 'Балам, ты задерживаешь аренду! Приходи скорее.');
      return;
    }
    if (id === 'aigerim') {
      const h = G.hour();
      const opts = ['Просто поболтать'];
      if (st.rel.aigerim >= 50 && h >= 17 && h < 22) opts.push('Позвать гулять на набережную');
      opts.push('Пока!');
      const c = await ask('aigerim', 'Алло? О, привет! Что-то случилось?', opts);
      if (opts[c] === 'Просто поболтать') {
        if (G.once('call_aigerim')) G.addRel('aigerim', 3);
        await say('aigerim', pick(['Я тут рисую плакат с шаром EXPO. Он как планета, правда?', 'У нас сегодня было столько заказов — руки до сих пор пахнут кофе.', gx('Спасибо, что позвонил. Мне приятно.', 'Спасибо, что позвонила. Мне приятно.')]));
      } else if (opts[c].startsWith('Позвать')) {
        await say('aigerim', 'С удовольствием! Встретимся у Байтерека через полчаса?');
        await UI.fade('Вы гуляете по набережной Есиля. Огни, морозный воздух, долгий разговор…', async () => {
          G.advance(120, { walking: true });
          const b = World.byId.baiterek;
          Ents.placePlayer(b.doorX, b.doorY + 2);
        });
        G.add('mood', 25); G.addRel('aigerim', 8); st.stats.dates = (st.stats.dates || 0) + 1;
        await say('aigerim', st.stats.dates >= 3 ? 'Знаешь… мне кажется, ты — лучшее, что случилось со мной в этом городе.' : 'Было здорово. Давай повторим?');
      }
    }
  }

  /* ---------- работа ---------- */

  async function baristaShift() {
    const st = s();
    await say('aigerim', st.stats.baristaShifts ? 'Снова в строю! Заказы на экране, рецепты — на доске. Поехали!' : 'Смотри: на экране заказ, на доске — рецепт. Нажимай ингредиенты по порядку. Ошибёшься — начнёшь чашку заново. Удачи!');
    const r = await MG.barista(st.stats.baristaShifts);
    const pay = 3000 + r.served * 500 + r.tips;
    await UI.fade('Смена в «Дала Кофе»…', async () => { G.advance(240, { work: 2 }); });
    st.stats.baristaShifts++;
    G.earn(pay, `смена: ${r.served} заказов`);
    G.addXp('charm', 0.15 + r.served * 0.03);
    G.addRel('aigerim', r.served >= 5 ? 5 : 2);
    await say('aigerim', r.served >= 7 ? 'Ты прирождённый бариста! Клиенты в восторге.' : r.served >= 4 ? 'Хорошая смена! Спасибо за помощь.' : 'Ничего, первые смены у всех такие. Главное — не сжечь молоко!');
  }

  const OFFICE_PAY = [0, 12000, 18000, 26000];
  const OFFICE_TITLES = ['', 'Junior-разработчик', 'Middle-разработчик', 'Senior-разработчик'];
  const OFFICE_EVENTS = [
    {
      text: 'Пятница, 16:40. Прод упал. Все смотрят на тебя.',
      opts: [
        { t: 'Найти баг самому', need: 4, good: 'Опечатка в конфиге найдена за 15 минут. Команда аплодирует!', bad: 'Три часа поиска бага… и сломалось что-то ещё. Ой.' },
        { t: 'Позвать Армана и разобраться вместе', ok: 'Вдвоём нашли проблему быстро. Арман доволен, что ты не стал геройствовать.' },
        { t: 'Тихо уйти домой', badAlways: 'В понедельник тебя ждал неловкий разговор…' },
      ],
    },
    {
      text: 'Коллега Данияр просит помочь с задачей, а у тебя свой дедлайн.',
      opts: [
        { t: 'Помочь — команда важнее', ok: 'Данияр угостил тебя кофе и баурсаками. Дедлайн тоже удалось успеть, хоть и впритык.', energy: -8 },
        { t: 'Вежливо отказать и доделать своё', ok: 'Своя задача закрыта раньше срока. Данияр справился сам.' },
      ],
    },
    {
      text: 'Совещание на два часа. Спикер читает слайды вслух.',
      opts: [
        { t: 'Задать умный вопрос', need: 3, good: 'Вопрос попал в точку — тебя запомнило руководство.', bad: 'Вопрос оказался не к месту. Неловкая пауза…' },
        { t: 'Тихо кодить под столом', ok: 'Пока все обсуждали шрифты, два тикета уже закрыты.' },
      ],
    },
    {
      text: 'Заказчик просит «сделать красиво» за один день.',
      opts: [
        { t: 'Позвонить Айгерим за советом по дизайну', needRel: ['aigerim', 40], good: 'Айгерим подсказала палитру и шрифты. Заказчик в восторге!', bad: 'Айгерим не ответила — она на смене.' },
        { t: 'Сделать как получится', need: 3, good: 'Получилось вполне прилично!', bad: 'Заказчик назвал это «смело». Это не комплимент.' },
      ],
    },
    {
      text: 'Новый стажёр не может запустить проект. Вокруг паника.',
      opts: [
        { t: 'Показать, как всё настроить', need: 2, good: 'Стажёр смотрит на тебя как на героя. Обаяние растёт.', bad: 'Вы оба полчаса смотрели на ошибку. Потом помог Арман.' },
        { t: 'Скинуть ссылку на документацию', ok: 'Документация помогла. Почти.' },
      ],
    },
  ];

  async function officeShift() {
    const st = s();
    const ev = pick(OFFICE_EVENTS);
    const opts = ev.opts.map((o) => o.t);
    const c = await ask(null, ev.text, opts);
    const o = ev.opts[c];
    let good = false, msg = o.ok || '';
    if (o.need != null) { good = lvl('code') >= o.need || (lvl('code') >= o.need - 1 && chance(0.5)); msg = good ? o.good : o.bad; }
    else if (o.needRel) { good = st.rel[o.needRel[0]] >= o.needRel[1]; msg = good ? o.good : o.bad; }
    else if (o.badAlways) { good = false; msg = o.badAlways; }
    else good = chance(0.7);
    await say(null, msg);
    await UI.fade('Рабочий день в Steppe Digital…', async () => { G.advance(8 * 60, { work: 1.5 }); });
    if (o.energy) G.add('energy', o.energy);
    st.stats.officeShifts++;
    if (good) st.stats.goodShifts++;
    const pay = OFFICE_PAY[st.job.level] + (good ? 2000 : 0);
    G.earn(pay, good ? 'зарплата + премия' : 'зарплата');
    G.addXp('code', good ? 0.3 : 0.18);
    G.add('mood', good ? 6 : -4);
    // повышение
    const need = st.job.level === 1 ? 5 : 12;
    const codeNeed = st.job.level === 1 ? 4 : 6;
    if (st.job.level < 3 && st.stats.goodShifts >= need && lvl('code') >= codeNeed) {
      st.job.level++;
      Sfx.play('success');
      await say('arman', `${P()}, зайди на минутку. Мы посмотрели на твою работу… Поздравляю, теперь ты ${OFFICE_TITLES[st.job.level]}! Зарплата — ${fmtMoney(OFFICE_PAY[st.job.level])} за смену.`);
      G.add('mood', 20);
    } else if (st.job.level < 3 && st.stats.goodShifts >= need) {
      UI.toast(`Для повышения нужен навык «Код» ${codeNeed}`, 'info');
    }
  }

  async function interview() {
    const st = s();
    if (!G.wearsFormal()) {
      await say(null, 'Девушка на ресепшене улыбается: «На собеседование у нас дресс-код — костюм». Ирония: Арман сидит в худи. Но HR непреклонен.');
      return;
    }
    await say('arman', `Привет, ${P()}! Садись. Я Арман, тимлид. Не волнуйся, это просто разговор.`);
    let score = 0;
    const q1 = await ask('arman', 'Начнём с простого. Что такое переменная?', ['Именованное место для хранения данных', 'Ошибка в программе', 'Тип монитора']);
    if (q1 === 0) { score++; await say('arman', 'Верно.'); } else await say('arman', 'Хм… не совсем.');
    const q2 = await ask('arman', 'Пользователи жалуются, что приложение тормозит. Твои действия?', ['Сначала измерю, где именно тормозит', 'Перепишу всё с нуля', 'Скажу, что у них плохой интернет']);
    if (q2 === 0) { score++; await say('arman', 'Правильный подход — сначала данные, потом выводы.'); } else await say('arman', 'Хм. Рискованно.');
    const kaz = lvl('kaz') >= 2;
    const q3 = await ask('arman', 'Қазақша сөйлейсіз бе? Вы говорите по-казахски?', kaz ? ['Иә, аздап сөйлеймін! Да, немного говорю!', 'Нет, к сожалению'] : ['Э-э… простите, не понял', 'Нет, к сожалению']);
    if (kaz && q3 === 0) { score++; await say('arman', 'Керемет! Отлично! У нас половина клиентов — госсектор, это очень пригодится.'); }
    else await say('arman', 'Ничего, это можно подтянуть.');
    if (lvl('code') >= 3 && score >= 2) {
      await say('arman', `Ну что ж… Мне нравится, как ты думаешь. Добро пожаловать в Steppe Digital! Смены по будням, приходи к 9–11 утра. Зарплата джуна — ${fmtMoney(OFFICE_PAY[1])} за смену.`);
      st.job.hired = true; st.job.level = 1; st.met.arman = true;
      G.addRel('arman', 10); G.add('mood', 25);
      Sfx.play('success');
    } else {
      await say('arman', lvl('code') < 3 ? 'Честно — пока не хватает опыта в программировании. Подтяни код и приходи снова, я буду рад.' : 'Пока не убедил. Подготовься и приходи в другой день!');
    }
    G.advance(60);
  }

  /* ---------- той ---------- */

  async function toyInvite() {
    const st = s();
    let d = st.day + 2;
    while (weekday(d) !== 6) d++;
    st.flags.toyDay = d;
    Sfx.play('ring');
    await say('dauren', `Алло, ${P()}! Сидишь? Сядь. Я ЖЕНЮСЬ! На Мадине!`);
    await say('dauren', `Той — в «Алтын Сарае» на правом берегу, у набережной. ${dayDate(d).getDate()} ${MONTHS[dayDate(d).getMonth()]}, в ${WEEKDAYS_FULL[weekday(d)]}, с шести до одиннадцати вечера.`);
    await say('dauren', 'Ты обязан прийти! И оденься нормально — костюм, чапан или что-то красивое. Не в спортивках, умоляю. Мама Мадины строгая.');
  }

  async function wedding() {
    const st = s();
    if (!G.wearsFormal()) {
      await say(null, 'На входе тётя в бархатном платье оглядывает тебя с головы до ног: «Балам, на той — в спортивках?!». Надо переодеться во что-то нарядное.');
      return;
    }
    await say('dauren', `${P()}! ${gx('Пришёл', 'Пришла')}! Мадина, знакомься — это ${gx('мой лучший друг', 'моя лучшая подруга')}!`);
    const g = await ask('madina', 'Сәлеметсіз бе! Рада познакомиться. Даурен столько про тебя рассказывал!', lvl('kaz') >= 1 ? ['Құттықтаймын! Поздравляю вас!', 'Поздравляю! Ты очень красивая невеста'] : ['Поздравляю! Ты очень красивая невеста', 'Привет!']);
    if (g === 0 && lvl('kaz') >= 1) { await say('madina', 'Ой, қазақша! Рақмет! Даурен, а твой друг молодец.'); st.flags.toyScore = 1; }
    else st.flags.toyScore = 0;
    // конверт
    const envs = [5000, 10000, 20000, 50000].filter((v) => v <= st.money);
    const eopts = envs.map((v) => `Положить в конверт ${fmtMoney(v)}`);
    eopts.push(envs.length ? 'Без конверта' : 'Денег на конверт нет…');
    const e = await ask(null, 'У входа стоит красивый сундук для конвертов. По традиции гости дарят деньги молодым.', eopts);
    if (e < envs.length) {
      st.money -= envs[e];
      st.flags.toyScore += envs[e] >= 20000 ? 2 : envs[e] >= 10000 ? 1 : 0;
      UI.toast(`Подарок молодым: ${fmtMoney(envs[e])}`, 'info');
    }
    await say(null, 'Зал сияет золотом. На столах — бешбармак, казы, баурсаки, шелпек и горы сладостей. Играет живая музыка.');
    G.add('food', 100);
    await say('tamada', 'Дорогие гости! А теперь слово — лучшему другу жениха! Просим, просим!');
    const t = await ask(null, 'Все смотрят на тебя. Что скажешь?', [
      lvl('kaz') >= 3 ? 'Бақытты болыңдар! Шаңырақтарың биік болсын! (по-казахски)' : { text: 'Тост по-казахски', disabled: true, note: 'нужен казахский 3' },
      'Даурен, ты всегда был рядом, когда мне было трудно. Будьте счастливы!',
      'Желаю, чтобы ваша любовь была крепче, чем мороз в Астане!',
      'Э-э… ну… горько?',
    ]);
    if (t === 0) { st.flags.toyScore += 3; await say('tamada', 'Ой, керемет! Пусть ваш шаңырақ будет высоким — лучше пожелания нет! Аплодисменты!'); }
    else if (t === 1) { st.flags.toyScore += 2; await say(null, 'Даурен прячет слёзы. Мадина обнимает его. Зал аплодирует.'); }
    else if (t === 2) { st.flags.toyScore += 2; await say(null, 'Зал смеётся и хлопает. Тамада: «Вот это тост! Крепче мороза!»'); }
    else { await say(null, `Тамада спасает ситуацию шуткой. Ну… ты хотя бы ${gx('попытался', 'попыталась')}.`); }
    await say('tamada', 'А теперь — танцы! Все в круг! Играет «Қара жорға»!');
    const acc = await MG.rhythm({ title: 'Қара жорға', bpm: 112, beats: 44 });
    if (acc >= 0.7) { st.flags.toyScore += 2; await say(null, `${gx('Ты отжёг', 'Ты отожгла')}! Даже бабушки одобрительно кивают.`); }
    else if (acc >= 0.4) { st.flags.toyScore += 1; await say(null, `Неплохо ${gx('станцевал', 'станцевала')}! Главное — от души.`); }
    else await say(null, `${gx('Танцевал', 'Танцевала')} ты… своеобразно. Но весело!`);
    await UI.fade('Той продолжается до поздней ночи…', async () => {
      const h = G.hour();
      G.advance(Math.max(30, Math.round((23.5 - h) * 60)));
    });
    st.flags.toyDone = true;
    st.stats.toys++;
    const sc = st.flags.toyScore;
    G.add('mood', 30 + sc * 3); G.addRel('dauren', 15 + sc * 2); G.addXp('charm', 0.5 + sc * 0.1);
    await say('dauren', sc >= 6 ? `${gx('Братан', 'Сестрёнка')}… это был лучший той в истории Астаны. Спасибо тебе!` : `Спасибо, что ${gx('пришёл', 'пришла')}. Для меня это очень важно.`);
  }

  /* ---------- финал ---------- */

  async function buyFlat() {
    const st = s();
    const price = FLAT_PRICE;
    await say(null, `Менеджер показывает варианты: однушка в ЖК «Жаңа Үй» на левом берегу, с видом на Байтерек. Первый взнос и договор — ${fmtMoney(price)}.`);
    const c = await ask(null, 'Оформляем?', [st.money >= price ? 'Подписать договор' : { text: 'Подписать договор', disabled: true, note: `нужно ${fmtMoney(price)}` }, 'Позже']);
    if (c !== 0) return;
    st.money -= price;
    st.flags.ownFlat = true;
    st.homeId = 'realty';
    st.rent.locked = false;
    Sfx.play('success');
    await say(null, 'Ключи от собственной квартиры — у тебя в руках. Из окна видно, как золотой шар Байтерека ловит закат.');
    await ending();
  }

  async function ending() {
    const st = s();
    st.ended = true;
    await say('mama', `Балам… Я горжусь тобой. Ты ${gx('приехал', 'приехала')} с одной сумкой, а теперь у тебя свой дом в столице.`);
    const friends = Object.entries(st.rel).filter(([k, v]) => k !== 'mama' && v >= 50).map(([k]) => NPCS[k].name);
    await UI.ending({
      days: st.day, money: st.money, deliveries: st.stats.deliveries, shifts: st.stats.officeShifts + st.stats.baristaShifts,
      friends, title: OFFICE_TITLES[st.job.level] || 'Курьер', kaz: lvl('kaz'),
    });
  }

  const FLAT_PRICE = 150000;

  /* ---------- локации ---------- */

  const open = (h0, h1) => () => { const h = G.hour(); return h0 < h1 ? h >= h0 && h < h1 : h >= h0 || h < h1; };

  const LOCS = {
    home: {
      name: 'Комната у Гульнар-апай', kz: 'Үй', hours: [0, 24], tone: 'home',
      desc: () => s().rent.locked ? 'Дверь закрыта. Гульнар-апай ждёт оплату долга.' : 'Скромная комната на третьем этаже панельки. Пахнет баурсаками с первого этажа.',
      npcs: () => ['gulnar'],
      actions: () => homeActions(s().rent.locked),
    },
    realty: {
      name: () => s().flags.ownFlat ? 'Моя квартира' : 'Агентство «Жаңа Үй»', kz: 'Жаңа Үй', hours: () => s().flags.ownFlat ? [0, 24] : [9, 19], tone: 'office',
      desc: () => s().flags.ownFlat ? 'Своя квартира на левом берегу. Вид на Байтерек и бульвар.' : 'Агентство недвижимости. На стенах — фото новых ЖК с панорамными окнами.',
      actions: () => s().flags.ownFlat ? homeActions(false) : [
        { label: 'Посмотреть квартиры', sub: `первый взнос ${fmtMoney(FLAT_PRICE)}`, run: buyFlat },
      ],
    },
    shop: {
      name: 'Продукты 24/7', kz: 'Азық-түлік', hours: [0, 24], tone: 'shop',
      desc: () => 'Маленький магазин у дома. Продавщица смотрит сериал на телефоне.',
      actions: () => [
        buyItem('groceries', 2500),
        buyFood('Самса', 500, 22, 2, 0, 10),
        buyFood('Кофе 3-в-1', 300, 0, 1, 8, 5),
        buyItem('chocolate', 450),
        buyItem('baursak', 1200),
      ],
    },
    market: {
      name: 'Центральный базар', kz: 'Орталық базар', hours: [8, 19], tone: 'market',
      desc: () => 'Ряды с одеждой, специями, сухофруктами и казы. Шумно, тепло, все торгуются.',
      npcs: () => ['erzhan'],
      actions: () => [
        buyCloth('puffer', 28000), buyCloth('ushanka', 6000), buyCloth('chapan', 35000), buyCloth('kalpak', 9000), buyCloth('hoodie', 12000),
        buyItem('kazy', 4000), buyItem('kurt', 800), buyItem('kumys', 1200),
      ],
    },
    shawarma: {
      name: 'Шаурма №1', kz: 'Шаурма', hours: [10, 24], tone: 'food',
      desc: () => 'Тесная забегаловка с лучшей шаурмой на правом берегу. По вечерам здесь Даурен.',
      npcs: () => (G.hour() >= 18 ? ['dauren'] : []),
      actions: () => [buyFood('Шаурма', 1600, 45, 3), buyFood('Лагман', 2200, 55, 5, 0, 30), buyFood('Шай с баурсаками', 900, 18, 6, 4, 20)],
    },
    lang: {
      name: 'Тілдер орталығы', kz: 'Языковой центр', hours: [9, 20], tone: 'study',
      desc: () => 'Языковой центр. На доске: «Бүгін — сегодня. Ертең — завтра. Кеше — вчера».',
      npcs: () => ['saule'],
      actions: () => [{
        label: 'Урок казахского', price: 3000, time: 90, sub: `уровень ${lvl('kaz')} · тест после урока`,
        disabled: lvl('kaz') >= 10 ? 'максимальный уровень' : null,
        run: async () => {
          if (!G.pay(3000)) return;
          const n = await MG.quiz(lvl('kaz'));
          G.advance(90);
          s().stats.lessons++;
          G.addXp('kaz', 0.12 + n * 0.18);
          G.add('mood', n >= 4 ? 5 : 0);
          await say('saule', n === 5 ? 'Өте жақсы! Отлично! Ни одной ошибки.' : n >= 3 ? 'Жақсы! Хорошо, продолжайте.' : 'Ештеңе етпейді — ничего страшного. Повторим в следующий раз.');
        },
      }],
    },
    coffee: {
      name: 'Дала Кофе', kz: 'Dala Coffee', hours: [8, 21], tone: 'cafe',
      desc: () => 'Уютная кофейня с войлочными панно на стенах и запахом свежей обжарки.',
      npcs: () => ['aigerim'],
      actions: () => [
        buyFood('Капучино', 1400, 0, 4, 22, 15),
        buyFood('Шай с молоком по-казахски', 800, 10, 6, 10, 15),
        {
          label: 'Смена бариста', sub: '4 часа · 3 000 ₸ + бонусы', time: 240,
          disabled: !s().flags.metAigerim ? 'сначала поговори с Айгерим' : !open(8, 17)() ? 'смены начинаются с 8:00 до 17:00' : s().energy < 25 ? TIRED() : null,
          run: baristaShift,
        },
      ],
    },
    courier: {
      name: 'Курьерская служба «Жылдам»', kz: 'Жылдам', hours: [8, 22], tone: 'work',
      desc: () => 'Склад с жёлтыми термосумками. На стене — карта города, утыканная флажками.',
      npcs: () => (G.hour() < 18 ? ['dauren'] : []),
      actions: () => {
        const d = s().delivery;
        if (d) return [{ label: 'Отменить текущий заказ', sub: 'без оплаты', run: async () => { s().delivery = null; UI.toast('Заказ отменён', 'info'); } }];
        return [{
          label: 'Взять заказ', sub: 'забери в заведении и отвези клиенту',
          disabled: !s().flags.joinedCourier ? 'сначала поговори с Дауреном' : G.hour() >= 21 ? 'заказы до 21:00' : s().energy < 15 ? TIRED() : null,
          run: async () => {
            const nd = newDelivery();
            s().delivery = nd;
            Sfx.play('success');
            UI.toast(`Заказ #${nd.id}: забери ${GOODS[nd.from]} в «${World.byId[nd.from].name}» → «${World.byId[nd.to].name}». Оплата ~${fmtMoney(nd.reward)}`, 'quest');
            UI.closeAll();
          },
        }];
      },
    },
    gym: {
      name: 'Спортзал «Батыр»', kz: 'Батыр', hours: [7, 23], tone: 'work',
      desc: () => 'Железо, зеркала и тренер, который зимой ходит в шортах.',
      actions: () => [
        {
          label: 'Тренировка', price: 1500, time: 90, sub: 'выносливость +, макс. энергия растёт',
          disabled: s().energy < 20 ? TIRED() : null,
          run: async () => {
            if (!G.pay(1500)) return;
            await UI.fade('Тренировка…', async () => G.advance(90, { work: 6 }));
            G.addXp('fit', 0.35); G.add('mood', 8);
            s().maxEnergy = 100 + lvl('fit') * 4;
          },
        },
        {
          label: 'Сауна', price: 2000, time: 60, sub: 'настроение +15 · энергия +10',
          run: async () => { if (!G.pay(2000)) return; await UI.fade('Сауна…', async () => G.advance(60)); G.add('mood', 15); G.add('energy', 10); },
        },
      ],
    },
    mosque: {
      name: 'Мечеть Хазрет Султан', kz: 'Әзірет Сұлтан', hours: [6, 22], tone: 'calm',
      desc: () => 'Одна из крупнейших мечетей Центральной Азии. Белый мрамор, бирюзовые купола и тишина, в которой слышно собственное дыхание.',
      actions: () => [
        {
          label: 'Посидеть в тишине', time: 30, sub: 'настроение +12 · раз в день',
          disabled: s().daily.mosque ? gx('сегодня уже был', 'сегодня уже была') : null,
          run: async () => { s().daily.mosque = true; await UI.fade('Тишина…', async () => G.advance(30)); G.add('mood', 12); },
        },
        { label: 'Рассмотреть орнаменты', time: 20, sub: 'узоры в казахском стиле', run: async () => { G.advance(20); await say(null, 'В узорах на стенах узнаются традиционные казахские орнаменты — те же завитки «қошқар мүйіз», бараньи рога, что и на коврах в доме у бабушки.'); } },
      ],
    },
    hospital: {
      name: 'Городская больница', kz: 'Емхана', hours: [0, 24], tone: 'calm',
      desc: () => 'Очередь, бахилы, автомат с кофе. Медсестра выглядит уставшей, но улыбается.',
      actions: () => [
        {
          label: 'Капельница с витаминами', price: 6000, time: 60, sub: 'энергия +45',
          run: async () => { if (!G.pay(6000)) return; await UI.fade('Капельница…', async () => G.advance(60)); G.add('energy', 45); },
        },
      ],
    },
    karaoke: {
      name: 'Караоке «Әнші»', kz: 'Әнші', hours: [16, 3], tone: 'night',
      desc: () => 'Неон, диваны и микрофон, который видел всё. В меню — хиты от Димаша до Батырхана Шукенова.',
      actions: () => [{
        label: 'Спеть песню', price: 2500, time: 60, sub: 'ритм-игра · обаяние и настроение',
        run: async () => {
          if (!G.pay(2500)) return;
          const song = pick(['Менің Қазақстаным', 'Ақ Орда', 'Атыраудың ақ шағаласы', 'Звёздное небо']);
          const acc = await MG.rhythm({ title: song, bpm: 100, beats: 36 });
          G.advance(60);
          G.addXp('charm', 0.15 + acc * 0.35);
          G.add('mood', Math.round(8 + acc * 18));
          await say(null, acc > 0.7 ? 'Зал аплодирует стоя! Кто-то снимает тебя на телефон.' : acc > 0.4 ? 'Неплохо! Друзья за соседним столиком подпевали.' : `Ну… ты хотя бы не ${gx('держал', 'держала')} микрофон вверх ногами.`);
        },
      }],
    },
    toyhana: {
      name: 'Той-хана «Алтын Сарай»', kz: 'Алтын Сарай', hours: [10, 24], tone: 'gold',
      desc: () => 'Банкетный зал с золотыми колоннами и хрустальными люстрами. Здесь каждые выходные — той.',
      actions: () => {
        const st = s();
        const today = Quests.status('toy') === 'active' && st.day === st.flags.toyDay && G.hour() >= 17.5;
        if (today && !st.flags.toyDone) return [{ label: 'Войти на той Даурена и Мадины', sub: 'нужна нарядная одежда', run: wedding }];
        return [{ label: 'Заглянуть в зал', time: 10, sub: 'сегодня закрытое мероприятие', run: async () => { G.advance(10); await say(null, 'Официант вежливо улыбается: «Сегодня у нас закрытый той. Кто-то из Шымкента женится — гостей восемьсот человек!»'); } }];
      },
    },
    pyramid: {
      name: 'Дворец мира и согласия', kz: 'Бейбітшілік және келісім сарайы', hours: [10, 18], tone: 'calm',
      desc: () => 'Стеклянная вершина пирамиды светится, как фонарь. Внутри — оперный зал и зимний сад.',
      actions: () => [{
        label: 'Экскурсия', price: 1500, time: 60, sub: 'настроение +12',
        run: async () => {
          if (!G.pay(1500)) return;
          G.advance(60); G.add('mood', 12);
          await say(null, 'Гид рассказывает: пирамида — символ согласия разных народов и религий, которые живут в Казахстане. Под самой вершиной — витражи с голубями.');
        },
      }],
    },
    khan: {
      name: 'Хан Шатыр', kz: 'Хан Шатыр', hours: [10, 22], tone: 'gold',
      desc: () => 'Гигантский шатёр из прозрачной плёнки. Внутри — магазины, кино и тропический пляж посреди степной зимы.',
      actions: () => [
        {
          label: 'Пляж на верхнем этаже', price: 6000, time: 120, sub: 'настроение +30 · энергия +8',
          run: async () => { if (!G.pay(6000)) return; await UI.fade('Песок, пальмы и +30 под куполом…', async () => G.advance(120)); G.add('mood', 30); G.add('energy', 8); },
        },
        { label: 'Кино', price: 2500, time: 120, sub: 'настроение +18', run: async () => { if (!G.pay(2500)) return; await UI.fade('Попкорн и новый фильм…', async () => G.advance(120)); G.add('mood', 18); } },
        buyFood('Фудкорт', 2600, 50, 4, 0, 30),
        buyCloth('suit', 45000), buyCloth('gala', 38000), buyCloth('hoodie', 15000), buyCloth('pufferN', 52000), buyCloth('beanie', 3500),
        buyItem('flowers', 3000),
      ],
    },
    baiterek: {
      name: 'Байтерек', kz: 'Бәйтерек', hours: [10, 22], tone: 'gold',
      desc: () => '97 метров над бульваром. Наверху, в золотом шаре, — отпечаток ладони и вид на весь город.',
      actions: () => [{
        label: 'Подняться в золотой шар', price: 1000, time: 60, sub: s().flags.wishMade ? 'настроение +10 · раз в день' : 'загадай желание',
        run: async () => {
          if (!G.pay(1000)) return;
          G.advance(60);
          if (!s().flags.wishMade) {
            await say(null, 'Лифт поднимает тебя в золотую сферу. Внизу — весь город: бульвар, Хан Шатыр, синий шар EXPO, белая Акорда.');
            await say(null, 'В центре — золотой отпечаток ладони. Говорят, если приложить руку и загадать желание, оно сбудется.');
            const w = await ask(null, 'Ты прикладываешь ладонь. О чём ты мечтаешь?', ['Хорошая работа и карьера', 'Свой дом в этом городе', 'Встретить своих людей — друзей, любовь', 'Чтобы мама мной гордилась']);
            s().flags.wishMade = true; s().flags.wish = w;
            await say(null, 'Ладонь будто теплеет. Может, показалось. А может — нет.');
            G.add('mood', 20);
          } else if (G.once('baiterek')) {
            G.add('mood', 10);
            await say(null, pick(['Закат окрашивает город в золото.', 'Снизу Акорда кажется игрушечной.', 'Ты находишь взглядом свой дом на правом берегу.']));
          } else await say(null, 'Вид всё такой же прекрасный.');
        },
      }],
    },
    akorda: {
      name: 'Акорда', kz: 'Ақорда', hours: [0, 24], tone: 'calm',
      desc: () => 'Резиденция президента. Внутрь не пускают, но голубой купол со шпилем отлично смотрится на фото.',
      actions: () => [{ label: 'Сделать фото', time: 10, sub: 'настроение +3 · раз в день', disabled: s().daily.akorda ? gx('уже сфоткал сегодня', 'уже сфоткала сегодня') : null, run: async () => { s().daily.akorda = true; G.advance(10); G.add('mood', 3); UI.toast('Фото на фоне Акорды отправлено маме', 'good'); } }],
    },
    arena: {
      name: 'Астана Арена', kz: 'Астана Арена', hours: [10, 22], tone: 'work',
      desc: () => 'Стадион с раздвижной крышей. По выходным в 18:00 — матчи «Астаны».',
      actions: () => [
        {
          label: 'Футбольный матч', price: 3000, time: 120, sub: 'выходные, 17:30–19:00 · настроение +25',
          disabled: !G.isWeekend() ? 'матчи по выходным' : !(G.hour() >= 17.5 && G.hour() < 19) ? 'начало в 18:00' : null,
          run: async () => { if (!G.pay(3000)) return; await UI.fade('«А-ста-на! А-ста-на!»', async () => G.advance(120)); G.add('mood', 25); G.addXp('charm', 0.1); await say(null, pick(['«Астана» победила 2:1! Гол на последней минуте!', 'Ничья 0:0, но атмосфера была огонь.', 'Проиграли 1:2, но фанаты пели до конца.'])); },
        },
        { label: 'Пробежка вокруг стадиона', time: 45, sub: 'выносливость + · бесплатно', disabled: s().energy < 25 ? TIRED() : null, run: async () => { await UI.fade('Пробежка…', async () => G.advance(45, { work: 6, outdoor: true })); G.addXp('fit', 0.15); G.add('mood', 5); s().maxEnergy = 100 + lvl('fit') * 4; } },
      ],
    },
    university: {
      name: 'Университет', kz: 'Университет', hours: [8, 21], tone: 'study',
      desc: () => 'Огромный атриум, студенты с ноутбуками и запах кофе из автомата.',
      actions: () => [
        {
          label: 'Библиотека: учить программирование', time: 120, sub: 'код + · бесплатно',
          disabled: s().energy < 15 ? TIRED() : null,
          run: async () => { await UI.fade('Учёба в библиотеке…', async () => G.advance(120, { work: 1 })); G.addXp('code', s().energy > 40 ? 0.4 : 0.25); },
        },
        {
          label: 'Интенсив «Python за выходные»', price: 20000, time: 360, sub: 'код +1.2 · один раз',
          disabled: s().flags.pyCourse ? 'уже пройден' : null,
          run: async () => { if (!G.pay(20000)) return; s().flags.pyCourse = true; await UI.fade('Шесть часов кода и пиццы…', async () => G.advance(360, { work: 2 })); G.addXp('code', 1.2); },
        },
        { label: 'Поболтать со студентами', time: 30, sub: 'обаяние +', run: async () => { G.advance(30); G.addXp('charm', 0.12); await say(null, pick(['Студенты спорят, где лучше бешбармак — у них в Таразе или в Павлодаре.', 'Тебя позвали на хакатон в EXPO. Звучит интересно!', 'Первокурсник спрашивает, где тут столовая. Ты, оказывается, уже знаешь.'])); } },
      ],
    },
    office: {
      name: 'Steppe Digital', kz: 'БЦ на левом берегу', hours: [8, 19], tone: 'office',
      desc: () => 'Опенспейс на 14-м этаже. Вид на шар EXPO, пуфики и вечный запах кофе.',
      npcs: () => ['arman'],
      actions: () => {
        const st = s(), out = [];
        const wd = !G.isWeekend();
        if (Quests.isStep('career', 2)) out.push({ label: 'Пройти собеседование', sub: 'будни 9:00–17:00 · дресс-код', disabled: !wd ? 'по выходным не работаем' : !open(9, 17)() ? 'собеседования с 9 до 17' : null, run: interview });
        if (st.job.hired) out.push({
          label: `Рабочая смена · ${OFFICE_TITLES[st.job.level]}`, sub: `8 часов · ${fmtMoney(OFFICE_PAY[st.job.level])}`, time: 480,
          disabled: !wd ? 'выходной' : !open(8.5, 11)() ? 'смена начинается с 8:30 до 11:00' : st.daily.office ? gx('сегодня уже отработал', 'сегодня уже отработала') : st.energy < 25 ? TIRED() : null,
          run: async () => { st.daily.office = true; await officeShift(); },
        });
        out.push({ label: 'Кофе-брейк на кухне', time: 15, sub: 'энергия +6', disabled: !st.job.hired ? 'только для сотрудников' : null, run: async () => { G.advance(15); G.add('energy', 6); } });
        return out;
      },
    },
    expo: {
      name: 'EXPO «Нұр Әлем»', kz: 'Нұр Әлем', hours: [10, 20], tone: 'study',
      desc: () => 'Стеклянный шар высотой с 25-этажный дом. Внутри — музей энергии будущего.',
      actions: () => [{
        label: 'Музей энергии будущего', price: 2000, time: 90, sub: 'настроение +12 · код +',
        run: async () => {
          if (!G.pay(2000)) return;
          await UI.fade('Ветряки, солнечные панели и смотровая под куполом…', async () => G.advance(90));
          G.add('mood', 12); G.addXp('code', 0.1);
        },
      }],
    },
    mall: {
      name: 'ТРЦ «Самал Плаза»', kz: 'Самал Плаза', hours: [10, 22], tone: 'shop',
      desc: () => 'Большой торговый центр: электроника, фудкорт, цветы и самокаты.',
      actions: () => [
        buyItem('scooter', 65000), buyItem('laptop', 140000), buyItem('flowers', 3000),
        buyFood('Фудкорт', 2400, 50, 3, 0, 30), buyCloth('beanie', 3500),
      ],
    },
    station: {
      name: 'Вокзал «Нұрлы Жол»', kz: 'Нұрлы Жол', hours: [0, 24], tone: 'calm',
      desc: () => 'Огромный стеклянный вокзал. Табло: «Алматы, Шымкент, Караганда, Павлодар…»',
      actions: () => [
        buyFood('Беляш', 400, 15, 1, 0, 10),
        {
          label: 'Поспать на скамейке', time: 0, sub: 'если некуда идти · энергия до 60', disabled: G.hour() < 21 && G.hour() >= 6 ? 'только ночью' : null,
          run: async () => { await sleepUntilMorning(0.6); G.add('mood', -15); },
        },
        { label: 'Посмотреть на табло', time: 5, sub: 'просто вспомнить, откуда ' + gx('приехал', 'приехала'), run: async () => { G.advance(5); await say(null, `Поезд в ${s().base.from === 'аул под Туркестаном' ? 'Туркестан' : s().base.from} уходит каждый вечер. Где-то там мама сейчас пьёт чай и смотрит новости про погоду в Астане.`); } },
      ],
    },
  };

  function homeActions(locked) {
    if (locked) return [];
    const st = s();
    const out = [];
    const h = G.hour();
    out.push({
      label: 'Спать до утра', sub: 'до 7:00 · сохранение', disabled: h >= 7 && h < 19 && st.energy > 35 ? 'ещё рано (можно после 19:00)' : null,
      run: async () => { UI.closeAll(); await sleepUntilMorning(1); },
    });
    out.push({ label: 'Вздремнуть 2 часа', time: 120, sub: 'энергия +', run: async () => { await UI.fade('Короткий сон…', async () => G.advance(120, { asleep: true })); } });
    out.push({
      label: 'Приготовить ужин', time: 40, sub: 'нужен набор продуктов · сытость +50', disabled: !G.has('groceries') ? 'нет продуктов' : null,
      run: async () => { G.take('groceries'); G.advance(40); G.add('food', 50); G.add('mood', 6); UI.toast('Домашний ужин — сытость +50', 'good'); },
    });
    out.push({
      label: 'Учить код на ноутбуке', time: 120, sub: 'код +', disabled: !G.has('laptop') ? 'нужен ноутбук' : st.energy < 15 ? TIRED() : null,
      run: async () => { await UI.fade('Туториалы и пет-проект…', async () => G.advance(120, { work: 1 })); G.addXp('code', 0.35); },
    });
    out.push({ label: 'Смотреть сериал', time: 90, sub: 'настроение +12', run: async () => { await UI.fade('Ещё одна серия…', async () => G.advance(90)); G.add('mood', 12); } });
    out.push({ label: 'Гардероб', sub: 'переодеться', run: async () => UI.wardrobe() });
    return out;
  }

  function locName(id) { const L = LOCS[id]; return typeof L.name === 'function' ? L.name() : L.name; }
  function locHours(id) { const L = LOCS[id]; return typeof L.hours === 'function' ? L.hours() : L.hours; }
  function isOpen(id) {
    const [a, b] = locHours(id);
    if (a === 0 && b === 24) return true;
    return open(a, b)();
  }

  /* ---------- вход в здание ---------- */

  async function enter(b) {
    const st = s();
    if (st.delivery && await deliveryAt(b.id)) {
      if (b.res || !LOCS[b.id]) return;
    }
    if (b.id === 'r1' && G.flag('grannyQuest') === 'carrying') {
      await say(null, 'У подъезда тебя встречает внучка бабушки Бибігүл и забирает сумки.');
      await say('granny', `Ой, айналайын, уже ${gx('донёс', 'донесла')}! Вот, держи баурсаки, сама пекла. Бақытты бол!`);
      G.flag('grannyQuest', 'done'); G.give('baursak', 2); G.add('mood', 15); G.addXp('charm', 0.25);
      return;
    }
    if (b.res) {
      await say(null, pick(['Домофон молчит.', 'Из домофона: «Кто там?.. А, не ко мне». Гудки.', 'Подъезд закрыт. На двери объявление: «Отключение горячей воды с 10:00 до 18:00».', 'Сосед с собакой выходит и придерживает дверь. Но тебе сюда не нужно.']));
      return;
    }
    const L = LOCS[b.id];
    if (!L) return;
    if (!isOpen(b.id)) {
      const [a, c] = locHours(b.id);
      await say(null, `«${locName(b.id)}» сейчас закрыт. Часы работы: ${fmtClock(a * 60)}–${fmtClock((c % 24) * 60)}.`);
      return;
    }
    if (b.id === 'home' && !st.flags.metGulnar) {
      await UI.openLocation('home');
      await Talk.gulnar();
      UI.refreshLocation();
      return;
    }
    Sfx.play('door');
    await UI.openLocation(b.id);
    if (b.id === 'courier' && !st.flags.joinedCourier) { await Talk.dauren(); UI.refreshLocation(); }
    if (b.id === 'coffee' && !st.flags.metAigerim) { await Talk.aigerim(); UI.refreshLocation(); }
    if (b.id === 'lang' && !st.met.saule) { await Talk.saule(); UI.refreshLocation(); }
  }

  const WEATHER_NAMES = { clear: 'ясно', cloudy: 'облачно', rain: 'дождь', snow: 'снег', buran: 'буран' };

  return {
    LOCS, Talk, worldNpcs, CONTACTS, WEATHER_NAMES, FLAT_PRICE, OFFICE_TITLES,
    faint, sleepUntilMorning, eat, enter, busTravel, taxi, taxiQuote, call, toyInvite, locName, locHours, isOpen, deliveryAt, ending,
  };
})();
