  // ------------------------------------------------------------- the API --

  Aquarium.fish = {
    get: () => fish,

    /* A tap that isn't the last one. */
    startle(step, final, t) {
      if (fish.mode === 'bowl') startle(step, final, t);
    },

    /* The glass has gone: he throws himself out of it, up to the top of the
       screen, and turns over there. The turn always finishes nose down. */
    release(t) {
      if (fish.mode !== 'bowl') return;
      fish.mode = 'leap';
      fish.hold = null;
      fish.dash = null;
      fish.spin = 0;
      fish.grow = 0;

      const spread = Number(get('fish.leap_spread', 170));
      const rise = Math.max(0.2, Number(get('fish.leap_rise', 1)));
      const turn = Math.max(rise, Number(get('fish.leap_turn', 2)));
      const v = scene.view;
      const x1 = clamp(fish.x + rand(-spread, spread), v.w * 0.1, v.w * 0.9);

      /* The turns, and the angle they have to finish on: whole turns for the
         look of it, and then the quarter that leaves him pointing at the
         water. Which quarter depends on the drawing he is wearing — the one
         facing left has its nose at the other end, so nose-down is the other
         way round for it. */
      const [few, many] = range('fish.leap_flips', 1, 2);
      const turns = Math.round(rand(few, many));
      const way = x1 >= fish.x ? 1 : -1;
      const noseDown = (Math.PI / 2) * (fish.facing >= 0 ? 1 : -1);

      fish.leap = {
        at: t, part: 'up', rise, turn,
        x0: fish.x, y0: fish.y, x1,
        spinEnd: turns * Math.PI * 2 * way + noseDown
      };
    },

    reset() {
      fish.mode = 'bowl';
      fish.facing = -1;
      fish.flip = -1;
      fish.dive = null;
      fish.leap = null;
      fish.unwind = null;
      fish.lastBreak = -9;
      fish.vx = -20; fish.vy = 0;
      fish.grow = 0;
      fish.spin = 0;
      fish.spinRate = 0;
      fish.dash = null;
      fish.hold = null;
      fish.target = null;
      fish.roll = null;
      fish.wantJump = null;
      fish.outside = 0;
      fish.nextRoll = fish.now + 6;
      fish.nextJump = fish.now + 7;
      bubbles.length = 0;
      const b = bowlBox();
      if (b) { fish.x = (b.left + b.right) / 2; fish.y = (b.top + b.bottom) / 2; }
    },

    place(x, y) { fish.x = x; fish.y = y; }
  };
