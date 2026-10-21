# Portfolio guide (v3.4)

Abbreviations:
    bg = background
    white = color:ece6da   (--bone, primary text)
    silt = color:b7cfd6    (--silt, secondary text)
    orange = color:ff6b2c  (--koi, the fish and the accent — nothing else on the page may use it)
    panel = rounded border element, translucent bg, backdrop blur (see Panels)
    Bowl = Fish Bowl



Project architecture:
    A single static page. Content is YAML, markup is Jinja templates, and build.py
    turns them into the three generated files that are the whole site:

        src/content/*.yaml   ─┐
        src/templates/**     ─┼─►  index.html
        src/assets/css/*     ─┼─►  styles.css
        src/assets/js/*      ─┴─►  script.js

    Those three files plus media/ are the site. Never edit the generated files,
    edit src/ and rebuild.

    - Build: `python build.py` (once), `--watch` (rebuild on save), `--serve`
      (rebuild + server on localhost:8000). build.bat does the same on Windows.
      The server answers Range requests (as a real host does), so videos
      stream and seek, and a browser dropping a download prints nothing.
      Needs jinja2 and pyyaml (requirements.txt).
    - The build validates content (ids unique, required fields present, all
      aquarium.yaml blocks present, YAML parses) and stops with a plain message
      instead of writing a broken page. It also lists media/ files still missing.
    - In progress: anything in the content files can be kept off the page while
      it's being written. `in_progress: true` on a block (a project, a role, a
      skill group, a hero panel) leaves the whole block out; `<<text>>` inside
      any line leaves just that text out, and a list item that is only `<<…>>`
      is dropped. A hero panel leading to a hidden project goes with it.
      Hidden things are skipped by validation, and the build lists them.
    - Pictures: media/ holds one folder per project (professional/<id>/,
      hobby/<id>/), plus logos/ for the studio marks and hero/ for the
      opening-screen tiles; media/README.md has the
      tree. The yaml names each file by its path from media/ without the
      extension, and the build finds whichever of .jpg .jpeg .png .webp .avif
      is there (logos: .png .svg .webp .avif). The picture alone fills a panel;
      an .mp4 of the same name is optional and plays on hover. The .mp4 alone
      fills it too, showing its first frame until it plays.
      A name ending in / is a folder (professional/brave-giant/contributions/ui/):
      every picture directly in it is shown, in filename order, each fading
      over the last at hero.fade / hero.hold (2s fade, held 5–8s), the same
      as the hero panels. Works for any preview: thumbnail, cover,
      contribution media, feature media. Pictures only (an .mp4 in the
      folder is ignored); an empty folder is empty water, and the build
      lists it.
    - The build inlines the two fish sprites (src/assets/img/fish-left.png,
      fish-right.png) into the page as data URIs, writes aquarium.yaml into the
      page as JSON (readable live as `Aquarium.config`), and writes the CSS
      variables CSS needs (panel opacity/blur/radius/edge/float, bowl size/aspect,
      depth colours) at the end of styles.css.
    - CSS and JS are numbered parts concatenated in filename order. Adding a file
      picks it up automatically; the number prefix is the order.

    src/
    ├─ content/
    │  ├─ site.yaml           name, tagline, intro, hero pitch lines, bowl note,
    │  │                      nav, section headings, contact links, colophon
    │  ├─ aquarium.yaml       every number for the bowl, glass, fish, water,
    │  │                      depth, shoal, panels, motion and sound
    │  ├─ professional.yaml   professional projects (row + detail page)
    │  ├─ hobby.yaml          hobby projects (row + detail page)
    │  └─ experience.yaml     roles, and skill groups (chips or lines)
    ├─ templates/
    │  ├─ base.html           page shell; includes everything below
    │  ├─ sections/           title, pond, work, experience, contact, details,
    │  │                      game (the Game Mode view and the sweep)
    │  ├─ details/            professional.html, hobby.html (the two page shapes)
    │  └─ partials/           aquarium (canvas + config + sprites), topbar,
    │                         macros (video, slideshow, media, split_media,
    │                         project_row, media_row, model_gallery, part_top,
    │                         lines, references), icons (contact marks, and
    │                         settings, sound, reset)
    └─ assets/
       ├─ css/  01-tokens 02-reset 03-layout 04-topbar 05-bands 06-title
       │        07-work 08-experience 09-contact 10-detail 11-game
       │        12-responsive (keep last)
       ├─ js/   01-core     settings from aquarium.yaml, shared state
       │        02-nav      year, sticky top bar
       │        03-media    previews: play on hover, empty-state fallback,
       │                    photo slideshows, the cover on a hovered thumbnail
       │        04-detail   detail pages: open, close, focus, one URL (#id) each
       │        05-sound    all sounds synthesised (Web Audio), no audio files
       │        06-depth    page depth → water colour
       │        07-water    the canvas, the loop, water, surface, ripples, splash
       │        08-shoal    the little fish
       │        09-fish     him: swim, leap, jump, roll, circle, dash, off-frame
       │        10-bowl     bowl, castle, cracks, break, page lock, hero dive
       │        11-settings the gear and its panel (open/close only)
       │        12-models   Gallery viewers: lazy load, pan, reset, animations
       │        13-game     Game Mode: the sweep, opening and closing the view
       ├─ img/  fish-left.png, fish-right.png (trimmed, transparent bg)
       └─ svg/  koi_fish.svg (old v3.3 drawing, unused)

    Rendering: everything animated is drawn on ONE canvas fixed behind the page,
    in ordered layers — water 10, inside of the bowl 20, shoal 30, fish 50,
    glass 75, surface 90. Each JS module registers its own layer and doesn't
    need to know about the others; a module can be removed and the rest still run.

    Content conventions:
    - In any content line: `*word*` = orange, `**word**` = one size up within its
      own line, `^^st^^` = raised (1^^st^^, 2^^nd^^), `\n` = line break.
      They nest: `**To be the *greatest* fish**` is a size up with one
      word orange, and `**… *Game Developing Fish!***` closes both at once.
      This works in every field of every .yaml file: the build applies the
      marks to everything a template prints (Jinja `finalize` in build.py,
      the `marks` function), so a new field or template gets them too.
      A block (`|` or `>`) is one paragraph: its wrapped lines join up, and
      only a typed `\n` breaks it. A one-line value keeps its breaks
      (a "\n" in double quotes or a typed \n).
      Inside an HTML attribute (aria-label, alt, <title>, the meta
      description) markup can't go, so templates use `| plain` there, which
      strips the marks. Don't `| trim` a content field: that strips the
      trailing newline that marks a block.
    - Adding a project = adding a block to professional.yaml / hobby.yaml. The row,
      detail page, link and URL all come from its `id`.
    - Media is named by stem: `media/<name>.mp4` (plays muted/looped on hover) +
      `media/<name>.jpg` (poster); either alone is enough. A missing file renders as an empty water panel,
      never a broken box. Previews are 16:9, up to 600px wide (--preview).
    - Every tunable number belongs in aquarium.yaml, not hard-coded in JS/CSS.
      Settings are read at the moment they're used, with a fallback, so a deleted
      value never breaks the page.



Look and feel:
    The page is one tall body of water seen from the side. It starts as a lit
    tank and darkens as you scroll down (scrolling = going deeper).
    - Sky (above the waterline): starts as 06455a, the colour of the water
      just under the surface, so the Bowl sits in one unbroken tank. When the
      Bowl breaks it clears to 0d7fa4 (depth.sky_color), on the same ease-out
      curve as the fish's leap, arriving exactly as he reaches the top of it
      (fish.leap_rise, 1s). Aquarium.reset() puts it back to the water colour.
    - Water: starts at 06455a just under the surface, 05364a halfway, 03212e at
      the bottom; fully dark by 85% of the page (depth.* in aquarium.yaml).
    - Fonts: Archivo (sans, variable width/weight) for headings and UI,
      Newsreader (serif) for body text. Loaded from Google Fonts in base.html.
    - Orange is reserved for the fish and accents (tagline, "Fish" in the quote,
      hovers).

Panels:
    Every section below the title is a panel floating on the water:
    rounded (26px), translucent dark bg (opacity 0.4, darkens slightly with
    depth), backdrop blur 8px, faint 1px border, soft drop shadow. Panels slowly
    ride the water (a few px up/down, out of step with each other).
    Panels are as wide as the shell column + gutters, with clear water gaps
    between them so the fish can swim through.
    Without backdrop-filter support the panels go solid.



Sections:
    1. Title
    2. My Work
    3. Experience & skills
    4. Contact
    (+ Detail pages, opened from My Work)
    (+ Game Mode, opened from the button under the Overview)

Title:
    Two parts, after Ref Slike/Initial_title_reference.png and
    Ref Slike/Title_sequence_reference.jpeg: the opening screen (sky), and the
    Pond under it (below the water).

        ┌──────── Name / SUBTITLE (top, centred) ─────────┐
        │  Fish Bowl              │  ┌────┐               │  opening screen,
        │                         │  │ 1  │  ┌─────┐      │  exactly one screen
        │                         │  │    │  │  3  │      │  tall
        │  tap to break the glass │  ├────┤  │     │      │  (1 AAA, 2 Mobile,
        │                         │  │ 2  │  │     │      │  3 Indie: photos
        └─────────────────────────┴──┤    ├──┤     ├──────┘  only, no labels)
        ~~~~~~~~~~~~~~~~~~~ water surface (final) ~~~~~~~~~~~  tiles run on past
                                                               the screen bottom
                        Small Fish,
                     In a Big Pond,                          the Pond
                        With Even
                          BIGGER
                          IDEAS!
            My work  |  Experience & skills  |  Contact
        ┌──────────────── My work panel ───────────────────┐

    Opening screen:
    - Name (top, centred, no pane and no blur):
        <2rem bold white>Luka Miletić<>
        <3.5rem orange>The Game Developing Fish<>
    - Fish Bowl (left half, as large as the screen allows):
        <generated on the canvas, the HTML is only a button reserving the space>
        <small print, uppercase>Tap to break the glass<>   (fades out with the glass)
    - Hero panels (right half; `panels` in site.yaml, once called the
      showcase): three panels of professional
      experience across the industry, all the same size, staggered (AAA and
      Mobile down the left column, Indie in the right column starting halfway
      down AAA), running on past the bottom of the screen. Each shows its own
      collection of photos, every picture in its folder (media/hero/aaa,
      mobile, indie) in filename order, each picture fading over the last in
      2s and held a random 5–8s (hero.fade / hero.hold in aquarium.yaml), so
      the three never change together. No text on them: the `label` is
      only read out by screen readers (aria-label), and a hover or focus
      turns the panel's border orange. They're separate from the
      projects' thumbnails and covers; a panel whose folder is still empty
      shows its project's thumbnail. Which project is which is hero.panels in site.yaml
      (AAA = Ubisoft Belgrade, Mobile = Brave Giant, Indie = Llamaware).
      The moment one is clicked all three stop taking clicks (mouse and
      keyboard), but stay where they are; at once the clicked one grows a
      little (1.06×, keeping its orange edge) and the other two fade back to
      45%, over 0.35s (hero.picked_scale / picked_fade / picked_time); when the fish reaches the peak of
      his leap (fish.leap_rise, 1s) they rise up the screen (40% of its
      height, easing in over 1s) and fade out as they go. Clicking one plays the break sequence; then,
      instead of letting go, the fish keeps swimming nose down and the page
      follows him down to that group of My work: Professional, and it stops
      there. This is its own sequence (the hero dive), not the bowl break's:
      the break and the leap are the same (the sky clears from the water
      colour to 0d7fa4 by the peak of his leap, and he has no shadow while in
      the air), but My work is shown from the
      click, and the page never stops on the way — it sets off with the water
      at the water's pace, carries straight on past the Quote where the water
      stops, picks up speed (Dive speed in Settings, starting at
      fish.escort_speed, 1200px/s) and only brakes as the group reaches the
      top of the screen (fish.escort_brake, scaled with the speed so the stop
      takes as long at any Dive speed). He holds
      the bottom of the screen nose down until the group comes up to him, and
      rides it in. The sky is cut away once he is there. Nothing is opened; the bowl
      counts as broken.
      Free scroll: once the Quote has gone up past him, a mouse-wheel scroll
      (or a swipe) ends the dive there. The page unlocks, the sky is cut
      away, he levels out as after a tap, and the scrolling is yours.
      Before he has passed the Quote, scrolling does nothing. Turned off by
      Scroll lock in Settings (see Settings); locked, the dive always runs
      to the group.

    The Pond (under the opening screen; its top edge is where the water
    surface comes to rest):
    - While the fish falls: the Quote, centred, center aligned, bold sans, each
      line larger than the last (1.2em / 1.26em / 1.58em / 1.62em):
        Small <orange>Fish<>,
        In a <one size up>Big<> Pond,
        With Even <one size up>BIGGER IDEAS!<>
    - 1s after the fall sequence completes the Quote fades out and the Name
      and Overview fade in, centred horizontally: Name just above the water,
      Subtitle just below it, the Overview (intro from site.yaml) below that,
      the full width of the shell at 1.2rem. The Quote and the Overview share
      one cell, so their blur panes are always exactly the same size. The intro is one paragraph
      however it is wrapped in the file; *orange*, **one size up** and a
      typed \n work in it.
    - Game Mode button: centred just below the Overview, coming in with it.
      A round frosted button (like the corner buttons, larger) with a
      joystick icon, and under it the label <small uppercase silt>Game Mode<>
      (game.label in site.yaml). The label is part of the button. On hover
      the ring, icon and label go orange. Opens Game Mode (see Game Mode).
    - Nav: My work | Experience & skills | Contact — one single bar the full
      width of the panels below, three equal cells, large heading-sized text,
      vertical separators between the cells whose ends fade out; on hover the
      text goes orange and an orange mark grows from the middle underneath.
      Held back until the page unlocks.
    The Quote, Overview and nav bar have no coloured background and no border,
    only a backdrop blur (panels.blur), and each pane hugs its text. Every
    such borderless blur pane (these and the bowl note) fades
    out over its last 3rem instead of ending (a feathered mask, --feather;
    the pane is padded by that much more, so the text is never faded).

    Narrow screens (below 56rem): the opening screen stacks — name, bowl,
    showcase — and the subtitle shrinks to fit.

    The Bowl:
    2D front view, one smooth curve with no sharp corners anywhere, wide opening
    with a lip that just rolls over into a rim that is one level line (the
    opening is seen edge on). The glass sheen covers only the water; the air
    above it is fully clear. Inside: nearly white water, warm sand gravel
    (not blue), swaying green algae, a small grey castle. The fish (the orange
    sprite) swims inside it. The water in the bowl wobbles when tapped.

    Opening sequence (the page is locked until the glass breaks: no scrolling,
    nothing below the title visible, no top bar):
    1. Tap 1: the glass rings, a crack appears, the bowl jolts; the fish swims up
       a little towards the surface and holds there.
    2. Tap 2: another crack; the fish slightly breaks the surface.
    3. Tap 3 (or a click on a showcase thumbnail): the glass shatters into
       tumbling, falling shards, the name at the top fades out, and the sky
       clears from the water colour to 0d7fa4 (see Look and feel). The hero
       panels stop taking clicks but stay put. The fish leaps up and reaches
       the top of the screen in exactly 1s; at that moment the hero panels
       rise up the screen and fade out. He hangs there while he slowly turns
       1 or 2 flips. The turn takes
       exactly 2s from the break and ends nose down. He grows to 1.6× his bowl
       size over the same 2s.
    4. Then the water comes in: it appears from below the screen and rises at a
       steady pace, slowing only at the very end, to 17% from the top of the
       screen (water.rise_time 3.4s). While it rises the page scrolls down with
       it, so it comes to rest at the top of the Pond. At the same moment he
       falls from the top of the screen, nose down, and meets the water on the
       way (big splash, droplets, wave along the surface, splash sound).
    5. In the water he keeps facing down and keeps swimming, down past the
       Quote to the bottom of the screen, where My work starts, and holds
       there until the water stops.
    6. When the water stops: he is free (levels out and swims on his own;
       after a break by tapping he starts levelling out 0.6s before the
       water stops, fish.dive_level_lead — after a hero click he stays nose
       down), the
       page unlocks, and the nav and sections fade in. The sky above the Pond
       is cut away at that moment (nothing moves on screen), so the page can't
       be scrolled up past the Name on the water. 1s later the Quote gives way
       to the Name and Overview. If a thumbnail started it, he instead swims
       on down with the page to that group of My work, and stops there.
    The skip link breaks the glass and, once the water is up, goes to My Work. A direct link to
    a project (#id) opens it without locking anything. Without JavaScript the
    page is simply the portfolio, unlocked.

The Water:
    - Surface: 5 overlapping wave layers, a bright foam edge. Anything going
      through it (the fish jumping, landing, his back breaking it while swimming)
      sends a travelling wave out along the line and throws up droplets.
    - Under the surface: wandering light bands (caustics), drawn several passes
      wider and fainter so they have no visible edge, each band on its own phase.
    - Sunbeams: very soft, blurred shafts built from 3 interfering sine waves,
      each beam with its own random phases, rate, width and lean, so they move
      naturally and independently.
    - Drifting silt motes.
    - Clicking the water makes a round, realistic ripple: a leading front with
      fading crests behind it, amplitude falling off with distance, each crest
      lit on the near side and dark on the far side, fine wrinkles near the
      front. Ripples stay in the water, never drawn into the sky.
    - The shoal: ~40 little fish that school loosely, scatter when the main fish
      comes close, and blend into the water colour so the orange fish pops out.
    - The water darkens with scroll depth; the bottom is darker still.

The Fish:
    - In the water he is 1.6× his bowl size (fish.grow_to).
    - Two drawings, one per direction (fish-left.png / fish-right.png, from
      Ref Slike, white keyed out and trimmed). fish-left.png is also the page icon:
      favicon.png (256px, transparent) and apple-touch-icon.png (180px, on
      #06455a) in the site root, padded square. They are made once, not by the
      build, so redo them if the drawing changes. Turning
      squashes him through zero width and opens out with the other drawing.
    - Swims by bending: the sprite is drawn in thin vertical strips displaced by
      a wave from nose to tail; the head stays steady, the tail swings hardest.
      Leans into climbs and dives, blows bubbles from his mouth now and then.
    - Once free he follows the cursor; with a still cursor he wanders on his own.
    - Click: he turns rapidly and dashes to the cursor. If the click is just
      below the surface he stops at the surface. A click in the sky above the
      waterline is a jump (if he's near the surface he jumps straight away,
      otherwise he swims up first and then jumps).
    - Hover: hovering a gallery row, showcase thumbnail, contact row, skill
      group, role, section heading, nav cell, the sound toggle or the Game
      Mode button makes him
      circle it, in a wide, slow
      orbit.
    - Jumps out of the water on his own every so often (fish.jump_every,
      8–20s), with 0–1 flips — but never while he is following the cursor
      (cursor in the window and moved within fish.idle_after, 2.5s). Click
      jumps into the sky still happen while following.
    - Shadow: a faint copy of him (fish.shadow, 0.12) under him and a little
      behind, in the water only. Hidden while he is in the air: the leap out
      of the Bowl until he lands, and his own jumps until he drops back in.
    - Can do a full 360° roll in the water, sometimes instead of a plain turn.
    - Can leave the window past the side edge and come back.
    - Scrolling drags him along with the page (mostly).

Game Mode:
    A different, more interactive view of the page, opened by the Game Mode
    button under the Overview. For now it is under construction.
    - Switching: a band of deep water, wider than the screen, with lit
      leaning edges like the surface foam, sweeps across the whole screen —
      left to right on the way in, right to left on the way out, its top
      edge leaning the way it goes. It gathers pace on the way in and loses
      it on the way out; the views swap at the halfway point, while it
      covers the screen. It goes over everything, the corner buttons too.
      game.sweep_time (1.1s, the whole crossing) and game.sweep_angle (10°)
      in aquarium.yaml. With reduced motion asked for, the views just swap.
    - The view: laid over the water on the same glass as a detail page; the
      page under it, and the top bar, are hidden and it can't scroll. The
      water, shoal and fish keep going behind it. Centred: the joystick in a
      ring, <small uppercase>Game Mode<>, <large bold>Under construction<>,
      a strip of pale warning tape, a line of text, and a "Back to the
      portfolio" button. All the words are `game:` in site.yaml.
    - Leaving: the Back button or Escape sweeps back to the page where it
      was left, with focus on the Game Mode button.

My Work:
    One panel with a heading and two clearly separated shelves (the hobby shelf
    a shade deeper, with a hairline above). No explanatory text under the
    headings.
    Gallery rows (both shelves): preview on the left (~600px, 16:9, plays on
    hover), text on the right: title, role, short summary, tags (orange
    badges, lettered in pure white), "Open details" cue. The whole row, thumbnail included, opens the
    project's detail page (the link covers the row; the split thumbnail's
    layers are isolated so they can't sit above it).
    Professional Projects:
        Grouped by category (AAA, Mobile, Indie — `category` in
        professional.yaml), each group under a small orange heading and
        reachable as #pro-<category>; the showcase thumbnails lead here.
        Listed as <Project Name> • <Studio Name>.
        Thumbnail split diagonally from bottom left to top right: top-left is the
        game picture (the project's `thumbnail`), bottom-right is the studio logo (media/logos/<studio>),
        falling back to the studio's name if there's no logo file yet. The game
        picture is solid down to the diagonal, then fades out over the studio
        half, gone 35% of the way across it (--split-overlap in 07-work.css).
        No hairline on the seam.
        Hovering (or focusing) the row plays the project's cover in the
        thumbnail's place, over the whole split: its cover.mp4, or the
        cover picture when there is no clip. It is only fetched on the
        first hover and only fades up (0.35s) once it is playing, so the
        thumbnail stays until there is something to show; leaving fades it
        out and pauses it. While it plays the cover fades into the studio
        corner like the game picture does, and that fade widens smoothly
        (0.6s) from 35% to 70% of the corner's half; the thumbnail picture
        fades away under it, and the studio logo (or name) slides down into
        the very corner, a little smaller, staying on top. Off under
        prefers-reduced-motion.
        Each professional project has a cover clip with still framing, no
        zooms: Black Flag Resynced from its two trailers (17s, eight long
        shots, each from inside one uninterrupted shot of the trailer,
        0.6s dissolves, no rating badge, credit, disclaimer or end card),
        Apocalypse Express and Push Puzzle from their own clips (~20s,
        mostly hard cuts).
    Hobby Projects:
        Same gallery rows, single (unsplit) preview.

Lists:
    A small round orange bullet in front of each list item (What I build,
    What I'm working on, Contribution), hung to the left so a
    wrapped line lines up under the text. No dashes.

Description text:
    Every description is justified, with long words hyphenated and the last
    line left ragged: gallery summaries, breakdown text, role text, detail
    Description and Overview, and every bulleted list item (What I build,
    What I'm working on, Contribution). Those (bar the breakdown text) are set 3px
    over the body size. The overview under the name is justified too,
    its last line centred to match the centred title.

Detail pages:
    A full-screen layer over the page with a sticky "Back to my work" button
    (a plain pill, no dash in front of the text).
    Each project has its own URL (#<id>); focus moves to the title. The fish,
    the bowl, the page and the top bar are hidden behind it. Its background is
    the same frosted panel as its shelf in My work: a professional page the
    colour of the professional shelf, a hobby page the hobby shelf's tint.
    Contribution blocks and Features rows alternate: picture left, then
    picture right. Below 56rem (phones, narrow tablets) they stack and stop
    alternating: every block is picture first, text under it.
    Professional project page:
        - Title (<Project Name>, with <Studio Name> on its own line under it,
          smaller and in a lighter weight)
          with the game's `cover` beside it (its own picture, not the
          gallery thumbnail). Every professional project has a cover.mp4
          too, which plays there, looped, while it is on screen, over the
          cover picture as its poster.
        - Description: short text about the game across the full width, with
          no heading, and the References under it (see below).
        - Technologies: the project's `technologies` as orange badges, as on
          hobby pages. Left out when the project has no such list.
        - Contribution: one or more blocks (`contributions:`), each a preview on
          the left (its media, or the main one) and on the right an optional
          heading over a list of what I contributed. A hairline between blocks.
          The older single `contribution` + `contribution_media` still works.
    Hobby project page:
        1. Project name as the title.
        2. Two columns: Overview on the left (References under it), "What I'm
           working on" (goals / features I'm exploring) on the right.
        3. Technologies: orange badges, like the gallery tags.
        4. "Features" (yaml key `features`): rows, preview on the left and
           short text on the right (not clickable).
        5. "Gallery" (yaml key `gallery`, optional): 3D models, see Gallery.

Gallery:
    The last section of any detail page, hobby or professional, when the
    project has a `gallery:` list. Each item is { model, title, text,
    poster, zoom }: `model` is a .glb or .gltf in media/ named without its
    extension (all but `model` optional). A grid of two columns across the
    full width (one below 56rem), each model in a 4:3 dark glass panel,
    title and text under it.
    - The viewer is Google's <model-viewer> 3.5.0, from jsDelivr, added to
      the page only when some project has a model.
    - It turns slowly by itself; drag (mouse or finger) to turn it to any
      angle. It holds still while pressed and dragged, and starts turning
      again 2.5s after the last turn, zoom or drag (auto-rotate-delay). As
      it starts turning again it glides back to the middle of the view at
      its starting zoom; the angle it was left at stays. "Drag to turn"
      shows until somebody does.
    - Alt + middle mouse button, dragged: moves the model across the view
      (the cursor becomes a move cursor). <model-viewer>'s own panning
      stays off (disable-pan), so right-drag and Ctrl/Shift-drag don't pan.
    - With the mouse over a model, the wheel zooms it in, or out to 2.5
      times the distance it starts at (a pinch on a phone); elsewhere it
      scrolls the page as usual. A round reset button (circular arrow) in
      the top left of each view puts the zoom back where it started and
      keeps the angle. `zoom: false` on an item turns zoom off, and the
      reset button with it. A vertical swipe on a phone still scrolls.
    - A model with animations in it plays one on a loop: the item's
      `play`, else one called Idle, else the first in the file.
    - Animation showcase: an item with `animation:` in place of `model:`.
      Every animation in the file is a pill button under the viewport
      (or only the item's `animations` list, in that order), labelled from its name
      (JumpHorStatic reads "Jump Hor Static"). Pressing one plays it from
      the start, on a loop, and lights that pill koi. The names are read
      from the file when the site is built, and the build stops on a
      `play` or `animations` name the file doesn't have.
    - A model is fetched once its panel comes on screen, not with the page.
    - A missing model leaves an empty water panel, and the build lists it.

References:
    Optional `links:` on any project: a list of { label, url } (or just a url,
    then the badge shows the site's name, e.g. ubisoft.com). Shown in one
    wrapping row under the Description / Overview as orange badges like the
    tags, lettered in white, each with the site's icon in a small white bubble
    on the left. Opens in a new tab. The icon is the site's favicon (fetched
    from Google's favicon service when the page loads), or a file in media/ if
    the link names `icon:`; if neither loads, the bubble shows the site's first
    letter. A link with `rating: a/b` (e.g. 8/10) is a rating badge: the same
    badge with the score in a white bubble on the right.
    The build checks that every url starts with https:// (or http://,
    mailto:), and that every rating reads a/b.

Experience and skills:
    Panel with a heading and two columns:
    - Left: "What I work with" — skill groups. Short names as boxed chips
      (Languages, Engines & tools), phrases as a plain list (What I build).
    - Right: "Where I've worked" — roles: studio, role, one line of text.
    No subtitle text under the heading.

Contact:
    Panel with heading and a short note. Links to email, GitHub and LinkedIn,
    each with a monochrome line icon in the page style in front of it (envelope,
    code brackets, profile card — not company logos). The icon is a link too;
    the label exists only for screen readers.
    Colophon at the bottom: © year, name, "Built by hand, fish included."

Top bar:
    Sticky, fixed to the top, appears only once the title section has scrolled
    away (hidden while locked or while a detail page is open), leaving room on
    the right for the sound toggle. Frosted, spans
    the full width of the panel column: name on the left, the three nav links on
    the right separated by hairlines.

Sound:
    Everything synthesised in the browser, no audio files: knuckle tap on glass,
    crack, shatter, and a realistic water splash (a ringing bubble that rises in
    pitch as it dies, smaller bubbles after it, a bright hit at the front, a thin
    wash of droplets). The Sound button (a speaker icon: waves when on, a
    cross when off) is always visible, fixed in the top right corner over
    everything (detail pages included), just left of the Settings gear; the
    top bar leaves room for both. Volumes in aquarium.yaml. Starts as
    sound.enabled in aquarium.yaml; a
    viewer's own click is remembered in their browser (localStorage
    "portfolio.sound") and wins over the yaml from then on.

Settings:
    A gear button (icon only, in the line style of the contact marks) in the
    top right corner, over everything, with Sound on its left. It opens a
    small frosted panel under the buttons; a second click, a click elsewhere
    or Escape closes it. Always there, before and after the break.
    - Scroll lock (switch): on, the hero dive keeps the page to the group;
      off, a scroll takes the page back once he is past the Quote (see Hero
      panels). Starts as the opposite of fish.escort_free_scroll (true, so
      unlocked).
    - Dive speed (slider, fish.escort_speed_min..max, 400-2400px/s, shown as
      a % of fish.escort_speed): the pace of the hero dive. Disabled while
      the scroll is unlocked. A change during a dive takes effect at once.
    Both are remembered in the viewer's browser (localStorage
    "portfolio.freeScroll" and "portfolio.diveSpeed") and win over the yaml
    from then on.

Accessibility and responsiveness:
    - The bowl is a real button (keyboard tappable); skip link at the top.
    - prefers-reduced-motion: water, shoal and plants slow to 30% of their pace,
      videos get native controls instead of hover play, photo slideshows hold
      their first picture, and a hovered professional thumbnail doesn't play
      its cover. Clicks still move him.
    - Narrower screens: below 56rem the title stacks (name, bowl, quote,
      showcase); on phones the nav cells stack; galleries, detail pages and the
      experience columns collapse to one column.

Content still missing: the real email address and LinkedIn URL (site.yaml
still has hello@example.com and linkedin.com/in/your-profile), role dates in
experience.yaml, and one picture (hobby/infernal-dante/movement, which the
build lists). The Ubisoft role reads Gameplay programmer in experience.yaml
but UI programmer in professional.yaml. Everything else is in: real game
titles, the hobby projects' text, every professional project's cover clip,
and Ubisoft Belgrade's contribution clips (montages of gameplay footage, no
YouTube player overlay in them).

Publishing:
The site is live at https://fishismynick.github.io/ and is served from the
main branch of github.com/FishIsMyNick/FishIsMyNick.github.io. To update it,
run `python build.py`, then `git add -A`, `git commit -m "..."` and
`git push`. Pages redeploys within a minute or two. Every file has to stay
under 100 MB (a GitHub limit) and the whole site under 1 GB.
