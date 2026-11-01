  // ------------------------------------------------------------- surface --

  /* How far the line is lifted at a point by whatever has gone through it.

     A splash is a group of waves, not a ring: it leaves the point it was made
     at, travels out along the surface at `splash_speed`, and the water behind
     the front goes on rocking for a moment after it has passed. Nothing is
     lifted before the front arrives, which is what makes it read as travelling
     rather than as the whole line flexing at once. */
  function splashLift(x, t) {
    if (!splashes.length) return 0;

    const life = Math.max(0.3, Number(get('water.splash_life', 2.4)));
    const speed = Math.max(40, Number(get('water.splash_speed', 540)));
    const wave = Math.max(30, Number(get('water.splash_wave', 170)));
    const tall = Number(get('water.splash_height', 30));
    const k = (Math.PI * 2) / wave;

    let dy = 0;
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      const age = t - s.born;
      if (age > life) { splashes.splice(i, 1); continue; }

      const d = Math.abs(x - s.x);
      const front = speed * age;
      if (d > front) continue;                       // it hasn't reached here

      // dies away with time, with distance, and behind the front
      const fade = Math.pow(1 - age / life, 1.7);
      const spread = 1 / (1 + d / 300);
      const trail = Math.exp(-Math.pow((front - d) / (wave * 2.2), 2) * 0.55);

      dy -= Math.sin(k * (d - front) + s.seed) * tall * s.strength * fade * spread * trail;
    }
    return dy;
  }

  /* The line itself, drawn over everything so that the fish can break it.
     Several waves overlap — the far ones slow and faint, the near one crisp —
     which is what gives the surface its depth. `surface_layers` is how many. */
  function drawSurface(ctx, env) {
    const { t, w, h } = env;
    const surf = state.surfaceY;
    if (surf < -80 || surf > h + 80) { drawRipples(ctx, env); drawDrops(ctx, env); return; }

    const height = Number(get('water.wave_height', 9));
    const length = Math.max(40, Number(get('water.wave_length', 320)));
    const move = Number(get('water.movement', 1)) * motion();
    const foam = Number(get('water.foam', 0.5));
    const layers = Math.max(1, Math.round(Number(get('water.surface_layers', 3))
                                        - state.lean));

    // back to front: the last one drawn is the one the eye reads as the line
    for (let i = layers - 1; i >= 0; i--) {
      const far = layers > 1 ? i / (layers - 1) : 0;    // 1 is the farthest
      const amp = height * (1 - far * 0.45);
      const speed = 0.9 * move * (1 - far * 0.3);
      const drop = far * height * 1.5;
      const phase = i * 1.9;
      const strength = foam * (1 - far * 0.55);

      // the near layers take the most of a splash, the far ones a little
      const take = 1 - far * 0.55;

      const at = x => surf + drop
        + Math.sin(x / (length * (1 + far * 0.4)) * Math.PI * 2 + t * speed + phase) * amp
        + Math.sin(x / (length * 0.37) * Math.PI * 2 - t * speed * 1.5 + phase) * amp * 0.35
        + splashLift(x, t) * take;

      // a band of brighter water just under the front one
      ctx.save();
      if (i === 0) {
        ctx.beginPath();
        ctx.moveTo(0, at(0));
        for (let x = 0; x <= w; x += 20) ctx.lineTo(x, at(x));
        ctx.lineTo(w, at(w) + 30);
        ctx.lineTo(0, at(0) + 30);
        ctx.closePath();
        const band = ctx.createLinearGradient(0, surf + drop - amp, 0, surf + drop + 30);
        band.addColorStop(0, `rgba(222, 250, 255, ${0.26 * strength})`);
        band.addColorStop(1, 'rgba(222, 250, 255, 0)');
        ctx.fillStyle = band;
        ctx.fill();
      }

      // and the line itself. A splash is drawn at a finer step than the swell:
      // the wave group is short, and at 20px it would come out as corners.
      const step = splashes.length ? 7 : 20;
      ctx.beginPath();
      ctx.moveTo(0, at(0));
      for (let x = 0; x <= w; x += step) ctx.lineTo(x, at(x));
      ctx.strokeStyle = `rgba(233, 253, 255, ${0.5 * strength})`;
      ctx.lineWidth = 1.5 - far * 0.6;
      ctx.stroke();
      ctx.restore();
    }

    drawRipples(ctx, env);
    drawDrops(ctx, env);
  }

  /* What the splash threw up: droplets, falling back into the line they came
     out of. They are the part of a splash the eye actually reads as water. */
  function drawDrops(ctx, env) {
    if (!drops.length) return;
    const g = Number(get('water.splash_gravity', 1500));
    const { t, dt } = env;

    ctx.save();
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      const age = t - d.born;
      if (age > d.life) { drops.splice(i, 1); continue; }

      d.vy += g * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      // back in the water, and gone
      if (d.vy > 0 && d.y > state.surfaceY + 2) { drops.splice(i, 1); continue; }

      const fade = Math.pow(1 - age / d.life, 0.7);
      // stretched along the way it is going, the way a droplet is
      const speed = Math.hypot(d.vx, d.vy);
      const long = clamp(speed / 900, 0, 1.4);

      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(Math.atan2(d.vy, d.vx));
      ctx.fillStyle = `rgba(235, 252, 255, ${0.72 * fade})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, d.r * (1 + long), d.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /* A ring where something touched the water.

     It is round, because water does not know which way the screen is turned.
     And it is a wave rather than a circle: one front leaves the point it was
     made at and travels out at `ripple_speed`, with the crests behind it
     following at their own spacing, each one thinner and fainter than the one
     in front. Three things are doing the work:

       - the amplitude falls as 1/√r, which is what a ring spreading out over a
         surface does, on top of dying away with age;
       - every crest is drawn twice, bright on the near side and dark on the
         far side, because what you see of a ripple is the light bending
         through the slope of it rather than the water itself;
       - the front runs ahead of the rest: short waves travel slower than long
         ones on water, so the leading crest arrives alone and the fine ones
         gather up behind it.

     Capillary wrinkles ride just inside the front, which is the detail that
     stops it reading as a drawn circle. */
  function drawRipples(ctx, env) {
    if (!ripples.length) return;

    const life = Math.max(0.2, Number(get('water.ripple_life', 2.4)));
    const rings = Math.max(1, Math.round(Number(get('water.ripple_rings', 4))));
    const strength = Number(get('water.ripple_strength', 0.8));
    const speed = Math.max(20, Number(get('water.ripple_speed', 240)));
    const wave = Math.max(10, Number(get('water.ripple_wave', 34)));

    ctx.save();
    ctx.lineCap = 'round';

    /* A ring is round, but it is a ring on the water — so it is kept to the
       water. Without this the half of it above the line goes on expanding
       into the sky, which is the one thing that gives away that this is a
       circle being drawn rather than something happening on a surface. */
    const line = Math.max(0, state.surfaceY);
    if (line < env.h) {
      ctx.beginPath();
      ctx.rect(0, line, env.w, env.h - line);
      ctx.clip();
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      const age = env.t - r.born;
      if (age >= life) { ripples.splice(i, 1); continue; }

      const t01 = age / life;
      const fade = Math.pow(1 - t01, 1.5);
      const front = speed * age * (0.55 + 0.45 * (1 - t01 * 0.5));

      for (let k = 0; k < rings; k++) {
        // the crests trail the front, the short ones further back
        const radius = front - k * wave * (1 + k * 0.22);
        if (radius <= 3) continue;

        const spread = 1 / Math.sqrt(Math.max(radius, 8) / 18);
        const amp = 0.5 * strength * r.strength * fade * spread
                  * Math.pow(0.68, k);
        if (amp <= 0.004) continue;

        const width = clamp(1 + amp * 3.4, 0.7, 3.4);

        // the dark side of the slope, just outside the crest
        ctx.strokeStyle = `rgba(3, 26, 34, ${Math.min(amp * 0.5, 0.3)})`;
        ctx.lineWidth = width * 1.25;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius + width * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        // and the lit side of it
        ctx.strokeStyle = `rgba(228, 250, 255, ${Math.min(amp, 0.55)})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      /* The fine wrinkles that run ahead of a real ripple, just inside the
         front. They are drawn as one wobbling ring rather than a circle, so
         the leading edge is never a perfect curve. */
      const fineAmp = 0.22 * strength * r.strength * Math.pow(1 - t01, 2.2);
      if (fineAmp > 0.01 && front > 14) {
        ctx.strokeStyle = `rgba(228, 250, 255, ${fineAmp})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        const steps = 48;
        for (let s = 0; s <= steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const wobble = Math.sin(a * 7 + r.seed) * 1.6
                       + Math.sin(a * 13 - r.seed * 2) * 1.1;
          const rr = front - wave * 0.35 + wobble;
          const x = r.x + Math.cos(a) * rr;
          const y = r.y + Math.sin(a) * rr;
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
