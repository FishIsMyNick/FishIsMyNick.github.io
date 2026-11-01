  // ----------------------------------------------------------------- go --

  resize();
  remeasureSurface();
  scene.add(10, drawWater);
  scene.add(90, drawSurface);
  requestAnimationFrame(frame);

  // So the other modules can measure the line again after a reset.
  Aquarium.remeasureSurface = remeasureSurface;
  Aquarium.clock = () => clock;
