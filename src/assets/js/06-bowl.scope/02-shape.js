  // ---------------------------------------------------------- the shape --

  /* Body and neck as one path. Curves and an arc, nothing else — the glass is
     a shape, not a diagram of a bowl. */
  function shape(b) {
    const neck = clamp(Number(get('bowl.neck', 0.46)), 0.2, 0.9);
    const neckH = clamp(Number(get('bowl.neck_height', 0.15)), 0, 0.4) * b.h;
    const flare = Number(get('bowl.flare', 0.06));
    const rx = b.w / 2;
    const ry = (b.h - neckH) / 2;
    const cx = b.x + b.w / 2;
    const cy = b.y + neckH + ry;
    const a = Math.acos(clamp(neck, -1, 1));
    return {
      cx, cy, rx, ry, a, neck,
      lipY: b.y + neckH * 0.2,
      lip: rx * (neck + flare),
      openY: cy - ry * Math.sin(a),
      openX: rx * neck
    };
  }

  /* The silhouette as a ring of points: the body round the bottom, up the
     waist of the neck, over the lip, across the rim, and down the other side.

     The ring is then drawn as one closed curve passing through every point,
     rather than as arcs and lines joined end to end. A curve through points
     has no corners in it anywhere — there is nowhere for one to be — which is
     the whole requirement, and it means the glass is described by where it
     goes rather than by a list of tangents that have to be kept in step.

     `lip_round` is how far the lip rolls over before the rim starts. The top
     of the lip and the rim are one level line: the bowl is seen side on, so
     its opening is seen edge on. */
  function outline(b) {
    const s = shape(b);
    const roll = clamp(Number(get('bowl.lip_round', 0.42)), 0, 1);

    const r = Math.max(2, s.lip * 0.4 * roll + b.w * 0.012);
    const inner = Math.max(s.lip - r * 1.2, s.lip * 0.3);
    const rimY = s.lipY - r * 0.5;
    const at = f => lerp(s.openY, s.lipY, f);

    const pts = [];
    const steps = 30;

    // the body, from the right of the opening all the way round to the left
    for (let i = 0; i <= steps; i++) {
      const th = -s.a + (Math.PI + 2 * s.a) * (i / steps);
      pts.push({ x: s.cx + s.rx * Math.cos(th), y: s.cy + s.ry * Math.sin(th) });
    }

    // up the left of the neck: in at the waist, out again to the lip
    pts.push({ x: s.cx - s.openX * 0.95, y: at(0.4) });
    pts.push({ x: s.cx - s.lip * 0.93,   y: at(0.86) });
    pts.push({ x: s.cx - s.lip,          y: s.lipY + r * 0.22 });
    // over the top of it
    pts.push({ x: s.cx - s.lip * 0.94,   y: rimY, flat: true });
    pts.push({ x: s.cx - inner,          y: rimY, flat: true });
    // and straight across the rim
    pts.push({ x: s.cx - inner * 0.45,   y: rimY, flat: true });
    pts.push({ x: s.cx + inner * 0.45,   y: rimY, flat: true });
    // the same again, the other way about
    pts.push({ x: s.cx + inner,          y: rimY, flat: true });
    pts.push({ x: s.cx + s.lip * 0.94,   y: rimY, flat: true });
    pts.push({ x: s.cx + s.lip,          y: s.lipY + r * 0.22 });
    pts.push({ x: s.cx + s.lip * 0.93,   y: at(0.86) });
    pts.push({ x: s.cx + s.openX * 0.95, y: at(0.4) });

    return { s, pts };
  }

  /* One closed curve through all of them.

     The control points are the centripetal Catmull-Rom ones: each knot is
     spaced by the square root of the distance to the next, which is what stops
     a tight turn — the lip — from looping back over itself the way an evenly
     spaced curve through the same points would.

     A `flat` point is on the level rim: the curve leaves it and arrives at it
     level, so the lip meets the rim without a bump. */
  function curveThrough(ctx, pts) {
    const n = pts.length;
    const d = (a, c) => Math.sqrt(Math.hypot(c.x - a.x, c.y - a.y)) || 1e-4;

    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];

      const d1 = d(p0, p1), d2 = d(p1, p2), d3 = d(p2, p3);
      const k1 = 3 * d1 * (d1 + d2);
      const k2 = 3 * d3 * (d3 + d2);

      ctx.bezierCurveTo(
        (d1 * d1 * p2.x - d2 * d2 * p0.x + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.x) / k1,
        p1.flat ? p1.y
          : (d1 * d1 * p2.y - d2 * d2 * p0.y + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.y) / k1,
        (d3 * d3 * p1.x - d2 * d2 * p3.x + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.x) / k2,
        p2.flat ? p2.y
          : (d3 * d3 * p1.y - d2 * d2 * p3.y + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.y) / k2,
        p2.x, p2.y);
    }
    ctx.closePath();
  }

  function bowlPath(ctx, b) {
    const { s, pts } = outline(b);
    ctx.beginPath();
    curveThrough(ctx, pts);
    return s;
  }

  function waterY(b, t) {
    const level = clamp(Number(get('bowl.water_level', 0.8)), 0.05, 0.98);
    const wobbleOn = Number(get('bowl.wobble', 0.6));
    const since = t - shake.at;
    const rock = since < 2
      ? Math.sin(since * 16) * Math.exp(-since * 3) * shake.power * 0.25 * wobbleOn
      : 0;
    return b.y + b.h * (1 - level) + rock;
  }
