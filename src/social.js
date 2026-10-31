'use strict';
// Экран разговора: у каждого персонажа свои любимые темы, юмор и вкус к комплиментам.
// За разговор можно набрать до трёх звёзд — от них растут отношения.

const TOPICS = {
  weather: { n: 'Погода', i: 'sun' }, food: { n: 'Еда', i: 'bowl' }, music: { n: 'Музыка', i: 'note' },
  sport: { n: 'Спорт', i: 'ball' }, cinema: { n: 'Кино', i: 'film' }, fashion: { n: 'Мода', i: 'shirt' },
  tech: { n: 'Технологии', i: 'laptop' }, art: { n: 'Искусство', i: 'flower' }, travel: { n: 'Путешествия', i: 'map' },
  family: { n: 'Семья', i: 'person' }, city: { n: 'Астана', i: 'star' }, money: { n: 'Работа и деньги', i: 'coin' },
  kaz: { n: 'Казахский язык', i: 'talk' },
};

const TRAITS = {
  gulnar: { likes: ['family', 'food', 'kaz'], dislike: 'tech', joke: 0.45, compl: 0.85 },
  dauren: { likes: ['sport', 'money', 'food'], dislike: 'art', joke: 0.9, compl: 0.5 },
  aigerim: { likes: ['art', 'music', 'city'], dislike: 'money', joke: 0.6, compl: 0.7, flirt: 0.6 },
  arman: { likes: ['tech', 'money', 'sport'], dislike: 'fashion', joke: 0.5, compl: 0.4 },
  saule: { likes: ['kaz', 'family', 'travel'], dislike: 'sport', joke: 0.35, compl: 0.6 },
  erzhan: { likes: ['food', 'money', 'weather'], dislike: 'tech', joke: 0.85, compl: 0.5 },
  timur: { likes: ['art', 'city', 'travel'], dislike: 'money', joke: 0.7, compl: 0.6, flirt: 0.6 },
  zhanel: { likes: ['travel', 'food', 'music'], dislike: 'weather', joke: 0.6, compl: 0.7, flirt: 0.6 },
  alikhan: { likes: ['city', 'art', 'tech'], dislike: 'sport', joke: 0.45, compl: 0.65, flirt: 0.55 },
};

const TOPIC_LINES = {
  weather: ['Говорят, завтра опять −25. Я уже достал(а) второй пуховик.', 'В Астане погода меняется пять раз за день. Это закаляет.'],
  food: ['О, бешбармак! Только мясо надо резать руками, иначе не то.', 'Лучшие баурсаки — у бабушки. Это научный факт.'],
  music: ['Я вчера слушал(а) домбру на бульваре — мурашки!', 'Знаешь «Ақ орда»? Её на каждом тое поют.'],
  sport: ['«Астана» в этом сезоне в отличной форме!', 'Я по утрам бегаю вдоль Есиля. Ну, иногда.'],
  cinema: ['Новый казахстанский фильм — очень сильный, советую.', 'Кино в Хан Шатыре — лучший способ пережить зиму.'],
  fashion: ['Калпак снова в моде, видишь?', 'Пуховик и стиль — вещи совместимые. Почти.'],
  tech: ['У нас тут все стартапы делают. Каждый второй — айтишник.', 'Я заказываю всё через приложения. Даже баурсаки.'],
  art: ['В музее в EXPO — как в будущем. Сходи обязательно.', 'Казахский орнамент — это же целый язык.'],
  travel: ['Мечтаю съездить в Алматы, в горы. Хоть на выходные.', 'В Туркестане мавзолей Яссауи — невероятный. Съезди обязательно.'],
  family: ['Мама звонит каждый день. Спрашивает, поел(а) ли я.', 'У нас дома по выходным собирается вся родня.'],
  city: ['Ты знаешь, что Хан Шатыр и пирамиду проектировал один архитектор?', 'Я помню, когда на левом берегу была степь.'],
  money: ['Зарплату получил(а) — и уже нет. Магия.', 'Говорят, в IT хорошо платят. Может, переучиться?'],
  kaz: ['Қазақша сөйлейсің бе? Керемет!', 'Казахский красивый, особенно в песнях.'],
};
const DISLIKE_LINES = ['Ой… давай не об этом.', 'Хм. Это не моя тема, если честно.', 'Скучновато… Давай про что-нибудь другое?'];
const NEUTRAL_LINES = ['Ага, интересно.', 'Ну да, наверное.', 'Хм, никогда об этом не думал(а).'];
const JOKE_OK = ['Ха-ха-ха! Ну ты даёшь!', 'Ой, не могу, ха-ха!', 'Это было смешно. Правда смешно.'];
const JOKE_BAD = ['…', 'Это была шутка? Ладно.', 'Не понял(а)… В смысле, не смешно.'];
const COMPL_OK = ['Ой, спасибо! Приятно.', 'Как приятно! Рақмет.', 'Мне такое редко говорят.'];
const COMPL_BAD = ['Ты это всем говоришь?', 'Спасибо… наверное.', 'Мы же только что об этом говорили.'];
const FLIRT_OK = ['Ты флиртуешь? …Продолжай.', 'Ох. Я, кажется, покраснел(а).', 'С тобой опасно разговаривать — сердце скачет.'];
const FLIRT_BAD = ['Эм… давай не так быстро.', 'Это было неловко.', 'Не сегодня, ладно?'];

