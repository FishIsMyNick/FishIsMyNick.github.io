# Luka Miletić — portfolio v3.4

A single static page. Same build as v3 — content in YAML, templates in Jinja,
three generated files as the whole site — with a different opening.

> **v3.4 is v3.3 with a drawing of the fish for each direction, a surface
> worth breaking, and the splash rebuilt — sound and all.** `portfolio_v3/`
> through `portfolio_v3.3/` are untouched; they are independent, and editing
> one does nothing to the others. `portfolio_v4/` is the separate
> pond-from-above idea.

```
                 src/content/*.yaml   ─┐
                 src/templates/**     ─┼─►  index.html
                 src/assets/css/*     ─┼─►  styles.css      the whole site
                 src/assets/js/*      ─┴─►  script.js
```

Those three files plus `media/` are the site. Upload them anywhere.

## What's new in v3.4

**Two fish.** He is no longer one drawing held up to a mirror: there is a
drawing for each direction — `src/assets/img/fish-left.png` and
`fish-right.png` — and the turn swaps between them. The movement is the one it
always was, squashed down through nothing and opened out the other side; what
you see on the far side of it is now a drawing made to face that way. Both are
inlined into the page by the build, so the page still carries its own fish.

**He goes in head first.** The leap out of the bowl always lands nose down, and
then he keeps going down until the water has finished rising — the page opens
by his taking the water rather than by his bobbing about at the top of it. The
turn is re-aimed every frame on the way down, against the waterline as it is at
that moment rather than where it was when he jumped, so he arrives at the angle
whatever the numbers are set to.

**The surface is worth breaking.** Five waves overlap along the line instead of
three. Anything going through it — him jumping, him landing, his back coming
out of the water as he swims — sends a wave travelling out along the surface in
both directions and throws up a crown of droplets that falls back into it.

**The ripples are round, and they are waves.** A front leaves the point you
clicked and travels out, the crests following it, each thinner and fainter than
the one in front; the amplitude falls as 1/√r, the way a ring spreading over a
surface does; every crest is drawn bright on the near side and dark on the far
side, because what you see of a ripple is light bending through the slope of
it; and a line of fine wrinkles runs just inside the leading edge, so it is
never a perfect circle. They are kept to the water rather than drawn up into
the sky.

**The splash sounds like water.** Noise on its own is a hiss. What the ear
reads as water is bubbles: a pocket of trapped air rings at a pitch set by its
size and shrinks as it rises, so the note slides *upwards* as it dies away.
There is one big one for the cavity he leaves behind him, a scatter of small
ones after it, a short bright hit at the front and a thin wash of falling
droplets underneath.

**And:** scrolling drags him with the page, because the water does not scroll —
you go down through it. The three nav links are set large and divided by
hairlines rather than flung to the far corners. Everything written on the
opening screen sits on a frosted plate, on the same settings as the panels
further down. The quote reads *With Even / BIGGER IDEAS!*, and the two
explanatory lines under *Hobby projects* and *Experience & skills* are gone.

## What's new in v3.3

**The title page.** Your name, the bowl and the quote take a third of the width
each and sit on one line, centred on the same axis — the bowl's own centre, not
the bowl plus its caption. The quote's last phrase is set over two rows so it
stays clear of the glass, and your name is now one unbreakable word per span,
so no window width can leave the `ć` of *Miletić* stranded on a line of its own.
The overview and the nav have come out of the left-hand column: they run
underneath all three, the nav across the full width of the panels below it.

**The glass.** The whole silhouette is one curve drawn through a ring of points
rather than arcs and lines joined end to end, so there is no corner anywhere on
it — there is nowhere for one to be. The opening is wider and the flare almost
gone: it comes up off the body and rolls over, instead of pinching into a neck
and spreading into a vase. The inside is as it was.

**Him.** Three new things he can do:

- **Jump.** He leaves the water of his own accord every `jump_every` seconds,
  and a click in the sky above the waterline is an invitation — if he is near
  the line he goes straight for it, and if he isn't he swims up and jumps when
  he gets there. He is thrown exactly hard enough to reach what he is going for.
- **Leave.** The window is not the edge of the water. He can carry on out past
  the side by `off_frame` of his own lengths and come back; `off_frame_chance`
  is how often a wander of his own heads out there.
- **Turn right over.** A full 360, nose over tail, now and then — and sometimes
  instead of simply flipping round when a click sends him back the other way.

**The light.** The bands under the surface are laid down several times over,
wider and fainter each pass, which adds up to an edge that isn't there at all;
and every band keeps its own phases, so they wander past each other instead of
sliding along in formation. The sunbeams get the same treatment plus an outright
blur, and no two of them share a clock any more — each has its own phases,
rates, width and lean, drawn once when the page opens.

