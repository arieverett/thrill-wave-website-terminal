/* Thrill Wave terminal: easter eggs (Oct 12, 2026).
   1. "wake up..." : after a minute with no input, the screen types the Matrix wake-up lines and offers
      to follow the white rabbit into the secret break room (once per visit; never over the intro,
      a playing film, a game or the break room).
   2. credits : type "credits" or the Konami code (up up down down left right left right b a), or tap the clock
      in the corner 5 times on a phone. The site rolls its own end credits to its own song (only when the
      music is already on) and ends on "a thrill wave film".
   3. blue pill : "blue pill" next to skip on the intro, the "blue pill" label on the top right of the outer
      frame, [07] blue pill in the menu, typing "bluepill", or the end of the credits.
      The frame label and menu item ask first, then power the system down like on / off,
      type "you chose comfort. goodbye." and leave for thrillwave.com. */
(function twEasterEggs() {
  'use strict';
  if (window.__twEasterEggs) return;
  window.__twEasterEggs = true;

  var HOME = 'https://thrillwave.com/';
  var IDLE_MS = window.__twIdleMs || 60000;
  var BLUE = '#3d8bff';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  function muted() { return store.get('tw_audio_muted') === '1'; }

  // ---------- styles ----------
  var css = document.createElement('style');
  css.textContent = [
    ':root{--tw-blue:' + BLUE + '}',
    '.tw-egg{position:fixed;inset:0;z-index:2147483000;background:#000;color:var(--fg,#fff);font-family:var(--font,ui-monospace,Menlo,monospace);',
    'font-size:14px;line-height:1.58;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .6s ease}',
    '.tw-egg.is-on{opacity:1}',
    '.tw-egg .welcome-line{font-size:14px!important;line-height:1.58!important;white-space:pre!important}',
    '.tw-egg .welcome-text{margin-bottom:0}',
    '.tw-egg__actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:48px;opacity:0;pointer-events:none}',
    '.tw-egg__actions.is-on{opacity:1;pointer-events:auto}',
    // buttons: the same look as "click to start" (white, 1px white border), green or neon blue on hover
    '.tw-egg__btn{font-family:var(--font);font-size:11.6px;font-weight:500;color:var(--fg,#fff);background:transparent;border:1px solid var(--fg,#fff);',
    'border-radius:4px;padding:9px 17px;height:29px;box-sizing:border-box;display:inline-flex;align-items:center;letter-spacing:1.6px;line-height:1;',
    'text-transform:lowercase;cursor:pointer;text-decoration:none;transition:color .18s ease,border-color .18s ease,text-shadow .18s ease}',
    '.tw-egg__btn:hover,.tw-egg__btn:focus-visible{color:var(--accent);border-color:var(--accent);outline:none}',
    '.tw-egg__btn--blue:hover,.tw-egg__btn--blue:focus-visible{color:var(--tw-blue);border-color:var(--tw-blue);text-shadow:0 0 8px rgba(61,139,255,.55)}',
    // credits
    '.tw-egg--credits{display:block;overflow:hidden}',
    '.tw-egg__roll{width:min(520px,calc(100% - 48px));margin:0 auto;padding-top:100vh;will-change:transform}',
    '.tw-egg__title{text-align:center;letter-spacing:2px;margin:0 0 2.6em}',
    '.tw-egg__row{display:flex;justify-content:space-between;align-items:baseline;gap:20px;margin:.3em 0}',
    '.tw-egg__row span:first-child{color:var(--muted);flex:0 0 auto}',
    '.tw-egg__row span:last-child{text-align:right}',
    '.tw-egg__stack{text-align:center;margin:.3em 0}',
    '.tw-egg__stack span{display:block}',
    '.tw-egg__stack span:first-child{color:var(--muted);margin-bottom:.3em}',
    '.tw-egg__gap{height:2.2em}',
    '.tw-egg__card{margin-top:75vh;text-align:center;letter-spacing:.3em}',
    '.tw-egg__end{position:absolute;left:0;right:0;bottom:14vh;display:flex;justify-content:center;padding:0 24px}',
    '.tw-egg__end .tw-egg__actions{margin-top:0;justify-content:center}',
    '@media (max-width:720px){.tw-egg,.tw-egg .welcome-line{font-size:13px!important}',
    '.tw-egg__btn{font-size:10.5px;height:28px;padding:8px 14px}.tw-egg__row{gap:14px}}',
    '@media (prefers-reduced-motion:reduce){.tw-egg--credits{overflow:auto}.tw-egg__roll{padding:10vh 0 0}.tw-egg__card{margin-top:3em}',
    '.tw-egg__end{position:static;margin:2.5em 0 10vh}}',
    // blue pill on the intro (left of skip), on the outer frame and in the menu
    '.controls .tw-controls-sep{color:var(--muted);font-size:9.5px;align-self:center;user-select:none}',
    '.controls #bluepill-btn:hover,.controls #bluepill-btn:focus-visible{color:var(--tw-blue);text-shadow:0 0 8px rgba(61,139,255,.55);outline:none}',
    '.frame-label--tr{top:var(--tw-frame-label-y,-7px)!important;right:var(--tw-frame-label-x,22px)!important;left:auto!important;bottom:auto!important;cursor:pointer;pointer-events:auto!important}',
    'a.frame-label--tr:hover,a.frame-label--tr:focus-visible,.bluepill-modal-open .frame-label--tr{color:var(--tw-blue)!important;outline:none}',
    '#side-menu .menu-item--bluepill:hover .name,#side-menu .menu-item--bluepill:focus-visible .name,#side-menu .menu-item--bluepill:hover .num,#side-menu .menu-item--bluepill:focus-visible .num{color:var(--tw-blue)!important}',
    '#bluepill-modal .power-modal__btn--confirm:hover,#bluepill-modal .power-modal__btn--confirm:focus-visible{color:var(--tw-blue)!important;border-color:var(--tw-blue)!important}'
  ].join('');
  document.head.appendChild(css);

  // ---------- shared overlay ----------
  var open = null, onClose = null;
  function overlay(extra) {
    close();
    var el = document.createElement('div');
    el.className = 'tw-egg' + (extra ? ' ' + extra : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    open = el;
    return el;
  }
  function close() {
    if (!open) return;
    var el = open; open = null;
    var fn = onClose; onClose = null;
    if (fn) fn();
    el.classList.remove('is-on');
    setTimeout(function () { el.remove(); }, 600);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function button(label, cls, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tw-egg__btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  // Typed lines in the look of the opening "hi. / welcome to thrill wave." gate: white mono lines with a "> "
  // prompt and one blinking block cursor that moves down line by line (styles from .welcome-* in styles.css).
  // Every line exists from the start (empty), so the block never shifts or resizes while it types.
  function typedBlock(el, count) {
    var inner = document.createElement('div'); inner.className = 'welcome-inner'; el.appendChild(inner);
    var text = document.createElement('div'); text.className = 'welcome-text'; inner.appendChild(text);
    var cursor = document.createElement('span'); cursor.className = 'welcome-cursor';
    var lines = [];
    for (var n = 0; n < count; n++) {
      var l = document.createElement('div'); l.className = 'welcome-line';
      var t = document.createElement('span'); t.className = 'line-text'; l.appendChild(t);
      text.appendChild(l); lines.push(t);
    }
    return {
      inner: inner,
      type: function (i, str, speed) {
        var target = lines[i];
        target.parentNode.appendChild(cursor);
        if (reduce) { target.textContent = str; return Promise.resolve(); }
        var k = 0;
        return new Promise(function (done) {
          (function step() {
            if (!el.isConnected || k >= str.length) return done();
            target.textContent += str[k++];
            setTimeout(step, speed || 42);
          })();
        });
      }
    };
  }

  // ---------- 1. wake up ----------
  var idleTimer;
  function busy() {
    var body = document.body;
    if (open || document.hidden || !body) return true;
    // not during the opening (welcome gate, boot) or a power-down
    var gate = document.getElementById('welcome-gate');
    if (gate && !gate.classList.contains('gone')) return true;
    var boot = document.getElementById('boot-root');
    if (boot && boot.classList.contains('boot-running')) return true;
    if (body.classList.contains('tw-powering-down') || body.classList.contains('power-modal-open') ||
        body.classList.contains('bluepill-modal-open')) return true;
    // not in the break room or a game (the room is open while the terminal is minimized)
    if (body.classList.contains('tw-terminal-minimized') || body.classList.contains('tw-breakroom-game-active')) return true;
    // never over a film someone is watching with sound
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i], src = f.getAttribute('src') || '';
      if (!src || src === 'about:blank' || /muted=1/.test(src)) continue; // silent background loops don't count
      var cs = getComputedStyle(f);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      var r = f.getBoundingClientRect();
      if (r.width && r.height && r.bottom > 0 && r.top < innerHeight) return true;
    }
    return false;
  }
  function armIdle() {
    clearTimeout(idleTimer);
    if (store.get('tw-woke')) return;
    idleTimer = setTimeout(wakeUp, IDLE_MS);
  }
  function wakeUp(force) {
    if (force !== true && busy()) return armIdle();
    store.set('tw-woke', '1');
    var el = overlay();
    var block = typedBlock(el, 3);
    var acts = document.createElement('div'); acts.className = 'tw-egg__actions';
    acts.appendChild(button('knock, knock', '', function () { close(); openBreakroom(); }));
    acts.appendChild(button('stay asleep', '', close));
    block.inner.appendChild(acts);
    (async function () {
      await wait(700);
      var lines = ['> wake up...', '> the story has you...', '> follow the white rabbit.'];
      for (var i = 0; i < lines.length; i++) {
        await block.type(i, lines[i], 70);
        await wait(reduce ? 200 : 1100);
        if (!el.isConnected) return;
      }
      acts.classList.add('is-on');
    })();
  }
  function openBreakroom() {
    // The break room opens from the dot in the terminal's title bar
    var dot = document.querySelector('.terminal.main .terminal-bar .terminal-dots');
    if (dot) { dot.scrollIntoView({ block: 'center' }); dot.click(); }
  }
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (t) {
    window.addEventListener(t, armIdle, { passive: true, capture: true });
  });
  armIdle();

  // ---------- 2. credits ----------
  var CREDITS = [
    ['title', 'thrill_wave'],
    ['row', 'producer', 'ari everett'],
    ['row', 'director / dp', 'tony swann'],
    ['row', 'strategy & sitrep', 'chris kuzman'],
    ['gap'],
    ['row', 'written, shot and cut in', 'phoenix, az'],
    ['row', 'founded', '2018'],
    ['gap'],
    ['row', 'site', 'v3.2.402 · build 459'],
    ['row', 'lineage', 'wordpress → wix → v3'],
    ['row', 'releases shipped', '402'],
    ['gap'],
    ['stack', 'special thanks', 'everyone who took the red pill'],
    ['card', 'a thrill wave film']
  ];
  var song = null;
  function decks() { return [document.getElementById('bg-audio'), document.getElementById('break-audio')]; }
  function musicOn() {
    if (muted()) return false;
    var api = window.twBreakRoomAudio;
    if (api && api.isAnyAudible) return !!api.isAnyAudible();
    return decks().some(function (d) { return d && !d.paused && !d.muted; });
  }
  function stopSong() {
    if (!song) return;
    try { song.pause(); song.currentTime = 0; } catch (e) {}
  }
  function rollCredits() {
    // Mic drop: if the music is on, the house song stops and the credits song takes over
    var hadMusic = musicOn();
    var el = overlay('tw-egg--credits');
    if (hadMusic) {
      decks().forEach(function (d) { if (d) try { d.pause(); } catch (e) {} });
      try {
        if (!song) { song = new Audio('assets/audio/credits.mp3'); song.preload = 'auto'; }
        song.currentTime = 0; song.volume = 0.4; song.muted = false;
        var p = song.play(); if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
    onClose = function () {
      stopSong();
      if (hadMusic && !muted() && window.twBreakRoomAudio) { try { window.twBreakRoomAudio.playCurrent(); } catch (e) {} }
    };

    var roll = document.createElement('div'); roll.className = 'tw-egg__roll';
    var card;
    CREDITS.forEach(function (c) {
      var n = document.createElement('div');
      if (c[0] === 'title') { n.className = 'tw-egg__title'; n.textContent = c[1]; }
      else if (c[0] === 'gap') { n.className = 'tw-egg__gap'; }
      else if (c[0] === 'card') { n.className = 'tw-egg__card'; n.textContent = c[1]; card = n; }
      else {
        n.className = c[0] === 'stack' ? 'tw-egg__stack' : 'tw-egg__row';
        var a = document.createElement('span'); a.textContent = c[1];
        var b = document.createElement('span'); b.textContent = c[2];
        n.appendChild(a); n.appendChild(b);
      }
      roll.appendChild(n);
    });
    el.appendChild(roll);

    var end = document.createElement('div'); end.className = 'tw-egg__end';
    var acts = document.createElement('div'); acts.className = 'tw-egg__actions';
    acts.appendChild(button('stay in the matrix', '', close));
    acts.appendChild(button('take the blue pill', 'tw-egg__btn--blue', function () {
      onClose = null; stopSong(); bluePill();
    }));
    end.appendChild(acts); el.appendChild(end);
    var show = function () { acts.classList.add('is-on'); };
    el.addEventListener('click', function (e) { if (!e.target.closest('.tw-egg__actions')) show(); });
    if (reduce) { show(); return; }

    // Roll until "a thrill wave film" sits alone in the middle of the screen, whatever the screen size
    var anim = null;
    function endY() { return -(card.offsetTop + card.offsetHeight / 2 - innerHeight / 2); }
    function frames(y) {
      return [{ transform: 'translateY(0px)' },
              { transform: 'translateY(' + (y * 0.94) + 'px)', offset: 0.9, easing: 'cubic-bezier(.25,.6,.35,1)' },
              { transform: 'translateY(' + y + 'px)' }];
    }
    var y = endY();
    var dur = Math.max(18000, Math.abs(y) / 68 * 1000);
    anim = roll.animate(frames(y), { duration: dur, easing: 'linear', fill: 'forwards' });
    anim.onfinish = show;
    function refit() { if (el.isConnected && anim && anim.effect) anim.effect.setKeyframes(frames(endY())); else removeEventListener('resize', refit); }
    addEventListener('resize', refit);
  }
  // if someone turns the house music back on mid-credits, the credits song steps aside
  document.addEventListener('play', function (e) {
    if (song && e.target && (e.target.id === 'bg-audio' || e.target.id === 'break-audio')) stopSong();
  }, true);

  // ---------- 3. blue pill ----------
  function bluePill() {
    stopSong();
    decks().forEach(function (d) { if (d) try { d.pause(); } catch (e) {} });
    var el = overlay();
    var block = typedBlock(el, 2);
    (async function () {
      await wait(600);
      await block.type(0, '> you chose comfort.', 42);
      await wait(650);
      await block.type(1, '> goodbye.', 42);
      await wait(1600);
      if (el.isConnected) window.location.href = HOME;
    })();
  }

  // Power down like on / off, then the blue pill lines, then thrillwave.com
  function bluePillShutdown() {
    var body = document.body;
    if (body.classList.contains('tw-powering-down')) return;
    window.twTypingGen = (window.twTypingGen || 0) + 1;
    window.twIntroRunning = false;
    try { if (typeof Tone !== 'undefined' && Tone.Destination) Tone.Destination.mute = true; } catch (e) {}
    stopSong();
    decks().forEach(function (d) { if (d) try { d.pause(); } catch (e) {} });
    setTimeout(function () {
      try { if (typeof Tone !== 'undefined' && Tone.Destination) Tone.Destination.mute = false; } catch (e) {}
      if (!muted()) { try { if (window.twUI && window.twUI.sndShutdown) window.twUI.sndShutdown(); } catch (e) {} }
    }, 50);
    if (!document.getElementById('power-down-collapse')) {
      var c = document.createElement('div');
      c.className = 'power-down-collapse'; c.id = 'power-down-collapse'; c.setAttribute('aria-hidden', 'true');
      body.appendChild(c);
    }
    var modal = document.getElementById('bluepill-modal');
    if (modal) modal.classList.add('is-shutting-down');
    body.classList.add('tw-powering-down');
    setTimeout(bluePill, reduce ? 0 : 780);
  }

  // The "take the blue pill?" box: same window as on / off
  function ensureModal() {
    var m = document.getElementById('bluepill-modal');
    if (m) return m;
    m = document.createElement('div');
    m.className = 'power-modal'; m.id = 'bluepill-modal'; m.setAttribute('aria-hidden', 'true');
    m.innerHTML =
      '<div aria-labelledby="bluepill-modal-title" aria-modal="true" class="power-modal__panel terminal" role="dialog">' +
        '<div class="power-modal__bar terminal-bar">' +
          '<span class="power-modal__bar-title">thrill_wave / blue_pill</span>' +
          '<div aria-hidden="true" class="terminal-dots"><span class="dot"></span><span class="dot"></span>' +
          '<span aria-label="cancel" class="dot live" role="button" tabindex="0" title="cancel" data-bluepill-cancel></span></div>' +
        '</div>' +
        '<div class="power-modal__body">' +
          '<div class="power-modal__title" id="bluepill-modal-title">take the blue pill? the story ends. you wake up on the regular website and believe whatever you want to believe about video production.</div>' +
          '<div class="power-modal__actions">' +
            '<button class="power-modal__btn power-modal__btn--confirm" data-bluepill-confirm type="button">take it</button>' +
            '<button class="power-modal__btn" data-bluepill-cancel type="button">stay</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    return m;
  }
  function closeMenu() {
    var body = document.body;
    if (!body.classList.contains('menu-open')) return;
    body.classList.remove('menu-open');
    var menuBtn = document.getElementById('menu-btn');
    var side = document.getElementById('side-menu');
    if (menuBtn) { menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = 'menu'; menuBtn.classList.remove('active'); }
    if (side) side.setAttribute('aria-hidden', 'true');
  }
  function openModal() {
    closeMenu();
    var m = ensureModal();
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('bluepill-modal-open');
    var stay = m.querySelector('button[data-bluepill-cancel]');
    if (stay) setTimeout(function () { stay.focus({ preventScroll: true }); }, 30);
  }
  function closeModal() {
    var m = document.getElementById('bluepill-modal');
    if (!m || m.classList.contains('is-shutting-down')) return;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('bluepill-modal-open');
  }

  // Entry points, added once (only #terminal-body changes between pages, the frame and menu stay)
  function mount() {
    // a. intro screen: "blue pill · skip"
    var skip = document.getElementById('skip-btn');
    if (skip && !document.getElementById('bluepill-btn')) {
      var bp = document.createElement('button');
      bp.id = 'bluepill-btn'; bp.type = 'button'; bp.textContent = 'blue pill';
      var sep = document.createElement('span'); sep.className = 'tw-controls-sep'; sep.textContent = '·'; sep.setAttribute('aria-hidden', 'true');
      skip.parentNode.insertBefore(bp, skip);
      skip.parentNode.insertBefore(sep, skip);
    }
    // b. top right of the outer frame
    var frame = document.querySelector('.frame');
    if (frame && !frame.querySelector('.frame-label--tr')) {
      var a = document.createElement('a');
      a.className = 'frame-label frame-label--tr'; a.href = HOME; a.textContent = 'blue pill';
      a.setAttribute('data-bluepill', '');
      frame.appendChild(a);
    }
    // c. the menu, under contact
    var list = document.querySelector('#side-menu .menu-list');
    if (list && !list.querySelector('.menu-item--bluepill')) {
      var item = document.createElement('button');
      item.type = 'button'; item.className = 'menu-item menu-item--bluepill';
      item.setAttribute('data-page', 'bluepill'); item.setAttribute('data-bluepill', '');
      item.innerHTML = '<span class="num">[07]</span><span class="name">blue pill</span>';
      list.appendChild(item);
      // the menu marks the page you're on as current; this item isn't a page, so it never is
      new MutationObserver(function () { if (item.classList.contains('current')) item.classList.remove('current'); })
        .observe(item, { attributes: true, attributeFilter: ['class'] });
      item.classList.remove('current');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  // window capture runs before the page's own document-level handlers (menu, power modal, click routing)
  window.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var hit = t.closest('#bluepill-btn, [data-bluepill], [data-bluepill-confirm], [data-bluepill-cancel]');
    if (!hit && t.id === 'bluepill-modal') hit = t;
    if (!hit) return;
    e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (hit.id === 'bluepill-btn') return bluePill();
    if (hit.hasAttribute('data-bluepill')) return openModal();
    if (hit.hasAttribute('data-bluepill-confirm')) return bluePillShutdown();
    closeModal();
  }, true);

  // ---------- triggers: typed words, Konami code, clock taps ----------
  var KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  var keys = [], typed = '';
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (document.body.classList.contains('bluepill-modal-open')) { closeModal(); return; }
      if (open) { close(); return; }
    }
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var k = (e.key || '').toLowerCase();
    keys.push(k); keys = keys.slice(-KONAMI.length);
    if (keys.join() === KONAMI.join()) { keys = []; rollCredits(); return; }
    if (k.length === 1) {
      typed = (typed + k).slice(-12);
      if (/credits$/.test(typed)) { typed = ''; rollCredits(); }
      else if (/bluepill$/.test(typed)) { typed = ''; bluePill(); }
    }
  }, true);

  var taps = 0, tapTimer;
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest || !e.target.closest('#clock')) return;
    taps++; clearTimeout(tapTimer);
    tapTimer = setTimeout(function () { taps = 0; }, 1500);
    if (taps >= 5) { taps = 0; rollCredits(); }
  });

  window.twEggs = { wakeUp: wakeUp, credits: rollCredits, bluePill: bluePill, bluePillShutdown: bluePillShutdown, busy: busy };
})();