const Social = (() => {
  const s = () => G.s;
  // «(а)» в репликах персонажа — по его полу
  const npcG = (id, t) => t.replace(/(\S+)\((а|ла)\)/g, (m, w, end) => (NPCS[id] && NPCS[id].look.female ? w + end : w));

  function known(id) {
    const st = s();
    st.known[id] = st.known[id] || { likes: [], dislike: null };
    return st.known[id];
  }

  const sprite = (L, dir) => Art.sprite(L, dir, 3).toDataURL();

  function hearts(id) {
    const r = s().rel[id] || 0;
    const full = Math.round(r / 20);
    return '♥'.repeat(full) + '♡'.repeat(5 - full);
  }

  function open(id, opts = {}) {
    return new Promise((resolve) => {
      const st = s();
      const tr = TRAITS[id] || { likes: [], dislike: null, joke: 0.5, compl: 0.5 };
      const daily = G.once('conv_' + id);
      let stars = 0, turns = 4 + (G.lv('charm') >= 3 ? 1 : 0), complCount = 0, busy = false;
      const usedTopics = new Set();
      let text = opts.greet || pick(['Привет! Как дела?', 'О, привет! Рад(а) тебя видеть.', 'Сәлем! Что нового?']);
      text = npcG(id, text);
      if (st.hyg < 25) text = `Эм… привет. Ты давно в душе ${gx('был', 'была')}? Ладно, не моё дело.`;
      const el = document.createElement('div');
      el.className = 'talk';
      el.style.setProperty('--tone', UI.toneOf(opts.loc) || '#2a5a80');
      UI.pushModal(el);
      const me = sprite(G.look(), 2), them = sprite(NPCS[id].look, 1);
      let mode = 'main';

      const finish = () => {
        el.remove();
        UI.popModal(el);
        if (daily) {
          const gain = stars >= 3 ? 6 : stars >= 2 ? 4 : stars >= 1 ? 2 : stars < 0 ? -2 : 0;
          if (gain) G.addRel(id, gain);
        }
        if (stars >= 3) { st.talks3++; UI.toast('Отличный разговор! ★★★', 'quest'); Life.checkMedals(); }
        resolve(stars);
      };

      function starHtml() {
        let out = '';
        for (let i = 1; i <= 3; i++) out += `<i class="${stars >= i ? 'on' : stars >= i - 0.5 ? 'half' : ''}"></i>`;
        return out;
      }

      function actions() {
        const out = [{ k: 'topic', label: 'Поговорить о…', icon: 'chat' }, { k: 'joke', label: 'Пошутить', icon: 'joke' }, { k: 'compl', label: 'Комплимент', icon: 'star' }];
        const dater = Romance.isDater(id);
        const l = st.love;
        if (dater && ((st.rel[id] || 0) >= 25 || l.partner === id)) out.push({ k: 'flirt', label: 'Флиртовать', icon: 'heart' });
        const gifts = Object.keys(st.inv).filter((g) => ITEMS[g] && ITEMS[g].gift && st.inv[g] > 0);
        if (gifts.length) out.push({ k: 'gift', label: 'Подарить', icon: 'gift', end: false });
        if (dater && !st.flags['phone_' + id] && (st.rel[id] || 0) < 40) out.push({ k: 'number', label: 'Взять номер', icon: 'phone', disabled: stars < 2 ? 'нужно ★★' : null });
        if (dater && ((st.rel[id] || 0) >= 50 || l.partner === id)) out.push({ k: 'date', label: 'Позвать на свидание', icon: 'ticket', disabled: Romance.canDateNow() ? null : 'вечером или в выходные' });
        if (dater && (st.rel[id] || 0) >= 70 && !l.partner && (l.dates[id] || 0) >= 2) out.push({ k: 'confess', label: 'Признаться в чувствах', icon: 'heart' });
        if (dater && l.partner === id && !l.engaged && (st.rel[id] || 0) >= 90) out.push({ k: 'propose', label: 'Сделать предложение', icon: 'ring', disabled: !st.flags.ownFlat ? 'нужна своя квартира' : !G.has('ring') ? 'нужно кольцо' : null });
        for (const x of opts.extra || []) out.push(Object.assign({ k: 'extra' }, x));
        out.push({ k: 'bye', label: 'Попрощаться', icon: 'hand' });
        return out;
      }

      function render() {
        const kn = known(id);
        const likes = tr.likes.map((t) => (kn.likes.includes(t) ? TOPICS[t].n : '?')).join(', ');
        const acts = mode === 'main' ? actions() : null;
        const topics = mode === 'topic' ? topicOffer() : null;
        el.innerHTML = `
          <div class="talk-stage">
            <div class="talk-head">
              <div class="talk-stars" aria-label="Звёзды разговора: ${stars}">${starHtml()}</div>
              <div class="talk-turns">${'<b></b>'.repeat(Math.max(0, turns))}</div>
            </div>
            <div class="talk-bubble fx-paper"><p>${escapeHtml(text)}</p></div>
            <img class="talk-me" alt="" src="${me}">
            <img class="talk-npc" alt="" src="${them}">
            <div class="talk-tag fx-panel"><b>${escapeHtml(NPCS[id].name)}</b><span class="hearts">${hearts(id)}</span><small>${escapeHtml(UI.relLabel(id))}</small>${tr.likes.length ? `<small>Любит: ${escapeHtml(likes)}${kn.dislike ? ` · не любит: ${escapeHtml(TOPICS[kn.dislike].n)}` : ''}</small>` : ''}</div>
          </div>
          <div class="talk-acts">
            ${acts ? acts.map((a, i) => `<button class="tile ${a.disabled ? 'is-off' : ''}" data-a="${i}">${UIKit.img(a.icon)}<span><b>${escapeHtml(a.label)}</b>${a.disabled ? `<small>${escapeHtml(a.disabled)}</small>` : ''}</span></button>`).join('') : ''}
            ${topics ? topics.map((t) => `<button class="tile" data-t="${t}">${UIKit.img(TOPICS[t].i)}<span><b>${TOPICS[t].n}</b>${kn.likes.includes(t) ? '<small>любит</small>' : kn.dislike === t ? '<small>не любит</small>' : ''}</span></button>`).join('') + '<button class="tile" data-back>' + UIKit.img('back') + '<span><b>Назад</b></span></button>' : ''}
          </div>`;
        el._acts = acts;
      }

      let offer = null;
      function topicOffer() {
        if (offer) return offer;
        const all = Object.keys(TOPICS).filter((t) => !usedTopics.has(t));
        const sure = tr.likes.filter((t) => !usedTopics.has(t));
        const res = [];
        if (sure.length) res.push(pick(sure));
        while (res.length < Math.min(6, all.length)) { const t = pick(all); if (!res.includes(t)) res.push(t); }
        offer = res.sort(() => Math.random() - 0.5);
        return offer;
      }

      const odds = (base) => clamp(base + G.lv('charm') * 0.05 + (st.mood > 60 ? 0.05 : st.mood < 30 ? -0.1 : 0) - (st.hyg < 25 ? 0.2 : 0), 0.05, 0.95);

      async function spend(next, delta) {
        stars = clamp(stars + delta, -1, 3);
        text = npcG(id, next);
        turns--;
        Sfx.play(delta > 0 ? 'coin' : delta < 0 ? 'error' : 'tick');
        if (delta > 0) Device.buzz(15);
        render();
        el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
        if (turns <= 0) {
          busy = true;
          await wait(900);
          text = npcG(id, stars >= 2 ? 'Ой, мне пора! Было приятно поболтать.' : 'Ладно, мне пора работать.');
          render();
          await wait(1100);
          finish();
        }
      }

      el.addEventListener('click', async (e) => {
        if (busy || UI.topModal() !== el) return;
        const back = e.target.closest('[data-back]');
        if (back) { mode = 'main'; render(); return; }
        const tb = e.target.closest('[data-t]');
        if (tb) {
          const t = tb.dataset.t, kn = known(id);
          usedTopics.add(t); mode = 'main';
          if (tr.likes.includes(t)) { if (!kn.likes.includes(t)) kn.likes.push(t); await spend(pick(TOPIC_LINES[t]), 1); }
          else if (tr.dislike === t) { kn.dislike = t; await spend(pick(DISLIKE_LINES), -1); }
          else await spend(chance(odds(0.35)) ? pick(TOPIC_LINES[t]) : pick(NEUTRAL_LINES), chance(odds(0.35)) ? 0.5 : 0);
          return;
        }
        const b = e.target.closest('[data-a]');
        if (!b) return;
        const a = el._acts[+b.dataset.a];
        if (a.disabled) { Sfx.play('error'); UI.toast(a.disabled, 'bad'); return; }
        Sfx.play('click');
        busy = true;
        try {
          if (a.k === 'topic') { mode = 'topic'; offer = null; render(); }
          else if (a.k === 'joke') { const ok = chance(odds(tr.joke)); await spend(pick(ok ? JOKE_OK : JOKE_BAD), ok ? 1 : -0.5); }
          else if (a.k === 'compl') { complCount++; const ok = complCount < 2 && chance(odds(tr.compl + Math.min(3, Romance.styleScore()) * 0.04)); await spend(pick(ok ? COMPL_OK : COMPL_BAD), ok ? 1 : complCount >= 2 ? -0.5 : 0); }
          else if (a.k === 'flirt') { const ok = chance(odds((tr.flirt || 0.3) + ((st.rel[id] || 0) - 40) / 200)); await spend(pick(ok ? FLIRT_OK : FLIRT_BAD), ok ? 1.5 : -1); if (ok) G.addRel(id, 2); }
          else if (a.k === 'number') { st.flags['phone_' + id] = true; await spend('Записывай: восемь, семь-семь-семь… Звони!', 0.5); UI.toast(`${NPCS[id].name} теперь в контактах`, 'info'); }
          else if (a.k === 'gift') { el.hidden = true; const gifts = Object.keys(st.inv).filter((g) => ITEMS[g] && ITEMS[g].gift && st.inv[g] > 0); const before = st.rel[id]; await Romance.giveGift(id, gifts); el.hidden = false; stars = clamp(stars + (st.rel[id] > before ? 1 : 0), -1, 3); render(); }
          else if (a.k === 'date') { finish(); await Romance.goOnDate(id); return; }
          else if (a.k === 'confess') { finish(); await Romance.confess(id); return; }
          else if (a.k === 'propose') { finish(); await Romance.propose(id); return; }
          else if (a.k === 'extra') { el.hidden = true; await a.run(); el.hidden = false; if (a.end) { finish(); return; } render(); }
          else if (a.k === 'bye') { finish(); return; }
        } finally { busy = false; }
      });
      render();
    });
  }

  return { open, TRAITS, known };
})();
