  // --------------------------------------------------------------- glass --

  function drawGlass(ctx, env) {
    const b = state.bowl;
    if (!b) return;

    if (state.broken) { drawShards(ctx, env); return; }

    const tint = get('bowl.glass_tint', '#dff2f7');
    const alpha = Number(get('bowl.glass_alpha', 0.42));
    const line = Number(get('bowl.glass_line', 2.2));
    const s = bowlPath(ctx, b);

    // the pane itself, as a sheen over the water only: the air above it is
    // left fully clear
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.rect(b.x - 2, waterY(b, env.t), b.w + 4, b.h);
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
