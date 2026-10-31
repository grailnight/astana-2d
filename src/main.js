'use strict';
// Точка входа: загрузка, главный цикл, взаимодействие с миром.

const Main = (() => {
  let playing = false;
  let eventRunning = false;
  let last = performance.now();
  let questTimer = 0, districtTimer = 0, district = '';
  let near = null;
  let snapCam = true;

  function interactables() {
    const p = Ents.player;
    const fx = p.x, fy = p.y - 4;
    const out = [];
    const st = G.s;
    for (const n of Content.worldNpcs) {
      if (!n.visible()) continue;
      const x = n.tx * TILE + 8, y = n.ty * TILE + 8;
      const d = dist(fx, fy, x, y);
      if (d < 22) out.push({ pri: 0, d, label: 'Говорить: ' + NPCS[n.id].name, x, y: y - 30, run: () => n.talk() });
    }
    for (const b of World.buildings) {
      const x = b.doorX * TILE + 8, y = b.doorY * TILE + 8;
      const d = dist(fx, fy, x, y);
      if (d > 19) continue;
      const del = st.delivery && ((st.delivery.stage === 'pickup' && st.delivery.from === b.id) || (st.delivery.stage === 'drop' && st.delivery.to === b.id));
      const lbl = del ? (st.delivery.stage === 'pickup' ? 'Забрать заказ: ' : 'Доставить: ') + b.name
        : b.res ? 'Подъезд: ' + b.name
          : b.id === 'akorda' ? 'Смотреть: Акорда'
            : 'Войти: ' + (b.id === 'realty' && st.flags.ownFlat ? 'Моя квартира' : b.id === 'home' ? 'Дом 12' : b.name);
      out.push({ pri: 1, d, label: lbl, x, y: b.base - 36, run: () => Content.enter(b) });
    }
    for (const s of World.busStops) {
      const d = dist(fx, fy, s.x, s.y);
      if (d < 18) out.push({ pri: 2, d, label: `Автобус: «${s.name}»`, x: s.x, y: s.y - 40, run: () => Content.busTravel(s) });
    }
    for (const d0 of World.decor) {
      const d = dist(fx, fy, d0.x, d0.y - 4);
      if (d0.kind === 'cat' && d < 18 && !['found', 'done'].includes(G.flag('catQuest'))) {
        out.push({
          pri: 2, d, label: 'Погладить кота', x: d0.x, y: d0.y - 18,
          run: async () => {
            if (G.flag('catQuest') === 'asked') { G.flag('catQuest', 'found'); Sfx.play('success'); await UI.say(null, 'Рыжий кот мурлычет и сам забирается к тебе на руки. Это точно Барсик! Отнеси его Аружан у дома 12.'); }
            else { G.add('mood', 2); await UI.say(null, 'Рыжий кот щурится и мурлычет. На ошейнике написано «Барсик».'); }
          },
        });
      }
      if (d0.kind === 'bench' && d < 14) out.push({ pri: 3, d, label: 'Посидеть на скамейке', x: d0.x, y: d0.y - 16, run: benchSit });
      if (d0.kind === 'fountain' && d < 32 && G.season() !== 'winter') out.push({ pri: 3, d, label: 'Бросить монетку в фонтан', x: d0.x, y: d0.y - 50, run: fountainCoin });
      if (d0.kind === 'wheel' && dist(fx, fy, d0.x, d0.y + 10) < 30) out.push({ pri: 1, d, label: 'Войти: Ботанический сад и колесо', x: d0.x, y: d0.y - 120, run: () => Content.openPlace('wheel') });
      if (d0.kind === 'stele' && d < 22) out.push({ pri: 3, d, label: 'Смотреть: монумент «Қазақ Елі»', x: d0.x, y: d0.y - 126, run: () => UI.say(null, 'Монумент «Қазақ Елі» — белая стела высотой 91 метр, в честь 1991 года, когда Казахстан стал независимым. На вершине — золотая птица Самрук.') });
      if (d0.kind === 'yurt' && d < 30) out.push({ pri: 3, d, label: 'Юрта: этно-аул', x: d0.x, y: d0.y - 44, run: yurt });
    }
    for (const ped of Ents.peds) {
      const d = dist(fx, fy, ped.x, ped.y - 4);
      if (d < 16) out.push({ pri: 4, d, label: 'Заговорить с прохожим', x: ped.x, y: ped.y - 34, run: () => pedTalk(ped) });
    }
    out.sort((a, b) => a.pri - b.pri || a.d - b.d);
    return out[0] || null;
  }

  async function benchSit() {
    await UI.fade(G.season() === 'winter' ? 'Скамейка холодная, но вид красивый…' : 'Ты сидишь и смотришь на город…', async () => G.advance(15));
    G.add('energy', 3); G.add('mood', G.temp() < -10 ? -1 : 3);
  }
  async function fountainCoin() {
    if (!G.once('fountain')) { await UI.say(null, 'Ты уже загадывал желание сегодня. Фонтан не любит жадных.'.replace('загадывал', gx('загадывал', 'загадывала'))); return; }
    if (!G.pay(100)) return;
    G.add('mood', 4);
    await UI.say(null, 'Монетка блеснула и ушла на дно. Говорят, так обязательно вернёшься в Астану.');
  }
  async function yurt() {
    const c = await UI.ask(null, 'Киіз үй — войлочная юрта. Наверху — шаңырақ, круглый купол, тот самый, что на гербе Казахстана. Внутри предлагают кумыс и баурсаки.', [`Кумыс и баурсаки — ${fmtMoney(1000)}`, 'Просто посмотреть']);
    if (c === 0 && G.pay(1000)) { G.advance(20); G.add('food', 15); G.add('mood', 8); UI.toast('Кумыс бодрит! Настроение +8', 'good'); }
  }
  function pedTalk(ped) {
    const winter = G.season() === 'winter';
    const lines = winter && chance(0.5) ? PED_LINES_WINTER : PED_LINES;
    ped.bubble = { text: lines[ped.lineIdx % lines.length], until: Render.now() + 4 };
    ped.lineIdx++;
    ped.pause = 3;
    const p = Ents.player;
    ped.dir = Math.abs(p.x - ped.x) > Math.abs(p.y - ped.y) ? (p.x < ped.x ? 1 : 2) : (p.y < ped.y ? 3 : 0);
    if (G.once('ped_' + (ped.lineIdx % 50))) G.addXp('charm', 0.03);
    return Promise.resolve();
  }

  async function runEvent(fn) {
    eventRunning = true;
    try { await fn(); } catch (e) { console.error(e); }
    eventRunning = false;
    Quests.tick();
  }

  let autosave = 60;
  function update(dt) {
    autosave -= dt;
    if (autosave <= 0) { autosave = 60; G.save(); }
    const blocked = UI.blocking() || eventRunning;
    if (blocked) { UI.hint(null); near = null; return; }
    if (G.events.length) { runEvent(G.events.shift()); return; }
    const v = Input.vector();
    Ents.movePlayer(v.x, v.y, dt, 74 * G.speedMul());
    G.advance(dt * GAME_MIN_PER_SEC, { outdoor: true, walking: Ents.player.moving });
    Ents.updatePeds(dt);
    Ents.updateCars(dt, (c) => { if (chance(0.5)) Sfx.play('honk'); });
    questTimer -= dt;
    if (questTimer <= 0) { questTimer = 0.5; Quests.tick(); }
    districtTimer -= dt;
    if (districtTimer <= 0) {
      districtTimer = 0.6;
      const d = World.district(Ents.player.x, Ents.player.y);
      if (d !== district) { if (district) UI.banner(d); district = d; }
    }
    const card = Life.cardNear(Ents.player.x, Ents.player.y - 4);
    if (card) Life.collect(card);
    near = interactables();
    UI.hint(near ? near.label : null);
    if (Input.take('action') && near) { Sfx.play('click'); Device.buzz(12); const n = near; runEvent(() => n.run()); }
    if (Input.take('phone')) { Sfx.play('click'); UI.openPhone('quests'); }
    if (Input.take('map')) { Sfx.play('click'); UI.openPhone('map'); }
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playing) update(dt);
    Render.frame(dt, { near: playing && near ? near : null, snap: snapCam });
    snapCam = false;
    if (playing) UI.updateHud();
    requestAnimationFrame(loop);
  }

  function startPlay(isNew) {
    const s = G.s;
    Ents.placePlayer(Math.floor(s.pos.x), Math.floor(s.pos.y));
    if (!isNew) { Ents.player.x = s.pos.x * TILE; Ents.player.y = s.pos.y * TILE; }
    Ents.player.dir = s.pos.dir || 0;
    Ents.spawnPeds(42, G.season() === 'winter');
    Ents.spawnCars(26);
    document.getElementById('hud').hidden = false;
    playing = true;
    Device.keepAwake();
    snapCam = true;
    district = World.district(Ents.player.x, Ents.player.y);
    if (!startPlay.bound) {
      startPlay.bound = true;
      document.addEventListener('visibilitychange', () => { if (document.hidden && playing) G.save(); });
    }
    if (isNew) G.events.push(intro);
    else UI.toast(`С возвращением, ${s.name}! ${fmtDate(s.day)}, ${fmtClock(s.min)}`, 'info');
    Quests.tick();
  }

  async function intro() {
    const s = G.s;
    await UI.fade(`Поезд «${s.base.from === 'аул под Туркестаном' ? 'Туркестан' : s.base.from} — Астана» прибывает на вокзал «Астана-1»…`);
    await UI.say(null, 'Ты выходишь из старого вокзала с часами на башне. Морозный ветер, огромное небо, а далеко на юге, за рекой, блестит золотой шар Байтерека.');
    Sfx.play('ring');
    await UI.say('dauren', `Алло, ${s.name}! Ну что, ${gx('приехал', 'приехала')}? Добро пожаловать в столицу!`);
    await UI.say('dauren', 'Слушай: я договорился с Гульнар-апай, она сдаст тебе комнату. Дом 12 на Сарыарке — от вокзала пару кварталов на юг, у улицы Кенесары.');
    await UI.say('dauren', 'Как устроишься — заходи ко мне в «Жылдам», это курьерская служба рядом с кофейней. Работу найдём!');
    UI.toast('Иди за жёлтой стрелкой. Телефон с картой и заданиями — кнопка справа вверху.', 'info');
  }

  async function boot(data) {
    World.gen();
    Device.init();
    // установка на главный экран (PWA) — только когда игра открыта с сервера, а не одним файлом
    if ('serviceWorker' in navigator && location.protocol.startsWith('http') && document.querySelector('link[rel="manifest"]')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    Render.init(document.getElementById('view'));
    Input.init();
    UI.initHud();
    requestAnimationFrame(loop);
    if (data && data.save && G.load(data.save)) { startPlay(false); return; }
    const choice = await UI.title(G.hasSave());
    if (choice === 'load' && G.load()) { startPlay(false); return; }
    const prof = await UI.creator();
    G.start(prof);
    startPlay(true);
  }

  return { boot };
})();

window.__back = () => {
  if (UI.blocking()) return UI.back();
  return false;
};

(function start() {
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    hot.snapshot(() => {
      if (!G.s) return {};
      const p = Ents.player;
      G.s.pos = { x: p.x / TILE, y: p.y / TILE, dir: p.dir };
      return { save: JSON.parse(JSON.stringify(G.s)) };
    });
  }
  const go = (data) => Main.boot(data || {});
  if (hot && hot.ready) hot.ready(go); else go((hot && hot.data) || {});
})();
