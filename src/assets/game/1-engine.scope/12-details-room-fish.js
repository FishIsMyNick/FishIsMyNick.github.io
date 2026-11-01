  /* ------------------------------------------------- the details room --

     Down here he is the portfolio's fish, behaving just as he does behind a
     project page in the portfolio (05-fish.scope, free in the water), from the
     same settings (the `fish` block of aquarium.yaml): a click is somewhere
     he goes straight to, anything the cursor rests on (text, a list, a
     picture: fish.circle_targets / circle_any, less fish.circle_skip) he
     circles one way round or the other, a moving cursor he follows, and
     left alone he wanders about the room on his own and now and then turns
     right over. */
  const fcfg = (key, fallback) => {
    const v = Number(Aquarium.get('fish.' + key, fallback));
    return Number.isFinite(v) ? v : fallback;
  };
  const brain = { goTo: null, target: null, nextThink: 0, hovered: null, turn: 1, roll: null, nextRoll: 0 };

  function roomBox() {
    const b = border();
    const { w, h } = view;
    return { left: b + halfW() + 6, right: w - b - halfW() - 6,
             top: borderTop() + halfH() + 6, bottom: h - b - halfH() - 6 };
  }

  /* A click: he comes about and goes straight there (09-fish's dashTo). */
  function swimTo(x, y) {
    if (move) return;
    const back = (x >= fish.x ? 1 : -1) !== fish.facing;
    brain.goTo = { x, y, until: clock + Math.max(0.2, fcfg('dash_time', 1.4)) };
    if (back && Math.random() < fcfg('roll_on_dash', 0.4) && startRoll()) return;
    fish.facing = x >= fish.x ? 1 : -1;
    fish.flip = fish.facing * 0.06;
  }

  function startRoll(dir) {
    if (Aquarium.get('fish.roll', true) === false || brain.roll) return false;
    brain.roll = { at: clock, dur: Math.max(0.2, fcfg('roll_time', 0.95)),
                   dir: dir || (Math.random() < 0.5 ? -1 : 1) };
    const [lo, hi] = Aquarium.range('fish.roll_every', 7, 18);
    brain.nextRoll = clock + rand(lo, hi);
    return true;
  }

  function rollAngle() {
    if (!brain.roll) return 0;
    const p = clamp((clock - brain.roll.at) / brain.roll.dur, 0, 1);
    if (p >= 1) { brain.roll = null; return 0; }
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    return eased * Math.PI * 2 * brain.roll.dir;
  }

  // what the cursor is resting on, the same way 05-fish.scope decides it
  function circled(target) {
    if (!target || !target.closest) return null;
    if (!room.contains(target) && !target.closest('.game-story')) return null;
    const skip = String(Aquarium.get('fish.circle_skip', ''));
    try { if (skip && target.closest(skip)) return null; } catch (err) { /* skip nothing */ }
    const whole = String(Aquarium.get('fish.circle_targets', '.entry'));
    const any = String(Aquarium.get('fish.circle_any', ''));
    try {
      return target.closest(whole) || (any ? target.closest(any) : null);
    } catch (err) { return null; }
  }

  layer.addEventListener('pointerover', event => {
    if (Aquarium.get('fish.circle', true) === false) return;
    const el = circled(event.target);
    if (el && el !== brain.hovered) brain.turn = Math.random() < 0.5 ? 1 : -1;
    if (el) brain.hovered = el;
  }, true);
  layer.addEventListener('pointerout', event => {
    if (!brain.hovered) return;
    const to = event.relatedTarget;
    if (!to || !brain.hovered.contains(to)) brain.hovered = null;
  }, true);

  function startBox() {
    return { left: halfW() + 10, right: view.w - wallW() - halfW() - 14,
             top: halfH() + 10, bottom: view.h - halfH() - 10 };
  }

  /* Where to head to go round `ring`: a little further on along it. */
  function roundRing(ring, box) {
    const lead = fcfg('circle_lead', 0.55) * brain.turn;
    const a = Math.atan2((fish.y - ring.cy) / ring.ry, (fish.x - ring.cx) / ring.rx) + lead;
    return { x: clamp(ring.cx + Math.cos(a) * ring.rx, box.left, box.right),
             y: clamp(ring.cy + Math.sin(a) * ring.ry, box.top, box.bottom) };
  }

  function isWide(el) {
    try { return el.matches(String(Aquarium.get('fish.circle_whole', '.contribution, .game-story'))); } catch (err) { return false; }
  }

  function orbit() {
    const el = brain.hovered;
    if (!el || !el.isConnected) { brain.hovered = null; return null; }
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > view.h) return null;
    const margin = fcfg('circle_margin', 40);
    const radius = fcfg('circle_radius', 150);
    const left = Math.max(r.left, 0), right = Math.min(r.right, view.w);
    const top = Math.max(r.top, 0), bottom = Math.min(r.bottom, view.h);
    if (isWide(el)) {
      // all the way round it, as near as the walls allow
      const box = scene === 'start' ? startBox() : roomBox();
      const cx = clamp((left + right) / 2, box.left, box.right);
      const cy = clamp((top + bottom) / 2, box.top, box.bottom);
      return { cx, cy,
               rx: Math.min((right - left) / 2 + margin, cx - box.left, box.right - cx),
               ry: Math.min((bottom - top) / 2 + margin, cy - box.top, box.bottom - cy) };
    }
    return {
      cx: (left + right) / 2,
      cy: (top + bottom) / 2,
      rx: clamp(Math.min(r.width / 2 + margin, radius * 1.8), radius * 0.5, view.w * 0.42),
      ry: clamp(Math.min(r.height / 2 + margin, radius * 1.4), radius * 0.35, view.h * 0.38)
    };
  }

  function swimRoom(dt) {
    const t = clock;
    const b = roomBox();
    const cruise = fcfg('speed', 70);
    const top = fcfg('max_speed', 1600);
    const gap = fcfg('follow_gap', 90);
    const ease = fcfg('follow_ease', 2.2);
    const H = holeW() / 2;
    let goal = null, want = cruise, urgency = 1;

    // 1. a click he is on his way to
    if (!goal && brain.goTo) {
      const g = brain.goTo;
      if (t > g.until || Math.hypot(g.x - fish.x, g.y - fish.y) < fcfg('dash_arrive', 26)) {
        brain.goTo = null;
        brain.nextThink = t;
      } else {
        goal = { x: clamp(g.x, b.left, b.right), y: clamp(g.y, b.top, b.bottom) };
        want = fcfg('dash_speed', 1100);
        urgency = 6;
      }
    }

    // 2. something the cursor is resting on, to be circled
    if (!goal && Aquarium.get('fish.circle', true) !== false) {
      const ring = orbit();
      if (ring) {
        goal = roundRing(ring, b);
        want = fcfg('circle_speed', 140);
        urgency = Math.max(0.2, fcfg('circle_ease', 1.5));
      }
    }

    // 3. the cursor itself, while it's moving. In the mouth of the shaft
    // it means up the shaft.
    const following = Aquarium.get('fish.follow', true) !== false && pointer.inside
      && (t - pointer.moved) < fcfg('idle_after', 2.5);
    if (!goal && following) {
      if (pointer.y < border() * 2 && Math.abs(pointer.x - view.w / 2) < H) {
        goal = { x: view.w / 2, y: -fishLen() };
        want = num('swim_speed', 520);
        urgency = 2;
      } else {
        goal = { x: clamp(pointer.x, b.left, b.right), y: clamp(pointer.y, b.top, b.bottom) };
        want = clamp((Math.hypot(goal.x - fish.x, goal.y - fish.y) - gap) * ease, 0, top);
      }
    }

    // 4. his own business
    if (!goal) {
      if (!brain.target || t > brain.nextThink) {
        brain.target = { x: rand(b.left, b.right), y: rand(b.top, b.bottom) };
        const [lo, hi] = Aquarium.range('fish.wander_range', 1.4, 3.6);
        brain.nextThink = t + rand(lo, hi);
      }
      goal = brain.target;
      if (Math.hypot(goal.x - fish.x, goal.y - fish.y) < 30) {
        want = cruise * 0.25;
        if (t > brain.nextThink - 0.2) brain.nextThink = t;
      }
      if (t > brain.nextRoll && !brain.roll) {
        if (brain.nextRoll) startRoll();
        else {
          const [lo, hi] = Aquarium.range('fish.roll_every', 7, 18);
          brain.nextRoll = t + rand(lo, hi);
        }
      }
    }

    const dx = goal.x - fish.x, dy = goal.y - fish.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    want = Math.min(want, top);
    const accel = fcfg('accel', 3.2) * urgency;
    fish.vx += ((dx / dist) * want - fish.vx) * Math.min(1, accel * dt);
    fish.vy += ((dy / dist) * want - fish.vy) * Math.min(1, accel * dt);
    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;

    if (!brain.roll) {
      if (fish.vx > 14) fish.facing = 1;
      if (fish.vx < -14) fish.facing = -1;
    }
  }

  /* Where the cursor sends him. He stops a little short of it, and it can't
     go past the edge of the screen, so a cursor in an open way out aims him
     on through it instead. */
  function aim(x, y) {
    const { w, h } = view;
    const b = border();
    const g = gapH() / 2;
    const band = Math.max(b * 4, 60);
    if (scene === 'start' && x > w - wallW() && Math.abs(y - h / 2) < g) return [w + fishLen(), h / 2];
    if (scene === 'level') {
      if (x < band && Math.abs(y - h / 2) < g) return [-fishLen(), h / 2];
      if (level.opened.right && x > w - band && Math.abs(y - h / 2) < g) return [w + fishLen(), h / 2];
      if (level.opened.bottom && y > h - band && Math.abs(x - w / 2) < holeW() / 2) return [w / 2, h + fishLen()];
    }
    return [x, y];
  }

  /* Whatever is solid where he is, as boxes: { l, t, r, b }. The far sides
     run well off the screen, so nothing gets through by going fast. */
  function walls() {
    const { w, h } = view;
    const far = 4000;
    const out = [];
    const side = (l, t, r, b, thing = null) => out.push({ l, t, r, b, thing });

    if (scene === 'start') {
      const x = w - wallW();
      const g = gapH() / 2;
      side(-far, -far, w + far, 0);                // the top of the screen
      side(-far, h, w + far, h + far);             // the bottom
      side(-far, -far, 0, h + far);                // the left
      side(x, -far, w + far, h / 2 - g);           // the coral, above the hole
      side(x, h / 2 + g, w + far, h + far);        // and below it
    } else if (scene === 'level') {
      const inner = wallsOf(level);
      const b = inner.x, foot = inner.y;
      const g = gapH() / 2;
      const hole = holeW() / 2;
      side(-far, -far, w + far, inner.top);        // top
      side(-far, -far, b, h / 2 - g);              // left, open: the way back
      side(-far, h / 2 + g, b, h + far);
      if (level.opened.right) {                    // right, once it's broken open
        side(w - b, -far, w + far, h / 2 - g);
        side(w - b, h / 2 + g, w + far, h + far);
      } else side(w - b, -far, w + far, h + far);
      if (level.opened.bottom) {                   // the floor, likewise
        side(-far, h - foot, w / 2 - hole, h + far);
        side(w / 2 + hole, h - foot, w + far, h + far);
      } else side(-far, h - foot, w + far, h + far);
      for (const box of mechanicOf(level.i).solids(level)) side(box.l, box.t, box.r, box.b, box);
    } else if (scene === 'room') {
      const b = border();
      const hole = holeW() / 2;
      side(-far, -far, w / 2 - hole, borderTop()); // the ceiling, with the shaft up
      side(w / 2 + hole, -far, w + far, borderTop());
      side(-far, h - b, w + far, h + far);
      side(-far, -far, b, h + far);
      side(w - b, -far, w + far, h + far);
    }
    return out;
  }

  function collide() {
    const hw = halfW(), hh = halfH();
    // a dash that has only just run out still counts: he's still going fast
    const hard = fish.dash || clock - fish.dashEnd < 0.15;
    for (const r of walls()) {
      const ox = Math.min(fish.x + hw, r.r) - Math.max(fish.x - hw, r.l);
      const oy = Math.min(fish.y + hh, r.b) - Math.max(fish.y - hh, r.t);
      if (ox <= 0 || oy <= 0) continue;

      if (r.thing && r.thing.touch(hard)) continue;

      if (ox < oy) {
        fish.x += fish.x < (r.l + r.r) / 2 ? -ox : ox;
        fish.vx = 0;
      } else {
        fish.y += fish.y < (r.t + r.b) / 2 ? -oy : oy;
        fish.vy = 0;
      }
      if (fish.dash) { fish.dash = null; fish.vx *= 0.2; fish.vy *= 0.2; }
    }
  }

  /* However it was done, this room is solved. */
  function beatRoom() {
    level.won = true;
    level.wonAt = clock;
    if (!cleared[current]) cleared[current] = [];
    cleared[current][level.n] = true;
    beaten[current] = subsOf(current).every((sub, n) => isCleared(current, n));
    level.titled = beaten[current] && level.n === lastSub(current);
  }

  /* What a room is called: `Level 1.2`, or just `Level 1` once it's the
     level's title room. */
  function roomName(i, n) {
    const titled = beaten[i] && n === lastSub(i);
    return 'Level ' + (i + 1) + (titled ? '' : '.' + (n + 1));
  }

  function enterLevel(i, n, back = false) {
    begin('tunnel', { kind: 'level', i, n, lv: makeLevel(i, n) }, roomName(i, n), levels[i].title, back);
  }

  /* Left: a level finished is only its title room, so from one it's the
     title room of the level before. In a level not finished yet it's the
     sublevel before, and from its first, the level before. */
  function goBack() {
    const i = current, n = level.n;
    if (!beaten[i] && n > 0) enterLevel(i, n - 1, true);
    else if (i > 0) enterLevel(i - 1, lastSub(i - 1), true);
    else begin('tunnel', { kind: 'start' }, data.back_kicker, data.title, true);
  }

  /* Right: the next sublevel, or at the end of a level, the next level: its
     title room if it's finished, its first sublevel if not. */
  function goOn() {
    const i = current, n = level.n;
    if (n < lastSub(i)) { enterLevel(i, n + 1); return; }
    const next = i + 1;
    if (next >= levels.length) begin('tunnel', { kind: 'start' }, data.end_kicker, data.end_title);
    else enterLevel(next, beaten[next] ? lastSub(next) : 0);
  }

  /* Has he gone through one of the ways out? */
  function exits() {
    const { w, h } = view;
    if (scene === 'start' && fish.x > w - wallW() * 0.45) {
      if (levels.length) enterLevel(0, beaten[0] ? lastSub(0) : 0);
    } else if (scene === 'level') {
      // he follows the cursor only so close, so it's enough to be into the
      // opening: the walls keep him out of it everywhere else
      if (fish.x - halfW() * 0.6 < border()) {
        goBack();
      } else if (level.opened.right && fish.x + halfW() * 0.6 > w - border()) {
        goOn();
      } else if (level.opened.bottom && fish.y + halfH() * 0.6 > h - border()) {
        begin('dive', { kind: 'room', i: current });
      }
    } else if (scene === 'room' && fish.y - halfH() * 0.6 < borderTop()) {
      begin('rise', { kind: 'level', i: current, lv: makeLevel(current) });
    }
  }
