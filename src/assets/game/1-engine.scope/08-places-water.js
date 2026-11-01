  /* Where he comes in, on each kind of place: `how` is the side he comes in
     by. */
  function entry(to, how) {
    const { w, h } = view;
    const b = border();
    if (to.kind === 'start') {
      return how === 'right' ? { x: w - wallW() - halfW() - 14, y: h / 2 } : { x: halfW() + 24, y: h / 2 };
    }
    if (to.kind === 'room') return { x: w / 2, y: Math.max(halfH() + b + 50, h * 0.16) };
    if (how === 'below') return { x: w / 2, y: h - b - halfH() - 6 };
    if (how === 'right') return { x: w - b - halfW() - 8, y: h / 2 };
    return { x: b + halfW() + 8, y: h / 2 };
  }

  /* The colour of a place's water at the end a passage joins it: `mid` for
     a tunnel (the openings are halfway up), `top` and `bottom` for the
     shafts. */
  function waterOf(place, where) {
    const f = where === 'top' ? 0 : where === 'bottom' ? 1 : 0.5;
    if (place.kind === 'start') return colorAt(lerp(0, 0.22, f));
    // a beaten level is its title page by now: the picture's ground
    if (place.kind === 'level' && showsPage(place.lv)) return edges[place.i] || Aquarium.rgb('#06202a');
    if (place.kind === 'room') return roomTop();
    const tint = tintOf(place.i);
    const [d0, d1] = place.kind === 'room' ? [roomDepth() - 0.05, roomDepth() + 0.08] : [0.05, 0.3];
    return mix(mix(colorAt(d0), tint, 0.28), mix(colorAt(d1), tint, 0.18), f);
  }

  /* What the top of the details room looks like: its water under the same
     frosted glass as a detail page (the .game-room background), so the
     shaft can come down into that colour. */
  function roomTop() {
    if (roomSize.top) return roomSize.top;
    const root = getComputedStyle(document.documentElement);
    const op = Number(root.getPropertyValue('--panel-opacity')) || 0.42;
    const depth = Number(root.getPropertyValue('--depth')) || 0;
    const tint = tintOf(current);
    const under = mix(colorAt(roomDepth() - 0.05), tint, 0.28);
    roomSize.top = mix(under, { r: 4, g: 32, b: 40 }, clamp(op * (0.9 + depth * 0.15), 0, 1));
    return roomSize.top;
  }

  /* The room's scroll, read when it changes rather than every frame: asking
     the page for these makes it work out its layout. */
  const roomSize = { scroll: 0, most: 0, client: 0, height: 0, top: null };

  function measureRoom() {
    roomSize.scroll = room.scrollTop;
    roomSize.client = room.clientHeight;
    roomSize.height = room.scrollHeight;
    roomSize.most = roomSize.height - roomSize.client;
    roomSize.top = null;
  }

  if (room) {
    room.addEventListener('scroll', measureRoom, { passive: true });
    if (window.ResizeObserver) {
      const watch = new ResizeObserver(measureRoom);
      watch.observe(room);
      if (roomBody) watch.observe(roomBody);
    }
  }

  function roomDepth() {
    return lerp(0.5, 1, clamp(roomSize.scroll / Math.max(1, roomSize.most), 0, 1));
  }

  function arrive(to) {
    here = to;
    level = to.kind === 'level' ? to.lv : null;
    if (to.kind !== 'start') current = to.i;
    setScene(to.kind);
    paintNear(to);
  }

  /* The details room: the project's own detail page, borrowed from the
     portfolio's detail layer for as long as he's down here. */
  let borrowed = null;

  function fillRoom(i) {
    const id = levels[i] && levels[i].project;
    const article = id && document.getElementById('detail-' + id);
    if (article && roomBody && !borrowed) {
      borrowed = { el: article, parent: article.parentNode, next: article.nextSibling };
      roomBody.appendChild(article);
      article.hidden = false;
    }
    room.scrollTop = 0;
    measureRoom();
  }

  function emptyRoom() {
    if (borrowed) {
      borrowed.el.hidden = true;
      borrowed.parent.insertBefore(borrowed.el, borrowed.next);
      borrowed = null;
    }
    if (room) room.hidden = true;
  }
