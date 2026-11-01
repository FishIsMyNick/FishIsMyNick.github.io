  // ------------------------------------------------------------- steering --

  /* The water inside the glass. `air` lets him up into the space above it,
     which is what a breach is. */
  function bowlBox(air) {
    const b = state.bowl;
    if (!b) return null;
    const level = Number(get('bowl.water_level', 0.8));
    const len = length();
    // far enough in that his nose and tail stay behind the glass
    const inset = Math.max(b.w * 0.16, len * 0.55);
    const waterline = b.y + b.h * (1 - level);
    const bottom = b.y + b.h * (1 - Number(get('bowl.gravel_depth', 0.16)) * 0.8);
    return {
      left: b.x + inset,
      right: b.x + b.w - inset,
      top: (air ? b.y + b.h * 0.06 : waterline + b.h * 0.06) + len * 0.1,
      bottom: bottom - len * 0.2,
      waterline
    };
  }

  /* The water you can see. This is where he decides to go. */
  function visibleBox() {
    const v = scene.view;
    const pad = length() * 0.5;
    return {
      left: pad * 0.5,
      right: v.w - pad * 0.5,
      top: Math.max(state.surfaceY, 0) + pad * 0.5,
      bottom: v.h - pad * 0.4
    };
  }

  /* And how far the water goes. The window is not the edge of it: he may carry
     on out past the side or the bottom by `off_frame` of his own lengths,
     which is what makes the water feel wider than the screen. The surface is
     the one wall he cannot swim through — going above it is a jump. */
  function limitBox() {
    const v = scene.view;
    const len = length();
    const out = Math.max(0, Number(get('fish.off_frame', 1.4))) * len;
    return {
      // He is allowed right up under the line rather than held a body's depth
      // below it: a click just under the surface is a place he can reach, and
      // his back breaking through is a splash, not a mistake.
      top: Math.max(state.surfaceY + len * Number(get('fish.surface_gap', 0.12)),
                    -out * 0.6),
      left: -out,
      right: v.w + out,
      bottom: v.h + out * 0.5
    };
  }

  /* Where he is held, and where he aims. In the bowl they are the same thing. */
  function box() {
    if (fish.mode !== 'bowl') return limitBox();
    return bowlBox(!!(fish.hold && fish.hold.air)) || limitBox();
  }

  function roam() {
    if (fish.mode !== 'bowl') return visibleBox();
    return bowlBox(!!(fish.hold && fish.hold.air)) || visibleBox();
  }

  function newTarget(t) {
    const b = roam();
    if (!b || b.right <= b.left || b.bottom <= b.top) return;

    let x = rand(b.left, b.right);
    const y = rand(b.top, b.bottom);
    let out = false;

    // now and then he simply carries on out of the frame, and comes back
    if (fish.mode === 'free' && Math.random() < Number(get('fish.off_frame_chance', 0.18))) {
      const lim = limitBox();
      x = Math.random() < 0.5 ? rand(lim.left, b.left) : rand(b.right, lim.right);
      out = true;
    }

    fish.target = { x, y, out };
    const [lo, hi] = range('fish.wander_range', 1.4, 3.6);
    // somewhere off the edge is a long way at a cruise, so once he has decided
    // to go he keeps going: he does not change his mind halfway out there
    fish.nextThink = t + (out ? Math.max(hi, 2.5) * 2 : rand(lo, hi));
  }

  /* A click: he comes about on the spot and goes straight there. If that means
     doubling back on himself he sometimes turns right over instead of simply
     facing the other way. */
  function dashTo(x, y, t) {
    if (fish.mode === 'leap' || fish.mode === 'jump' || fish.dive) return;
    const back = (x >= fish.x ? 1 : -1) !== fish.facing;
    fish.dash = { x, y, until: t + Math.max(0.2, Number(get('fish.dash_time', 1.4))) };
    if (back && fish.mode === 'free'
        && Math.random() < Number(get('fish.roll_on_dash', 0.4)) && startRoll(t)) {
      // a roll keeps him pointing the way he was until he comes round
      return;
    }
    fish.facing = x >= fish.x ? 1 : -1;
    // the turn itself is quick rather than instant; starting it near zero is
    // what makes it read as a fish coming about rather than a drawing swapping
    fish.flip = fish.facing * 0.06;
  }
