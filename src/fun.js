'use strict';
// Чудачества: странные и смешные поступки, как в старых симуляторах жизни.
// Поднимают настроение, но копят «чудачество»: город начинает тебя узнавать.

const Fun = (() => {
  const s = () => G.s;
  function state() {
    const st = s();
    if (st.crazy == null) st.crazy = 0;
    if (!st.fun) st.fun = { snowmen: [], licked: 0, done: {} };
    return st;
  }

  function crazyLabel() {
    const c = state().crazy;
    return c >= 75 ? 'городская легенда' : c >= 45 ? 'известный чудак' : c >= 15 ? 'с изюминкой' : 'обычный житель';
  }

  // общий итог любого чудачества
  function absurd(id, crazy, mood = 0) {
    const st = state();
    const before = st.crazy;
    st.crazy = clamp(st.crazy + crazy, 0, 100);
    st.fun.done[id] = (st.fun.done[id] || 0) + 1;
    st.stats.absurd = (st.stats.absurd || 0) + 1;
    if (mood) G.add('mood', mood);
    Day.note('absurd');
    if (before < 45 && st.crazy >= 45) { UI.toast('По городу ходят слухи о тебе…', 'info'); Life.msg('dauren', `Слушай, мне тут рассказали про ${gx('какого-то парня, который', 'какую-то девушку, которая')} творит странное по всему городу. Это же ты, да? Ха-ха!`); }
    if (before < 75 && st.crazy >= 75) { UI.toast('Ты — городская легенда Астаны!', 'medal'); Life.msg('mama', 'Балам, соседка говорит, тебя по телевизору показывали в программе «Курьёзы недели». Это правда?!'); }
    Life.checkMedals();
  }

  function onNewDay() { const st = state(); st.crazy = Math.max(0, st.crazy - 3); st.fun.snowmen = st.fun.snowmen.filter((m) => st.day - m.day < 4 && G.season() === 'winter'); }

  // Реплика прохожего, который тебя узнаёт
  function fameLine() {
    const c = state().crazy;
    if (c < 45 || !chance(0.35)) return null;
    const lines = ['Это же ты! Ты вчера с голубями разговаривал' + gx('', 'а') + '!', 'Мама, смотри, это тот человек из видео!', 'Можно с тобой сфоткаться? Ты же легенда!', 'О, звезда района. Сәлем!'];
    if (state().fun.done.lick) lines.push('Как язык? Зажил после столба?');
    return pick(lines);
  }

  /* ---------- дома и в кофейне ---------- */

  const say = (t) => UI.say(null, t);

  const OBJ = {
    bed: [{
      label: 'Попрыгать на кровати', icon: 'joke', time: 5, sub: 'чудачество · настроение +4',
      run: async (room) => {
        G.advance(5); G.add('energy', -2);
        await say(room === 'home' ? 'Пружины скрипят на весь подъезд. Через минуту из кухни: «Ой, балам, ты там живой?!» — Гульнар-апай.' : 'Ты прыгаешь до потолка. Снизу соседи стучат шваброй. Ты стучишь в ответ — ритм «Қара жорға».');
        absurd('jump', 3, 4);
      },
    }, {
      label: 'Разглядывать узоры на ковре', icon: 'star', time: 15, sub: 'настроение +3', cond: (room) => Decor.placed(room, 'w1') === 'tuskiiz',
      run: async () => { G.advance(15); await say(pick(['В узорах тұскиіза ты находишь верблюда, Байтерек и лицо Даурена.', 'Если долго смотреть на орнамент, он начинает шевелиться. Или это ты засыпаешь.', 'Ты считаешь завитки «қошқар мүйіз». Сбиваешься на сорок втором.'])); absurd('kilim', 1, 3); },
    }],
    shower: [{
      label: 'Петь в душе во весь голос', icon: 'mic', time: 20, sub: 'гигиена 100 · чудачество',
      run: async () => {
        await UI.fade('«Менің Қазақстаным…» — на весь подъезд', async () => G.advance(20));
        s().hyg = 100;
        await say(chance(0.5) ? 'Сосед за стенкой подпевает второй голос. Получается почти как на тое.' : 'По трубам стучат. Кажется, это аплодисменты. Или нет.');
        absurd('sing', 2, 5);
      },
    }],
    fridge: [{
      label: 'Поговорить с холодильником', icon: 'talk', time: 5, sub: 'чудачество',
      run: async () => { G.advance(5); await say(pick(['Холодильник гудит в ответ. Кажется, он единственный тебя понимает.', 'Ты жалуешься холодильнику на цены на базаре. Он молча светит лампочкой.', 'Ты открываешь холодильник, смотришь внутрь три минуты и закрываешь. Ничего не изменилось.'])); absurd('fridge', 3, 2); },
    }],
    tv: [{
      label: 'Спорить с телевизором', icon: 'tv', time: 15, sub: 'чудачество · настроение +3',
      run: async () => { G.advance(15); await say(pick(['Ты доказываешь синоптику, что −30 — это не «слегка прохладно». Он не слушает.', 'Ты подсказываешь участникам викторины. Они не слышат, но ты знал' + gx('', 'а') + ' все ответы!', 'Ты кричишь «Гол!» вместе с комментатором. Это был повтор.'])); absurd('tv', 2, 3); },
    }],
    sofa: [{
      label: 'Искать мелочь под подушками', icon: 'coin', time: 10, sub: 'раз в день · вдруг повезёт',
      cond: () => !s().daily.sofaCoins,
      run: async () => {
        s().daily.sofaCoins = true; G.advance(10);
        if (chance(0.4)) { const n = pick([50, 100, 200, 500]); G.earn(n, 'нашлось под подушкой'); await say(`Под подушкой — ${fmtMoney(n)}, пульт от старого телевизора и одна семечка.`); }
        else await say(pick(['Под подушками: крошки от баурсака, носок и пуговица. Богатства не случилось.', 'Ты находишь курт, которому, кажется, лет пять. Лучше не надо.']));
        absurd('sofa', 1, 1);
      },
    }],
    wardrobe: [{
      label: 'Спрятаться в шкафу', icon: 'shirt', time: 10, sub: 'чудачество',
      run: async () => { G.advance(10); await say('Внутри темно и пахнет нафталином. Ты ждёшь Нарнию. Нарнии не случилось, но стало спокойнее.'); absurd('hide', 3, 2); },
    }, {
      label: 'Покрасоваться перед зеркалом', icon: 'star', time: 10, sub: 'настроение +3',
      run: async () => { G.advance(10); await say(pick(['Ты репетируешь тост для тоя. Зеркало аплодирует. Мысленно.', 'Ты делаешь лицо «я — успешный айтишник». Получается «я — уставший курьер». Тоже неплохо.', 'Ты примеряешь калпак и говоришь себе: «Сәлеметсіз бе, аға». Солидно.'])); absurd('mirror', 1, 3); },
    }],
    sink: [{
      label: 'Корчить рожи в зеркало', icon: 'joke', time: 5, sub: 'чудачество · настроение +3',
      run: async () => { G.advance(5); await say('Ты изображаешь верблюда, Байтерек и маму, когда звонишь ей поздно. Последнее — особенно похоже.'); absurd('faces', 2, 3); },
    }],
    dining: [{
      label: 'Съесть все баурсаки со стола', icon: 'bowl', time: 10, sub: 'сытость +20 · чудачество',
      cond: (room) => room === 'home',
      run: async () => {
        G.advance(10); G.add('food', 20);
        await UI.say('gulnar', 'Ой-бай! Это же гостям было! …Ладно, кушай, кушай, худой совсем.');
        absurd('baursak', 2, 3); G.addRel('gulnar', -1);
      },
    }],
    desk: [{
      label: 'Написать письмо себе в будущее', icon: 'note', time: 20, sub: 'настроение +4',
      run: async () => { G.advance(20); await say('«Дорогой будущий я. Если ты читаешь это, значит, пережил' + gx('', 'а') + ' первую зиму в Астане. Купи себе нормальный пуховик». Письмо отправляется в ящик стола.'); absurd('letter', 1, 4); },
    }],
    counter: [{
      label: 'Заказать «как обычно»', icon: 'cup', time: 5, sub: 'а она помнит?',
      run: async () => {
        G.advance(5);
        if ((s().rel.aigerim || 0) >= 40) { G.add('energy', 15); await UI.say('aigerim', 'Капучино без сахара и с корицей сверху, знаю-знаю. Сегодня за счёт заведения!'); absurd('usual', 1, 4); }
        else { await UI.say('aigerim', 'Эм… «как обычно» — это как? Ты у нас второй раз… Давай я просто сделаю американо?'); absurd('usual', 3, 1); }
      },
    }, {
      label: 'Попросить написать имя на стакане', icon: 'note', time: 5, sub: 'чудачество',
      run: async () => { G.advance(5); const n = s().name; await say(`На стакане крупно: «${n.slice(0, 2)}${pick(['ыбек', 'урлан', 'ик', 'аша', 'ник'])}». Почти угадали.`); absurd('cup', 1, 2); },
    }],
    table: [{
      label: 'Построить башню из сахара', icon: 'joke', time: 15, sub: 'чудачество · настроение +3',
      run: async () => { G.advance(15); await say(pick(['Девять пакетиков сахара в высоту! Посетитель за соседним столиком снимает на телефон.', 'Башня рушится на восьмом этаже. Айгерим смотрит из-за стойки. Долго смотрит.'])); absurd('sugar', 2, 3); },
    }],
  };

  // действия для мебели в интерьере
  function objectActs(it, cur) {
    const list = OBJ[it.k];
    if (!list || !cur) return [];
    return list.filter((a) => !a.cond || a.cond(cur.id)).map((a) => ({ ...a, run: () => a.run(cur.id) }));
  }

  /* ---------- на улице ---------- */

  async function lickPost() {
    const st = state();
    G.advance(10);
    await say('Ты знаешь, что так нельзя. Все знают, что так нельзя. Ты медленно прикасаешься языком к столбу…');
    Sfx.play('error'); Device.buzz(80);
    await say('…и намертво примерзаешь. Прохожие останавливаются. Кто-то снимает видео. Бабушка приносит термос с тёплым чаем и молча поливает столб.');
    st.fun.licked++;
    G.add('mood', -4); G.add('energy', -4);
    absurd('lick', 8, 0);
    await say('Свобода! Язык горит, зато теперь у тебя есть история на всю жизнь.');
  }

  async function snowAngel() {
    G.advance(10);
    await say('Ты падаешь спиной в сугроб и машешь руками и ногами. Над тобой — огромное степное небо.');
    G.add('mood', 6); G.add('energy', -3); G.add('hyg', -5);
    absurd('angel', 2, 0);
  }

  async function snowman(tx, ty) {
    const st = state();
    if (st.fun.snowmen.some((m) => m.tx === tx && m.ty === ty)) { await say('Здесь уже стоит твой снеговик. Он гордо смотрит на дорогу.'); return; }
    await UI.fade('Катаешь снежные комы…', async () => G.advance(30, { outdoor: true }));
    const kinds = ['калпак', 'ушанку', 'шарф «Астана»', 'ведро'];
    const hat = pick(kinds);
    st.fun.snowmen.push({ tx, ty, day: st.day, hat: kinds.indexOf(hat) });
    G.add('mood', 8); G.add('energy', -6);
    UI.toast(`Снеговик в ${hat === 'шарф «Астана»' ? 'шарфе «Астана»' : hat}! Снеговиков: ${st.fun.snowmen.length}`, 'good');
    st.fun.made = (st.fun.made || 0) + 1;
    absurd('snowman', 1, 0);
  }

  async function shakeTree(d) {
    G.advance(5);
    if (G.season() === 'winter') { await say('Ты трясёшь ёлку. Вся шапка снега с веток падает тебе за шиворот. Бодрит!'); G.add('energy', 3); G.add('mood', -1); }
    else if (chance(0.2)) { G.earn(200, 'кто-то потерял'); await say('С дерева падают листья… и чья-то купюра. Ветер в Астане носит и не такое.'); }
    else await say('Листья кружатся, как в клипе. Прохожие обходят тебя по широкой дуге.');
    absurd('shake', 2, 2);
  }

  async function hugTree() { G.advance(5); await say('Ты обнимаешь дерево. Оно не против. Бабушка на скамейке одобрительно кивает: «Табиғатты сүю керек».'); absurd('hug', 1, 3); }

  async function wadeFountain() {
    G.advance(10);
    await say('Ты снимаешь кроссовки и заходишь в фонтан. Вода ледяная, дети в восторге, охранник — нет.');
    G.add('mood', 6); G.add('hyg', -10);
    City.addCrime(3);
    absurd('fountain', 4, 0);
  }

  async function busAnnouncer(stop) {
    G.advance(5);
    await say(`Ты объявляешь голосом диктора: «Келесі аялдама — ${stop.name}! Следующая остановка — ${stop.name}!» Люди на остановке оглядываются. Один дедушка благодарит и садится не в тот автобус.`);
    absurd('announce', 2, 3);
  }

  // Голуби: меню вместо одного действия
  async function pigeonsMenu(feed) {
    const c = await UI.ask(null, 'Голуби деловито клюют что-то у твоих ног.', ['Покормить голубей', 'Пугнуть голубей', 'Поговорить с голубем', 'Уйти']);
    if (c === 0) return feed();
    if (c === 1) { City.scarePigeons(); G.advance(2); await say('Ты топаешь, и стая взлетает с шумом крыльев. Почему-то очень приятно.'); absurd('scare', 1, 2); }
    if (c === 2) { G.advance(5); await say(pick(['Голубь смотрит одним глазом и уходит. Видимо, ему нечего сказать.', 'Ты рассказываешь голубю про свой день. Он кивает. Каждые полсекунды.', '«Сәлем, бауырым», — говоришь ты голубю. Голубь отвечает «гур-гур». Диалог налажен.'])); absurd('pigeontalk', 3, 2); }
  }

  // Прохожие: меню действий, как в старых симуляторах
  async function pedMenu(ped, talk) {
    if (ped.police) return talk(ped);
    const c = await UI.ask(null, 'Прохожий вопросительно смотрит на тебя.', ['Спросить, как дела', 'Сделать вид, что узнал' + gx('', 'а'), 'Станцевать «Қара жорға»', 'Отойти']);
    if (c === 0) return talk(ped);
    if (c === 1) {
      ped.bubble = { text: pick(['Мы знакомы?..', 'А-а-а, Ерлан! …Нет? Извините.', 'Ой, а мы с вами учились? В Караганде?']), until: Render.now() + 4 }; ped.pause = 3;
      G.advance(2); await say('— Сәлем! Сколько лет! Как мама? — восклицаешь ты. Прохожий мучительно пытается вспомнить, кто ты.'); absurd('pretend', 2, 2);
    }
    if (c === 2) {
      ped.pause = 4;
      const ok = G.lv('charm') >= 2 || chance(0.5);
      ped.bubble = { text: ok ? 'Ха-ха, давай ещё!' : 'Э-э… я пойду.', until: Render.now() + 4 };
      G.advance(5); await say(ok ? 'Ты танцуешь «Қара жорға» прямо на тротуаре. Прохожий хлопает в ладоши, кто-то присоединяется!' : 'Ты танцуешь «Қара жорға». Прохожий медленно пятится и переходит на другую сторону.');
      absurd('dance', 3, ok ? 6 : 2); if (ok) G.addXp('charm', 0.05);
    }
  }

  // Уличные чудачества рядом с игроком (вызывается из списка взаимодействий)
  function street(fx, fy, out) {
    const winter = G.season() === 'winter';
    for (const d of World.decor) {
      const dd = dist(fx, fy, d.x, d.y - 2);
      if (d.kind === 'lamp' && winter && G.temp() <= -10 && dd < 12) out.push({ pri: 5, d: dd, label: 'Лизнуть фонарный столб', btn: ['ЛИЗНУТЬ', 'joke'], x: d.x, y: d.y - 38, run: lickPost });
      if (d.kind === 'tree' && dd < 13) out.push({ pri: 5, d: dd, label: winter ? 'Потрясти ёлку' : 'Потрясти дерево', btn: ['ТРЯСТИ', 'leaf'], x: d.x, y: d.y - 38, run: () => (chance(0.5) ? shakeTree(d) : hugTree()) });
      if (d.kind === 'fountain' && !winter && dd < 28) out.push({ pri: 4, d: dd + 1, label: 'Залезть в фонтан', btn: ['В ФОНТАН', 'drop'], x: d.x + 14, y: d.y - 48, run: wadeFountain });
    }
    for (const stp of World.busStops) {
      const dd = dist(fx, fy, stp.x, stp.y);
      if (dd < 18) out.push({ pri: 5, d: dd, label: 'Объявить остановку голосом диктора', btn: ['ОБЪЯВИТЬ', 'mic'], x: stp.x, y: stp.y - 44, run: () => busAnnouncer(stp) });
    }
    // зима: снег на газоне — ангел и снеговик
    if (winter && !out.length) {
      const tx = Math.floor(fx / TILE), ty = Math.floor((fy + 4) / TILE);
      if (World.tile(tx, ty) === World.T.GRASS) {
        out.push({ pri: 6, d: 0, label: 'Слепить снеговика', btn: ['СНЕГОВИК', 'star'], x: tx * TILE + 8, y: ty * TILE - 20, run: () => snowman(tx, ty) });
        out.push({ pri: 6, d: 1, label: 'Сделать снежного ангела', btn: ['АНГЕЛ', 'star'], x: tx * TILE + 8, y: ty * TILE - 20, run: snowAngel });
      }
    }
  }

  // Подписи кнопки для уличных меню
  const snowmen = () => state().fun.snowmen;

  /* ---------- в разговоре ---------- */

  const PRANK_OK = [() => `Ха-ха-ха! Ты меня ${gx('подловил', 'подловила')}! Ну всё, держись теперь.`, () => 'Ой, я поверил(а)! Ну ты артист!', () => 'Ха! Это было смешно. Расскажу на работе.'];
  const PRANK_BAD = [() => 'Это было не смешно.', () => 'Серьёзно? У меня чуть сердце не остановилось.', () => 'Знаешь… давай без таких шуток.'];
  const PRANKS = ['Ты с серьёзным лицом говоришь, что Байтерек на выходные увезут на ремонт в Караганду.', 'Ты показываешь за спину собеседника: «Смотри, верблюд на светофоре!»', 'Ты сообщаешь, что с завтрашнего дня зима в Астане отменена указом.'];

  return {
    crazyLabel, absurd, onNewDay, fameLine, objectActs, street, pigeonsMenu, pedMenu, snowmen, state,
    PRANK_OK, PRANK_BAD, PRANKS,
  };
})();
