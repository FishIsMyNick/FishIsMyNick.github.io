  // -------------------------------------------------------- what's hovered --

  let hovered = null;
  let turn = 1;            // which way round he goes: 1 or -1, new for each thing

  /* What counts as a thing to circle. The whole things in `circle_targets`
     come first — a row, a skill group — so hovering a link inside a row still
     circles the row. Anything else on the page (`circle_any`: a paragraph, a
     heading, a picture, a button) is circled on its own. Anything in
     `circle_skip` (the name) isn't circled at all. */
  function thing(target) {
    if (!target || !target.closest) return null;
    if (target.closest('.aquarium')) return null;
    const skip = String(get('fish.circle_skip', ''));
    try { if (skip && target.closest(skip)) return null; } catch (err) { /* bad selector: skip nothing */ }
    const whole = String(get('fish.circle_targets', '.entry'));
    const any = String(get('fish.circle_any', ''));
    try {
      return target.closest(whole) || (any ? target.closest(any) : null);
    } catch (err) { return null; }
  }

  document.addEventListener('pointerover', event => {
    if (get('fish.circle', true) === false) return;
    const el = thing(event.target);
    if (el && el !== hovered) turn = Math.random() < 0.5 ? 1 : -1;
    if (el) hovered = el;
  }, true);

  document.addEventListener('pointerout', event => {
    if (!hovered) return;
    const to = event.relatedTarget;
    if (!to || !hovered.contains(to)) hovered = null;
  }, true);

  /* The ring he swims around whatever the cursor is on: the thing's own box,
     pushed out by `circle_margin`, so he passes outside it rather than through
     it — but never wider than a couple of `circle_radius`, or a tall row would
     have him circling the whole screen. It is centred on the part of the thing
     you can actually see, so a half-scrolled row is still circled on screen. */
  function orbit() {
    if (!hovered || !hovered.isConnected) { hovered = null; return null; }
    const v = scene.view;
    const r = hovered.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > v.h) return null;

    const margin = Number(get('fish.circle_margin', 40));
    const radius = Number(get('fish.circle_radius', 150));
    const left = Math.max(r.left, 0), right = Math.min(r.right, v.w);
    // `circle_whole`: all the way round it however big, to the screen's edges
    let wide = false;
    try { wide = hovered.matches(String(get('fish.circle_whole', '.contribution, .game-story'))); } catch (err) { /* bad selector */ }
    if (wide) {
      const top = Math.max(r.top, 0), bottom = Math.min(r.bottom, v.h);
      const cx = (left + right) / 2, cy = (top + bottom) / 2;
      return { cx, cy,
               rx: Math.min((right - left) / 2 + margin, cx - 40, v.w - cx - 40),
               ry: Math.min((bottom - top) / 2 + margin, cy - 40, v.h - cy - 40) };
    }
    const top = Math.max(r.top, 0), bottom = Math.min(r.bottom, v.h);

    return {
      cx: (left + right) / 2,
      cy: (top + bottom) / 2,
      rx: clamp(Math.min(r.width / 2 + margin, radius * 1.8), radius * 0.5, v.w * 0.42),
      ry: clamp(Math.min(r.height / 2 + margin, radius * 1.4), radius * 0.35, v.h * 0.38)
    };
  }
