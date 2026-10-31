'use strict';
// Случайные события на улице: кошелёк на тротуаре, уличный музыкант, потерявшийся турист,
// флешмоб, снежки, промоутер, котёнок на дереве. Над местом события — жёлтый «!».

const Events = (() => {
  const s = () => G.s;
  let cur = null; // { kind, x, y, actors: [{x, y, look, dir, sheet}], obj, until, done }
  let timer = 40;

  const KINDS = {
    wallet: { title: 'Кошелёк на тротуаре', btn: ['ПОДНЯТЬ', 'bag'], when: () => true, weight: 2 },
    busker: { title: 'Уличный музыкант', btn: ['СЛУШАТЬ', 'note'], when: (h) => h >= 10 && h < 21 && s().weather.kind !== 'buran', weight: 3 },
    tourist: { title: 'Потерявшийся турист', btn: ['ПОМОЧЬ', 'map'], when: (h) => h >= 9 && h < 20, weight: 3 },
    flashmob: { title: 'Флешмоб', btn: ['ТАНЦЕВАТЬ', 'note'], when: (h) => h >= 12 && h < 19 && s().weather.kind !== 'buran', weight: 1.5 },
    snowball: { title: 'Дети играют в снежки', btn: ['СНЕЖОК', 'joke'], when: (h) => G.season() === 'winter' && h >= 10 && h < 17, weight: 2 },
    promo: { title: 'Промоутер с листовками', btn: ['ВЗЯТЬ', 'news'], when: (h) => h >= 10 && h < 20, weight: 1.5 },
    cattree: { title: 'Котёнок на дереве', btn: ['СНЯТЬ', 'cat'], when: (h) => h >= 8 && h < 20 && !Pet.has(), weight: 1.5, tree: true },
  };

  function state() {
    const st = s();
    if (!st.events) st.events = { helped: 0, seen: {} };
    return st.events;
  }

  /* ---------- появление ---------- */

  function spawn(force) {
    const p = Ents.player, h = G.hour();
    const kinds = Object.keys(KINDS).filter((k) => KINDS[k].when(h));
    if (!kinds.length && !force) return;
    let total = kinds.reduce((a, k) => a + KINDS[k].weight, 0), r = Math.random() * total, kind = force || kinds[0];
    if (!force) for (const k of kinds) { r -= KINDS[k].weight; if (r <= 0) { kind = k; break; } }
    let x, y;
    if (KINDS[kind].tree) {
      const trees = World.decor.filter((d) => d.kind === 'tree' && Math.hypot(d.x - p.x, d.y - p.y) > 70 && Math.hypot(d.x - p.x, d.y - p.y) < 170);
      if (!trees.length) return;
      const t = pick(trees); x = t.x; y = t.y;
    } else {
      const tiles = World.pedTiles.filter(([tx, ty]) => { const d = Math.hypot(tx * TILE + 8 - p.x, ty * TILE + 12 - p.y); return d > 70 && d < 160; });
      if (!tiles.length) return;
      const [tx, ty] = pick(tiles); x = tx * TILE + 8; y = ty * TILE + 12;
    }
    const winter = G.season() === 'winter';
    const actor = (dx, dy, look) => ({ x: x + dx, y: y + dy, look: look || Ents.randomLook(winter), dir: 0 });
    const actors = [];
    if (kind === 'busker') actors.push(actor(0, 0, { ...Ents.randomLook(winter), female: false, hairStyle: 'short', outfit: 'chapan', top: '#5b3a6e', bottom: '#1b1b1b', hat: 'kalpak', beard: chance(0.5) }));
    if (kind === 'tourist') actors.push(actor(0, 0, { ...Ents.randomLook(winter), hat: 'cap', hatColor: '#e8a317', bag: true, glasses: true }));
    if (kind === 'promo') actors.push(actor(0, 0, { ...Ents.randomLook(winter), outfit: 'courier', top: '#e5533d', hat: 'cap', hatColor: '#e5533d' }));
    if (kind === 'flashmob') for (let i = 0; i < 5; i++) actors.push(actor((i - 2) * 11, (i % 2) * 6));
    if (kind === 'snowball') for (let i = 0; i < 3; i++) actors.push(actor((i - 1) * 14, (i % 2) * 5, { ...Ents.randomLook(true), hat: 'beanie', hatColor: pick(['#c0392b', '#2f6fd1', '#e8a317']) }));
    for (const a of actors) a.sheet = Art.charSheet(a.look);
    cur = { kind, x, y, actors, until: G.now() + 240, t0: Render.now() };
  }

  function update(dt) {
    if (cur && (cur.done || G.now() > cur.until || Math.hypot(cur.x - Ents.player.x, cur.y - Ents.player.y) > 420)) cur = null;
    if (cur) {
      // танцоры и дети двигаются
      const t = Render.now();
      if (cur.kind === 'flashmob') cur.actors.forEach((a, i) => { a.dir = [0, 2, 0, 1][Math.floor(t * 2 + i) % 4]; a.moving = true; a.anim = t * 6 + i; });
      if (cur.kind === 'snowball') cur.actors.forEach((a, i) => { a.dir = Math.floor(t * 0.7 + i) % 2 ? 1 : 2; a.moving = Math.sin(t * 3 + i) > 0; a.anim = t * 6; });
      if (cur.kind === 'busker') { cur.actors[0].moving = true; cur.actors[0].anim = t * 3; }
      return;
    }
    if (Quests.status('arrival') !== 'done') return; // не мешаем первым шагам в городе
    timer -= dt;
    if (timer > 0) return;
    timer = rand(60, 110);
    if (chance(0.7)) spawn();
  }

  /* ---------- взаимодействие ---------- */

  function interactable(fx, fy) {
    if (!cur) return null;
    const d = Math.hypot(fx - cur.x, fy - cur.y + 4);
    if (d > (cur.kind === 'flashmob' ? 34 : 22)) return null;
    return { pri: 0, d, label: KINDS[cur.kind].title, btn: KINDS[cur.kind].btn, x: cur.x, y: cur.y - (KINDS[cur.kind].tree ? 44 : 36), run: () => run(cur) };
  }

  function finish(ev, helped) {
    ev.done = true;
    const e = state();
    e.seen[ev.kind] = (e.seen[ev.kind] || 0) + 1;
    if (helped) { e.helped++; Life.checkMedals(); }
    Day.note('event');
  }

  // направление словами — от туриста к цели
  function compass(fx, fy, b) {
    const dx = b.doorX * TILE - fx, dy = b.doorY * TILE - fy;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'на восток' : 'на запад') : (dy > 0 ? 'на юг' : 'на север');
  }

  async function run(ev) {
    const st = s();
    const say = (t, who = null) => UI.say(who, t);
    switch (ev.kind) {
      case 'wallet': {
        const sum = pick([4000, 6500, 9000, 12000]);
        const c = await UI.ask(null, `На тротуаре лежит кожаный кошелёк. Внутри — ${fmtMoney(sum)}, проездной и визитка: «Сапарова Гүлназ, бухгалтер», с телефоном.`, ['Позвонить хозяйке', 'Отдать патрульному', 'Оставить себе']);
        if (c === 0) {
          G.advance(15);
          await say('Через пятнадцать минут прибегает запыхавшаяся женщина: «Ой, рақмет, айналайын! Там пенсия мамина!» Она пытается сунуть тебе деньги.');
          const r = await UI.ask(null, 'Гүлназ-апай протягивает 2 000 ₸.', ['Взять, спасибо', 'Не надо, это же просто правильно']);
          if (r === 0) G.earn(2000, 'благодарность'); else { G.add('mood', 6); G.addXp('charm', 0.1); await say('«Таких людей мало! Пусть у тебя всё будет хорошо в Астане!» — и она обнимает тебя прямо посреди улицы.'); }
          G.add('mood', 6); City.addCrime(-5); finish(ev, true);
        } else if (c === 1) {
          G.advance(10); G.add('mood', 4); City.addCrime(-8);
          await say('Патрульный записывает находку: «Вернём хозяйке. Спасибо, гражданин — побольше бы таких».'); finish(ev, true);
        } else if (c === 2) {
          G.earn(sum, 'находка'); G.add('mood', -4); City.addCrime(10);
          await say('Ты прячешь кошелёк в карман. Деньги есть, а на душе почему-то скребёт.');
          if (chance(0.35)) Life.msg('mama', 'Балам, мне сон приснился, что ты чужое взял. Ты же у меня честный человек, правда?');
          finish(ev, false);
        }
        break;
      }
      case 'busker': {
        const c = await UI.ask(null, 'Музыкант в чапане играет на домбре кюй Курмангазы «Адай». Вокруг собираются люди.', ['Бросить 200 ₸ в чехол', 'Подпеть и станцевать', 'Попросить сыграть «Менің Қазақстаным»', 'Пойти дальше']);
        if (c === 0) { if (G.pay(200)) { G.add('mood', 4); await say('Музыкант кивает и прибавляет темп. Мурашки!'); finish(ev, true); } }
        else if (c === 1) {
          const acc = await MG.rhythm({ title: 'Кюй «Адай» на бульваре', bpm: 120, beats: 24 });
          G.advance(20); G.add('mood', Math.round(6 + acc * 10)); G.addXp('charm', 0.05 + acc * 0.1);
          const tips = Math.round(acc * 3000 / 100) * 100;
          if (tips) G.earn(tips, 'доля от чаевых');
          await say(acc > 0.6 ? 'Толпа хлопает в такт! Музыкант делит с тобой чаевые: «Приходи завтра, бауырым!»' : 'Получилось не очень ритмично, но весело. Кто-то снимает на телефон.');
          finish(ev, true);
        } else if (c === 2) { if (G.pay(500)) { G.add('mood', 7); await say('Звучит гимн, и пара прохожих останавливается, положив руку на сердце. Неожиданно трогательно.'); finish(ev, true); } }
        break;
      }
      case 'tourist': {
        const targets = ['baiterek', 'khan', 'akorda', 'expo', 'mosque', 'station1', 'pyramid'].filter((id) => World.byId[id]);
        const b = World.byId[pick(targets)];
        const right = compass(ev.x, ev.y, b);
        const dirs = ['на север', 'на юг', 'на запад', 'на восток'];
        const c = await UI.ask(null, `Турист с картой: «Excuse me… Простите, где тут ${b.name}? Я из Ташкента, у вас всё такое огромное!» Север на карте — вверху.`, [...dirs.map((d0) => `Идите ${d0}`), 'Проводить до места']);
        if (c === 4) {
          await UI.fade(`Ты провожаешь туриста до места (${b.name}) и по дороге рассказываешь про город…`, async () => G.advance(40, { walking: true, outdoor: true }));
          G.earn(3000, 'турист благодарит'); G.addXp('charm', 0.12); G.add('mood', 6);
          await say('«Рахмат! В Ташкенте расскажу, какие в Астане люди!» — турист дарит тебе магнитик с Регистаном.');
          finish(ev, true);
        } else if (dirs[c] === right) {
          G.earn(1000, 'турист благодарит'); G.addXp('charm', 0.06); G.add('mood', 4);
          await say(`«Рахмат!» Турист уверенно уходит ${right}. Ты определённо уже ${gx('местный', 'местная')}.`);
          finish(ev, true);
        } else {
          await say(`Турист уходит ${dirs[c]}… а ${b.name} вообще-то ${right}. Через минуту он возвращается и смотрит на тебя с укором.`);
          G.add('mood', -2); finish(ev, false);
        }
        break;
      }
      case 'flashmob': {
        const c = await UI.ask(null, 'Пятеро ребят включают колонку — флешмоб «Қара жорға»! Зовут присоединиться.', ['Присоединиться!', 'Снять на телефон', 'Пройти мимо']);
        if (c === 0) {
          const acc = await MG.rhythm({ title: 'Флешмоб «Қара жорға»', bpm: 108, beats: 28 });
          G.advance(15); G.add('mood', Math.round(8 + acc * 12)); G.addXp('charm', 0.08 + acc * 0.12);
          await say(acc > 0.6 ? 'Вы зажгли! Прохожие хлопают, девочка дарит тебе значок флешмоба.' : 'Ты немного путаешь движения, но улыбаешься так, что это не важно.');
          if (acc > 0.6) Life.msg('dauren', 'Ты в видео флешмоба у Байтерека?! Там уже 50 тысяч просмотров! Звезда!');
          Fun.absurd('flashmob', 1, 0); finish(ev, true);
        } else if (c === 1) { G.advance(5); G.add('mood', 3); await say('Видео получилось огонь. Отправляешь маме — она отвечает тремя сердечками и «а ты где?».'); finish(ev, false); }
        break;
      }
      case 'snowball': {
        const c = await UI.ask(null, 'Шлёп! Снежок прилетает тебе прямо в плечо. Дети хохочут и прячутся за сугробом.', ['Ответить снежком!', 'Сделать вид, что не заметил' + gx('', 'а')]);
        if (c === 0) {
          await UI.fade('Снежная битва! Ты отступаешь за скамейку, дети атакуют с фланга…', async () => G.advance(20, { outdoor: true }));
          G.add('mood', 10); G.add('energy', -5); G.add('hyg', -5);
          await say(chance(0.5) ? 'Победа! Дети объявляют тебя «главным генералом двора».' : 'Ты проиграл' + gx('', 'а') + ' трое против одного, но это была славная битва.');
          Fun.absurd('snowfight', 1, 0); finish(ev, true);
        } else { G.add('mood', -1); finish(ev, false); }
        break;
      }
      case 'promo': {
        const c = await UI.ask(null, 'Промоутер в красной кепке: «Шаурма №1 — купон на скидку! Берёте?»', ['Взять купон', 'Нет, спасибо']);
        if (c === 0) { G.give('coupon', 1); UI.toast('Купон: шаурма за полцены в «Шаурма №1»', 'good'); finish(ev, false); }
        else finish(ev, false);
        break;
      }
      case 'cattree': {
        const ok = G.lv('fit') >= 1 || chance(0.6);
        await UI.fade('Ты карабкаешься по стволу, ветки цепляют куртку…', async () => G.advance(15, { outdoor: true }));
        if (!ok) { G.add('mood', -2); G.add('hyg', -10); await say('Ветка обламывается, ты съезжаешь вниз. Котёнок смотрит сверху с жалостью. Через минуту он спускается сам.'); finish(ev, false); break; }
        G.add('mood', 6);
        await say('Ты снимаешь дрожащего котёнка. Он тут же забирается тебе под куртку и мурчит. Ошейника нет — ничей.');
        const c = await UI.ask(null, 'Котёнок не хочет вылезать из-под куртки.', ['Забрать домой', 'Отнести в приют']);
        if (c === 0) await Pet.adopt(pick(['grey', 'black', 'calico']), 'tree');
        else { G.add('mood', 2); await say('В приюте «Мысық» котёнка берут и обещают найти ему хозяев. Если передумаешь — приют в «Самал Плазе».'); }
        finish(ev, true);
        break;
      }
      default:
    }
  }

  /* ---------- отрисовка ---------- */

  function drawables(vx0, vx1, vy0, vy1) {
    if (!cur) return [];
    const out = [];
    if (cur.x < vx0 - 60 || cur.x > vx1 + 60 || cur.y < vy0 - 60 || cur.y > vy1 + 60) return out;
    for (const a of cur.actors) out.push({ y: a.y, evActor: a });
    if (cur.kind === 'wallet') out.push({ y: cur.y - 2, evObj: 'wallet', x: cur.x, yy: cur.y });
    if (cur.kind === 'cattree') out.push({ y: cur.y + 1, evObj: 'cat', x: cur.x, yy: cur.y });
    if (cur.kind === 'busker') out.push({ y: cur.y + 2, evObj: 'case', x: cur.x + 10, yy: cur.y });
    return out;
  }
  const marker = () => (cur && !cur.done ? { x: cur.x, y: cur.y - (KINDS[cur.kind].tree ? 46 : 40) } : null);
  const active = () => cur;

  return { update, interactable, drawables, marker, active, state, spawn, KINDS };
})();
