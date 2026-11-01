  // -------------------------------------------------------------- places --

  const subsOf = i => (levels[i] && levels[i].sublevels) || [{}];
  const lastSub = i => subsOf(i).length - 1;
  const isCleared = (i, n) => !!(cleared[i] && cleared[i][n]);

  /* A room of level `i`: sublevel `n`, or left out, its last. A sublevel done
     already has its crate gone and its way on open. A level with all of them
     done is its last room with the title page, and the floor open as well. */
  function makeLevel(i, n = lastSub(i)) {
    // a level not built yet has nothing to beat: it's open from the start
    if (mechanicOf(i).notBuilt) {
      cleared[i] = subsOf(i).map(() => true);
      beaten[i] = true;
    }
    const done = isCleared(i, n);
    const titled = !!beaten[i] && n === lastSub(i);
    const lv = {
      i,
      n,
      won: done,
      titled,
      wonAt: done ? -99 : 0,
      // what's done is already open; otherwise the rock breaks open
      opened: { right: done, bottom: titled },
      gone: { right: done, bottom: titled },   // its rock has come apart
      openAt: { right: -99, bottom: -99 },
      breaks: {},
      glowAt: {},        // when each opening began to glow
      debris: []
    };
    if (!done) mechanicOf(i).setup(lv, subsOf(i)[n]);
    return lv;
  }
