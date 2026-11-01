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
