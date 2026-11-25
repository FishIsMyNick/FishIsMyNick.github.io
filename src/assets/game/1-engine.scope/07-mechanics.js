  /* What a level is played with. Every level names a mechanic (`mechanic` in
     game.yaml), and all its sublevels use it, each with its own numbers. Each
     lives in a file of its own in ../2-mechanics, and registers itself:

       Portfolio.game.mechanic('name', game => ({ setup, solids, draw }));

       setup(room, sub)  put what the room needs on the room, from its sublevel
       solids(room)      what's in the way, as boxes { l, t, r, b, touch(hard) }.
                         `touch` is called when he runs into it (`hard`: he was
                         dashing), and says true if he goes on through
       draw(room, dt)    paint it, and whatever is left of it

     A mechanic may also take him over, for as long as `holds` says so. While it
     does he doesn't swim or hit anything, and clicks and keys go to it instead:

       holds(room)       is he on its leash just now?
       steer(room, dt)   where he should be: { x, y, len, facing, rate }
       press(room, dx, dy)  an arrow key or WASD
       tap(room, x, y)   a click or a touch
       continuous        held movement keys are passed to steer as a direction
       angle(room)       additional rotation for the free fish renderer
       hideGoal(room)    replace the default goal with mechanic-specific UI
       hat(room)         override the worn hat, including null
       rightWall(room)   replace the right collision wall with these boxes
       aimExit(room,x,y) redirect the cursor through a custom opening
       exit(room)        handle a custom exit, returning true if it takes over
       rockOffset(room)  horizontal offset of the custom rock

     And it may have words on the page, in .game-plates (sections/game.html),
     which slides with the room:

       plates(room)      bring them up to date. Called every frame: write to the
                         page only when something changed

     And it may reshape the room's rock, all of it, as one piece with no joins:

       rock(room, open)  { key, outlines } for its walls with the right side
                         open or not, or nothing. outlines() gives { pts, rough }
                         as for rockShape. A title room has the plain walls,
                         this fading off them
       inset(room)       how far in those walls are: { x, top, y }
       under(room)       paint what lies under the rock
       ahead(i, n, sub)  jobs to paint now, so that nothing stops for them later

     A level not built yet says `notBuilt: true`: it's open on every side from
     the start, keeps its water instead of going to its title page, and has no
     reset button.

     `game` below is all a mechanic gets of the engine. Anything it keeps for
     one visit to a room it keeps on `room`, which is made afresh each visit.
     When the room is solved it calls game.beatRoom(). */
  const mechanics = {};

  const mechanicOf = i => mechanics[levels[i] && levels[i].mechanic] || mechanics.crate;

  /* A finished room whose water gives way to the project's title page. */
  const showsPage = lv => lv.titled && !mechanicOf(lv.i).notBuilt;

  /* The mechanic that has him just now, if one does. */
  function holder() {
    if (scene !== 'level' || !level || move || fading) return null;
    const m = mechanicOf(level.i);
    return m.holds && m.holds(level) ? m : null;
  }

  function holdFish(to, dt) {
    const k = to.positioned ? 1 : 1 - Math.exp(-(to.rate || 14) * dt);
    const dx = (to.x - fish.x) * k, dy = (to.y - fish.y) * k;
    fish.x += dx;
    fish.y += dy;
    fish.vx = dx / Math.max(dt, 0.001);
    fish.vy = dy / Math.max(dt, 0.001);
    fish.dash = null;
    if (to.facing) fish.facing = to.facing;
  }

  /* A mechanic's rock for a room, baked as all one piece of stone. */
  function customRock(lv, open = lv.gone.right) {
    const m = mechanicOf(lv.i);
    return m.rock ? m.rock(lv, open) : null;
  }

  function bakeOutlines(key, outlines, i) {
    const seed = 5 + i * 3;
    return bakeRock(key, () => {
      const shapes = outlines().map(o => rockShape(o.pts, o.rough, rockAmp(), seed));
      if (!shapes.length) return;
      const outline = new Path2D();
      for (const s of shapes) outline.addPath(s.outline);
      drawRock({ outline, faces: shapes.flatMap(s => s.faces) }, seed);
    });
  }

  /* Where a room's walls are: where the rock starts on each side. */
  function wallsOf(lv) {
    const m = mechanicOf(lv.i);
    const inset = !lv.titled && m.inset && m.inset(lv);
    return inset || { x: border(), top: borderTop(), y: border() };
  }

  const engineForMechanics = {
    get platePad() { return STONE_PAD; },
    get ctx() { return ctx; },        // always ask: it isn't always the same one
    get clock() { return clock; },
    get aim() { return { x: pointer.x, y: pointer.y, inside: pointer.inside, firing: pointer.down !== null }; },
    get nose() { return fishLen() * 0.49; },
    mouthLight: (x, y, reach) => mouthLight(x, y, reach),
    get fish() { return { x: fish.x, y: fish.y, vx: fish.vx, vy: fish.vy }; },
    get view() { return { w: view.w, h: view.h, dpr: view.dpr }; },
    num, clamp, lerp, rand,
    sound,
    puff: (x, y, size) => puff(x, y, size),
    slowFish(k) { fish.vx *= k; fish.vy *= k; },
    beatRoom: () => beatRoom(),
    warmPassage(width, pad) {
      const length = Math.round(view.w * Math.max(1.2, num('tunnel_length', 2.2)));
      bakePassage(true, length, width, pad);
    },
    prepareRoom: () => paintNear(here),
    breakRightWall: room => startBreak(room, 'right'),
    levelNumber: i => levels[i].number,
    nextStream(room, stream, title, fork) {
      const lv = { ...makeLevel(room.i, room.n), stream };
      begin('tunnel', { kind: 'level', i: room.i, lv }, room.review ? roomName(room.i, room.n) : title, levels[room.i].title, false, false, fork);
    },
    goBack: () => goBack(),
    resetRoom: () => fadeReset(),
    fade: (on, seconds) => setFade(on, seconds),
    kept,                             // emptied when the game starts over
    subsOf,
    rockOverlap: OVERLAP,
    border: () => border(),
    borderTop: () => borderTop(),
    fullLen: () => fullLen(),
    gapH: () => gapH(),
    softCanvas: () => softCanvas(),
    stoneBehind: (el, seed) => stoneBehind(el, seed),
    plate: plateOf,
    paintNow: c => paintNow(c),
    rockAhead: (key, outlines, i) => { bakeOutlines(key, outlines, i); }
  };