**And:** the panels are frosted 8px instead of 15, and the contact rows have
lost the words *Email*, *GitHub* and *LinkedIn* in favour of a line drawing in
front of each link. The mark is a link too, so either half of the row takes you
there. They are drawings of ours in the page's own style — an envelope, a pair
of brackets, a profile card — rather than anybody's logo.

## What's new in v3.1

The fish starts in a goldfish bowl, and the page starts locked: no scrolling,
nothing under the title. Under the bowl it says **tap to break the glass**.

- **Tap once** — the glass rings and a crack appears. He bolts.
- **Twice** — another crack.
- **Three times** — it shatters. The pieces fall, water rises up the page, he
  drops into it, and the rest of the portfolio is let in.

From then on he is loose in the water and follows your cursor, dashing towards
wherever you click. Scrolling takes you deeper: the light goes from the teal of
the surface to almost black at the bottom of the page, and the sections ride on
top of the water as rounded translucent panels with the water showing between
them.

**Every number in all of that lives in `src/content/aquarium.yaml`** — how many
taps, how far the dash goes, how hard the tail beats, how fast the water moves,
how deep it gets, how many little fish are in it, how see-through the panels
are. See *Playing with the feel*, below.

## Changing what the page says

**Everything you'd want to edit lives in `src/content/`.** It is YAML:
indentation matters, `#` starts a comment, and every edit point is commented.

| File | What's in it |
| --- | --- |
| `site.yaml` | Your name, tagline, the four quote lines in the pond, the showcase thumbnails beside the bowl, intro, section headings, contact links |
| `aquarium.yaml` | The bowl, the glass, the fish, the water, the depth, the shoal, the panels, the sound |
| `professional.yaml` | The professional projects, rows and detail pages both |
| `hobby.yaml` | The hobby projects, rows and detail pages both |
| `experience.yaml` | Roles, and the skills lists beside them |

Four marks work in any line of content: `*word*` comes out in the orange
accent, `**word**` a size up inside its own line, `^^st^^` raised — for
`1^^st^^`, `2^^nd^^`, `3^^rd^^` — and a `\n` is a line break —
which is how the last phrase is set over two rows instead of reaching across
into the bowl. The quote is written as

```yaml
pitch:
  - "Small *Fish*,"
  - "In a **Big** Pond,"
  - "With Even\n**BIGGER IDEAS!**"
```

A contact link takes an `icon` — `mail`, `code`, `profile`, `globe` or `chat`,
drawn in `src/templates/partials/icons.html` — and its `label` is no longer
printed beside it: it is what a screen reader announces for the mark. Add
another icon by giving it a name in that file.

A professional project takes two more fields than it used to — `studio`, which
is what comes after the bullet in the row, and `logo`, naming a
`media/<logo>.png` for the lower corner of the thumbnail. Until that file
exists, the corner falls back to the studio's name.

## Building

```bash
python build.py            # build once
python build.py --watch    # rebuild on every save
python build.py --serve    # the same, plus a server on http://localhost:8000
```

On Windows, **double-click `build.bat`** — it installs what's missing and
builds. Pass `--serve` to it the same way from a terminal.

It needs Python 3 and two packages (`pip install jinja2 pyyaml`, or
`pip install -r requirements.txt`). The build tells you if they're missing.

**`index.html`, `styles.css` and `script.js` in this folder are generated.**
They're kept so the site works without running a build, but anything typed into
them is lost the next time you build. Edit `src/` instead.

## Playing with the feel

`python build.py --serve`, then edit `aquarium.yaml` and save: it rebuilds on
every save, so it's a reload to see a change.

Faster still, the whole file is readable in the browser console, live:

```js
Aquarium.config.fish.leap_turn = 3         // a slower turn at the top of the leap
Aquarium.config.fish.circle_radius = 260   // a wider orbit round what you hover
Aquarium.config.fish.wiggle = 1.4          // more tail
Aquarium.config.water.movement = 2         // choppier
Aquarium.config.shoal.blend = 0.2          // let the little fish show
Aquarium.config.panels.blur = 0            // no frosting behind the sections

Aquarium.break_()    // skip the tapping
Aquarium.reset()     // put him back in a whole bowl and lock the page again
```

Nothing there is saved — when a number feels right, write it into
`aquarium.yaml` and build.

A few worth knowing about:

