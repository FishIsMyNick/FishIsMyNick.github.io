  // ------------------------------------------------ turning right over --

  /* A full 360 in the water: nose over tail, once round, and on he goes. It is
     an angle added to however he is already held, so he keeps swimming — he
     does not stop to do it. */
  function startRoll(t, dir) {
    if (get('fish.roll', true) === false) return false;
    if (fish.roll || fish.mode !== 'free') return false;
    fish.roll = {
      at: t,
      dur: Math.max(0.2, Number(get('fish.roll_time', 0.95))),
      dir: dir || (Math.random() < 0.5 ? -1 : 1)
    };
    const [lo, hi] = range('fish.roll_every', 7, 18);
    fish.nextRoll = t + rand(lo, hi);
    return true;
  }

  function rollAngle() {
    if (!fish.roll) return 0;
    const p = clamp((fish.now - fish.roll.at) / fish.roll.dur, 0, 1);
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    return eased * Math.PI * 2 * fish.roll.dir;
  }
