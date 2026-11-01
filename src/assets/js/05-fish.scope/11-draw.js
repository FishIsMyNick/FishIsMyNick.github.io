  // ---------------------------------------------------------------- draw --

  function draw(ctx, env) {
    if (!ready) return;
    update(env.t, env.dt);

    /* The drawing he is wearing, and how wide it is drawn. `flip` carries both:
       its sign says which of the two it is, its size how far through a turn he
       is. The drawing is never mirrored — at the middle of a turn one is at no
       width at all, and the other opens out of it. */
    const side = sideNow();
    const sheet = sheets[side];
    const shade = shades[side];
    if (!sheet) return;

    const len = length();
    const h = len * shape[side];
    const rot = rotation();
    rotation.last = rot;
    const squash = Math.max(0.02, Math.abs(fish.flip));

    const wiggle = Number(get('fish.wiggle', 0.55)) * h * 0.14;
    const waves = Number(get('fish.wave_length', 1.2));
    const steady = clamp(Number(get('fish.head_steady', 0.26)), 0, 0.9);

    ctx.save();
    ctx.translate(fish.x, fish.y);
    ctx.rotate(rot);
    ctx.scale(squash, 1);

    const strips = Math.max(10, Math.round(len / 4));
    const stripW = sheet.width / strips;
    const outW = len / strips;

    // his shadow: one soft blit, under him and a little behind. Only in the
    // water — in the air there is nothing behind him for it to fall on.
    const shadow = Number(get('fish.shadow', 0.12));
    const airborne = fish.mode === 'leap' || fish.mode === 'jump';
    if (shadow > 0 && !airborne) {
      ctx.save();
      ctx.globalAlpha = shadow;
      ctx.drawImage(shade, -len / 2 + len * 0.03, -h / 2 + h * 0.1, len, h);
      ctx.restore();
    }

    // and the fish, strip by strip, with the wave running down him
    for (let i = 0; i < strips; i++) {
      // 0 at the nose, 1 at the tail, whichever way this drawing faces
      const u = (i + 0.5) / strips;
      const s = side === 'left' ? u : 1 - u;
      const amount = Math.pow(clamp((s - steady) / (1 - steady), 0, 1), 1.6);
      const dy = Math.sin(fish.phase - s * waves * Math.PI * 2) * wiggle * amount;
      ctx.drawImage(
        sheet,
        i * stripW, 0, stripW + 0.6, sheet.height,
        -len / 2 + i * outW, -h / 2 + dy, outW + 0.8, h
      );
    }
    ctx.restore();

    // the water lit up around him
    const glow = Number(get('fish.glow', 0.3));
    if (glow > 0) {
      const g = ctx.createRadialGradient(fish.x, fish.y, 0, fish.x, fish.y, len * 0.9);
      g.addColorStop(0, `rgba(255, 140, 70, ${0.16 * glow})`);
      g.addColorStop(1, 'rgba(255, 140, 70, 0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fish.x, fish.y, len * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBubbles(ctx, env) {
    if (!bubbles.length) return;
    ctx.save();
    for (const b of bubbles) {
      const age = (env.t - b.born) / b.life;
      const alpha = clamp(1 - age, 0, 1) * 0.5;
      ctx.strokeStyle = `rgba(226, 250, 255, ${alpha})`;
      ctx.fillStyle = `rgba(226, 250, 255, ${alpha * 0.18})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
      ctx.fill();
    }
    ctx.restore();
  }