| Setting | What it does |
| --- | --- |
| `glass.taps_to_break` | How many taps. 1 for people in a hurry |
| `glass.lock_page` | `false` leaves the page scrollable from the start |
| `glass.rise_hold`, `glass.breach` | What a tap does to him before the last one |
| `bowl.neck`, `flare`, `lip_round` | The shape of the glass: how wide the opening, how far the lip rolls over into the level rim |
| `fish.leap_rise`, `leap_turn`, `leap_top`, `leap_flips`, `grow_to` | The leap out of the broken bowl: how long to the top, how long the turn, where he hangs, how many turns, how much bigger he lands |
| `fish.jump`, `jump_every`, `jump_power`, `jump_flips` | Leaving the water once he's out there: how often, how hard, how many turns |
| `fish.jump_at_clicks`, `jump_near_surface` | Whether a click in the sky is a jump, and how near the line he has to be to go |
| `fish.off_frame`, `off_frame_chance`, `off_frame_speed` | How far past the edge of the window he may go, how often, and how briskly |
| `fish.roll`, `roll_time`, `roll_every`, `roll_on_dash` | The full turn: how long it takes, how often, and how often a click becomes one |
| `fish.dash_speed`, `dash_turn` | The click: how fast he goes, how hard he turns |
| `fish.circle`, `circle_targets`, `circle_radius`, `circle_speed` | What he circles when you hover, how widely, and how slowly |
| `fish.dive_speed`, `dive_settle`, `dive_unwind`, `escort_speed` | The dive after the splash: how fast down, how far off the bottom he waits, how long he takes to level out, and how fast he takes the page down after a showcase click |
| `fish.scroll_drag` | How much the page carries him as you scroll. 1 pins him to it, 0 leaves him on the screen |
| `fish.surface_gap`, `dash_surface_gap` | How far under the line he holds himself, and how far under it a click can take him |
| `fish.break_speed`, `break_gap` | What counts as coming through the surface, and how often that can happen |
| `water.splash_speed`, `splash_wave`, `splash_height` | The wave that runs out along the line when something goes through it |
| `water.splash_drops`, `splash_throw`, `splash_gravity` | And the droplets it throws up |
| `water.ripple_speed`, `ripple_wave`, `ripple_rings` | How fast a ripple travels out, how far apart its crests are, how many there are |
| `fish.follow` | `false` and he ignores the cursor, swimming his own way |
| `fish.wiggle`, `wave_length`, `stroke_rate` | The swim stroke |
| `water.surface_end`, `rise_time`, `rise_ease` | How far from the top of the screen the waterline stops (the page scrolls with it so it stops at the top of the pond), how long the climb takes, how much of it is spent slowing down |
| `water.surface_layers` | How many waves overlap along the line |
| `water.shaft_interference` | The three wave speeds the sunbeams are built from |
| `water.shaft_blur`, `shaft_softness`, `shaft_randomness` | How soft the beams are, and how far each one goes its own way |
| `water.caustic_passes`, `caustic_softness`, `caustic_drift` | The same, for the bands under the surface |
| `depth.*_color`, `depth.curve` | How the light goes as you scroll |
| `shoal.blend` | How far the little fish disappear into the water. 1 is invisible |
| `panels.opacity`, `panels.blur` | The section panels. `blur` is the one setting that costs real work to draw |

### What the build checks

It stops with a plain-English message, rather than producing a quietly broken
page, when a project has no `id`, two projects share one, a required field is
missing, a block of `aquarium.yaml` has gone astray, the YAML doesn't parse, or
a template refers to a field that isn't there. It also lists the clips still
missing from `media/` each time it runs.

Settings are read one at a time at the moment they're used, so a value deleted
from `aquarium.yaml` falls back to a sensible one instead of stopping the page.

## Structure

```
portfolio_v3.4/
├─ index.html  styles.css  script.js   generated — don't edit
├─ media/                              your clips and posters
├─ build.py  build.bat  requirements.txt
└─ src/
   ├─ content/     the five YAML files above
   ├─ templates/
   │  ├─ base.html             the page shell
   │  ├─ sections/             one file per section of the page
   │  ├─ details/              the two detail-page shapes
   │  └─ partials/
   │     ├─ aquarium.html      the canvas, the settings, the two drawings
   │     ├─ macros.html        the pieces that repeat (a preview, a row)
   │     ├─ icons.html         the marks in front of the contact links
   │     └─ topbar.html
   └─ assets/
      ├─ css/    11 numbered files, concatenated in order
      ├─ js/     10 numbered files, concatenated in order
      ├─ img/    fish-left.png, fish-right.png — him, one per direction
      └─ svg/    koi_fish.svg — the drawing v3.3 used. Nothing reads it now
```

