/* The bowl, the glass, and the three taps it takes.

   The bowl is drawn on the canvas, in the box the stylesheet keeps for it in
   the title section — so where it sits on the page is a CSS question, and
   everything about how it looks is a question for the `bowl` and `glass`
   blocks of src/content/aquarium.yaml.

   It is one soft shape: a body and a neck in a single path, stroked twice so
   the line reads as glass rather than as a drawn outline. There is no straight
   line and no corner anywhere on it — the lip rolls over into the rim, and the
   rim is a curve of its own. Inside it there is sand, a plant and a castle.

   Tapping it rings the glass, cracks it, and sends him up to look. The last
   tap breaks it: the pieces fall, he leaps up to the top of the screen and
   turns over there, and then falls as the water comes up the screen to meet
   him. When the water has reached the top the rest of the page — which until
   then could not be scrolled to — is let in, and the overview fades in where
   the bowl was. */

(() => {
  'use strict';

  const { get, clamp, lerp, rand, motion, css } = Aquarium;
  const state = Aquarium.state;
  const scene = Aquarium.scene;
  if (!scene) return;

  const el = document.getElementById('bowl');
  const note = document.getElementById('bowl-note');
  const showcase = document.querySelector('.showcase');
  const body = document.body;

  let cracks = [];       // polylines in bowl space: 0–1 across, 0–1 down
  let shards = [];
  let shake = { at: -99, power: 0 };
  let brokeAt = 0;
  let revealed = false;
  let heading = null;    // where the page goes once the water is up, if anywhere
  let gravel = null;     // worked out once, so the stones don't crawl
  let plants = null;

  // ---------------------------------------------------------- the shape --

  /* Body and neck as one path. Curves and an arc, nothing else — the glass is
     a shape, not a diagram of a bowl. */
  function shape(b) {
    const neck = clamp(Number(get('bowl.neck', 0.46)), 0.2, 0.9);
    const neckH = clamp(Number(get('bowl.neck_height', 0.15)), 0, 0.4) * b.h;
    const flare = Number(get('bowl.flare', 0.06));
    const rx = b.w / 2;
    const ry = (b.h - neckH) / 2;
    const cx = b.x + b.w / 2;
    const cy = b.y + neckH + ry;
    const a = Math.acos(clamp(neck, -1, 1));
    return {
      cx, cy, rx, ry, a, neck,
      lipY: b.y + neckH * 0.2,
      lip: rx * (neck + flare),
      openY: cy - ry * Math.sin(a),
      openX: rx * neck
    };
  }

  /* The silhouette as a ring of points: the body round the bottom, up the
     waist of the neck, over the lip, across the rim, and down the other side.

     The ring is then drawn as one closed curve passing through every point,
     rather than as arcs and lines joined end to end. A curve through points
     has no corners in it anywhere — there is nowhere for one to be — which is
     the whole requirement, and it means the glass is described by where it
     goes rather than by a list of tangents that have to be kept in step.

     `lip_round` is how far the lip rolls over before the rim starts; `rim_bow`
     is how much the rim dips as it crosses. */
  function outline(b) {
    const s = shape(b);
    const roll = clamp(Number(get('bowl.lip_round', 0.42)), 0, 1);
    const bow = clamp(Number(get('bowl.rim_bow', 0.5)), 0, 2);

    const r = Math.max(2, s.lip * 0.4 * roll + b.w * 0.012);
    const inner = Math.max(s.lip - r * 1.2, s.lip * 0.3);
    const rimY = s.lipY - r * 0.35;
    const dip = (r * 1.2 + b.h * 0.012) * bow;
    const at = f => lerp(s.openY, s.lipY, f);

    const pts = [];
    const steps = 30;

    // the body, from the right of the opening all the way round to the left
    for (let i = 0; i <= steps; i++) {
      const th = -s.a + (Math.PI + 2 * s.a) * (i / steps);
      pts.push({ x: s.cx + s.rx * Math.cos(th), y: s.cy + s.ry * Math.sin(th) });
    }

    // up the left of the neck: in at the waist, out again to the lip
    pts.push({ x: s.cx - s.openX * 0.95, y: at(0.4) });
    pts.push({ x: s.cx - s.lip * 0.93,   y: at(0.86) });
    pts.push({ x: s.cx - s.lip,          y: s.lipY + r * 0.22 });
    // over the top of it
    pts.push({ x: s.cx - s.lip * 0.94,   y: s.lipY - r * 0.5 });
    pts.push({ x: s.cx - inner,          y: rimY });
    // and across the rim
    pts.push({ x: s.cx - inner * 0.45,   y: rimY + dip });
    pts.push({ x: s.cx + inner * 0.45,   y: rimY + dip });
    // the same again, the other way about
    pts.push({ x: s.cx + inner,          y: rimY });
    pts.push({ x: s.cx + s.lip * 0.94,   y: s.lipY - r * 0.5 });
    pts.push({ x: s.cx + s.lip,          y: s.lipY + r * 0.22 });
    pts.push({ x: s.cx + s.lip * 0.93,   y: at(0.86) });
    pts.push({ x: s.cx + s.openX * 0.95, y: at(0.4) });

    return { s, pts };
  }

  /* One closed curve through all of them.

     The control points are the centripetal Catmull-Rom ones: each knot is
     spaced by the square root of the distance to the next, which is what stops
     a tight turn — the lip — from looping back over itself the way an evenly
     spaced curve through the same points would. */
  function curveThrough(ctx, pts) {
    const n = pts.length;
    const d = (a, c) => Math.sqrt(Math.hypot(c.x - a.x, c.y - a.y)) || 1e-4;

    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];

      const d1 = d(p0, p1), d2 = d(p1, p2), d3 = d(p2, p3);
      const k1 = 3 * d1 * (d1 + d2);
      const k2 = 3 * d3 * (d3 + d2);

      ctx.bezierCurveTo(
        (d1 * d1 * p2.x - d2 * d2 * p0.x + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.x) / k1,
        (d1 * d1 * p2.y - d2 * d2 * p0.y + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.y) / k1,
        (d3 * d3 * p1.x - d2 * d2 * p3.x + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.x) / k2,
        (d3 * d3 * p1.y - d2 * d2 * p3.y + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.y) / k2,
        p2.x, p2.y);
    }
    ctx.closePath();
  }

  function bowlPath(ctx, b) {
    const { s, pts } = outline(b);
    ctx.beginPath();
    curveThrough(ctx, pts);
    return s;
  }

  function waterY(b, t) {
    const level = clamp(Number(get('bowl.water_level', 0.8)), 0.05, 0.98);
    const wobbleOn = Number(get('bowl.wobble', 0.6));
    const since = t - shake.at;
    const rock = since < 2
      ? Math.sin(since * 16) * Math.exp(-since * 3) * shake.power * 0.25 * wobbleOn
      : 0;
    return b.y + b.h * (1 - level) + rock;
  }

  // ------------------------------------------------------------- insides --

  function makeGravel() {
    const count = Math.max(0, Math.round(Number(get('bowl.gravel_count', 120))));
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push({
        u: Math.random(),
        v: Math.random(),
        r: rand(0.012, 0.026),
        tone: Math.random()
      });
    }
    return out;
  }

  function makePlants() {
    const out = [];
    for (let i = 0; i < 3; i++) {
      out.push({
        u: 0.24 + i * 0.05 + rand(-0.02, 0.02),
        h: rand(0.8, 1.15),
        lean: rand(-0.09, 0.09),
        phase: rand(0, Math.PI * 2),
        leaves: 5 + Math.round(rand(0, 3))
      });
    }
    return out;
  }

  /* The sand lies in a shallow mound rather than a flat band. */
  function sandTop(b, u) {
    const depth = clamp(Number(get('bowl.gravel_depth', 0.16)), 0, 0.6);
    const base = b.y + b.h * (1 - depth);
    return base - Math.sin(u * Math.PI) * b.h * depth * 0.28;
  }

  function drawInside(ctx, env) {
    const b = state.bowl;
    if (!b || state.broken) return;

    bowlPath(ctx, b);
    ctx.save();
    ctx.clip();

    // the water
    const wy = waterY(b, env.t);
    const tint = Aquarium.rgb(get('bowl.water_tint', '#e6f6fb'));
    const alpha = Number(get('bowl.water_alpha', 0.7));
    const fill = ctx.createLinearGradient(0, wy, 0, b.y + b.h);
    fill.addColorStop(0, css(tint, alpha * 0.82));
    fill.addColorStop(1, css(tint, alpha));
    ctx.fillStyle = fill;
    ctx.fillRect(b.x - 2, wy, b.w + 4, b.h);

    // where it meets the air, soft
    const meniscus = ctx.createLinearGradient(0, wy - 6, 0, wy + 8);
    meniscus.addColorStop(0, 'rgba(255, 255, 255, 0)');
    meniscus.addColorStop(0.45, 'rgba(255, 255, 255, .75)');
    meniscus.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = meniscus;
    ctx.fillRect(b.x - 2, wy - 6, b.w + 4, 14);

    drawSand(ctx, b);
    if (get('bowl.castle', true) !== false) drawCastle(ctx, b);
    drawPlants(ctx, b, env);

    ctx.restore();
  }

  function drawSand(ctx, b) {
    const depth = clamp(Number(get('bowl.gravel_depth', 0.16)), 0, 0.6);
    if (depth <= 0) return;
    if (!gravel) gravel = makeGravel();

    const warm = get('bowl.gravel_color', '#d9b27a');
    const dark = get('bowl.gravel_shade', '#b98f55');

    // the mound
    ctx.beginPath();
    ctx.moveTo(b.x - 2, sandTop(b, 0));
    for (let i = 0; i <= 20; i++) ctx.lineTo(b.x + (b.w * i) / 20, sandTop(b, i / 20));
    ctx.lineTo(b.x + b.w + 2, b.y + b.h + 4);
    ctx.lineTo(b.x - 2, b.y + b.h + 4);
    ctx.closePath();
    const bed = ctx.createLinearGradient(0, sandTop(b, 0.5), 0, b.y + b.h);
    bed.addColorStop(0, warm);
    bed.addColorStop(1, dark);
    ctx.fillStyle = bed;
    ctx.fill();

    // the stones in it
    for (const g of gravel) {
      const top = sandTop(b, g.u);
      const y = top + g.v * (b.y + b.h - top);
      ctx.fillStyle = g.tone > 0.5 ? warm : dark;
      ctx.globalAlpha = 0.55 + g.tone * 0.4;
      ctx.beginPath();
      ctx.ellipse(b.x + g.u * b.w, y, g.r * b.w, g.r * b.w * 0.74, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* A castle, the way the ones in fish tanks look: a keep, two towers, battlements
     and a dark doorway. */
  function drawCastle(ctx, b) {
    const w = b.w * Number(get('bowl.castle_width', 0.3));
    const h = b.h * Number(get('bowl.castle_height', 0.3));
    const at = clamp(Number(get('bowl.castle_at', 0.63)), 0.1, 0.9);
    const stone = get('bowl.castle_color', '#9fb0b8');
    const dark = get('bowl.castle_shade', '#6d8089');

    const cx = b.x + at * b.w;
    const ground = sandTop(b, at) + h * 0.1;

    const keepW = w * 0.44;
    const towerW = w * 0.26;
    const towerH = h * 0.78;

    // the two towers, then the keep between them
    [-1, 1].forEach(side => {
      const x = cx + side * (keepW / 2 + towerW / 2) - towerW / 2;
      block(x, ground - towerH, towerW, towerH, 3);
    });
    block(cx - keepW / 2, ground - h, keepW, h, 3);

    // the way in
    ctx.fillStyle = dark;
    const doorW = keepW * 0.4, doorH = h * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - doorW / 2, ground);
    ctx.lineTo(cx - doorW / 2, ground - doorH * 0.55);
    ctx.quadraticCurveTo(cx, ground - doorH * 1.25, cx + doorW / 2, ground - doorH * 0.55);
    ctx.lineTo(cx + doorW / 2, ground);
    ctx.closePath();
    ctx.fill();

    // two windows up in the towers
    [-1, 1].forEach(side => {
      const x = cx + side * (keepW / 2 + towerW / 2);
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(x, ground - towerH * 0.62, towerW * 0.16, towerW * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    /* One tower or wall: the stone, its battlements, and a shaded side. */
    function block(x, y, bw, bh, teeth) {
      ctx.fillStyle = stone;
      ctx.beginPath();
      ctx.rect(x, y, bw, bh);
      ctx.fill();

      // the shaded right-hand side
      ctx.fillStyle = dark;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x + bw * 0.68, y, bw * 0.32, bh);
      ctx.globalAlpha = 1;

      // battlements
      const step = bw / (teeth * 2 - 1);
      ctx.fillStyle = stone;
      for (let i = 0; i < teeth; i++) {
        ctx.fillRect(x + i * step * 2, y - bh * 0.12, step, bh * 0.14);
      }
    }
  }

  function drawPlants(ctx, b, env) {
    const plantH = Number(get('bowl.plant_height', 0.5));
    if (plantH <= 0) return;
    if (!plants) plants = makePlants();

    const sway = Number(get('bowl.plant_sway', 0.5)) * motion();
    ctx.strokeStyle = get('bowl.plant_color', '#3fa34a');
    ctx.lineCap = 'round';

    for (const p of plants) {
      const x = b.x + p.u * b.w;
      const root = sandTop(b, p.u) + b.h * 0.02;
      const tip = root - b.h * plantH * p.h;
      const bend = Math.sin(env.t * 0.9 + p.phase) * b.w * 0.035 * sway;

      ctx.lineWidth = Math.max(2, b.w * 0.012);
      ctx.beginPath();
      ctx.moveTo(x, root);
      ctx.quadraticCurveTo(x + bend + p.lean * b.w, (root + tip) / 2, x + bend * 1.6, tip);
      ctx.stroke();

      for (let i = 1; i <= p.leaves; i++) {
        const f = i / (p.leaves + 1);
        const ly = lerp(root, tip, f);
        const lx = x + bend * f * 1.4 + p.lean * b.w * f;
        const side = i % 2 ? 1 : -1;
        const leaf = b.w * 0.055 * (1 - f * 0.5);
        ctx.lineWidth = Math.max(1.5, b.w * 0.008);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(lx + side * leaf, ly - leaf * 0.5,
                             lx + side * leaf * 1.5, ly - leaf * 1.1);
        ctx.stroke();
      }
    }
  }

  // --------------------------------------------------------------- glass --

  function drawGlass(ctx, env) {
    const b = state.bowl;
    if (!b) return;

    if (state.broken) { drawShards(ctx, env); return; }

    const tint = get('bowl.glass_tint', '#dff2f7');
    const alpha = Number(get('bowl.glass_alpha', 0.42));
    const line = Number(get('bowl.glass_line', 2.2));
    const s = bowlPath(ctx, b);

    // the pane itself, as a sheen over whatever is behind it
    ctx.save();
    ctx.clip();
    const sheen = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    sheen.addColorStop(0, hexa(tint, 0.2 * alpha));
    sheen.addColorStop(0.45, hexa(tint, 0.02 * alpha));
    sheen.addColorStop(1, hexa(tint, 0.14 * alpha));
    ctx.fillStyle = sheen;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // one soft crescent down the left, and one shine across the top right
    ctx.strokeStyle = hexa('#ffffff', 0.4 * alpha);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3, b.w * 0.03);
    ctx.beginPath();
    ctx.ellipse(s.cx, s.cy, s.rx * 0.84, s.ry * 0.84, 0, Math.PI * 0.6, Math.PI * 0.94);
    ctx.stroke();

    ctx.fillStyle = hexa('#ffffff', 0.1 * alpha);
    ctx.beginPath();
    ctx.ellipse(s.cx + s.rx * 0.36, s.cy - s.ry * 0.44,
                s.rx * 0.3, s.ry * 0.1, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // the outline, drawn twice: a wide soft one under a thin bright one
    bowlPath(ctx, b);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.miterLimit = 1;
    ctx.strokeStyle = hexa(tint, 0.16 + 0.2 * alpha);
    ctx.lineWidth = line * 3;
    ctx.stroke();
    ctx.strokeStyle = hexa(tint, 0.5 + 0.4 * alpha);
    ctx.lineWidth = line;
    ctx.stroke();

    drawCracks(ctx, b);
  }

  // -------------------------------------------------------------- cracks --

  /* A crack is a run of short segments wandering away from where it was hit,
     with a couple of forks. Kept in bowl space so it stays put when the window
     is resized. */
  function makeCrack() {
    const spread = Number(get('glass.crack_spread', 0.62));
    const jitter = Number(get('glass.crack_jitter', 0.45));
    const from = { x: rand(0.3, 0.7), y: rand(0.35, 0.68) };
    const lines = [];

    const branches = 3 + Math.round(rand(0, 2));
    for (let i = 0; i < branches; i++) {
      const line = [from];
      let angle = rand(0, Math.PI * 2);
      let x = from.x, y = from.y;
      const steps = 4 + Math.round(rand(0, 4));
      const reach = spread / steps;
      for (let s = 0; s < steps; s++) {
        angle += rand(-1, 1) * jitter;
        x += Math.cos(angle) * reach * rand(0.6, 1.3);
        y += Math.sin(angle) * reach * rand(0.6, 1.3);
        if (x < 0.06 || x > 0.94 || y < 0.06 || y > 0.94) break;
        line.push({ x, y });
      }
      if (line.length > 1) lines.push(line);
    }
    return lines;
  }

  function drawCracks(ctx, b) {
    if (!cracks.length) return;
    ctx.save();
    bowlPath(ctx, b);       // a crack can't run off the edge of the glass
    ctx.clip();
    ctx.strokeStyle = hexa(get('glass.crack_color', '#ffffff'), 0.85);
    ctx.lineWidth = Number(get('glass.crack_width', 2));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const line of cracks) {
      ctx.beginPath();
      line.forEach((p, i) => {
        const x = b.x + p.x * b.w, y = b.y + p.y * b.h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- shards --

  function makeShards(b, t) {
    const count = Math.max(4, Math.round(Number(get('glass.shards', 26))));
    const spin = Number(get('glass.shard_spin', 2.2));
    const out = [];
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand(-0.1, 0.1);
      const radius = (b.w / 2) * rand(0.55, 1);
      const size = b.w * rand(0.04, 0.12);
      out.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius * 0.95,
        vx: Math.cos(angle) * rand(40, 220),
        vy: Math.sin(angle) * rand(20, 120) - rand(60, 260),
        rot: rand(0, Math.PI * 2),
        spin: rand(-spin, spin),
        size,
        born: t,
        points: [
          { x: 0, y: -size * rand(0.6, 1) },
          { x: size * rand(0.4, 0.9), y: size * rand(0.1, 0.5) },
          { x: -size * rand(0.3, 0.8), y: size * rand(0.3, 0.8) }
        ]
      });
    }
    return out;
  }

  function drawShards(ctx, env) {
    if (!shards.length) return;
    const g = Number(get('glass.shard_gravity', 1800));
    const life = Math.max(0.2, Number(get('glass.shard_fade', 1.6)));
    const tint = get('bowl.glass_tint', '#dff2f7');

    ctx.save();
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      const age = env.t - s.born;
      if (age > life) { shards.splice(i, 1); continue; }

      s.vy += g * env.dt;
      s.x += s.vx * env.dt;
      s.y += s.vy * env.dt;
      s.rot += s.spin * env.dt;

      const alpha = clamp(1 - age / life, 0, 1);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.beginPath();
      s.points.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = hexa(tint, 0.3 * alpha);
      ctx.fill();
      ctx.strokeStyle = hexa('#ffffff', 0.7 * alpha);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

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

  // -------------------------------------------------------------- update --

  function measure(env) {
    if (!el) { state.bowl = null; return; }
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) { state.bowl = null; return; }

    const since = env.t - shake.at;
    const jolt = since < 1.4
      ? Math.sin(since * 38) * Math.exp(-since * Number(get('glass.shake_decay', 7))) * shake.power
      : 0;

    state.bowl = { x: r.left + jolt, y: r.top, w: r.width, h: r.height };
  }

  function pour(env) {
    if (!state.broken) { state.pour = 0; return; }
    const time = Math.max(0.1, Number(get('glass.pour_time', 0.9)));
    state.pour = clamp((env.t - brokeAt) / time, 0, 1);
  }

  // ---------------------------------------------------------------- wire --

  if (el) {
    el.addEventListener('click', event => {
      event.preventDefault();
      tap();
    });
  }

  /* The lock. Added here rather than written into the HTML, so that a page
     whose script never ran is simply the portfolio, scrollable as usual. */
  function lock() {
    if (get('glass.lock_page', true) === false) return;
    if (state.deepLinked) return;          // they came for a project page
    body.classList.add('is-locked');
    document.documentElement.classList.add('is-locked');
    // A #work or #contact left in the address from last time would have the
    // browser jump down to it as the page loads, and the lock would then
    // hold it there. Locked, the page belongs at the top.
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    window.scrollTo(0, 0);
  }

  // The browser may still put the scroll back after this script has run —
  // on load, or coming back to the tab from the history. While the page is
  // locked, it goes straight back to the top.
  // And whatever else moves it — a late jump to an anchor, a restored
  // position, a key — is undone the moment it happens: until the glass
  // breaks, the page does not move from the top. (Once it breaks, the water
  // takes the page down, and this stands aside.)
  const toTop = () => {
    if (state.broken || !body.classList.contains('is-locked')) return;
    if (window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' });
  };
  window.addEventListener('load', toTop);
  window.addEventListener('pageshow', toTop);
  window.addEventListener('scroll', toTop, { passive: true });

  // Anyone who tabs to the skip link wants the page, not the puzzle.
  const skip = document.getElementById('skip');
  if (skip) skip.addEventListener('click', event => {
    if (state.broken) return;
    event.preventDefault();
    smash(Aquarium.clock(), { group: 'work' });
  });

  // A thumbnail on the opening screen breaks the glass too, and then takes
  // the page down to its part of My work. Nothing is opened: it stops there.
  document.querySelectorAll('.showcase-link').forEach(link => {
    link.addEventListener('click', event => {
      if (state.broken) return;
      event.preventDefault();
      smash(Aquarium.clock(), { group: link.dataset.group });
    });
  });

  Aquarium.break_ = target => { if (!state.broken) smash(Aquarium.clock(), target); };
  Aquarium.breakGlass = Aquarium.break_;
  Aquarium.reset = () => {
    state.broken = false;
    state.taps = 0;
    state.pour = 0;
    revealed = false;
    cracks = [];
    shards = [];
    gravel = null;
    plants = null;
    body.classList.remove('is-free');
    body.classList.remove('is-breaking');
    body.classList.remove('is-settled');
    body.classList.remove('is-titled');
    body.classList.remove('is-escorting');
    body.classList.remove('is-apex');
    if (showcase) showcase.inert = false;
    heading = null;
    state.heading = false;
    untrim();
    unfold();
    if (el) { el.disabled = false; el.setAttribute('aria-label', 'Tap to break the glass'); }
    if (Aquarium.fish) Aquarium.fish.reset();
    if (Aquarium.dropSurface) Aquarium.dropSurface();
    lock();
  };

  // a project page is laid over the water, and the bowl stays behind it
  const covered = () => body.classList.contains('detail-open');
  scene.add(20, (ctx, env) => { measure(env); pour(env); if (!covered()) drawInside(ctx, env); });
  scene.add(75, (ctx, env) => { if (!covered()) drawGlass(ctx, env); });

  lock();
  // The lock (or not) is in place, so the boot cover from the <head> can go.
  document.documentElement.classList.remove('is-booting');

  // --------------------------------------------------------------- bits --

  function hexa(hex, alpha) {
    const c = Aquarium.rgb(hex);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${clamp(alpha, 0, 1)})`;
  }

})();
