  // ---------------------------------------------------------- transitions --

  /* The place he's leaving, the passage, and the place he's going, laid end
     to end along one line — across the screen for the tunnel, down it for
     the shafts — and slid past the screen. `dir` is which way along that
     line the next place is: +1 right or down, -1 left or up (back to the
     level before, or back up from a room). The passage is `long` screens long, so its far end comes onto
     the screen's edge as he gets there: by then it has slid the passage and
     one screen past, and the next place fills the screen.

     kind: tunnel (sideways), dive (down to a room), rise (back up from one).
     `to` is the place it ends in. */
  function begin(kind, to, top, bottom, back = false, hurry = false) {
    const reduce = Portfolio.reduceMotion.matches ? 0.4 : 1;
    const dur = Math.max(0.3, (kind === 'tunnel' ? num('tunnel_time', 5) : num('dive_time', 2)) * reduce);
    const across = kind === 'tunnel';
    const size = across ? view.w : view.h;
    const long = Math.max(1.2, num(across ? 'tunnel_length' : 'shaft_length', across ? 2.2 : 1.6));
    const rise = kind === 'rise';
    const dir = rise || back ? -1 : 1;
    const how = across ? (dir > 0 ? 'left' : 'right') : (rise ? 'below' : 'above');
    // the water at each end of the passage: the colours of the places it
    // joins, so it blends into both
    const ends = across ? ['mid', 'mid'] : rise ? ['top', 'bottom'] : ['bottom', 'top'];

    // in a hurry, he's already turning towards the middle
    const off = view.w / 2 - fish.x;
    const side = hurry && Math.abs(off) > 4 ? Math.sign(off) : fish.flip >= 0 ? 1 : -1;
    move = {
      kind, from: here, to, dur, at: clock,
      across, size, length: size * long, dir,
      p0: { x: fish.x, y: fish.y },
      p1: entry(to, how),
      c0: waterOf(here, ends[0]),
      c1: waterOf(to, ends[1]),
      side,
      // the way his nose points: along the tunnel, or down or up the shaft
      rot0: drawFree.rot || 0,
      rot: across ? 0 : (rise ? -1 : 1) * side * Math.PI / 2,
      last: 0,
      hurry: hurry ? clamp(Math.abs(off) / 1800, 0.12, 0.45) : 0,
      pick: across ? hatPick(here, to, dir, size + size * long) : null
    };
    fish.dash = null;
    fish.vx = fish.vy = 0;
    brain.goTo = brain.target = brain.hovered = brain.roll = null;
    brain.nextRoll = 0;
    if (to.kind === 'room') fillRoom(to.i);
    setScene(kind);
    if (across) {
      hud.tunnelTop.textContent = top || '';
      hud.tunnelBottom.textContent = bottom || '';
    }
    if (sound()) sound().bubble(1);
  }

  function finish() {
    const m = move;
    move = null;
    fish.x = m.p1.x;
    fish.y = m.p1.y;
    fish.vx = 0;
    fish.vy = m.kind === 'rise' ? -60 : 0;
    if (m.from.kind === 'room') emptyRoom();
    arrive(m.to);
  }

  function tintOf(i) {
    return (levels[i] && levels[i].tint) || '#1d7f8c';
  }
