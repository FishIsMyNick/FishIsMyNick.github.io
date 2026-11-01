/* The water, and the loop everything else draws inside.

   One canvas, fixed to the viewport, is the whole scene: the water, the inside
   of the bowl, the shoal, the fish, the glass. They are kept apart as layers
   with an order, so each module can add its own and not care about the others:

       Aquarium.scene.add(50, (ctx, env) => { ... });

   Low numbers are far away. 10 is the water, 20 the inside of the bowl, 30 the
   shoal, 50 the fish, 75 the glass over the top of him, 90 the surface itself.

   The canvas is fixed, so the water does not scroll with the page: scrolling
   takes you down through it instead, which is the whole idea. The waterline is
   remembered as a point on the page, and where that lands on the screen is
   what the first layer draws from. */


  const { get, clamp, lerp, rand, mix, motion, colorAt, depthAt, css } = Aquarium;
  const state = Aquarium.state;

  const host = document.getElementById('aquarium');
  const canvas = document.getElementById('aquarium-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