The number prefixes on the CSS and JS parts **are** the order they're joined
in. Add a file and it's picked up; no list to update.

### The ten scripts

| | |
| --- | --- |
| `01-core.js` | The settings from `aquarium.yaml`, and the state the rest share |
| `02-nav.js` | The year, and the sticky nav bar |
| `03-media.js` | Project previews: play on hover, empty-state fallback |
| `04-detail.js` | Detail pages: open, close, focus, one URL each |
| `05-sound.js` | Glass and water, synthesised — no audio files to ship |
| `06-depth.js` | How deep a point on the page is, and what colour that is |
| `07-water.js` | The canvas, the loop, the water, the surface, the ripples |
| `08-shoal.js` | The little fish |
| `09-fish.js` | Him: swimming, the leap, jumping, rolling, circling, dashing |
| `10-bowl.js` | The bowl, the castle, the cracks, the break, the lock |

Everything is drawn on one canvas fixed behind the page, in layers with an
order — water 10, the inside of the bowl 20, the shoal 30, him 50, the glass
75, the surface 90 — so each module adds its own and doesn't have to know about
the others. A module can be deleted and the rest still run.

## How he swims

The artwork is a flat drawing seen from the side, so the body is bent rather
than jointed: the sprite is rasterised once, then redrawn every frame as a row
of thin vertical strips, each nudged up or down by a wave travelling from nose
to tail. `head_steady` holds the first third of him rigid, so the head barely
moves and the tail swings hardest.

He blows a bubble or two from his mouth every few seconds, turns over by being
squashed through zero rather than flipped, and leans into a climb or a dive.
A click makes him come about — a hard turn, `dash_turn` long — and swim the
whole way to it at `dash_speed`; hovering anything on the page sends him round
it instead, wide and slow. The leap works its spin out from how long he will be
in the air, so he lands the right way up whatever the numbers are set to, and a
jump does the same.

Three of the four things he does are the same piece of arithmetic seen from
different angles. Facing is a mirror, so it can only ever take him through 90
degrees: a **roll** is therefore an angle of its own, eased from 0 to a full
turn and added to however he is already held, which is why he keeps swimming
while he does it rather than stopping to perform it. A **jump** is the leap
without the bowl — thrown hard enough to reach what it is aimed at, held
nose-first along its own arc, and ended the moment the waterline comes back up
at him. And **going off the edge** is just a destination outside the window: he
picks one now and then, swims there at `off_frame_speed` without changing his
mind on the way, and turns back after `off_frame_return` seconds out of sight.

To change the fish, replace the two PNGs in `src/assets/img/` — one drawing
facing left, one facing right. Each should be **trimmed to its ink on a
transparent background**: nothing is cropped or keyed at build time, so what is
in the file is what swims, margins and all. The drawings do not have to be the
same size as each other; each is drawn to the length he is at the time, at its
own proportions.

The only setting tied to the artwork is `fish.mouth`, where the bubbles come
from. It is a point on the left-facing drawing, and it is read from the nose
end whichever way he happens to be going.

## Accessibility

The lock is added by the script, so a page whose JavaScript never ran is simply
the portfolio, scrollable as usual. The bowl is a real button: it can be tabbed
to and tapped with the keyboard, and the skip link at the top of the page
breaks the glass and goes straight to the work. A link to a project
(`...#infernal-dante`) opens that page directly and never locks anything.

With `prefers-reduced-motion` set, the water, the shoal and the plants slow to
`motion.reduced_scale` of their usual pace, and the videos get native controls
instead of playing on hover. He still comes when you click — that part is
yours, not the page's.

## Adding a project

Add a block to `professional.yaml` or `hobby.yaml` and build. That's the whole
job — the gallery row, the detail page, the link between them and the project's
URL all come from the one `id`. Copy an existing block to get the field names
right. Removing a project is deleting its block.

## What still needs you

- **Contact** — your real email and LinkedIn URL in `site.yaml`, in both the
  `href` and the `text`.
- **Professional projects** — titled by studio, because I had no game titles to
  use. The descriptions are a first pass worth rewriting in your own words.
- **Hobby projects** — CombatDemo and AttackTowerDefence are still placeholders.
- **Dates** on the roles in `experience.yaml`, if you want them.
- **Clips** — drop them in `media/`; see `media/README.md`.

## Fonts

Archivo and Newsreader load from Google Fonts, in `src/templates/base.html`. To
self-host instead, download both and swap the `<link>` for local `@font-face`
rules. The page falls back to Helvetica and Georgia without them.
