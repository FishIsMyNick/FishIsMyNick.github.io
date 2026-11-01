  // ----------------------------------------------------------- the level --

  /* A level's walls: the same rock as the start's, all the way round. The
     way back on the left is always open. The way on (right) and the hole
     in the floor are solid rock until the level is beaten; then each cracks
     and breaks away (`startBreak`), the right one first. */
  const BREAK = { right: 0.35, bottom: 0.8 };   // seconds after the win
  const CRACK = 1.1;                            // the cracks spread for this long
  const RUMBLE = 1.1;                           // then the pieces shake apart, shrinking
  const FALL_MIDDLE = 6.5, FALL_EDGE = 3;       // how fast their fall gathers pace, per second

  /* The rock round a level, as it stands: `gone` says which openings have
     lost their rock. */
  function levelRock(lv) {
    const { w, h } = view;
    const b = border(), t = borderTop();
    const g = gapH() / 2;
    const cy = h / 2;
    const far = 90;
    const amp = rockAmp();
    const H = holeW() / 2;
    const seed = 5 + lv.i * 3;
    const right = lv.gone.right, bottom = lv.gone.bottom;
    const pieces = [];
    if (right) {
      pieces.push(rockShape(
        [[-far, -far], [w + far, -far], [w + far, cy - g], [w - b, cy - g], [w - b, t],
         [b, t], [b, cy - g], [-far, cy - g]],
        [false, false, true, true, true, true, true, false], amp, seed));
      if (bottom) {
        pieces.push(rockShape(
          [[w / 2 - H, h + far], [-far, h + far], [-far, cy + g], [b, cy + g], [b, h - b], [w / 2 - H, h - b]],
          [false, false, true, true, true, true], amp, seed));
        pieces.push(rockShape(
          [[w + far, h + far], [w / 2 + H, h + far], [w / 2 + H, h - b], [w - b, h - b],
           [w - b, cy + g], [w + far, cy + g]],
          [false, true, true, true, true, false], amp, seed));
      } else {
        pieces.push(rockShape(
          [[w + far, h + far], [-far, h + far], [-far, cy + g], [b, cy + g], [b, h - b],
           [w - b, h - b], [w - b, cy + g], [w + far, cy + g]],
          [false, false, true, true, true, true, true, false], amp, seed));
      }
    } else if (bottom) {
      pieces.push(rockShape(
        [[-far, -far], [w + far, -far], [w + far, h + far], [w / 2 + H, h + far], [w / 2 + H, h - b],
         [w - b, h - b], [w - b, t], [b, t], [b, cy - g], [-far, cy - g]],
        [false, false, false, true, true, true, true, true, true, false], amp, seed));
      pieces.push(rockShape(
        [[w / 2 - H, h + far], [-far, h + far], [-far, cy + g], [b, cy + g], [b, h - b], [w / 2 - H, h - b]],
        [false, false, true, true, true, true], amp, seed));
    } else {
      pieces.push(solidRock(lv));
    }
    return pieces;
  }

  function solidRock(lv) {
    const { w, h } = view;
    const b = border(), t = borderTop();
    const g = gapH() / 2;
    const cy = h / 2;
    const far = 90;
    return rockShape(
      [[-far, -far], [w + far, -far], [w + far, h + far], [-far, h + far], [-far, cy + g],
       [b, cy + g], [b, h - b], [w - b, h - b], [w - b, t], [b, t], [b, cy - g], [-far, cy - g]],
      [false, false, false, false, true, true, true, true, true, true, true, false], rockAmp(), 5 + lv.i * 3);
  }

  function bakeLevel(lv) {
    const seed = 5 + lv.i * 3;
    const custom = !lv.titled && customRock(lv);
    if (custom) return bakeOutlines(custom.key, custom.outlines, lv.i);
    return bakeRock(`level${lv.i}:${lv.gone.right}:${lv.gone.bottom}`,
                    () => levelRock(lv).forEach(piece => drawRock(piece, seed)));
  }

  function frameOf(lv) {
    const { w, h } = view;
    const b = border();
    const g = gapH() / 2;
    const cy = h / 2;
    const H = holeW() / 2;
    const seed = 5 + lv.i * 3;

    if (lv.won) {
      for (const which of ['right', 'bottom']) {
        if (which === 'bottom' && !lv.titled) continue;        // only a finished level has a floor to break
        if (!lv.gone[which] && !lv.breaks[which] && clock - lv.wonAt >= BREAK[which]) startBreak(lv, which);
      }
    }
    stepBreaks(lv);
    const right = lv.opened.right, bottom = lv.opened.bottom;

    const m = mechanicOf(lv.i);
    if (m.under) m.under(lv);

    // the way back is always lit, and the way on once it's open: while it's
    // breaking it has a light of its own (drawOpeningGlow)
    const reach = wallsOf(lv).x + g * 1.6;
    mouthLight(0, cy, reach);
    if (right && lv.glowAt.right === undefined) mouthLight(w, cy, reach);

    // one seed for all of it, so the pits stay put when the wall is cut up
    stampBaked(bakeLevel(lv));
    // a little coral here and there, kept out of the openings. It grows on
    // the whole wall, so it doesn't move when the openings break
    const clear = (x, y) => (Math.abs(y - cy) < g + 30 && (x < b * 3 || x > w - b * 3))
                         || (y > h - b * 3 && Math.abs(x - w / 2) < H + 30)
                         || y < b * 3;   // the title and the buttons in the top wall
    if (lv.titled || !customRock(lv)) coralOn(shapeOf('solid' + lv.i, () => solidRock(lv)), 9, seed, 0.7, clear);

    drawOpeningGlow(lv);
    drawCracks(lv);
    drawDebris(lv);

    // a title room's plain walls, showing as a mechanic's rock fades off them
    const custom = lv.titled && customRock(lv, false);
    if (custom) {
      const left = 1 - clamp((clock - lv.wonAt - 0.3) / Math.max(0.1, num('reveal_time', 1.4)), 0, 1);
      if (left > 0) {
        ctx.save();
        ctx.globalAlpha *= left;
        stampBaked(bakeOutlines(custom.key, custom.outlines, lv.i));
        ctx.restore();
      }
    }

    // once it's open, which way to go
    const a = 0.35 + Math.sin(clock * 4) * 0.25;
    ctx.save();
    if (right) {
      ctx.fillStyle = `rgba(255, 179, 92, ${a * clamp((clock - lv.openAt.right) / 0.5, 0, 1)})`;
      chevron(w - wallsOf(lv).x - 34 + Math.sin(clock * 4) * 4, cy, 0);
    }
    if (bottom) {
      ctx.fillStyle = `rgba(255, 179, 92, ${a * clamp((clock - lv.openAt.bottom) / 0.5, 0, 1)})`;
      chevron(w / 2, h - b - 34 + Math.sin(clock * 4) * 4, Math.PI / 2);
    }
    ctx.restore();
  }

  const rockAmp = () => clamp(border() * 0.28, 5, 12);
