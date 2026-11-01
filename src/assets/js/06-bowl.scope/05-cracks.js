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
