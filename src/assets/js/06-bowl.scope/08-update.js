  // -------------------------------------------------------------- update --

  function measure(env) {
    if (!el) { state.bowl = null; return; }
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) { state.bowl = null; return; }

    const since = env.t - shake.at;
    const jolt = since < 1.4
      ? Math.sin(since * 38) * Math.exp(-since * Number(get('glass.shake_decay', 7))) * shake.power
      : 0;

    state.bowl = { x: r.left + jolt, y: r.top, w: r.width, h: r.height };
  }

  function pour(env) {
    if (!state.broken) { state.pour = 0; return; }
    const time = Math.max(0.1, Number(get('glass.pour_time', 0.9)));
    state.pour = clamp((env.t - brokeAt) / time, 0, 1);
  }
