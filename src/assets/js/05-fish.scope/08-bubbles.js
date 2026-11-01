  // ------------------------------------------------------------- bubbles --

  function breathe(t, dt) {
    if (get('fish.bubbles', true) === false) return;

    if (t > fish.nextBubble) {
      const [lo, hi] = range('fish.bubble_every', 1.6, 5);
      fish.nextBubble = t + rand(lo, hi);
      if (fish.mode === 'bowl' || fish.mode === 'free') {
        const [few, many] = range('fish.bubble_count', 1, 4);
        const n = Math.round(rand(few, many));
        const [small, big] = range('fish.bubble_size', 2, 6);
        const m = mouth();
        for (let i = 0; i < n; i++) {
          bubbles.push({
            x: m.x + rand(-4, 4),
            y: m.y + rand(-4, 4),
            r: rand(small, big),
            phase: rand(0, Math.PI * 2),
            born: t,
            life: Number(get('fish.bubble_life', 4)) * rand(0.7, 1.2)
          });
        }
        if (n > 1) Portfolio.sound.bubble(0.6);
      }
    }

    const rise = Number(get('fish.bubble_rise', 42));
    const wobble = Number(get('fish.bubble_wobble', 14));
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const age = t - b.born;
      b.y -= rise * dt * (0.7 + b.r / 8) * motion();
      b.x += Math.sin(t * 2.2 + b.phase) * wobble * dt;
      const ceiling = state.broken ? state.surfaceY : (state.bowl
        ? state.bowl.y + state.bowl.h * (1 - Number(get('bowl.water_level', 0.8)))
        : 0);
      if (age > b.life || b.y < ceiling + b.r) bubbles.splice(i, 1);
    }
  }

  /* Where his mouth is right now, in screen pixels — the bubbles start here.
     `mouth` in the YAML is a point on the left-facing drawing, across and
     down; on the right-facing one it is the same point read from the other
     end, because that drawing is the fish the other way round and not a
     mirror of this one. */
  function mouth() {
    const m = get('fish.mouth', [0.03, 0.46]);
    const len = length();
    const h = len * bodyRatio();
    const across = sideNow() === 'left' ? Number(m[0]) : 1 - Number(m[0]);
    const lx = (across - 0.5) * len;
    const ly = (Number(m[1]) - 0.5) * h;
    const rot = rotation();
    return {
      x: fish.x + lx * Math.cos(rot) - ly * Math.sin(rot),
      y: fish.y + lx * Math.sin(rot) + ly * Math.cos(rot)
    };
  }

  /* How far round the drawing is turned.

     The sprite is a side view and is mirrored left and right, so the angle is
     measured from whichever way his nose is pointing — which is why the sign
     follows `facing`.

     In the air he is held nose-first along his own arc, plus whatever flips he
     is doing. In the water he tips nose-up or nose-down by `pitch`, plus a
     roll if one is under way — and a roll is a whole turn, so this is where
     the 360 comes from. */
  function rotation() {
    if (fish.mode === 'leap') return fish.spin;

    // On the way down after the splash, and while he waits at the bottom for
    // the water, he is pointed straight down whatever he is doing.
    const noseDown = (Math.PI / 2) * (fish.facing >= 0 ? 1 : -1);
    if (fish.dive) {
      // unless he has started coming round to level for the end of it
      const lv = fish.dive.level;
      if (!lv) return noseDown;
      const k = clamp((fish.now - lv.at) / lv.dur, 0, 1);
      return lerp(noseDown, swimRotation(), k * k * (3 - 2 * k));
    }

    const raw = swimRotation();
    // and once he is let go he comes round to level, rather than snapping
    const u = fish.unwind;
    if (u) {
      const k = clamp((fish.now - u.at) / u.dur, 0, 1);
      if (k >= 1) fish.unwind = null;
      else return lerp(u.from, raw, k * k * (3 - 2 * k));
    }
    return raw;
  }

  function swimRotation() {
    const speed = Math.hypot(fish.vx, fish.vy);
    const sign = fish.facing >= 0 ? 1 : -1;

    if (fish.mode === 'jump') {
      const along = speed < 1 ? 0 : Math.atan2(fish.vy, Math.max(Math.abs(fish.vx), 1)) * sign;
      return clamp(along, -1.35, 1.35) + fish.spin;
    }

    const roll = rollAngle();
    if (speed < 1) return roll;
    const k = Number(get('fish.pitch', 0.45));
    const pitch = Math.atan2(fish.vy, Math.max(Math.abs(fish.vx), 30)) * k;
    return clamp(pitch, -1.1, 1.1) * sign + roll;
  }
