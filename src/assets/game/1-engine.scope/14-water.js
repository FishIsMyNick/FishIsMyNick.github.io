  // ---------------------------------------------------------------- water --

  /* Lighter at the top and darker at the bottom, like the portfolio's water,
     and `d0`..`d1` deep. A level's tint is laid through it. */
  function water(d0, d1, tint, alpha = 1) {
    if (alpha <= 0) return;
    const { w, h } = view;
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const top = tint ? mix(colorAt(d0), tint, 0.28) : colorAt(d0);
    const bottom = tint ? mix(colorAt(d1), tint, 0.18) : colorAt(d1);
    g.addColorStop(0, css(top));
    g.addColorStop(1, css(bottom));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // the specks in it
    for (let i = 0; i < 46; i++) {
      const x = (hash(i) * w + clock * (6 + hash(i + 99) * 10)) % w;
      const y = (hash(i + 50) * h + Math.sin(clock * 0.4 + i) * 8 + h) % h;
      ctx.fillStyle = `rgba(220, 245, 250, ${0.08 + hash(i + 3) * 0.12})`;
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.restore();
  }
