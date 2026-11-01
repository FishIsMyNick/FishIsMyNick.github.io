/* Him.

   The artwork is a flat drawing seen from the side, so the body is bent rather
   than jointed: the sprite is rasterised once, then redrawn every frame as a
   row of thin vertical strips, each nudged up or down by a wave travelling
   from nose to tail. The head barely moves, the tail swings hardest, and the
   whole shape flexes the way a fish does.

   He has four lives, in order:

       bowl     turning circles behind the glass, with nowhere to go. A tap
                brings him up for a look; another puts his nose through the
                surface
       leap     the tap that breaks the glass throws him into the air, where
                he turns over once or twice and doubles in size on the way down
       free     out in the water, following the cursor, circling whatever you
                hover, and dashing to wherever you click. The water is wider
                than the window: he can carry on out past the edge of it and
                come back, and he can turn right over, nose over tail, as he
                goes
       jump     out of the water altogether — of his own accord every so
                often, or after a click in the sky above the waterline. He
                arcs, turns over if he feels like it, and comes back down with
                a splash

   Everything he does comes from the `fish` block of src/content/aquarium.yaml.
   Replace src/assets/svg/koi_fish.svg to change the fish; the only settings
   tied to the drawing are `faces`, which says which way its nose points, and
   `mouth`, which is where the bubbles come from. */


  const { get, range, clamp, lerp, rand, pick, motion, css, colorAt, depthAt } = Aquarium;
  const state = Aquarium.state;
  const scene = Aquarium.scene;
  if (!scene) return;
