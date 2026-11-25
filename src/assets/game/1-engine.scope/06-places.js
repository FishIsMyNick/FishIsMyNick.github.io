  // -------------------------------------------------------------- places --

  const subsOf = i => (levels[i] && levels[i].sublevels) || [{}];
  const isReview = (i, n) => !!subsOf(i)[n]?.review;
  let reviewScenario = 0;
  const lastSub = i => subsOf(i).length - 1;
  const isCleared = (i, n) => !!(cleared[i] && cleared[i][n]);

  /* A room of level `i`: sublevel `n`, or left out, its last. A sublevel done
     already has its crate gone and its way on open. A level with all of them
     done is its last room with the title page, and the floor open as well. */
  function makeLevel(i, n = lastSub(i)) {
    // a level not built yet has nothing to beat: it's open from the start
    const review = isReview(i, n);
    if (mechanicOf(i).notBuilt && !review) {
      cleared[i] = subsOf(i).map(() => true);
      beaten[i] = true;
    }
    const done = review ? !!mechanicOf(i).notBuilt : isCleared(i, n);
    const titled = !review && !!beaten[i] && n === lastSub(i);
    const lv = {
      i,
      n,
      review,
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
    if (!done) {
      const scenarios = subsOf(i);
      const puzzle = levels[i].mechanic === 'pushpuzzle';
      const sub = review && puzzle ? scenarios[reviewScenario + 1] : scenarios[n];
      if (review) lv.reviewScenario = reviewScenario;
      mechanicOf(i).setup(lv, sub);
    }
    return lv;
  }
