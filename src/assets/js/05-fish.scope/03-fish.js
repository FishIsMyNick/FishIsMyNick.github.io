  // ------------------------------------------------------------- the fish --

  const fish = {
    x: 0, y: 0,
    vx: -20, vy: 0,
    facing: -1,            // -1 nose left, +1 nose right
    flip: 1,               // the width he is drawn at, while turning over
    placed: false,
    phase: 0,
    mode: 'bowl',          // bowl | leap | free | jump
    grow: 0,               // 0 the size he is in the bowl, 1 the size he ends
    spin: 0,               // how far round he is, mid-leap
    spinRate: 0,
    hold: null,            // somewhere he has been startled to
    target: null,
    nextThink: 0,
    dash: null,
    nextBubble: 2,
    now: 0,                // the scene clock, for anything drawing itself
    roll: null,            // a full turn, nose over tail, under way
    nextRoll: 6,
    nextJump: 7,
    wantJump: null,        // a click in the sky he is working his way up to
    outside: 0,            // how long he has been off the edge of the window
    dive: null,            // heading for the bottom while the water comes up
    leap: null,            // the way out of the bowl: up, hang, turn, fall
    unwind: null,          // levelling out after the dive
    lastBreak: -9          // when he last came through the surface
  };
  state.fish = fish;

  const bubbles = [];

  /* How long he is, in pixels. He leaves the bowl at `size_bowl` and arrives in
     the water `grow_to` times that, growing on the way down. On a narrow screen
     he is held to a share of it, so a phone doesn't get a fish wider than the
     page. */
  function length() {
    const small = Number(get('fish.size_bowl', 140));
    const big = small * Number(get('fish.grow_to', 2));
    const want = lerp(small, big, clamp(fish.grow, 0, 1));
    const room = scene.view.w * Number(get('fish.max_share', 0.5));
    return Math.max(60, Math.min(want, room));
  }
