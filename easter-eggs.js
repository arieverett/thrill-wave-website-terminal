/* Thrill Wave terminal: three easter eggs (Oct 12, 2026). Silent: none of them play sound.
   1. "wake up..." : after a minute with no input, the screen types the Matrix wake-up lines and offers
      to follow the white rabbit into the secret break room (once per visit; never over a playing film or game).
   2. credits : type "credits" or the Konami code (up up down down left right left right b a), or tap the clock
      in the corner 5 times on a phone. The site rolls its own end credits and ends on "a thrill wave film".
   3. bluepill : type "bluepill" (or pick it at the end of the credits). "you chose comfort. that's ok."
      then back to thrillwave.com. */
(function twEasterEggs() {
  'use strict';
  if (window.__twEasterEggs) return;
  window.__twEasterEggs = true;

  var HOME = 'https://thrillwave.com/';
  var IDLE_MS = 60000;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };

  // ---------- styles ----------
  var css = document.createElement('style');
  css.textContent = [
    '.tw-egg{position:fixed;inset:0;z-index:2147483000;background:#000;color:var(--accent,#00ff41);font-family:var(--font,ui-monospace,Menlo,monospace);',
    'font-size:clamp(14px,2.2vw,18px);line-height:1.7;display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity .6s ease}',
    '.tw-egg.is-on{opacity:1}',
    '.tw-egg__box{width:min(640px,100%)}',
    '.tw-egg__line{white-space:pre-wrap;min-height:1.7em}',
    '.tw-egg__cursor{display:inline-block;width:.6em;height:1.1em;margin-left:2px;vertical-align:-.15em;background:currentColor;animation:twEggBlink 1s steps(1) infinite}',
    '@keyframes twEggBlink{50%{opacity:0}}',
    '.tw-egg__actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px;opacity:0;transition:opacity .5s ease}',
    '.tw-egg__actions.is-on{opacity:1}',
    '.tw-egg__btn{font:inherit;font-size:.85em;color:inherit;background:none;border:1px solid currentColor;border-radius:4px;padding:8px 14px;cursor:pointer;text-decoration:none}',
    '.tw-egg__btn:hover,.tw-egg__btn:focus-visible{background:currentColor;color:#000;outline:none}',
    '.tw-egg__btn--blue{color:#6f8cff}',
    '.tw-egg--credits{align-items:flex-start;overflow:hidden;padding:0}',
    '.tw-egg__roll{width:min(560px,100% - 48px);margin:0 auto;padding-top:100vh;text-align:center;animation:twEggRoll var(--dur,26s) linear forwards}',
    '.tw-egg__roll h2{font:inherit;font-size:1.6em;letter-spacing:.2em;margin:0 0 2.5em;color:#fff}',
    '.tw-egg__roll .tw-egg__row{display:flex;justify-content:space-between;gap:16px;text-align:left;margin:.35em 0}',
    '.tw-egg__roll .tw-egg__row span:first-child{opacity:.6}',
    '.tw-egg__roll .tw-egg__gap{height:2.2em}',
    '.tw-egg__roll .tw-egg__card{margin-top:40vh;font-size:1.3em;letter-spacing:.3em;color:#fff}',
    '.tw-egg__end{position:absolute;left:0;right:0;bottom:12vh;display:flex;justify-content:center}',
    '@keyframes twEggRoll{to{transform:translateY(calc(-100% + 60vh))}}',
    '@media (prefers-reduced-motion:reduce){.tw-egg__roll{animation:none;padding-top:10vh}.tw-egg__roll .tw-egg__card{margin-top:2em}.tw-egg--credits{overflow:auto}.tw-egg__end{position:static;margin:2em 0}}'
  ].join('');
  document.head.appendChild(css);

  // ---------- shared overlay ----------
  var open = null;
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
    el.classList.remove('is-on');
    setTimeout(function () { el.remove(); }, 600);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function typeInto(line, text, speed) {
    if (reduce) { line.textContent = text; return Promise.resolve(); }
    var cur = document.createElement('span'); cur.className = 'tw-egg__cursor';
    line.textContent = ''; line.appendChild(cur);
    var i = 0;
    return new Promise(function (done) {
      (function step() {
        if (!line.isConnected) return done();
        if (i >= text.length) { cur.remove(); return done(); }
        cur.insertAdjacentText('beforebegin', text[i++]);
        setTimeout(step, speed || 70);
      })();
    });
  }
  function button(label, cls, onClick, href) {
    var b = document.createElement(href ? 'a' : 'button');
    b.className = 'tw-egg__btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    if (href) b.href = href; else b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  // ---------- 1. wake up ----------
  var idleTimer;
  function busy() {
    if (open || document.hidden) return true;
    // never over a film someone is watching with sound, a game or the break room
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i], src = f.getAttribute('src') || '';
      if (!src || src === 'about:blank' || /muted=1/.test(src)) continue; // silent background loops don't count
      var r = f.getBoundingClientRect();
      if (r.width && r.height && r.bottom > 0 && r.top < innerHeight) return true;
    }
    var room = document.querySelector('.tw-breakroom-grid');
    if (room) { var rr = room.getBoundingClientRect(); if (rr.height && rr.bottom > 0 && rr.top < innerHeight) return true; }
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
    var box = document.createElement('div'); box.className = 'tw-egg__box'; el.appendChild(box);
    var lines = ['wake up...', 'the story has you...', 'follow the white rabbit.'];
    var acts = document.createElement('div'); acts.className = 'tw-egg__actions';
    acts.appendChild(button('knock, knock', '', function () { close(); openBreakroom(); }));
    acts.appendChild(button('stay asleep', '', close));
    (async function () {
      await wait(700);
      for (var i = 0; i < lines.length; i++) {
        var l = document.createElement('div'); l.className = 'tw-egg__line'; box.appendChild(l);
        await typeInto(l, lines[i], 90);
        await wait(reduce ? 200 : 1300);
        if (!el.isConnected) return;
      }
      box.appendChild(acts);
      requestAnimationFrame(function () { acts.classList.add('is-on'); });
      var first = acts.querySelector('button'); if (first) first.focus({ preventScroll: true });
    })();
  }
  function openBreakroom() {
    // The break room opens from the dots in the terminal's title bar
    var dot = document.querySelector('.terminal.main .terminal-bar .terminal-dots');
    if (dot) { dot.scrollIntoView({ block: 'center' }); dot.click(); }
  }
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (t) {
    window.addEventListener(t, armIdle, { passive: true, capture: true });
  });
  armIdle();

  // ---------- 2. credits ----------
  var CREDITS = [
    ['h2', 'THRILL WAVE'],
    ['row', 'producer', 'ari everett'],
    ['row', 'director / dp', 'tony swann'],
    ['row', 'strategy & sitrep', 'chris kuzman'],
    ['gap'],
    ['row', 'written, shot and cut in', 'phoenix, az'],
    ['row', 'founded', '2018'],
    ['row', 'films in the archive', '220'],
    ['row', 'organizations we’ve worked with', '80+'],
    ['gap'],
    ['row', 'site', 'v3.2.402 · build 459'],
    ['row', 'lineage', 'wordpress → wix → v3'],
    ['row', 'releases shipped', '402'],
    ['row', 'coffee', 'not counted'],
    ['gap'],
    ['row', 'special thanks', 'everyone who stayed'],
    ['row', '', 'for the credits'],
    ['card', 'a thrill wave film']
  ];
  function rollCredits() {
    var el = overlay('tw-egg--credits');
    var roll = document.createElement('div'); roll.className = 'tw-egg__roll';
    CREDITS.forEach(function (c) {
      var n;
      if (c[0] === 'h2') { n = document.createElement('h2'); n.textContent = c[1]; }
      else if (c[0] === 'gap') { n = document.createElement('div'); n.className = 'tw-egg__gap'; }
      else if (c[0] === 'card') { n = document.createElement('div'); n.className = 'tw-egg__card'; n.textContent = c[1]; }
      else { n = document.createElement('div'); n.className = 'tw-egg__row';
        var a = document.createElement('span'); a.textContent = c[1];
        var b = document.createElement('span'); b.textContent = c[2];
        n.appendChild(a); n.appendChild(b); }
      roll.appendChild(n);
    });
    el.appendChild(roll);
    var end = document.createElement('div'); end.className = 'tw-egg__end';
    var acts = document.createElement('div'); acts.className = 'tw-egg__actions';
    acts.appendChild(button('stay in the matrix', '', close));
    acts.appendChild(button('take the blue pill', 'tw-egg__btn--blue', function (e) { e.preventDefault(); bluePill(); }));
    end.appendChild(acts); el.appendChild(end);
    var show = function () { acts.classList.add('is-on'); };
    if (reduce) show(); else roll.addEventListener('animationend', show);
    el.addEventListener('click', function (e) { if (e.target === el || e.target === roll) show(); });
  }

  // ---------- 3. blue pill ----------
  function bluePill() {
    var el = overlay();
    el.style.color = '#6f8cff';
    var box = document.createElement('div'); box.className = 'tw-egg__box'; el.appendChild(box);
    var l1 = document.createElement('div'); l1.className = 'tw-egg__line'; box.appendChild(l1);
    var l2 = document.createElement('div'); l2.className = 'tw-egg__line'; box.appendChild(l2);
    (async function () {
      await wait(500);
      await typeInto(l1, 'you chose comfort.', 70);
      await wait(500);
      await typeInto(l2, 'that’s ok.', 70);
      await wait(1400);
      if (el.isConnected) window.location.href = HOME;
    })();
  }

  // ---------- triggers: typed words, Konami code, clock taps ----------
  var KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  var keys = [], typed = '';
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) { close(); return; }
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

  window.twEggs = { wakeUp: wakeUp, credits: rollCredits, bluePill: bluePill };
})();
