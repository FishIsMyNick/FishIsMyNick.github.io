  // ------------------------------------------------- what a tap does to him --

  /* Every tap but the last. He comes up to look, and then puts his nose out. */
  function startle(step, final, t) {
    const b = bowlBox(true);
    if (!b) return;
    const hold = Number(get('glass.rise_hold', 1.4));
    const breach = Number(get('glass.breach', 0.35)) * length() * bodyRatio();
    const nose = step >= final - 1;      // the tap before the one that breaks it

    // a fish puts his nose out in the middle, where there is room for it
    const middle = (b.left + b.right) / 2;
    fish.hold = {
      x: nose ? middle + rand(-14, 14) : clamp(fish.x + rand(-40, 40), b.left, b.right),
      y: nose ? b.waterline - breach : b.waterline + length() * bodyRatio() * 0.45,
      air: nose,
      until: t + hold
    };
    fish.target = null;
  }
