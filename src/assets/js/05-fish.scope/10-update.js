  // -------------------------------------------------------------- update --

  function update(t, dt) {
    fish.now = t;

    // the first frame the bowl has been measured, he goes in it
    if (!fish.placed && (state.bowl || state.broken)) {
      fish.placed = true;
      if (!state.broken) Aquarium.fish.reset();
    }

    if (fish.roll && t > fish.roll.at + fish.roll.dur) fish.roll = null;

    /* A click anywhere is a place to be. Above the waterline it is somewhere
       he has to leave the water to reach: if he is near enough the line he
       goes straight for it, and if he isn't he swims up and jumps when he
       gets there. */
    const click = state.lastClick;
    if (click && click.at > (fish.lastClickSeen || -1)) {
      fish.lastClickSeen = click.at;
      const sky = state.broken && click.y < state.surfaceY - 6
               && get('fish.jump_at_clicks', true) !== false;
      if (sky && canJump()) {
        jump(t, { x: click.x, y: click.y });
      } else if (sky && fish.mode === 'free') {
        fish.wantJump = { x: click.x, y: click.y, until: t + 3 };
        dashTo(click.x, state.surfaceY + length() * 0.4, t);
      } else {
        dashTo(click.x, click.y, t);
      }
    }

    // the one he was working his way up to, now that he is up there
    if (fish.wantJump) {
      if (t > fish.wantJump.until) fish.wantJump = null;
      else if (canJump()) jump(t, fish.wantJump);
    }

    // and one of his own, every so often, when he has nothing else on
    if (t > fish.nextJump) {
      if (canJump() && !fish.dash && !hovered && !following(t)) jump(t, null);
      else if (fish.mode === 'free') fish.nextJump = t + 2;
      else scheduleJump(t);
    }

    // a turn of his own, for no reason at all
    if (t > fish.nextRoll && fish.mode === 'free' && !fish.dash && !fish.dive) startRoll(t);

    if (fish.mode === 'leap') fly(t, dt);
    else if (fish.mode === 'jump') arc(t, dt);
    else swim(t, dt);

    // how long he has been off the edge of the window. Left to his own
    // devices out there, he turns round and comes back in.
    const v = scene.view;
    const away = fish.x < -4 || fish.x > v.w + 4 || fish.y > v.h + 4;
    fish.outside = away ? fish.outside + dt : 0;
    if (fish.outside > Number(get('fish.off_frame_return', 2.6))) {
      fish.outside = 0;
      if (fish.mode === 'free' && !fish.dash) {
        const inner = visibleBox();
        fish.target = {
          x: clamp(fish.x, inner.left + 40, inner.right - 40),
          y: rand(inner.top, inner.bottom)
        };
        fish.nextThink = t + 2;
      }
    }

    // the body wave runs faster the harder he is working
    const speed = Math.hypot(fish.vx, fish.vy);
    const base = Number(get('fish.stroke_rate', 1.5));
    const extra = Number(get('fish.stroke_speedup', 0.5));
    fish.phase += dt * Math.PI * 2 * (base + (speed / 220) * base * extra);

    // turning over: the drawing is squashed through zero rather than snapped,
    // which reads as the fish swinging round towards you. A dash turns harder.
    const turnTime = Math.max(0.03, Number(fish.dash
      ? get('fish.dash_turn', 0.07)
      : get('fish.turn_time', 0.16)));
    fish.flip += (fish.facing - fish.flip) * Math.min(1, dt / turnTime * 1.6);

    breathe(t, dt);
  }

  /* Out of the bowl. Three parts, on a clock that starts at the break:

     up     to the top of the screen, slowing into it, in `leap_rise` seconds;
     hang   held there until `leap_turn` seconds have gone, the turn — one or
            two flips — spread evenly over the whole of that time and ending
            nose down;
     fall   and only then does the water start to come in. He drops, nose
            first, and goes in wherever the two of them meet.

     He grows into the fish he is about to be over the up and the hang. */
  function fly(t, dt) {
    const L = fish.leap;
    const since = t - L.at;

    if (L.part !== 'fall') {
      const up = clamp(since / L.rise, 0, 1);
      const out = 1 - (1 - up) * (1 - up);          // slowing into the top
      const k = clamp(since / L.turn, 0, 1);
      const turned = k * k * (3 - 2 * k);           // slow in, slow out

      const py = fish.y;
      fish.x = lerp(L.x0, L.x1, clamp(since / L.turn, 0, 1));
      fish.y = lerp(L.y0, topOfLeap(), out);
      fish.vx = (L.x1 - L.x0) / L.turn;
      fish.vy = dt > 0 ? (fish.y - py) / dt : 0;
      fish.spin = L.spinEnd * turned;
      fish.grow = clamp(since / L.turn, 0, 1);

      // the top of the leap: the hero panels go up and away from here
      if (since >= L.rise && !L.apex) {
        L.apex = true;
        if (typeof Aquarium.onApex === 'function') Aquarium.onApex(t);
      }

      if (since >= L.turn) {
        L.part = 'fall';
        fish.spin = L.spinEnd;
        fish.grow = 1;
        fish.vx = 0;
        fish.vy = 0;
        // now the water comes
        if (Aquarium.raiseSurface) Aquarium.raiseSurface();
      }
      return;
    }

    const g = Math.max(100, Number(get('fish.leap_gravity', 1500)));
    fish.vy += g * dt;
    fish.y += fish.vy * dt;

    if (fish.vy > 0 && fish.y >= state.surfaceY) enter(t);
  }

  /* Where he hangs: near the top of the screen, but never so near that the
     turn takes his nose or his tail off it. */
  function topOfLeap() {
    const at = scene.view.h * Number(get('fish.leap_top', 0.12));
    return Math.max(at, length() * 0.55);
  }

  function swim(t, dt) {
    const b = box();
    if (!b) return;

    const p = state.pointer;

    const cruise = Number(get('fish.speed', 70));
    const top = Number(get('fish.max_speed', 1600));
    const gap = Number(get('fish.follow_gap', 90));
    const ease = Number(get('fish.follow_ease', 2.2));

    let goal = null;
    let want = cruise;
    let urgency = 1;

    /* 0. straight down. He comes out of the bowl head first and keeps going
       down until the water has finished rising — so the page opens by his
       taking it, rather than by his bobbing about at the top of it. */
    if (fish.dive) {
      const rising = typeof Aquarium.surfaceRising === 'function'
        ? Aquarium.surfaceRising() : false;
      // and while the page is taking him on down to something, he goes too
      const escort = state.escortY != null;
      if (escort) fish.dive.until = Math.max(fish.dive.until, t + 2);
      if (t > fish.dive.until || (!rising && !escort)) {
        fish.dive = null;
        fish.unwind = { at: t, from: rotation.last || 0,
                        dur: Math.max(0.05, Number(get('fish.dive_unwind', 0.8))) };
        fish.nextThink = t;
      } else {
        // When he broke out on his own, with nowhere to take the page, he
        // starts levelling out just before the water stops, so he is level
        // by the time he is free. With somewhere to go he stays nose down.
        const lead = Math.max(0, Number(get('fish.dive_level_lead', 0.6)));
        const remaining = typeof Aquarium.surfaceLeft === 'function' ? Aquarium.surfaceLeft() : 0;
        if (!fish.dive.level && !state.heading && !escort && rising && lead > 0 && remaining <= lead) {
          fish.dive.level = { at: t, dur: Math.max(0.05, remaining) };
        }
        // down to the bottom of the screen, nose first, and he holds there,
        // still swimming, until the water is all the way up
        const floor = scene.view.h - length() * Number(get('fish.dive_settle', 0.62));
        // on the way to a part of the page he holds the bottom of the screen
        // until it comes up to him, then rides it in to the top
        const y = escort ? clamp(state.escortY, length() * 0.6, floor) : floor;
        goal = { x: fish.x, y };
        // Coming up the screen while the page goes down faster still is
        // going down through the water, so nose down is still the right way
        // round for it.
        const left = Math.abs(y - fish.y);
        // On the way to a group he swims down to the bottom of the screen at
        // a dive's pace; once the group has come up to him he keeps right up
        // with it, so he gets there as the page does.
        const riding = escort && y < floor;
        const most = riding
          ? Number(get('fish.max_speed', 1600))
          : Number(get('fish.dive_speed', 230)) * (escort ? 2 : 1);
        want = left > 4 ? Math.min(most, left * (riding ? 8 : 3)) : 0;
        urgency = riding ? 6 : 2;
      }
    }

    // 1. a click he is on his way to
    if (!goal && fish.dash) {
      const d = fish.dash;
      const away = Math.hypot(d.x - fish.x, d.y - fish.y);
      if (t > d.until || away < Number(get('fish.dash_arrive', 26))) {
        fish.dash = null;
        fish.nextThink = t;
      } else {
        // A click just under the line is a place in the water like any other.
        // He is held off the surface by less on a dash than he holds himself
        // off it otherwise, so he arrives at it instead of stopping short.
        const skim = state.surfaceY + length() * Number(get('fish.dash_surface_gap', 0.05));
        goal = {
          x: clamp(d.x, b.left, b.right),
          y: clamp(d.y, Math.min(skim, b.top), b.bottom)
        };
        want = Number(get('fish.dash_speed', 1100));
        urgency = 6;
      }
    }

    // 2. something the cursor is resting on, to be circled
    if (!goal && fish.mode === 'free' && get('fish.circle', true) !== false) {
      const ring = orbit();
      if (ring) {
        const lead = Number(get('fish.circle_lead', 0.55)) * turn;
        const a = Math.atan2((fish.y - ring.cy) / ring.ry,
                             (fish.x - ring.cx) / ring.rx) + lead;
        goal = {
          x: clamp(ring.cx + Math.cos(a) * ring.rx, b.left, b.right),
          y: clamp(ring.cy + Math.sin(a) * ring.ry, b.top, b.bottom)
        };
        want = Number(get('fish.circle_speed', 140));
        urgency = Math.max(0.2, Number(get('fish.circle_ease', 1.5)));
      }
    }

    // 3. somewhere a tap startled him to
    if (!goal && fish.hold) {
      if (t > fish.hold.until) { fish.hold = null; fish.nextThink = t; }
      else {
        goal = { x: fish.hold.x, y: fish.hold.y };
        want = Math.hypot(goal.x - fish.x, goal.y - fish.y) > 10 ? cruise * 3.4 : 0;
        urgency = 2.2;
      }
    }

    // 4. the cursor itself
    if (!goal && fish.mode === 'free' && following(t)) {
      goal = { x: clamp(p.x, b.left, b.right), y: clamp(p.y, b.top, b.bottom) };
      want = clamp((Math.hypot(goal.x - fish.x, goal.y - fish.y) - gap) * ease, 0, top);
    }

    // 5. his own business
    if (!goal) {
      if (!fish.target || t > fish.nextThink) newTarget(t);
      goal = fish.target || { x: fish.x, y: fish.y };
      // and if that is out past the edge of the window, he means it
      if (fish.target && fish.target.out) {
        want = cruise * Math.max(1, Number(get('fish.off_frame_speed', 3)));
        urgency = 1.6;
      }
      if (Math.hypot(goal.x - fish.x, goal.y - fish.y) < 30) {
        want = cruise * 0.25;
        if (t > fish.nextThink - 0.2) newTarget(t);
      }
    }

    const dx = goal.x - fish.x;
    const dy = goal.y - fish.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    want = Math.min(want, top);
    const accel = Number(get('fish.accel', 3.2)) * urgency;
    fish.vx += ((dx / dist) * want - fish.vx) * Math.min(1, accel * dt);
    fish.vy += ((dy / dist) * want - fish.vy) * Math.min(1, accel * dt);

    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;

    /* He keeps to his water. The ceiling gives way on a dash: whatever is
       holding him off the surface the rest of the time, a click he is on his
       way to is somewhere he gets to. */
    const ceiling = fish.dash
      ? Math.min(b.top, state.surfaceY + length() * Number(get('fish.dash_surface_gap', 0.05)))
      : b.top;

    if (fish.x < b.left)   { fish.x = b.left;   fish.vx = Math.abs(fish.vx) * 0.4; }
    if (fish.x > b.right)  { fish.x = b.right;  fish.vx = -Math.abs(fish.vx) * 0.4; }
    if (fish.y < ceiling)  { fish.y = ceiling;  fish.vy = Math.abs(fish.vy) * 0.4; }
    if (fish.y > b.bottom) { fish.y = b.bottom; fish.vy = -Math.abs(fish.vy) * 0.4; }

    /* And if his back came through the line on the way, the water says so —
       once, with a gap after it, so skimming along the top is not a drum roll. */
    if (fish.mode === 'free' && state.broken && state.pour > 0.9) {
      const out = state.surfaceY - (fish.y - length() * bodyRatio() * 0.4);
      const quick = Math.abs(fish.vy) > Number(get('fish.break_speed', 140));
      if (out > 0 && quick && (t - fish.lastBreak) > Number(get('fish.break_gap', 1.1))) {
        breakSurface(t, clamp(0.35 + out / 60, 0.35, 1.1));
      }
    }

    // which way round he is drawn, with a little hysteresis so that a fish
    // hovering over the cursor doesn't flicker. Mid-roll it is left alone:
    // he is already turning, and a mirror on top of that reads as a glitch.
    if (!fish.dash && !fish.roll && !fish.dive) {
      if (fish.vx > 14) fish.facing = 1;
      if (fish.vx < -14) fish.facing = -1;
    }
  }

  /* The moment he lands: nose first, and he keeps going. */
  function enter(t) {
    fish.mode = 'free';
    fish.grow = 1;
    fish.spin = 0;
    fish.spinRate = 0;

    /* He went in head down and he carries on head down — the water taking him
       rather than catching him. The dive runs until the surface has finished
       climbing; `until` is only there in case it never says so. */
    const rise = Number(get('water.rise_time', 3.4));
    fish.dive = { until: t + rise + 3 };
    fish.vy = Math.max(Math.abs(fish.vy) * 0.5, Number(get('fish.dive_speed', 230)) * 0.8);
    fish.vx = 0;
    fish.target = null;
    fish.dash = null;

    breakSurface(t, 1.9, true);
    // the clock on both of the things he now does of his own accord starts
    // here, so neither of them happens the second he gets in the water
    scheduleJump(t);
    const [lo, hi] = range('fish.roll_every', 7, 18);
    fish.nextRoll = t + rand(lo, hi) * 0.6;
    if (typeof Aquarium.onSplash === 'function') Aquarium.onSplash(t);
  }
