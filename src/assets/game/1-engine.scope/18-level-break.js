  /* The rock in an opening gives way, in three goes:
     1. cracks spread through the solid wall from the middle of the opening
        until they have cut out the pieces;
     2. the pieces come loose: each is cut from a picture of the wall, so
        nothing changes to look at, then they rumble softly and draw apart,
        shrinking (to 90% at the least);
     3. they fall out through the edge of the screen, slowly at first and
        faster all the time (exponentially), tipping a little towards the
        middle of the hole. The middle ones start as soon as the rumble does,
        and the further out a piece is the later it starts, the outermost as
        the way opens. */
  function startBreak(lv, which) {
    const { w, h } = view;
    const right = which === 'right';
    const b = right ? wallsOf(lv).x : wallsOf(lv).y;
    const g = gapH() / 2;
    const cy = h / 2;
    const amp = rockAmp();
    const seed = 5 + lv.i * 3;
    // along the opening, and across the rock from its face to past the edge
    const half = right ? g : holeW() / 2;
    const mid = right ? cy : w / 2;
    const t0 = mid - half - 26, t1 = mid + half + 26;
    const face = t => right ? w - b + amp * wobble(t, seed + 7.7) : h - b + amp * wobble(t, seed);
    const outer = right ? w + 8 : h + 8;
    const xy = (t, s) => right ? [s, t] : [t, s];

    const cols = Math.max(3, Math.round((t1 - t0) / 44));
    const rows = 2;
    const grid = [];
    for (let i = 0; i <= cols; i++) {
      grid.push([]);
      for (let j = 0; j <= rows; j++) {
        const k = i * 31 + j * 7 + lv.i * 101 + (right ? 0 : 500);
        let t = lerp(t0, t1, i / cols);
        if (i > 0 && i < cols) t += (hash(k) - 0.5) * (t1 - t0) / cols * 0.6;
        const f = face(t);
        let s = lerp(f, outer, j / rows);
        if (j > 0 && j < rows) s += (hash(k + 1) - 0.5) * (outer - f) / rows * 0.5;
        grid[i].push({ t, s });
      }
    }
    // a jagged line between two points of the grid
    const jag = (a, c, k) => {
      const [ax, ay] = xy(a.t, a.s), [cx, cy2] = xy(c.t, c.s);
      const d = Math.hypot(cx - ax, cy2 - ay) || 1;
      const steps = Math.max(2, Math.ceil(d / 8));
      const out = [];
      for (let n = 0; n <= steps; n++) {
        const u = n / steps;
        const off = n === 0 || n === steps ? 0 : (hash(k + n * 3) - 0.5) * 5;
        out.push([lerp(ax, cx, u) - (cy2 - ay) / d * off, lerp(ay, cy2, u) + (cx - ax) / d * off]);
      }
      return out;
    };
    const salt = lv.i * 211 + (right ? 0 : 900);
    const across = [], down = [];
    for (let i = 0; i <= cols; i++) {
      down.push([]);
      across.push([]);
      for (let j = 0; j <= rows; j++) {
        if (j < rows) down[i].push(jag(grid[i][j], grid[i][j + 1], salt + i * 41 + j * 17));
        if (i === cols) continue;
        if (j === 0) {
          // along the wall's own face, not across it
          const line = [];
          for (let n = 0; n <= 8; n++) {
            const t = lerp(grid[i][0].t, grid[i + 1][0].t, n / 8);
            line.push(xy(t, face(t)));
          }
          across[i].push(line);
        } else across[i].push(jag(grid[i][j], grid[i + 1][j], salt + i * 59 + j * 23 + 500));
      }
    }

    // the cracks, in the order they spread: `from` when, of the whole 0–1
    const cracks = [];
    const away = t => Math.abs(t - mid) / (half + 26);
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j < rows; j++) {
        cracks.push({ line: down[i][j], from: 0.45 * away(grid[i][j].t) + j * 0.12 + hash(salt + i * 7 + j) * 0.08 });
      }
    }
    for (let i = 0; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        cracks.push({ line: across[i][j], from: 0.5 * away(grid[i][j].t) + 0.2 + hash(salt + i * 11 + j) * 0.08 });
      }
    }

    const pieces = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const pts = [...across[i][j], ...down[i + 1][j], ...across[i][j + 1].slice().reverse(), ...down[i][j].slice().reverse()];
        const n = pts.length;
        const cx = pts.reduce((v, p) => v + p[0], 0) / n;
        const cyy = pts.reduce((v, p) => v + p[1], 0) / n;
        const k = i * 13 + j * 5 + lv.i * 77;
        const side = Math.sign((right ? cyy : cx) - mid) || 1;
        const apart = side * (2 + hash(k + 1) * 7);
        pieces.push({
          pts: pts.map(p => [p[0] - cx, p[1] - cyy]),
          x: cx, y: cyy,
          ax: right ? 0 : apart, ay: right ? apart : 0,
          // the way down and out, gentle: right through the right edge, the
          // floor's through the bottom
          ox: right ? 1 : 0, oy: right ? 0.35 : 1,
          fall: 3 + hash(k + 2) * 3,
          rate: lerp(FALL_MIDDLE, FALL_EDGE, clamp(away(right ? cyy : cx), 0, 1)),
          wait: RUMBLE * clamp(away(right ? cyy : cx), 0, 1),
          // the side of it facing the water comes round towards the middle
          tip: (right ? side : -side) * (0.2 + hash(k + 3) * 0.2),
          shrink: 0.9 + hash(k + 4) * 0.05,
          k
        });
      }
    }

    // the one recording covers both openings, which break close together
    if (sound() && !lv.crumbled) {
      sound().crumble();
      if (lv.titled) sound().ding();        // the last of a level's rooms
    }
    lv.crumbled = true;
    lv.breaks[which] = { at: clock, cracks, pieces, formed: false };
    lv.glowAt[which] = clock;
  }

  /* Moves a break along. */
  function stepBreaks(lv) {
    const seed = 5 + lv.i * 3;
    for (const which of ['right', 'bottom']) {
      const br = lv.breaks[which];
      if (!br) continue;
      const age = clock - br.at;
      if (age >= CRACK && !br.formed) {
        br.formed = true;
        cutPieces(lv, br, seed);
        lv.gone[which] = true;
        for (const d of br.pieces) if (hash(d.k + 9) < 0.5) puff(d.x, d.y, 0.8);
      }
      if (age >= CRACK + RUMBLE && !lv.opened[which]) {
        lv.opened[which] = true;
        lv.openAt[which] = clock;
        delete lv.breaks[which];
      }
    }
  }

  /* Each piece as a little picture of the wall it was. */
  function cutPieces(lv, br, seed) {
    const { w, h, dpr } = view;
    const wall = bakeLevel(lv);
    for (const d of br.pieces) {
      const xs = d.pts.map(p => p[0]), ys = d.pts.map(p => p[1]);
      const x0 = Math.min(...xs) - 1, y0 = Math.min(...ys) - 1;
      const bw = Math.max(...xs) + 1 - x0, bh = Math.max(...ys) + 1 - y0;
      const img = document.createElement('canvas');
      img.width = Math.ceil(bw * dpr);
      img.height = Math.ceil(bh * dpr);
      const c = img.getContext('2d');
      c.scale(dpr, dpr);
      c.translate(-x0 - d.x, -y0 - d.y);
      c.beginPath();
      d.pts.forEach(([x, y], n) => (n ? c.lineTo(x + d.x, y + d.y) : c.moveTo(x + d.x, y + d.y)));
      c.closePath();
      c.clip();
      c.drawImage(wall, -OVERLAP, -OVERLAP, w + OVERLAP * 2, h + OVERLAP * 2);
      d.img = img; d.x0 = x0; d.y0 = y0; d.bw = bw; d.bh = bh;
      d.born = br.at;
      lv.debris.push(d);
    }
  }

  /* Run `paint` with everything drawing on a canvas of its own, sized in
     screen pixels and drawn at `scale`, and give that back. `c` is one to use
     again. */
  function paintOn(cw, ch, paint, c = document.createElement('canvas'), scale = view.dpr) {
    const pw = Math.ceil(cw * scale), ph = Math.ceil(ch * scale);
    if (c.width !== pw || c.height !== ph) {
      c.width = pw;
      c.height = ph;
    }
    const main = ctx;
    ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pw, ph);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    paint();
    ctx = main;
    return c;
  }

  /* A soft warm light from behind the rock as an opening breaks, the same as
     the one in the mouth of the start's passage: it comes up as the cracks
     spread and the pieces loosen, then goes on pulsing until he goes into a
     tunnel or shaft, when it goes out quickly. `glowAt` belongs to this visit: a room he comes back to is made
     afresh, and doesn't glow again. */
  const GLOW_OUT = 0.3;      // seconds for the light to go out as he leaves

  function drawOpeningGlow(lv) {
    const { w, h } = view;
    const wall = wallsOf(lv);
    const rise = CRACK + RUMBLE;
    const leaving = move && move.from.lv === lv ? clock - move.at : -1;
    if (leaving >= GLOW_OUT) return;
    const out = leaving < 0 ? 1 : 1 - smooth(leaving / GLOW_OUT);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const which of ['right', 'bottom']) {
      if (lv.glowAt[which] === undefined) continue;
      const age = clock - lv.glowAt[which];
      const level = smooth(age / rise) * out;
      const right = which === 'right';
      // from the edge of the screen, like the light in any tunnel's mouth
      const x = right ? w : w / 2, y = right ? h / 2 : h;
      const r = (right ? gapH() : holeW()) * 1.5 + (right ? wall.x : wall.y);
      const pulse = 0.72 + Math.sin(clock * 2.4) * 0.28;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, `rgba(255, 186, 120, ${0.34 * level * pulse})`);
      glow.addColorStop(0.5, `rgba(255, 186, 120, ${0.12 * level * pulse})`);
      glow.addColorStop(1, 'rgba(255, 186, 120, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  function drawCracks(lv) {
    for (const which of ['right', 'bottom']) {
      const br = lv.breaks[which];
      if (!br || br.formed) continue;
      const u = (clock - br.at) / CRACK;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const c of br.cracks) {
        const p = clamp((u - c.from * 0.8) / 0.3, 0, 1);
        if (p <= 0) continue;
        const n = Math.max(1, Math.round((c.line.length - 1) * p));
        const stroke = (style, wid, dx) => {
          ctx.strokeStyle = style;
          ctx.lineWidth = wid;
          ctx.beginPath();
          for (let i = 0; i <= n; i++) {
            const [x, y] = c.line[i];
            if (i) ctx.lineTo(x + dx, y + dx); else ctx.moveTo(x + dx, y + dx);
          }
          ctx.stroke();
        };
        // a lit lip beside the dark of it
        stroke('rgba(255, 214, 228, .16)', 1, 1);
        stroke('rgba(10, 2, 8, .92)', 1 + clamp(u, 0, 1) * 1.2, 0);
      }
      ctx.restore();
    }
  }

  function drawDebris(lv) {
    if (!lv.debris.length) return;
    const { w, h } = view;
    const still = Portfolio.reduceMotion.matches ? 0 : 1;
    const keep = [];
    ctx.save();
    ctx.lineJoin = 'round';
    for (const d of lv.debris) {
      const age = clock - d.born;
      const r = clamp((age - CRACK) / RUMBLE, 0, 1);       // the rumble, 0–1
      const tau = Math.max(0, age - CRACK - d.wait);       // the fall, seconds
      const eased = r * r * (3 - 2 * r);
      const quake = still * Math.sin(Math.PI * Math.min(1, r * 1.1) + 0.3) * clamp(1 - tau / 0.5, 0, 1);
      const fallen = d.fall * (Math.exp(d.rate * tau) - 1);
      const x = d.x + d.ax * eased + d.ox * fallen
              + (Math.sin(age * 31 + d.k) + Math.sin(age * 47 + d.k * 2)) * 0.6 * quake;
      const y = d.y + d.ay * eased + d.oy * fallen
              + (Math.sin(age * 37 + d.k * 3) + Math.sin(age * 53 + d.k)) * 0.6 * quake;
      if (x - d.bw > w + 10 || y - d.bh > h + 10 || tau > 4) continue;
      keep.push(d);
      const size = lerp(1, d.shrink, eased);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(d.tip * (1 - Math.exp(-2.5 * tau)));
      ctx.scale(size, size);
      ctx.drawImage(d.img, d.x0, d.y0, d.bw, d.bh);
      // the dark of the crack still round it
      ctx.beginPath();
      d.pts.forEach(([px, py], n) => (n ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.strokeStyle = 'rgba(10, 2, 8, .8)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }
    lv.debris = keep;
    ctx.restore();
  }
