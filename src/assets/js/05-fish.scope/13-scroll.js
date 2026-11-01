  /* ------------------------------------------------------------- scroll --

     The water does not scroll: the canvas is fixed and the waterline is held
     at a point on the page, so going down the page is going down through the
     water rather than past a picture of it. He belongs to the water, so he
     goes with it — the page takes him along as it moves, by `scroll_drag` of
     however far it went, and he swims back to whatever he was doing from
     wherever that leaves him.

     At 1 he is pinned to the page and the window slides past him; at 0 he
     stays where he is on the screen, as he did before. Where he was going goes
     with him, or he would turn round and swim back up the moment he arrived. */

  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const dy = y - lastScrollY;
    lastScrollY = y;
    if (!dy || !state.broken || state.autoScroll) return;

    const drag = Number(get('fish.scroll_drag', 0.8));
    if (!drag) return;
    const carry = dy * clamp(drag, 0, 1);

    fish.y -= carry;
    if (fish.target) fish.target.y -= carry;
    if (fish.dash) fish.dash.y -= carry;
    if (fish.hold) fish.hold.y -= carry;
    for (const b of bubbles) b.y -= carry;
  }, { passive: true });

  loadSprites();
  scene.add(50, draw);
  scene.add(55, drawBubbles);
