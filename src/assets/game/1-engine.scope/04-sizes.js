  // --------------------------------------------------------------- sizes --

  function fullLen() {
    return clamp(Math.min(view.w, view.h) * num('fish_size', 0.15),
                 num('fish_min', 90), num('fish_max', 170));
  }
  // smaller while a mechanic has him on a grid (fish.size)
  const fishLen = () => fullLen() * fish.size;
  const fishTall = () => fishLen() * shape.right;
  // his body for knocking into things: a box a little inside the drawing
  const halfW = () => fishLen() * 0.42;
  const halfH = () => fishTall() * 0.4;
  const gapH = () => Math.max(fullLen() * shape.right * num('gap', 2.4), 90);
  const holeW = () => Math.max(gapH(), fullLen() * 1.5);
  const border = () => num('border', 30);
  const borderTop = () => border() + num('border_top_extra', 5);   // the top wall holds the buttons
  const wallW = () => clamp(view.w * 0.1, 70, 150);
