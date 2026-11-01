  // --------------------------------------------------------------- bits --

  function hexa(hex, alpha) {
    const c = Aquarium.rgb(hex);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${clamp(alpha, 0, 1)})`;
  }
