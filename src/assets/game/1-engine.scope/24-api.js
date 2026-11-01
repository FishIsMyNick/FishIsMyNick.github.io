  // ------------------------------------------------------------- the API --

  /* The way back up from a details room: everything starts at once, and he
     hurries over to the mouth of the shaft as the room begins to go. */
  if (roomUp) roomUp.addEventListener('click', () => {
    if (scene !== 'room' || move) return;
    begin('rise', { kind: 'level', i: current, lv: makeLevel(current) }, '', '', false, true);
  });

  /* What can come up next from `place`, ready before it does, so that nothing
     has to stop to be painted the first time it's seen: the tunnel and the
     first room beyond it and, in a level, the rest of that level. Never the
     whole game at once, which is seconds of work while he's trying to swim. */
  const near = new Set();

  function paintNear(place) {
    if (place.kind === 'room') return;
    const key = place.kind === 'level' ? place.i : -1;
    if (near.has(key)) return;
    near.add(key);
    const tunnel = view.w * Math.max(1.2, num('tunnel_length', 2.2));
    const shaft = view.h * Math.max(1.2, num('shaft_length', 1.6));
    const roomsOf = (i, from, to) => subsOf(i).slice(from, to).flatMap((sub, k) => {
      const m = mechanicOf(i);
      return m.ahead ? m.ahead(i, from + k, sub) : [];
    });
    const entered = (i) => {
      const state = (right, bottom) => () => bakeLevel({ i, gone: { right, bottom } });
      return [
        state(false, false), state(true, false), state(true, true),
        () => bakeRoom(i, true), () => bakeRoomShade(i),
        () => bakePassage(false, shaft, holeW()),
        () => {
          const img = pages[i] && pages[i].querySelector('img');
          // a big picture is unpacked away from the page, not in the way of it
          const ready = img && img.decode ? img.decode() : Promise.resolve();
          ready.catch(() => {}).then(() => { if (running) bakePage(i); });
        },
        ...roomsOf(i, 1)
      ];
    };
    const next = key + 1;
    paintAhead(
      () => bakePassage(true, tunnel, gapH()),
      ...(key >= 0 ? entered(key) : []),
      ...(levels[next] ? roomsOf(next, 0, 1) : [])
    );
  }

  /* The room starts over: its crate back, its walls whole, him at the way
     in. Other levels keep what's been done in them. */
  function resetLevel() {
    const n = level.n;
    beaten[current] = false;
    if (cleared[current]) cleared[current][n] = false;
    bubbles.length = 0;
    const to = { kind: 'level', i: current, n, lv: makeLevel(current, n) };
    arrive(to);
    const at = entry(to, 'left');
    fish.x = at.x;
    fish.y = at.y;
    fish.vx = fish.vy = 0;
    fish.dash = null;
    fish.cool = 0;
    fish.facing = 1;
  }

  /* Out to black, everything held still; the level is put back while nothing
     can be seen; and in again. */
  let fadeTimer = 0;

  function setFade(on, seconds) {
    if (!fadeEl) return;
    fadeEl.style.transitionDuration = seconds + 's';
    fadeEl.classList.toggle('is-on', on);
  }

  function fadeReset() {
    if (scene !== 'level' || move || fading) return;
    const time = Math.max(0, num('reset_fade', 0.4));
    fading = true;
    setFade(true, time);
    if (sound()) sound().bubble(1);
    fadeTimer = setTimeout(() => {
      if (!running) return;
      resetLevel();
      fading = false;
      setFade(false, time);
    }, time * 1000);
  }

  if (resetBtn) resetBtn.addEventListener('click', fadeReset);

  /* Dragging the stone, pressing the groove (the stone jumps there and can
     be dragged on) and the wheel over it. Pointer moves stop here, so he
     doesn't swim at the wall while it's being used. */
  let barHot = false;
  if (roomBar) {
    let grab = null;
    const scrollTo = y => {
      const bar = barPlace();
      if (bar) room.scrollTop = (y - grab - bar.y0) / Math.max(1, bar.len - bar.size) * bar.most;
    };
    roomBar.addEventListener('pointerdown', event => {
      const bar = barPlace();
      if (!bar || event.button > 0) return;
      const inside = event.clientY >= bar.y && event.clientY <= bar.y + bar.size;
      grab = inside ? event.clientY - bar.y : bar.size / 2;
      roomBar.setPointerCapture(event.pointerId);
      roomBar.classList.add('is-held');
      scrollTo(event.clientY);
    });
    roomBar.addEventListener('pointermove', event => {
      event.stopPropagation();
      if (grab !== null) scrollTo(event.clientY);
    });
    const letGo = () => { grab = null; roomBar.classList.remove('is-held'); barHot = roomBar.matches(':hover'); };
    roomBar.addEventListener('pointerup', letGo);
    roomBar.addEventListener('pointercancel', letGo);
    roomBar.addEventListener('pointerenter', () => { barHot = true; });
    roomBar.addEventListener('pointerleave', () => { if (grab === null) barHot = false; });
    roomBar.addEventListener('wheel', event => { room.scrollTop += event.deltaY; }, { passive: true });
  }

  window.addEventListener('resize', () => {
    if (!running) return;
    resize();
    paintNear(here);
    stones.forEach((seed, el) => stoneBehind(el, seed));
  });

  Portfolio.game = {
    /* The view has just been shown: start from the beginning. */
    enter() {
      if (running) return;
      running = true;
      resize();
      beaten.length = 0;
      cleared.length = 0;
      bubbles.length = 0;
      for (const key of Object.keys(kept)) delete kept[key];
      near.clear();
      fish.size = 1;
      move = null;
      current = 0;
      arrive({ kind: 'start' });
      // in the middle of the screen, below the story and the hints
      const row = $('game-start-row');
      const under = row ? row.getBoundingClientRect().bottom : view.h * 0.7;
      fish.x = view.w / 2;
      fish.y = clamp(under + halfH() + 24, halfH() + 10, view.h - halfH() - 10);
      fish.vx = 0; fish.vy = 0;
      fish.facing = 1; fish.flip = 1;
      last = 0;
      // the band is over the screen and will wait for this: the first frame
      // and what the first room needs are painted while nobody can see
      paintAheadNow(num('paint_under_sweep', 0.6) * 1000);
      frame(performance.now());
    },

    /* The settings panel opened or closed. A game on a clock waits for it; one
       that goes by turns has nothing to wait for. */
    settings(open) {
      inSettings = open;
      paused = open && running && !holder();
      if (open) stoneBehind($('settings'), 23);
    },

    /* A mechanic, from its own file: see 07-mechanics.js. */
    mechanic(name, make) { mechanics[name] = make(engineForMechanics); },

    /* Where things stand, for the console. */
    peek: () => ({ scene, current, fish: { ...fish }, level, beaten: beaten.slice(), cleared: cleared.map(c => c.slice()) }),

    /* The view is going: stop, and give back anything borrowed. */
    leave() {
      running = false;
      cancelAnimationFrame(raf);
      clearTimeout(fadeTimer);
      fading = false;
      inSettings = paused = false;
      setFade(false, 0);
      emptyRoom();
      keys.clear();
    }
  };
