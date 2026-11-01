  // -------------------------------------------------------------- layers --

  const layers = [];
  const scene = {
    view,
    add(order, draw) {
      layers.push({ order, draw });
      layers.sort((a, b) => a.order - b.order);
    },
    ripple(x, y, strength = 1) {
      ripples.push({ x, y, born: clock, strength, seed: rand(0, Math.PI * 2) });
      if (ripples.length > 24) ripples.shift();
    },

    /* Something went through the line. Two things come of it: a wave that
       travels out along the surface in both directions, and a crown of
       droplets thrown up off the point it went through.

       `strength` is roughly how hard — 1 is the fish landing, 2 is the fish
       landing from a height. `dir` is +1 going down into the water, -1 coming
       up out of it, which only changes how the droplets are thrown. */
    splash(x, strength = 1, dir = 1) {
      const s = clamp(strength, 0.1, 2.5);
      splashes.push({ x, born: clock, strength: s, seed: rand(0, Math.PI * 2) });
      if (splashes.length > 8) splashes.shift();

      const n = Math.round(Number(get('water.splash_drops', 16)) * s);
      const up = Number(get('water.splash_throw', 420));
      for (let i = 0; i < n; i++) {
        // across the crown, and hardest up the middle of it
        const across = rand(-1, 1);
        drops.push({
          x: x + across * 30 * s,
          y: state.surfaceY + rand(-4, 6),
          vx: across * rand(50, 240) * s,
          vy: -up * s * rand(0.35, 1) * (1 - Math.abs(across) * 0.45)
              * (dir < 0 ? 1.15 : 1),
          r: rand(1.1, 3.4) * (0.8 + s * 0.3),
          born: clock,
          life: rand(0.45, 1.15) * (0.7 + s * 0.3)
        });
      }
      if (drops.length > 260) drops.splice(0, drops.length - 260);
    }
  };
  Aquarium.scene = scene;
