/* The bowl, the glass, and the three taps it takes.

   The bowl is drawn on the canvas, in the box the stylesheet keeps for it in
   the title section — so where it sits on the page is a CSS question, and
   everything about how it looks is a question for the `bowl` and `glass`
   blocks of src/content/aquarium.yaml.

   It is one soft shape: a body and a neck in a single path, stroked twice so
   the line reads as glass rather than as a drawn outline. There is no straight
   line and no corner anywhere on it except the rim: the lip rolls over into
   it, and the rim runs straight across, because the bowl is seen side on. Inside it there is sand, a plant and a castle.

   Tapping it rings the glass, cracks it, and sends him up to look. The last
   tap breaks it: the pieces fall, he leaps up to the top of the screen and
   turns over there, and then falls as the water comes up the screen to meet
   him. When the water has reached the top the rest of the page — which until
   then could not be scrolled to — is let in, and the overview fades in where
   the bowl was. */


  const { get, clamp, lerp, rand, motion, css } = Aquarium;
  const state = Aquarium.state;
  const scene = Aquarium.scene;
  if (!scene) return;

  const el = document.getElementById('bowl');
  const note = document.getElementById('bowl-note');
  const showcase = document.querySelector('.showcase');
  const body = document.body;

  let cracks = [];       // polylines in bowl space: 0–1 across, 0–1 down
  let shards = [];
  let shake = { at: -99, power: 0 };
  let brokeAt = 0;
  let revealed = false;
  let heading = null;    // where the page goes once the water is up, if anywhere
  let gravel = null;     // worked out once, so the stones don't crawl
  let plants = null;
