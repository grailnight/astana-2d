'use strict';
// Сюжетные задания и подсказки.

const Quests = (() => {
  const s = () => G.s;
  const lv = (k) => G.lv(k);
  const done = (id) => s().quests[id] && s().quests[id].status === 'done';

  const LIST = [
    {
      id: 'arrival', title: 'Добро пожаловать в Астану', main: true,
      unlock: () => true,
      steps: [
        { text: 'Найди дом Гульнар-апай на правом берегу — через мост на север', target: 'home', done: () => s().flags.metGulnar },
      ],
      reward: () => { G.add('mood', 10); },
      hint: 'Балам, Гульнар-апай живёт на правом берегу, в доме 12 на Сарыарке. Это за рекой, на севере. Иди через мост или сядь на автобус у вокзала.',
    },
    {
      id: 'firstjob', title: 'Первые деньги', main: true,
      unlock: () => done('arrival'),
      steps: [
        { text: 'Зайди в курьерскую службу «Жылдам» к Даурену', target: 'courier', done: () => s().flags.joinedCourier },
        { text: 'Выполни 3 доставки', target: () => deliveryTarget(), progress: () => [s().stats.deliveries, 3], done: () => s().stats.deliveries >= 3 },
      ],
      reward: () => { G.earn(3000, 'бонус от «Жылдам»'); G.addRel('dauren', 5); },
      hint: 'Даурен говорил, курьером можно неплохо заработать. «Жылдам» — на правом берегу, рядом с кофейней. Только не замёрзни!',
    },
    {
      id: 'rent', title: 'Крыша над головой', main: true,
      unlock: () => done('arrival'),
      steps: [
        { text: () => `Заплати аренду Гульнар-апай до конца дня ${s().rent.due}`, target: 'home', progress: () => [Math.min(s().money, s().rent.amount), s().rent.amount], done: () => (s().flags.rentPaid || 0) >= 1 },
      ],
      reward: () => { G.addRel('gulnar', 5); },
      hint: 'Не забудь про аренду, балам. Гульнар-апай добрая, но долги никто не любит.',
    },
    {
      id: 'wish', title: 'Желание на Байтереке', main: true,
      unlock: () => done('arrival') && (s().stats.deliveries >= 1 || s().day >= 2),
      steps: [
        { text: 'Поднимись на Байтерек и приложи ладонь к отпечатку', target: 'baiterek', done: () => s().flags.wishMade },
      ],
      reward: () => { G.addXp('charm', 0.3); },
      hint: 'Сходи на Байтерек, балам. Говорят, если приложить ладонь к золотому отпечатку, желание сбудется. Это на левом берегу, посреди бульвара.',
    },
    {
      id: 'coffee', title: 'Чашка кофе', main: true,
      unlock: () => done('arrival') && (s().day >= 2 || s().stats.deliveries >= 2),
      steps: [
        { text: 'Загляни в «Дала Кофе» на правом берегу', target: 'coffee', done: () => s().flags.metAigerim },
        { text: 'Отработай смену бариста (8:00–17:00)', target: 'coffee', done: () => s().stats.baristaShifts >= 1 },
      ],
      reward: () => { G.addRel('aigerim', 8); },
      hint: 'Говорят, в «Дала Кофе» ищут бариста. Работа в тепле — это хорошо, особенно зимой.',
    },
    {
      id: 'kazakh', title: 'Тіл — ұлттың жаны', main: true,
      unlock: () => done('arrival') && s().day >= 2,
      steps: [
        { text: 'Запишись на урок в «Тілдер орталығы»', target: 'lang', done: () => s().stats.lessons >= 1 },
        { text: 'Подними казахский до 3 уровня', target: 'lang', progress: () => [Math.floor(s().xp.kaz * 10) / 10, 3], done: () => lv('kaz') >= 3 },
        { text: 'Поговори с Гульнар-апай по-казахски', target: 'home', done: () => s().flags.kazakhGulnar },
      ],
      reward: () => { G.add('mood', 15); },
      hint: 'Балам, учи казахский! Сауле-апай в языковом центре — хороший учитель. Гульнар-апай будет рада поговорить с тобой на родном языке.',
    },
    {
      id: 'career', title: 'Собеседование', main: true,
      unlock: () => s().flags.heardJob,
      steps: [
        { text: 'Прокачай «Код» до 3 — библиотека университета', target: 'university', progress: () => [Math.floor(s().xp.code * 10) / 10, 3], done: () => lv('code') >= 3 },
        { text: 'Купи деловой костюм в Хан Шатыре', target: 'khan', done: () => G.owns('suit') || G.owns('gala') },
        { text: 'Пройди собеседование в Steppe Digital (будни 9–17, в костюме)', target: 'office', done: () => s().job.hired },
      ],
      reward: () => { G.add('mood', 10); },
      hint: 'Айгерим говорила про IT-компанию у EXPO. Учись в библиотеке университета, купи костюм — и иди на собеседование. Я в тебя верю!',
    },
    {
      id: 'toy', title: 'Той у Даурена', main: true,
      unlock: () => s().job.hired && done('firstjob'),
      onStart: () => { G.events.push(() => Content.toyInvite()); },
      steps: [
        { text: 'Подготовь нарядную одежду: костюм, чапан или вечерний образ', target: () => (G.owns('chapan') ? null : 'khan'), done: () => G.owns('suit') || G.owns('chapan') || G.owns('gala') },
        { text: () => `Приди на той в «Алтын Сарай»: ${fmtDate(s().flags.toyDay || s().day)}, 18:00–23:00`, target: 'toyhana', done: () => s().flags.toyDone },
      ],
      fail: () => s().flags.toyDay && !s().flags.toyDone && (s().day > s().flags.toyDay || (s().day === s().flags.toyDay && G.hour() >= 23.9)),
      onFail: () => { G.addRel('dauren', -30); G.add('mood', -20); UI.toast(`Ты ${gx('пропустил', 'пропустила')} той Даурена… Он очень обиделся.`, 'bad'); },
      reward: () => {},
      hint: 'Той — это святое, балам! Надень что-нибудь красивое и обязательно приготовь конверт для молодых.',
    },
    {
      id: 'promo', title: 'Повышение', main: true,
      unlock: () => s().job.hired,
      steps: [
        { text: 'Отработай 5 удачных смен и подними «Код» до 4', target: 'office', progress: () => [Math.min(s().stats.goodShifts, 5), 5], done: () => s().job.level >= 2 },
      ],
      reward: () => {},
      hint: 'Работай честно, учись — и начальство заметит. Твой папа тоже так начинал.',
    },
    {
      id: 'flat', title: 'Свой дом', main: true,
      unlock: () => s().job.level >= 2 || (s().job.hired && s().money >= 100000),
      steps: [
        { text: () => `Накопи ${fmtMoney(Content.FLAT_PRICE)} на первый взнос`, target: null, progress: () => [Math.min(s().money, Content.FLAT_PRICE), Content.FLAT_PRICE], done: () => s().money >= Content.FLAT_PRICE || s().flags.ownFlat },
        { text: 'Оформи квартиру в агентстве «Жаңа Үй»', target: 'realty', done: () => s().flags.ownFlat },
      ],
      reward: () => {},
      hint: 'Своя квартира в столице — это мечта, балам. Копи деньги, не трать на ерунду!',
    },
  ];
  const byId = Object.fromEntries(LIST.map((q) => [q.id, q]));

  function deliveryTarget() {
    const d = s().delivery;
    if (!d) return 'courier';
    return d.stage === 'pickup' ? d.from : d.to;
  }

  function status(id) { const q = s().quests[id]; return q ? q.status : null; }
  function isStep(id, i) { const q = s().quests[id]; return !!q && q.status === 'active' && q.step === i; }

  function tick() {
    const st = s();
    for (const q of LIST) {
      let r = st.quests[q.id];
      if (!r) {
        if (!q.unlock()) continue;
        r = st.quests[q.id] = { status: 'active', step: 0 };
        UI.toast(`Новое задание: ${q.title}`, 'quest');
        Sfx.play('quest');
        if (q.onStart) q.onStart();
        if (!st.track || status(st.track) !== 'active') st.track = q.id;
      }
      if (r.status !== 'active') continue;
      if (q.fail && q.fail()) {
        r.status = 'failed';
        if (q.onFail) q.onFail();
        continue;
      }
      let guard = 0;
      while (r.step < q.steps.length && q.steps[r.step].done() && guard++ < 10) {
        r.step++;
        if (r.step < q.steps.length) UI.toast(`${q.title}: ${textOf(q.steps[r.step].text)}`, 'quest');
      }
      if (r.step >= q.steps.length) {
        r.status = 'done';
        UI.toast(`Задание выполнено: ${q.title}`, 'quest');
        Sfx.play('success');
        q.reward();
        if (st.track === q.id) st.track = null;
      }
    }
    if (!st.track || status(st.track) !== 'active') {
      const next = LIST.find((q) => status(q.id) === 'active');
      st.track = next ? next.id : null;
    }
  }

  function textOf(t) { return typeof t === 'function' ? t() : t; }

  function active() {
    return LIST.filter((q) => status(q.id) === 'active');
  }

  function objective() {
    const st = s();
    const side = sideObjective();
    const q = st.track ? byId[st.track] : null;
    if (st.delivery) {
      const d = st.delivery;
      const b = World.byId[d.stage === 'pickup' ? d.from : d.to];
      const left = d.stage === 'drop' ? Math.round(d.deadline - G.now()) : null;
      return { title: `Заказ #${d.id}`, text: d.stage === 'pickup' ? `Забери заказ: ${b.name}` : `Доставь: ${b.name}${left != null ? (left >= 0 ? ` · ${left} мин` : ' · опаздываешь!') : ''}`, target: b.id };
    }
    if (!q) return side;
    const r = st.quests[q.id];
    const step = q.steps[r.step];
    if (!step) return side;
    let text = textOf(step.text);
    if (step.progress) { const [a, b] = step.progress(); text += ` (${typeof a === 'number' && a >= 1000 ? fmtMoney(a) : a} / ${typeof b === 'number' && b >= 1000 ? fmtMoney(b) : b})`; }
    const target = typeof step.target === 'function' ? step.target() : step.target;
    return { title: q.title, text, target };
  }

  function sideObjective() {
    if (G.flag('grannyQuest') === 'carrying') return { title: 'Помощь бабушке', text: 'Отнеси сумки к дому на Абая, 3', target: 'r1' };
    if (G.flag('catQuest') === 'asked') return { title: 'Где Барсик?', text: 'Найди рыжего кота в парке на правом берегу', target: null };
    if (G.flag('catQuest') === 'found') return { title: 'Где Барсик?', text: 'Верни кота Аружан у дома 12', target: 'home' };
    return null;
  }

  function mamaHint() {
    const st = s();
    if (st.food < 25) return 'И поешь нормально! Не одними самсами. Купи продукты и приготовь что-нибудь дома.';
    if (st.energy < 25) return 'Голос у тебя уставший. Поспи, балам, здоровье дороже денег.';
    if (G.season() === 'winter' && G.warmth() < 3) return gx('Ты пуховик купил?', 'Ты пуховик купила?') + ' На базаре у Ержана недорого. В Астане без пуховика зимой — никак!';
    const q = st.track ? byId[st.track] : null;
    if (q && q.hint) return q.hint;
    if (st.ended) return 'Приезжай на выходных! Я бешбармак сделаю.';
    return 'Главное — береги себя. И звони почаще!';
  }

  function onNewDay() { tick(); }

  return { LIST, byId, tick, status, isStep, active, objective, mamaHint, onNewDay, textOf };
})();
