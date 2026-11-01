  // ---------------------------------------------------------------- state --

  const fish = {
    x: 0, y: 0, vx: 0, vy: 0,
    facing: 1, flip: 1, phase: 0, size: 1,
    dash: null, cool: 0,
    dashEnd: -9              // when the last dash ran out
  };

  const pointer = { x: 0, y: 0, inside: false, moved: -9, keyed: false };
  const keys = new Set();

  /* Where he is: { kind: 'start' }, { kind: 'level', i, lv } or
     { kind: 'room', i }. `scene` is its kind, or the transition's while one
     is under way. */
  let here = { kind: 'start' };
  let scene = 'start';
  let clock = 0;
  let current = 0;           // the level being played, or the last one
  let move = null;           // the transition under way (see begin)
  let level = null;          // the level he's in: crate, won
  const beaten = [];         // levels with every sublevel done
  const cleared = [];        // each level's sublevels done so far
  const bubbles = [];
  const kept = {};           // what mechanics keep for the whole run through the game
  let running = false;
  let fading = false;        // going to black for a reset: he holds still
  let inSettings = false;    // the settings are open: no input reaches the game
  let paused = false;        // ...and if it runs on a clock, everything waits
  let raf = 0;
  let last = 0;

  function setScene(name) {
    scene = name;
    layer.dataset.scene = name;
  }
