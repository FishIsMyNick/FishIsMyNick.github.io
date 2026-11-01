  // ------------------------------------------------------------ the tunnels --

  /* The passage between two places, between `a` and `b` along the line it
     lies on (screen pixels), with the water channel `wide` down its middle:
     the same rock as the start's wall and the same water as the start's,
     so the way from one place to the next looks like part of it. `pos` is
     how far the line has slid; the rock is drawn in the passage's own
     coordinates, so its shape goes by with it. Its ends are cut flat: the
     walls of the places either side carry on from them. Deeper (`depth`)
     the water and the stone both darken. */
  function passage(across, a, b, wide, pos, depth, c0, c1, dir) {
    const { w, h } = view;
    const lo = Math.max(a, 0), hi = Math.min(b, across ? w : h);
    if (hi <= lo) return;
    ctx.save();
    ctx.beginPath();
    if (across) ctx.rect(lo, 0, hi - lo, h);
    else ctx.rect(0, lo, w, hi - lo);
    ctx.clip();

    // everything goes by with the passage
    const L = b - a;
    const mid = across ? h / 2 : w / 2;
    const cross = across ? h : w;
    const at = (along, side) => across ? [along, side] : [side, along];
    ctx.translate(across ? a : 0, across ? 0 : a);

    // the water: the colour of the place at each end where it joins it,
    // and dark all through the middle
    const near = dir > 0 ? c0 : c1, farEnd = dir > 0 ? c1 : c0;
    const night = css(mix(colorAt(1), '#000000', 0.35));
    const g = across ? ctx.createLinearGradient(0, 0, L, 0) : ctx.createLinearGradient(0, 0, 0, L);
    g.addColorStop(0, css(near));
    g.addColorStop(0.28, night);
    g.addColorStop(0.72, night);
    g.addColorStop(1, css(farEnd));
    ctx.fillStyle = g;
    if (across) ctx.fillRect(0, 0, L, h);
    else ctx.fillRect(0, 0, w, L);

    // specks in the water
    for (let i = 0; i < L / 22; i++) {
      const [x, y] = at(hash(i * 3 + 11) * L, mid + (hash(i * 3 + 12) - 0.5) * wide * 0.9);
      ctx.fillStyle = `rgba(220, 245, 250, ${0.1 + hash(i + 9) * 0.14})`;
      ctx.fillRect(x, y, 1.8, 1.8);
    }

    ctx.restore();
  }

  /* The passage's rock. It goes over the places either side, which carry
     their own rock OVERLAP past the edge of the screen: it fades in over
     that stretch, so wall and passage melt into each other with no line
     where they meet. Their faces run straight there, so they lie together.
     All tunnels are the same rock, and so are all shafts, painted the once
     (at no more than one to one: it goes by fast). */
  function passageRock(across, a, b, wide) {
    const { w, h } = view;
    const lo = Math.max(a, 0), hi = Math.min(b, across ? w : h);
    if (hi <= lo) return;
    const L = b - a;
    const rock = bakePassage(across, L, wide);
    ctx.save();
    ctx.beginPath();
    if (across) ctx.rect(lo, 0, hi - lo, h);
    else ctx.rect(0, lo, w, hi - lo);
    ctx.clip();
    if (across) ctx.drawImage(rock, a, 0, L, h);
    else ctx.drawImage(rock, 0, a, w, L);
    ctx.restore();
  }

  function bakePassage(across, L, wide) {
    const { w, h } = view;
    const mid = across ? h / 2 : w / 2;
    const cross = across ? h : w;
    const at = (along, side) => across ? [along, side] : [side, along];
    const far = 120;
    const amp = clamp(wide * 0.07, 6, 14);
    const span = [OVERLAP, L - OVERLAP];
    const dark = across ? 0 : 0.4;
    return bake(`passage${across}:${Math.round(L)}:${Math.round(wide)}`, across ? L : w, across ? h : L, () => {
      const one = rockShape(
        [at(-far, -far), at(L + far, -far), at(L + far, mid - wide / 2), at(-far, mid - wide / 2)],
        [false, false, true, false], amp, 9.4, span);
      const two = rockShape(
        [at(L + far, cross + far), at(-far, cross + far), at(-far, mid + wide / 2), at(L + far, mid + wide / 2)],
        [false, false, true, false], amp, 12.9, span);
      drawRock(one, 9, dark);
      drawRock(two, 12, dark);
      // rub out its ends
      ctx.globalCompositeOperation = 'destination-out';
      for (const [e0, e1] of [[0, OVERLAP], [L, L - OVERLAP]]) {
        const fade = across ? ctx.createLinearGradient(e0, 0, e1, 0) : ctx.createLinearGradient(0, e0, 0, e1);
        fade.addColorStop(0, 'rgba(0, 0, 0, 1)');
        fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = fade;
        if (across) ctx.fillRect(Math.min(e0, e1), 0, OVERLAP, h);
        else ctx.fillRect(0, Math.min(e0, e1), w, OVERLAP);
      }
    }, Math.min(view.dpr, 1));
  }

  /* The room's frosted glass. A real blur (backdrop-filter) over a canvas
     that changes every frame is the most expensive thing on the screen, and
     the water behind the page is smooth anyway, so only he is frosted: inside
     `rect` he is painted through the same blur as the rest of the site's
     panes, on just the patch of screen round him; outside it, sharp. `paint`
     draws him, and the bubbles if it's the sharp go (`soft` false). */
  const frost = document.createElement('canvas');
  const canFilter = 'filter' in ctx;

  function paneBlur() {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--panel-blur'));
    return Number.isFinite(v) ? v : 8;
  }

  function frosted(rect, paint) {
    const { w, h } = view;
    if (!rect) { paint(false); return; }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip('evenodd');
    paint(false);
    ctx.restore();

    const blur = roomSize.blur || (roomSize.blur = paneBlur());
    const patch = fishLen() * 1.3 + blur * 6;
    const x0 = fish.x - patch / 2, y0 = fish.y - patch / 2;
    const him = paintOn(patch, patch, () => {
      ctx.translate(-x0, -y0);
      paint(true);
    }, frost);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (canFilter) {
      ctx.filter = `blur(${blur * view.dpr}px)`;
      ctx.drawImage(him, x0, y0, patch, patch);
    } else {
      // no canvas filters here: him many times over, in rings, comes close
      const taps = [[0, 0]];
      for (const [r, n] of [[blur * 0.6, 6], [blur * 1.2, 10], [blur * 1.8, 14]]) {
        for (let k = 0; k < n; k++) {
          taps.push([Math.cos(k / n * 6.283) * r, Math.sin(k / n * 6.283) * r]);
        }
      }
      ctx.globalAlpha = 1 / taps.length * 1.6;
      for (const [dx, dy] of taps) ctx.drawImage(him, x0 + dx, y0 + dy, patch, patch);
    }
    ctx.restore();
  }

  function roomRect(ox, oy) {
    const { w, h } = view;
    const b = border();
    if (Math.abs(ox) >= w || Math.abs(oy) >= h) return null;
    const t = borderTop();
    return { x: b + ox, y: t + oy, w: w - b * 2, h: h - t - b };
  }

  /* One place, drawn `ox`, `oy` off the screen. */
  function drawPlace(place, ox, oy, dt) {
    const { w, h } = view;
    // its rock runs OVERLAP past the screen, under the passage's, and the
    // light in its mouths further still
    const past = OVERLAP + Math.max(w, h) / 2;
    if (Math.abs(ox) >= w + past || Math.abs(oy) >= h + past) return;
    ctx.save();
    ctx.translate(ox, oy);
    if (place.kind === 'start') {
      water(0, 0.22);
      coral();
    } else if (place.kind === 'level') {
      const lv = place.lv;
      const fade = showsPage(lv)
        ? 1 - clamp((clock - lv.wonAt - 0.3) / Math.max(0.1, num('reveal_time', 1.4)), 0, 1)
        : 1;
      water(0.05, 0.3, tintOf(place.i), fade);
      frameOf(lv);
      mechanicOf(place.i).draw(lv, dt);
    } else if (place.kind === 'room') {
      const d = roomDepth();
      water(d - 0.05, d + 0.08, tintOf(place.i));
      // the mouth of the shaft, the colour of the frosted room below it
      const H = holeW() / 2;
      ctx.fillStyle = css(roomTop());
      ctx.fillRect(w / 2 - H - 30, 0, H * 2 + 60, borderTop());
      roomFrame(place.i);
    }
    ctx.restore();
  }

  /* The text that belongs to the places on screen, slid with them: the
     start's title and story, a level's goal and title page, the room. */
  const startEl = $('game-start');
  const goalEl = $('game-goal');
  const tunnelEl = $('game-tunnel');
  const platesEl = $('game-plates');

  function put(el, shown, ox, oy) {
    if (!el) return;
    const vis = shown ? 'visible' : 'hidden';
    if (el.style.visibility !== vis) el.style.visibility = vis;
    slide(el, shown ? ox : 0, shown ? oy : 0);
  }

  // a change to the page only when there is one
  function slide(el, ox, oy) {
    const to = ox || oy ? `translate(${ox}px, ${oy}px)` : '';
    if (el.dataset.slid !== to) {
      el.dataset.slid = to;
      el.style.transform = to;
    }
  }

  function layout(places) {
    const { w, h } = view;
    const seen = places.filter(p => Math.abs(p.ox) < w && Math.abs(p.oy) < h);
    const find = kind => seen.find(p => p.place.kind === kind);

    const start = find('start');
    put(startEl, !!start, start && start.ox, start && start.oy);

    const lvl = find('level');
    put(goalEl, !!lvl, lvl && lvl.ox, lvl && lvl.oy);
    const talks = lvl && mechanicOf(lvl.place.i).plates;
    put(platesEl, !!talks, lvl && lvl.ox, lvl && lvl.oy);
    layer.classList.toggle('has-plates', !!talks);
    if (talks) talks(lvl.place.lv);
    if (lvl) {
      const i = lvl.place.i;
      const lv = levels[i] || {};
      const head = [roomName(i, lvl.place.lv.n), lv.title, lv.studio].filter(Boolean).join(' · ');
      const room = lvl.place.lv;
      const text = room.titled ? (i === levels.length - 1 ? data.done_last : data.done) : room.won ? data.sub_done : subsOf(i)[room.n].hint || '';
      if (hud.goalLevel.textContent !== head) hud.goalLevel.textContent = head;
      if (hud.goalText.textContent !== text) hud.goalText.textContent = text;
      goalEl.classList.toggle('is-won', lvl.place.lv.won);
    }
    pages.forEach((page, i) => {
      // under solid water until it's beaten, so no need to paint it till then
      const on = lvl && lvl.place.i === i && showsPage(lvl.place.lv);
      page.classList.toggle('is-on', !!on);
      slide(page, on ? lvl.ox : 0, on ? lvl.oy : 0);
    });

    const rm = find('room');
    const show = (el, on) => {
      if (!el) return;
      if (el.hidden === on) el.hidden = !on;
      slide(el, on ? rm.ox : 0, on ? rm.oy : 0);
    };
    show(roomUp, !!rm);
    show(room, !!rm);
    show(roomBar, !!rm && roomSize.most > 0);
    if (resetBtn) {
      const off = scene !== 'level' || (level && mechanicOf(level.i).notBuilt);
      if (resetBtn.hidden !== off) resetBtn.hidden = off;
    }
  }

  // slow away, quickest in the middle, slow to a stop: gentle enough that
  // the middle, where the tunnel fills the screen, isn't over in a blink
  const easeInOut = u => (1 - Math.cos(Math.PI * clamp(u, 0, 1))) / 2;
  const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };

  function drawMove(dt) {
    const m = move;
    const u = clamp((clock - m.at) / m.dur, 0, 1);
    const e = easeInOut(u);
    const { w, h } = view;
    const len = fishLen();

    // how far the line has slid: the passage and one screen, all told
    const total = m.size + m.length;
    // whole pixels, so the places and the passage meet without a seam
    const slid = Math.round(m.dir * total * e);
    const step = slid - m.last;
    m.last = slid;
    const along = d => m.across ? [d, 0] : [0, d];

    // where each thing is on the line, and so on the screen
    const fromAt = -slid;
    const toAt = m.dir * total - slid;
    const a = (m.dir > 0 ? m.size : -m.length) - slid;
    const b = a + m.length;

    // the passage's water, the places, then its rock over the ends of theirs
    const depth = m.across ? 0.15 : lerp(0.3, 0.5, m.dir > 0 ? u : 1 - u);
    const wide = m.across ? gapH() : holeW();
    passage(m.across, a, b, wide, slid, depth, m.c0, m.c1, m.dir);
    drawPlace(m.from, ...along(fromAt), dt);
    drawPlace(m.to, ...along(toAt), dt);
    passageRock(m.across, a, b, wide);
    layout([{ place: m.from, ox: along(fromAt)[0], oy: along(fromAt)[1] },
            { place: m.to, ox: along(toAt)[0], oy: along(toAt)[1] }]);

    // the level and the project, a layer of their own over it all: once
    // the tunnel is coming in they slide in from its side and settle in
    // the middle, wait there, and leave the other way with its far end
    if (m.across) {
      const from = 0.2, to = 0.42;
      const settle = 1 - Math.pow(1 - clamp((u - from) / (to - from), 0, 1), 3);
      const leave = m.dir > 0 ? Math.min(0, b - w) : Math.max(0, a);
      const tx = u < to ? m.dir * w * (1 - settle) : leave;
      put(tunnelEl, true, tx, 0);
    } else put(tunnelEl, false);

    // the bubbles stay where they are in the water, so they slide too
    for (const bb of bubbles) {
      if (m.across) bb.x -= step; else bb.y -= step;
    }

    // him: from where he went in to where he comes out, picking up speed
    // and losing it with everything else, his nose turned along the way
    fish.x = lerp(m.p0.x, m.p1.x, e);
    const wantY = lerp(m.p0.y, m.p1.y, e);
    fish.y = wantY;
    // always down the middle of the passage, never through its rock (he
    // lies along it, so his height is what has to fit across it)
    const play = Math.max(0, (m.across ? gapH() : holeW()) / 2 - halfH() - 4);
    if (m.across) fish.y = clamp(fish.y, h / 2 - play, h / 2 + play);
    else if (m.hurry && clock - m.at < m.hurry) {
      // the button: he darts across to the mouth, kept under the ceiling
      // as it comes down until he's there
      fish.x = lerp(m.p0.x, w / 2, smooth((clock - m.at) / m.hurry));
      fish.y = Math.max(wantY, borderTop() + fromAt + halfH() + 6);
      m.pushed = fish.y - wantY;
    } else {
      fish.x = m.hurry ? w / 2 : clamp(fish.x, w / 2 - play, w / 2 + play);
      // and eases back onto his line up the shaft
      m.pushed = (m.pushed || 0) * Math.exp(-6 * dt);
      fish.y = wantY + m.pushed;
    }
    const pace = Math.abs(step) / Math.max(dt, 0.001);
    fish.phase += dt * Math.PI * 2 * (1.5 + Math.min(pace / 600, 3));
    if (m.across) {
      // facing the way he's going: right, or left on the way back
      fish.facing = m.dir;
      fish.flip = clamp(fish.flip + m.dir * dt / 0.12, -1, 1);
    } else {
      // any turn he was in the middle of finishes on the way
      fish.facing = m.side;
      fish.flip = clamp(fish.flip + m.side * dt / 0.12, -1, 1);
    }
    const rot = u < 0.5
      ? lerp(m.rot0, m.rot, smooth(u / 0.2))
      : lerp(m.rot, 0, smooth((u - 0.8) / 0.2));
    if (Math.random() < dt * Math.min(40, pace / 20)) {
      const back = m.across ? [-m.dir * len * 0.5, rand(-6, 6)] : [rand(-6, 6), (m.dir > 0 ? -1 : 1) * len * 0.5];
      puff(fish.x + back[0], fish.y + back[1], 0.8);
    }
    const worn = m.across ? tunnelHats(m, u, slid, a, b, len) : { hat: hatOf(m.from), lift: 0 };
    const roomAt = m.from.kind === 'room' ? fromAt : m.to.kind === 'room' ? toAt : null;
    frosted(roomAt === null ? null : roomRect(...along(roomAt)), soft => {
      if (!soft) drawBubbles(dt);
      drawFish(fish.x, fish.y, rot, fish.flip, len, worn.hat, worn.lift);
    });

    if (u >= 1) finish();
  }
