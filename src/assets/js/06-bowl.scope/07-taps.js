  // ------------------------------------------------------------ the taps --

  function tap() {
    if (state.broken) return;
    const t = Aquarium.clock();
    const needed = Math.max(1, Math.round(Number(get('glass.taps_to_break', 3))));

    state.taps += 1;
    shake = { at: t, power: Number(get('glass.shake', 14)) * (0.6 + state.taps * 0.25) };

    if (state.taps >= needed) { smash(t); return; }

    cracks = cracks.concat(makeCrack());
    if (state.taps === 1) Portfolio.sound.tap(1);
    else Portfolio.sound.crack(1);

    // he comes up to see what that was, and on the next one puts his nose out
    if (Aquarium.fish) Aquarium.fish.startle(state.taps, needed, t);

    if (note) {
      note.classList.add('is-going');
      setTimeout(() => note.classList.remove('is-going'), 220);
    }
  }

  /* `target`, if there is one, is where the page goes once it is open: a
     group in My work ({ group }), and optionally a project in it to open
     once he gets there ({ project }). The showcase only ever gives a group. */
  function smash(t, target) {
    heading = target || null;
    state.heading = !!heading;     // he holds his dive to the end if there is somewhere to go
    state.broken = true;
    state.breakTime = t;
    brokeAt = t;
    if (state.bowl) shards = makeShards(state.bowl, t);
    cracks = [];
    Portfolio.sound.shatter(1);

    if (el) { el.disabled = true; el.setAttribute('aria-label', 'The glass is broken'); }
    body.classList.add('is-breaking');      // the line under the bowl goes with it
    // The hero panels stop taking clicks at once, but stay where they are
    // until he reaches the top of his leap (Aquarium.onApex).
    if (showcase) showcase.inert = true;
    // On the way to a group, My work is there to be swum down to.
    if (heading) body.classList.add('is-escorting');
    if (Aquarium.fish) Aquarium.fish.release(t);
    else {
      apex();                               // no leap to wait for
      if (Aquarium.raiseSurface) Aquarium.raiseSurface();
    }

    // if something goes wrong on the way, the water still comes, the panels
    // still go and the page still opens
    const turn = Number(get('fish.leap_turn', 2));
    const rise = Number(get('water.rise_time', 3.4));
    setTimeout(apex, (Number(get('fish.leap_rise', 1)) + 0.5) * 1000);
    setTimeout(() => { if (Aquarium.raiseSurface) Aquarium.raiseSurface(); }, (turn + 1.5) * 1000);
    setTimeout(settled, (turn + rise + 4) * 1000);
  }

  /* The water has reached the top: the page opens. A second later the quote
     in the pond gives way to the name and the overview. And if a thumbnail
     broke the glass, the page goes on to what it was for. */
  function settled() {
    if (revealed) return;
    revealed = true;
    // Somewhere to go: he stays in his dive from this very frame, holding the
    // bottom of the screen, rather than levelling out first.
    if (heading && !escorting) state.escortY = Infinity;
    const wait = Math.max(0, Number(get('glass.reveal_delay', 0))) * 1000;
    setTimeout(() => {
      body.classList.add('is-settled');
      // On the way down to a group the page is still moving: the sky is cut
      // away once it gets there instead (see heroDive).
      if (!escorting) trimTop();
      reveal();
      setTimeout(() => body.classList.add('is-titled'), 1000);
      // Only if the water came up without the hero dive taking the page —
      // a missing group, say — does the page set off from here instead.
      if (heading && !escorting) goTo(heading);
    }, wait);
  }
  Aquarium.onSettled = settled;

  /* He is at the top of his leap: the hero panels rise up out of the screen,
     fading as they go (06-title.css). */
  function apex() {
    if (state.broken) body.classList.add('is-apex');
  }
  Aquarium.onApex = apex;

  /* The sky over the pond is only there for the opening. Once the page is
     open it is cut away — the band is shortened by exactly as far as the page
     has come down, and the page moved back by the same amount in the same
     frame — so nothing on the screen moves, and scrolling up stops at your
     name on the water. */
  function trimTop(by) {
    const band = document.querySelector('.band--title');
    const cut = Math.round(Math.min(window.scrollY, by === undefined ? Infinity : by));
    if (!band || cut <= 0 || band.classList.contains('is-trimmed')) return;
    state.autoScroll = true;             // he isn't to be carried by this one
    band.style.height = Math.max(0, band.offsetHeight - cut) + 'px';
    band.classList.add('is-trimmed');
    window.scrollTo({ top: window.scrollY - cut, behavior: 'instant' });
    if (Aquarium.shiftSurface) Aquarium.shiftSurface(cut);
    setTimeout(() => { if (!escorting) state.autoScroll = false; }, 120);
  }

  function untrim() {
    const band = document.querySelector('.band--title');
    if (!band) return;
    band.style.height = '';
    band.classList.remove('is-trimmed');
  }

  /* Down to a group in My work, and once there, into the project. The page
     goes at his pace rather than jumping: he stays nose down and swimming,
     holding the bottom of the screen until the group comes up to meet him,
     and the project opens once he is there. The page underneath is left
     scrolled to it, so coming back from the project lands you on its row. */
  let escorting = false;

  /* Free scroll: once he is past the quote, a scroll of the wheel (or a
     swipe) takes the page back from the dive, and it is yours from there.
     Scroll lock in Settings is the other way round: locked, the dive keeps
     the page to the end. `fish.escort_free_scroll` is where it starts.

     Dive speed in Settings is `fish.escort_speed`, the pace the dive picks
     up to. It only matters while the scroll is locked — unlocked, the page
     is yours — so the slider is off then. A viewer's own choices are
     remembered, and both are read as the dive goes, so a change made during
     one takes effect at once. */
  const freeKey = 'portfolio.freeScroll';
  const speedKey = 'portfolio.diveSpeed';
  const speedMin = Number(get('fish.escort_speed_min', 400));
  const speedMax = Number(get('fish.escort_speed_max', 2400));
  let freeScroll = get('fish.escort_free_scroll', true) !== false;
  let diveSpeed = Number(get('fish.escort_speed', 1200));
  try {
    const saved = localStorage.getItem(freeKey);
    if (saved !== null) freeScroll = saved === 'on';
    const speed = Number(localStorage.getItem(speedKey));
    if (speed) diveSpeed = speed;
  } catch (err) { /* no storage: the settings stand */ }
  diveSpeed = clamp(diveSpeed, speedMin, speedMax);

  const lockBox = document.getElementById('scroll-lock');
  const speedBar = document.getElementById('dive-speed');
  const speedOut = document.getElementById('dive-speed-value');
  if (lockBox && speedBar) {
    const paint = () => {
      lockBox.checked = !freeScroll;
      speedBar.value = String(diveSpeed);
      speedBar.disabled = freeScroll;
      speedBar.closest('.setting').classList.toggle('is-disabled', freeScroll);
      if (speedOut) speedOut.textContent = Math.round(diveSpeed / Number(get('fish.escort_speed', 1200)) * 100) + '%';
    };
    paint();
    lockBox.addEventListener('change', () => {
      freeScroll = !lockBox.checked;
      paint();
      try { localStorage.setItem(freeKey, freeScroll ? 'on' : 'off'); } catch (err) { /* fine */ }
    });
    speedBar.addEventListener('input', () => {
      diveSpeed = clamp(Number(speedBar.value), speedMin, speedMax);
      paint();
      try { localStorage.setItem(speedKey, String(diveSpeed)); } catch (err) { /* fine */ }
    });
  }

  /* The hero dive: one unbroken run from the bowl to the group. The page
     sets off with the water, at the pace the water would have taken it, and
     where the water stops it carries straight on — gathering speed up to
     the Dive speed — down past the quote and the nav into My work, and
     only slows to a stop as the group arrives at the top of the screen. He
     holds the bottom of the screen, nose down, until the group comes up to
     him, and rides it in. Called by the water as it starts to climb; `rise`
     is how that climb was going to move the page. */
  Aquarium.leadRise = rise => {
    const target = heading;
    const place = target && document.getElementById(target.group);
    if (!place || Portfolio.reduceMotion.matches) return false;

    escorting = true;
    state.autoScroll = true;
    const margin = parseFloat(getComputedStyle(place).scrollMarginTop) || 0;
    const ease = clamp(Number(get('water.rise_ease', 0.15)), 0.01, 1);
    // the water's own pace, over the steady part of its climb
    const water = Math.max(0, rise.scrollTo - rise.scrollFrom) / (rise.time * (1 - ease / 2));
    // The brake goes up with the speed, so the stop takes as long at any
    // Dive speed; the yaml's brake is the one for the yaml's speed.
    const cruise = () => Math.max(water, diveSpeed);
    const brake = () => Math.max(100, Number(get('fish.escort_brake', 1600)) *
      cruise() / Math.max(1, Number(get('fish.escort_speed', 1200))));
    let y = window.scrollY;
    let v = water;
    let last = Aquarium.clock();
    let dropped = false;      // scrolled out of it: the page is theirs

    // Past the quote is the quote's bottom edge gone up over him. Without
    // a quote, it is the page passing where the water stops.
    const quote = document.querySelector('.pond-quote');
    const past = () => {
      const fish = state.fish;
      if (!quote || !fish) return y >= rise.scrollTo;
      return quote.getBoundingClientRect().bottom < fish.y;
    };

    const unhook = () => {
      window.removeEventListener('wheel', takeOver);
      window.removeEventListener('touchmove', takeOver);
    };
    function takeOver() {
      if (dropped || !freeScroll || !past()) return;
      dropped = true;
      unhook();
      heading = null;
      state.heading = false;             // he levels out, as after a tap
      escorting = false;
      state.escortY = null;
      state.autoScroll = false;          // trimTop holds it on for its own jump
      reveal();                          // unlocked first: is-escorting is what shows My work while locked
      body.classList.remove('is-escorting');
      trimTop(rise.scrollTo);
    }
    window.addEventListener('wheel', takeOver, { passive: true });
    window.addEventListener('touchmove', takeOver, { passive: true });

    const goal = () => clamp(place.getBoundingClientRect().top + window.scrollY - margin, 0,
      document.documentElement.scrollHeight - window.innerHeight);

    const step = () => {
      if (dropped) return;
      const now = Aquarium.clock();
      const dt = Math.min(0.05, Math.max(0, now - last));
      last = now;
      const left = goal() - y;
      // past where the water stops, it picks up speed; near the group it
      // brakes, just hard enough to stop on it
      if (y >= rise.scrollTo) v += (cruise() - v) * Math.min(1, 1.6 * dt);
      v = Math.max(20, Math.min(v, Math.sqrt(2 * brake() * Math.max(0, left))));
      y = Math.min(y + v * dt, goal());
      window.scrollTo({ top: y, behavior: 'instant' });
      state.escortY = place.getBoundingClientRect().top + margin * 0.5;
      if (goal() - y > 0.5) { requestAnimationFrame(step); return; }
      arrive();
    };

    // There: once he is too, the sky above the pond is cut away (nothing on
    // screen moves) and he is let go.
    const until = Aquarium.clock() + 1.5;
    const arrive = () => {
      if (dropped) return;
      state.escortY = place.getBoundingClientRect().top + margin * 0.5;
      const fish = state.fish;
      const near = !fish || Math.abs(fish.y - Math.max(state.escortY, 0)) < 60;
      if (!near && Aquarium.clock() < until) { requestAnimationFrame(arrive); return; }
      unhook();
      heading = null;
      trimTop(rise.scrollTo);
      setTimeout(() => {
        escorting = false;
        state.autoScroll = false;
        state.escortY = null;
        body.classList.remove('is-escorting');
      }, 150);
    };
    requestAnimationFrame(step);
    return true;
  };

  function goTo(target) {
    heading = null;
    const place = document.getElementById(target.group);
    if (!place) return;

    const margin = parseFloat(getComputedStyle(place).scrollMarginTop) || 0;
    const from = window.scrollY;
    const to = Math.max(0, Math.min(
      place.getBoundingClientRect().top + from - margin,
      document.documentElement.scrollHeight - window.innerHeight));
    const speed = Math.max(100, diveSpeed);
    const time = Portfolio.reduceMotion.matches ? 0.01
      : clamp(Math.abs(to - from) / speed, 1.2, 5);
    const start = Aquarium.clock();

    escorting = true;
    state.autoScroll = true;
    const step = () => {
      const p = clamp((Aquarium.clock() - start) / time, 0, 1);
      const eased = p * p * (3 - 2 * p);
      window.scrollTo({ top: lerp(from, to, eased), behavior: 'instant' });
      state.escortY = place.getBoundingClientRect().top + margin * 0.5;
      if (p < 1) { requestAnimationFrame(step); return; }
      arrive();
    };

    // The page is there; the project opens once he is too, or soon after.
    const until = Aquarium.clock() + time + 1.5;
    const arrive = () => {
      state.escortY = place.getBoundingClientRect().top + margin * 0.5;
      const fish = state.fish;
      const near = !fish || Math.abs(fish.y - Math.max(state.escortY, 0)) < 60;
      if (!near && Aquarium.clock() < until) { requestAnimationFrame(arrive); return; }
      setTimeout(() => {
        escorting = false;
        state.autoScroll = false;
        state.escortY = null;
        if (!target.project) return;
        const link = place.querySelector(`.entry-link[data-project="${target.project}"]`);
        if (link) link.click();
      }, 250);
    };
    requestAnimationFrame(step);
  }

  function reveal() {
    body.classList.remove('is-locked');
    document.documentElement.classList.remove('is-locked');
    body.classList.add('is-free');
    fold();
    if (Aquarium.remeasure) Aquarium.remeasure();
  }

  /* The bowl's space is kept, but the button itself goes, so there is
     nothing left there to tab to. */
  function fold() {
    if (!el) return;
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
  }

  function unfold() {
    if (!el) return;
    el.style.opacity = '';
    el.style.visibility = '';
  }
