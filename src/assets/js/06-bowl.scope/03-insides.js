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
