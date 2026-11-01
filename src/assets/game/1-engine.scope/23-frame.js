  // ---------------------------------------------------------------- frame --

  function frame(now) {
    if (!running) return;
    if (paused) {
      last = 0;
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    clock += dt;

    let wantLen = 0;
    const held = holder();
    if (held) {
      const to = held.steer(level, dt);
      wantLen = to.len;
      holdFish(to, dt);
    } else if (!move && !fading) {
      swim(dt);
      collide();
      exits();
    }
    const wantSize = wantLen ? Math.min(1, wantLen / fullLen()) : 1;
    fish.size += (wantSize - fish.size) * (1 - Math.exp(-6 * dt));

    const { w, h } = view;
    ctx.clearRect(0, 0, w, h);

    if (move) {
      drawMove(dt);
    } else {
      drawPlace(here, 0, 0, dt);
      layout([{ place: here, ox: 0, oy: 0 }]);
      put(tunnelEl, false);
      drawFree(dt);
    }

    raf = requestAnimationFrame(frame);
  }
