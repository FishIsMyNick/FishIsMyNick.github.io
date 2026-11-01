# Modifications (v3.4, 2026-10-18, 11-14 on 2026-10-19, 23-40 on 2026-10-20, 41-53 on 2026-10-21, 54-55 on 2026-10-22, 56-67 on 2026-10-29, 68-70 on 2026-10-30, 96-99 on 2026-11-01)

Changes made on top of v3.4. Every edit is in src/; the generated index.html,
styles.css and script.js were rebuilt with `python build.py` after each one.
Guide.md is updated to match.


1. Sky colour follows the break
    File: src/assets/js/07-water.js (new skyColor(t), used by drawWater)
    - On page load the sky above the waterline is depth.shallow_color
      (#06455a), the colour the water starts at, so the Bowl sits in one
      unbroken tank.
    - When the Bowl breaks the sky blends to depth.sky_color (#0d7fa4).
    - Timing: it starts at the break (state.breakTime) and finishes after
      fish.leap_rise (1.0s), the moment the fish reaches the peak of his leap.
      It uses the same ease-out curve as his rise, 1 - (1 - u)², so the two
      move together.
    - Applies to every way the glass breaks: the third tap, a hero panel
      click (the hero dive), the skip link and Aquarium.break_(). All of them
      go through smash() in 10-bowl.js, which sets state.breakTime.
    - Aquarium.reset() puts the sky back to the water colour.
    - Both colours are still set in src/content/aquarium.yaml (depth.*).

2. Blur feather 3rem
    File: src/assets/css/01-tokens.css   --feather: 2rem → 3rem
    - Every borderless blur pane (Quote, Overview, nav bar, bowl note, hero
      labels) now fades out over its last 3rem.
    - The panes are padded and pulled out by the same token, so the text
      stays where it was and is never faded; each pane is 1rem bigger on
      every side.

3. No shadow while in the air
    File: src/assets/js/09-fish.js (the draw function)
    - The fish's shadow (fish.shadow, 0.12) is skipped while he is airborne:
      fish.mode 'leap' (out of the broken Bowl, until he lands) and 'jump'
      (his jumps out of the pond, until he drops back in).
    - The leap is the same in the Bowl sequence and the hero dive
      (smash() → fish.release()), so both are covered.
    - It comes straight back when he is in the water, with no fade.

4. No jumping while following the cursor
    File: src/assets/js/09-fish.js
    - New following(t): fish.follow is on, the cursor is in the window, and
      it moved within fish.idle_after (2.5s).
    - His own jumps (fish.jump_every) are skipped while following(t) is
      true. They start again once the cursor rests or leaves the window.
    - A click above the waterline still makes him jump, because that's a
      deliberate request.
    - Bowl and hero sequences: he can't jump during either one anyway
      (canJump() refuses while he is diving and until the water is in).
      The rule applies once he is free, after either sequence.
    - The cursor-follow step in swim() uses the same following(t) check, so
      the two can't disagree. Two unused locals (follow, idleAfter) were
      removed from swim().


5. Text marks work in every .yaml field
    Files: build.py, src/templates/**
    - Before: *orange*, **bigger** and \n only worked in the two fields
      a template passed through `| emphasis` / `| prose` (the pitch and the
      intro). Everywhere else, e.g. a professional project's description,
      they showed up as raw asterisks and a literal \n.
    - Now: every {{ … }} output goes through a new marks() function
      (Jinja `finalize`). A value ending in a newline is a YAML block and is
      treated as a paragraph (`prose`). Anything else keeps its line breaks
      (`emphasis`). Output that is already markup (macros, explicit
      filters) is left alone.
    - `emphasis` now also turns a typed \n into a break.
    - New `| plain` filter strips the marks, for places where markup can't
      go. Used on the <title>, the meta description, the bowl's aria-label,
      the hero links' aria-labels, the studio logo alt and the contact
      marks' aria-labels.
    - Removed `| trim` from the content text fields (overview paragraphs,
      technologies, description, summary, feature text, list items, role
      text). It stripped the newline that marks a block; marks() trims
      anyway.
    - Checked the built page: no markup inside attributes, no stray
      asterisks, and the only line breaks are the two typed \n.


6. Free scroll: scrolling can end the hero dive
    Files: src/assets/js/10-bowl.js (leadRise, toggle wiring),
           src/assets/js/07-water.js (shiftSurface), src/templates/base.html,
           src/assets/css/06-title.css, 04-topbar.css, 11-responsive.css
           (comment only), src/content/aquarium.yaml
    - In the hero dive, once the Quote's bottom edge is above the fish, a
      wheel or touchmove event ends the dive. The page unlocks (reveal()),
      is-escorting is removed, the sky above the Pond is cut away
      (trimTop), and he is let go and levels out (state.heading = false).
      The escort's scroll loop and arrive() stop.
    - Before he has passed the Quote, scrolling is ignored as before.
    - Toggle: a "Free scroll on/off" pill in the top left (#scroll-toggle,
      the Sound pill's styles plus .scroll-toggle for the left position).
      Default fish.escort_free_scroll: true. The viewer's choice is saved in
      localStorage ("portfolio.freeScroll"), guarded with try/catch, so it
      still works without storage.
    - The top bar has left padding to keep clear of the pill (10.5rem
      formula, mirroring the 8.5rem one for Sound).
    - shiftSurface() now also moves a climb in progress. Cutting the sky
      while the water is still rising no longer makes the waterline jump.


7. Sound on/off is remembered
    File: src/assets/js/05-sound.js
    - The Sound pill used to reset to on with every reload. The viewer's
      choice is now saved in localStorage ("portfolio.sound") and restored
      on load, the same way as Free scroll. It wins over sound.enabled in
      aquarium.yaml once a viewer has clicked it.
    - Guarded with try/catch: without storage (a private window, blocked
      site data) the yaml setting is used.


8. Bulleted lists are justified
    File: src/assets/css/02-reset.css
    - .lines li joins the description rule: justified, last line left,
      hyphenated. This covers What I build, What I'm working on and the
      Contribution lists. The bullet and the hanging indent are unchanged.
    - The size is unchanged: the list items don't take the +3px the
      descriptions get.


9. Contributions and features don't alternate on phones
    File: src/assets/css/11-responsive.css (the 56rem block)
    - The stacked layout was meant to put the picture first in every block,
      but its reset (`… > *`) was less specific than the alternating rule in
      10-detail.css (`… > .media`, `… > :not(.media)`). So on phones the
      even blocks still placed the picture in column 2, next to the text.
    - The reset now uses the same selectors, so it wins. Below 56rem every
      contribution and feature row is picture first, then text, in one
      column.


10. Free scroll pill disappears when the Bowl breaks
    Files: src/assets/css/06-title.css, src/assets/css/04-topbar.css,
           src/templates/base.html (comment)
    - body.is-breaking .scroll-toggle: opacity 0 and visibility hidden, faded
      over 0.6s, the same as the name at the top. Hidden, it also leaves the
      tab order. It comes back with Aquarium.reset(), which removes
      is-breaking.
    - The setting chosen before the break still applies to the hero dive.
    - Removed the top bar's left padding for the pill (from entry 6): the
      top bar only appears after the break, when the pill is gone.


11. Studio name on its own line
    Files: src/templates/details/professional.html, src/assets/css/10-detail.css
    - On a professional project's page the studio sits on the line under
      the game's name (.detail-studio is display: block), at .45em of the
      title, silt, lighter weight.


12. Settings and Sound buttons, icons only
    Files: src/templates/base.html, src/templates/partials/icons.html,
           src/assets/css/06-title.css, 04-topbar.css,
           src/assets/js/05-sound.js, src/assets/js/11-settings.js (new),
           src/assets/js/07-water.js
    - Top right corner: a Settings gear, with Sound to its left. Round
      frosted buttons (the old pills' glass), no text. The names are in
      aria-label and the tooltip.
    - Two new icons in icons.html, in the contact marks' style (one weight,
      round caps, currentColor): 'settings' (a gear) and 'sound' (a speaker
      with waves, or a cross when off, switched by aria-pressed in CSS).
    - The gear opens a small panel (#settings); it closes on a second
      click, a click elsewhere or Escape (Escape closes it before a detail
      page). The gear turns 45° while it is open.
    - The water ignores clicks in the panel, so the fish doesn't come over.
    - The top bar's room for the corner is 7.5rem (was 8.5rem for the pill).


13. Faster hero dive, with a Dive speed slider
    Files: src/content/aquarium.yaml, src/assets/js/10-bowl.js
    - fish.escort_speed 650 → 1200px/s, fish.escort_brake 900 → 1600.
    - The brake is scaled with the speed, so the stop at the group takes the
      same time at any speed.
    - Dive speed slider in Settings, from fish.escort_speed_min (400) to
      fish.escort_speed_max (2400), step 50, shown as a % of the default.
      Read live, so moving it mid-dive changes the dive. Remembered in
      localStorage ("portfolio.diveSpeed").
    - The fallback dive (goTo, when the water came up without the hero
      dive) uses it too.


14. Scroll lock moved into Settings
    Files: src/templates/base.html, src/assets/js/10-bowl.js,
           src/assets/css/06-title.css
    - The Free scroll pill in the top left is gone. It is now the Scroll
      lock switch in Settings: on = the dive keeps the page (free scroll
      off). Same storage key ("portfolio.freeScroll") and yaml setting, so
      choices viewers already made carry over.
    - The Dive speed slider is disabled (and dimmed) while the scroll is
      unlocked.
    - Unlike the pill, it doesn't disappear at the break: the panel is
      always there.


15. Technologies on professional project pages
    Files: src/templates/details/professional.html,
           src/assets/css/10-detail.css, src/content/professional.yaml (header)
    - A project's `technologies` list shows as a Technologies section of
      orange badges, the same as on hobby pages, between the description
      and Contribution.
    - Only shown when the project has the list (Ubisoft Belgrade does; the
      others don't yet).
    - Spaced like the sections around it (.detail--brief .detail-tech).


16. Hobby `gallery` renamed to `features`; a new Gallery of 3D models
    Files: src/content/hobby.yaml, build.py,
           src/templates/details/hobby.html, professional.html,
           src/templates/partials/macros.html (model_gallery),
           src/templates/sections/details.html,
           src/assets/css/10-detail.css, 11-responsive.css,
           src/assets/js/12-models.js (new)
    - The picture + text rows (the "Features" section) are now the yaml key
      `features`; .detail-gallery is .detail-features.
    - `gallery:` is now a list of 3D models, shown as a Gallery section at
      the bottom of hobby and professional pages: { model, title, text,
      poster, zoom }. `model` finds .glb or .gltf in media/.
    - Viewer: <model-viewer> 3.5.0 from jsDelivr, a module script added only
      when a project has models. camera-controls (drag to turn), slow
      auto-rotate, no pan, no wheel zoom unless `zoom: true`,
      touch-action pan-y so phones still scroll.
    - 12-models.js sets each model's src when its panel comes on screen.
      <model-viewer>'s own loading="lazy" never fired for models on detail
      pages, which start hidden. It also hides the "Drag to turn" hint
      after the first drag.
    - build.py: checks each gallery item has `model`, and lists missing
      models (and posters) after the build, like missing pictures.
    - Tested with a sample .glb served over http (removed afterwards).


17. The wheel zooms a gallery model
    File: src/templates/partials/macros.html (model_gallery)
    - With the mouse over a model, the wheel now zooms it (a pinch on a
      phone) instead of scrolling the page. Off the model it scrolls as
      before. `zoom: false` on an item turns it off; it was opt-in
      (`zoom: true`) in entry 16.


18. Gallery: two big columns, and it holds still while turned
    Files: src/assets/css/10-detail.css, 11-responsive.css,
           src/templates/partials/macros.html, src/assets/js/12-models.js
    - The models are a grid of two columns across the full width (was as
      many 22rem columns as fit, three on a wide screen), so each one is
      much bigger. One column below 56rem.
    - Auto-rotate stops the moment a model is pressed and stays off while
      it is dragged; it resumes 2.5s after it is let go
      (auto-rotate-delay, was 0, which let it turn under the cursor).


19. Gallery: animated models, and the animation showcase
    Files: build.py, src/templates/partials/macros.html,
           src/assets/js/12-models.js, src/assets/css/10-detail.css,
           src/content/hobby.yaml
    - Any gallery model with animations plays one on a loop (autoplay):
      `play: <name>`, else Idle, else the first. Still models are unchanged.
    - New item `animation: <model>` (in place of `model:`): the animations
      in the file as pill buttons under the viewport; pressing one plays
      it from the start and marks it (aria-pressed). `clips: [...]` picks
      and orders them.
    - build.py reads the animation names out of the .glb/.gltf at build
      time (model_animations), makes the labels (clip_label) and checks
      `play` / `clips` against the file.
    - Infernal Dante's second gallery item (dante-idle, 14 animations) is
      now an `animation:` item. Tested in Chrome: loads, starts on Idle,
      a press on Walk plays Walk.


20. Choosing the animations by name
    Files: build.py, src/templates/partials/macros.html, src/content/hobby.yaml
    - An animation item's list of buttons is now `animations:` (a list of
      names, shown in that order). `clips:` from entry 19 still works.
    - Infernal Dante's showcase lists all 14 by name, to be trimmed.


21. Gallery: zoom out, and a reset button
    Files: src/templates/partials/macros.html, icons.html,
           src/assets/js/12-models.js, src/assets/css/10-detail.css
    - Every view (model and animation) can now zoom out as well as in:
      max-camera-orbit radius 250% and max-field-of-view 45deg (the camera
      starts at the framed distance and 30deg, which was also the limit).
    - A round reset button in the top left of each view, with a new
      'reset' icon (a circular arrow, in the line style of the others):
      the radius and field of view go back to auto, the angle stays.
      Not shown on an item with `zoom: false`.
    - Tested in Chrome on both Dante views: zoomed out to 2.5x, turned,
      reset to the start zoom at the turned angle.

22. A clip alone fills a preview panel
    Files: build.py, src/templates/partials/macros.html,
           src/assets/js/03-media.js
    - Before, a panel was only filled when its picture (.jpg etc.) was
      there; an .mp4 with no picture showed empty water. Now either file is
      enough. A clip with no picture loads its metadata and shows its first
      frame (#t=0.1) until it plays.
    - The build looks up both files (`still` and `clip` filters), writes a
      poster only when the picture exists and a <source> only when the clip
      does, and the "Still waiting on" list only names panels with neither.


23. Hero panels wait for the top of the leap
    Files: src/assets/js/09-fish.js (fly), src/assets/js/10-bowl.js
           (smash, apex, Aquarium.onApex, reset), src/assets/css/06-title.css
    - Before: the moment the glass broke the hero panels faded out (0.6s).
    - Now: at the break they only stop taking clicks (pointer-events: none,
      and `inert` on .showcase so the keyboard can't reach them either).
      They stay fully visible.
    - When the fish reaches the peak of his leap (fish.leap_rise after the
      break), fly() calls Aquarium.onApex once, which adds body.is-apex.
      The panels then move up 40svh (1s, easing in) and fade (0.9s).
    - Applies to every way the glass breaks (third tap, hero panel, skip
      link, Aquarium.break_()).
    - Safety nets: without a fish module is-apex is set at the break; if
      the fish never leaps (sprites failed to load) a timer sets it
      leap_rise + 0.5s after the break. Aquarium.reset() removes is-apex
      and the inert.


24. Gallery: Alt + middle-drag pans, and it recentres when it resumes
    Files: src/assets/js/12-models.js, src/assets/css/10-detail.css
    - Alt + middle mouse button dragged over a model moves it across the
      view. The press is caught in the capture phase on <model-viewer>,
      before it can start a turn; the camera target is moved along the
      screen's right and up vectors (from the orbit's theta/phi), scaled so
      the model follows the pointer at its distance. The browser's
      middle-click autoscroll is prevented. disable-pan stays, so the
      viewer's own pan gestures stay off. Move cursor while panning
      (.is-panning).
    - When auto-rotate resumes (auto-rotate-delay, 2.5s, after the last
      turn, zoom or pan; not while still pressed) the target goes back to
      auto and the radius and field of view to their start: centred, first
      zoom, same angle.
    - Not yet tested in a browser.


25. Proofreading the content
    Files: src/content/hobby.yaml, professional.yaml, site.yaml
    - Spelling: roguelite, Italian greyhound, narrative, adorable, whack,
      exaggerated, character, interrupt, seamlessly, towards, trajectory,
      separate, preferred, opacity, overwhelmingly, Collaboration.
    - Grammar: comma splices, tense, hyphenation (hitbox-based, hands-on,
      third-person, blazing-fast), "really well", "its potential",
      "shut down a while ago", and similar, across the feature texts.
    - Removed seven "# EDIT" markers that showed on the page (inside a `|`
      block a # is text, not a comment).
    - Llamaware description: two sentences had run together ("…the machine
      The development…").
    - Consistency: US spelling (behavior), co-op, no trailing full stops in
      goal lists, "Assassin's Creed – Black Flag Resynced" the same in title
      and description. Meta description now says Unreal Engine and Unity.
    - Left as is: the Ubisoft role (Gameplay programmer in experience.yaml,
      UI programmer in professional.yaml) and the tagline's hyphenation.


26. No text on the hero panels
    Files: src/templates/sections/title.html, src/assets/css/06-title.css,
           src/content/site.yaml (comment)
    - The AAA / Mobile / Indie label over each hero panel, and its blurred
      pane, are gone (.showcase-label removed from the template and CSS).
    - `label` in site.yaml stays: it is still required, and still the
      first part of each panel's aria-label, so screen readers announce it.
    - Hover and focus still turn the panel's border orange.


27. A media name ending in / is a folder of pictures
    Files: src/templates/partials/macros.html (video, new slideshow),
           src/templates/sections/title.html, src/assets/js/03-media.js,
           src/assets/css/06-title.css, 07-work.css, build.py,
           src/content/professional.yaml, hobby.yaml (header comments)
    - Any media field (thumbnail, cover, contribution or feature media)
      that ends in / shows every picture directly in that folder, in
      filename order, as a crossfading stack. Brave Giant's UI/UX and
      Collection contributions use it.
    - The hero panels' photo stack is now the same thing: one slideshow
      macro (<div class="slides"> of <img class="slide">), one CSS rule
      (moved from 06-title.css to 07-work.css, --hero-fade renamed
      --slide-fade) and one JS loop, timed by hero.fade / hero.hold.
      .hero-photos is gone.
    - Only the hero panels stop changing once the glass breaks; the others
      keep going.
    - Hover-play skips these panels (nothing to play). An empty folder is
      marked empty water. build.py's "Still waiting on" list checks a
      folder for pictures instead of looking for a file, and labels it.
    - Pictures only; an .mp4 in the folder is not used.


28. Black Flag Resynced contribution clips
    Files: media/professional/ubisoft-belgrade/contribution-gphud.mp4,
           contribution-menus.mp4, contribution-quests.mp4,
           contribution-tutorials.mp4, contribution-general.mp4 (new)
    - Montages cut from the screen recordings in
      Temp/OBS/Portfolio/ACBFR, one per contribution, 17-22s each,
      1280x720, 30 fps, H.264, no audio (the same shape as the Llamaware
      clips). Each sits beside its existing poster, so the page shows the
      poster and plays the clip when it comes on screen. No content or
      code change was needed.
    - HUD: quest tracker and compass, wallet +40, a coin pickup, the
      wallet ticking 306 to 338, item notifications, eagle vision with
      NPC markers, the note reader, Viewpoint Synchronized. Mostly slow
      push-ins onto the element.
    - Menus: general store opening, ammo and remedy with "Maximum
      capacity reached", the world map, inventory (pistols), outfits.
    - Quests: the Nassau opening title, the objective changing from
      Follow Stede Bonnet to Buy the British cutlasses, Rescue the Sage
      with its steps, Prison key obtained, and cutscene subtitles.
    - Tutorials: all five (Barrels, Heavy Strike and one landing,
      Incapacitated Ship, Lightning Strikes and a strike, Weather), each
      pushing in onto its panel.
    - General: both general clips (cutscene, sailing) with the
      synchronisation sweep, a ship battle and the Weather sailing shot.
    - No YouTube player overlay in any frame: every recording was scanned
      at 10 fps for the player's progress bar (a thin red line from the
      left edge, or its stub near the start of a video) and the "press
      Esc" banner, and no shot comes within 0.6s of one, or from a
      recording's first second.
    - Cuts are 0.4s dissolves (straight cuts around the map); crops and
      zooms are sub-pixel, eased, so the push-ins don't step.


29. The --serve server streams video
    File: build.py (new make_server, used by watch)
    - "ConnectionResetError: [Errno 104] Connection reset by peer"
      tracebacks filled the terminal once the contribution clips were in.
      Python's file server sends every file whole; a browser plays video
      by asking for byte ranges and dropping a download when it seeks,
      loops or scrolls away, and each drop was a traceback.
    - The handler now answers Range requests (206 with Content-Range,
      416 past the end, Accept-Ranges on every response), the way a real
      web host does, so the dev server behaves like the live site.
    - The server ignores ConnectionResetError and BrokenPipeError (the
      browser hanging up); any other error still prints.
    - Request logging is now really off: the old line set log_message on
      the functools.partial, not on the handler class, so it did nothing.
    - Tested on a spare port: whole file 200, bytes=0-99, 1000-, -500
      all 206 with the right lengths, past the end 416, three clients
      hanging up mid-file printed nothing.


30. Cover clips for the professional projects
    Files: media/professional/ubisoft-belgrade/cover.mp4,
           llamaware/cover.mp4, brave-giant/cover.mp4 (new)
    - One montage per project, 19-22s, 1280x720, 30 fps, no audio, beside
      the existing cover picture (now its poster). Hard cuts with a few
      0.3s dissolves; every shot held still, no zooms or pans.
    - Black Flag Resynced: 19 shots from the trailer (Temp/OBS/Portfolio/
      ACBFR/trailer.mp4), cut on the trailer's own cuts: Edward at the
      wheel, Havana, islands, the spyglass and a galleon, cannons and
      fire, Blackbeard, boarding, the jungle, a leap of faith, under the
      sea, a ship going up. One crop for the whole clip (1792x1008 of the
      1920x1080) takes out the "work-in-progress" disclaimer along the
      bottom; the PEGI 18 opening and the pre-order end card aren't used.
    - Apocalypse Express: the title screen, then the highway, the Crasher,
      the forest, the Crow, snow, the Mechapede, co-op in the desert, the
      green boss and a firefight, from its contribution clips.
    - Push Puzzle: two levels (with the game's leaf wipe), three stars,
      another level, the Rescue Adventure logo, from its gameplay clip.


31. Hovering a professional thumbnail plays the cover
    Files: src/templates/partials/macros.html (split_media),
           src/assets/js/03-media.js, src/assets/css/07-work.css
    - split_media adds a .media-cover layer over the whole thumbnail: the
      cover's clip (or picture, if there is no clip), with its address in
      data-src so nothing is downloaded with the page.
    - Hovering or focusing the row sets the src on the first time, plays
      it, and fades the layer up once it is playing (or the picture has
      loaded). Leaving fades it out and pauses it; the next hover resumes.
    - The row's own preview logic now ignores the cover's video (it looks
      for a video outside .media-cover).
    - Nothing under prefers-reduced-motion: the thumbnail stays.


32. A slower Black Flag Resynced cover
    File: media/professional/ubisoft-belgrade/cover.mp4 (replaced)
    - The cuts were too fast (19 shots, ~1.1s each, hard cuts). Now 16
      shots in 16.4s, each the trailer's own shot used nearly end to end,
      joined by 0.5s dissolves (one straight cut from the spyglass to the
      galleon in it, and one into Blackbeard). Same crop, still no zooms.
    - The duel at 34.5s is back in: the overlay scan's hit there was the
      fire behind it, not a YouTube bar.


33. The studio logo stays over the playing cover
    Files: src/assets/js/03-media.js, src/assets/css/07-work.css
    - While the cover plays on a thumbnail, the figure gets .is-covered:
      the studio corner (logo, or the studio's name) is raised above the
      cover and its dark triangle fades to transparent with the cover's
      fade, so only the mark sits on the video. It goes back when the
      cover fades out.


34. Orange inside a size-up
    File: build.py (emphasis, plain, new BIGGER pattern)
    - `**…**` only matched when there was no star inside it, so
      `**To Become the World's Greatest *Game Developing Fish!* **` came
      out with the pairs matched the wrong way round.
    - Now `**…**` may hold a `*…*`: its closing pair is the first `**` not
      followed by another star, so `***` at the end closes the orange and
      then the size-up. `plain` strips them the same way.
    - Checked against every existing use (the quote, Small *Fish*, the
      pitch lines): unchanged.


35. The playing cover feathers into the corner, the logo moves into it
    File: src/assets/css/07-work.css
    - --split-overlap is registered with @property (a number), so it can
      be transitioned. While the cover plays (.is-covered) it goes from
      .35 to .7 over 0.6s: the cover, masked with the same --split-fade
      as the game picture, now fades into the studio corner and that
      fade widens to 70% of the corner's half.
    - The studio's dark triangle moved from .media-studio itself onto a
      ::before, because a clip-path makes its own stacking layer and kept
      the logo stuck under the cover. Now: triangle at the bottom, game
      (z 1), cover (z 2), logo or studio name (z 3).
    - The thumbnail picture fades out (0.35s) while covered; otherwise it
      ghosted through where the cover feathers out.
    - The logo slides from the middle of the triangle (right 7%, bottom
      9%, 46% x 42%) to the corner (right 2.5%, bottom 3.5%, 34% x 30%,
      drawn bottom-right in its box); a studio name aligns right.
    - Replaces entry 33's raised, transparent corner. Checked rendered in
      headless Chrome, at rest and covered.


36. Black Flag Resynced cover, from both trailers, far fewer cuts
    File: media/professional/ubisoft-belgrade/cover.mp4 (replaced again)
    - Entry 32's version was still busy: its shots were short and the
      trailer's own cuts sat close to them. Now 8 shots in 16.9s (about
      2.6s each), from trailer.mp4 and the new trailler2.mp4, joined by
      0.6s dissolves: the ghost ship in the storm, Edward at the wheel,
      the black flag at sunset, Edward and the setting sun, Havana's bell
      tower, under the sea, Edward and Blackbeard, the fleet burning.
    - Every shot lies inside one uninterrupted shot of its trailer. The
      cuts were found frame by frame (a jump in difference against the
      frames around it, which also catches soft cuts in the dark storm
      scenes), and the storm's lightning flashes were checked by eye so
      they weren't mistaken for cuts.
    - Nothing downloaded-looking in it: trailer 2's PEGI 18 badge (to
      5.5s) and end card (from 85.1s) aren't used; its song credit
      ("Leave Her Johnny", lower left from 22.6s) is cropped out of the
      flag shot (top-left 1476x830, still); trailer 1's "work-in-progress"
      line is cropped as before (1792x1008); no YouTube overlay in either.


Guide.md
    - (55) Contact: the colophon reads "a.k.a. Fish."
    - (51) Sound: off by default, the button drawn off from the start.
      (52) Settings, Scroll lock: the note's new wording.
      (54) Contact: the colophon reads "aka Fish."; Content still missing:
      the contact links and the Ubisoft role are done.
    - (23) Hero panels and Opening sequence step 3: the panels wait for the
      peak of the leap, then rise and fade. (24) Gallery: Alt + middle-drag
      pans, recentres and unzooms when it resumes turning; "Panning is off"
      removed. JS file list: 11-settings and 12-models added.
      (26) Hero panels: no label text; Title: the hero labels dropped from
      the blur-pane list.
      (27) Project architecture, Pictures: a name ending in / is a folder.
      (28) Content still missing: Ubisoft Belgrade's contribution clips
      are in. (29) Project architecture, Build: the server answers Range
      requests. (30, 31) My Work, Professional Projects: hovering a row
      plays the cover; every professional project has a cover clip.
      (32, 33) The same: the slower Black Flag cover, the logo stays on top.
      (34) Content conventions: the marks nest.
      (35) Professional Projects: the cover feathers in, the logo moves.
      (36) The same: the Black Flag cover's description.
    - (2026-10-20, a check of the whole guide against the site as it now
      is) Title diagram: the hero panels carry no labels. File tree: the
      full list of macros and icons, and what 03-media does now. Detail
      pages: the cover clip plays beside the title. Accessibility:
      slideshows and thumbnail covers under reduced motion. Content still
      missing: brought up to date (only the email, LinkedIn, role dates
      and one picture are left; the Ubisoft role differs between
      experience.yaml and professional.yaml).
    - (11-14) Detail pages: the studio line. Sound: the icon button. New
      Settings section replaces Free scroll. Hero panels: Dive speed,
      Scroll lock. (15) Professional project page: Technologies.
      (16) Hobby page: Features key; new Gallery section.
      (17) Gallery: the wheel zooms. (18) Gallery: two columns, still
      while turned. (19) Gallery: animations, animation showcase.
      (20) `animations:` picks them. (21) Zoom out, reset button.
      (22) Pictures: an .mp4 alone fills a panel.
    - Look and feel: the new sky behaviour.
    - Title: the feather is 3rem.
    - Free scroll: only before the break.
    - Detail pages: no alternating below 56rem.
    - Description text: list items are justified too.
    - Sound: remembers the viewer's choice.
    - Hero panels: Free scroll; new Free scroll section; Sound mentions its
      twin.
    - Project architecture, content conventions: the marks work in every
      field, blocks vs lines, `| plain` for attributes, no `| trim`.
    - Opening sequence, step 3: the sky clears as the fish leaps.
    - The Fish: the jump rule and the shadow rule.
    - Removed the "Remaining To Do list". Each item was already in the
      project:
        - the water rises continuously to its final position
        - Title elements are blur only, with no background or border
        - the Overview fades in once the water is up
        - the nav is a single bar with fading separators
        - the Quote
        - "What I work with" is on the left

37. Published to GitHub Pages
    Files: .gitignore, .nojekyll (new)
    - The folder is a git repo pushed to
      https://github.com/FishIsMyNick/FishIsMyNick.github.io (public, branch
      main). GitHub Pages serves it from the repo root at
      https://fishismynick.github.io/
    - .gitignore leaves out __pycache__/, _vidtest.html and TODO.md.
    - .nojekyll tells Pages to serve the files as they are, with no Jekyll
      build.

38. Bowl: level rim, clear air above the water
    Files: src/assets/js/10-bowl.js, src/content/aquarium.yaml, README.md
    - The glass sheen (and its shine and crescent) is clipped to below the
      waterline (drawGlass), so the air in the bowl is fully transparent.
    - The top of the bowl is one level line: the tops of the lip and the
      whole rim sit at the same height, with no dip. The rim points are marked
      `flat` in outline(), and curveThrough() keeps the curve level as it
      leaves and arrives at them, so the lip rounds into the rim with no bump.
    - bowl.rim_bow is gone from aquarium.yaml (it was what made the rim dip).

39. Page icon is the fish facing left
    Files: favicon.png, apple-touch-icon.png (new, site root),
           src/templates/base.html
    - favicon.png: src/assets/img/fish-left.png trimmed, scaled and centred on
      a 256×256 transparent square, so the browser doesn't squash it.
    - apple-touch-icon.png: the same on a 180×180 #06455a square
      (depth.shallow_color), since home-screen icons can't be transparent.
    - base.html links both. They are not made by build.py: if fish-left.png
      changes, make them again.

40. Game Mode button and the sweep
    Files: src/templates/sections/pond.html, src/templates/sections/game.html
           (new), src/templates/base.html, src/templates/partials/icons.html,
           src/assets/css/11-game.css (new), src/assets/css/04-topbar.css,
           src/assets/css/11-responsive.css → 12-responsive.css,
           src/assets/js/13-game.js (new), src/content/site.yaml,
           src/content/aquarium.yaml, README.md
    - A round button with a joystick icon (new `joystick` icon in
      icons.html) sits centred just below the Overview, with "Game Mode"
      under it as part of the button. It fades in with the Overview
      (pond-final). Hover turns it orange; the fish circles it
      (.game-toggle added to fish.circle_targets).
    - It opens Game Mode, a separate view laid over the water like a detail
      page (main and the top bar hidden, no scroll). For now the view says
      "Under construction", with a line of text and a "Back to the
      portfolio" button; Escape also goes back.
    - The switch is a band of deep water with lit leaning edges sweeping
      across the whole screen (left → right in, right → left out); the
      views swap while it covers the screen. New aquarium.yaml block
      `game:` — sweep_time 1.1s, sweep_angle 10°. Reduced motion: an
      instant swap.
    - New site.yaml block `game:` holds the label, heading, note and back
      text.
    - 11-responsive.css is now 12-responsive.css, so it stays last after
      the new 11-game.css.

41. Hero panels: the clicked one stands out
    Files: src/assets/js/10-bowl.js (pick, unpick), src/assets/css/06-title.css,
           src/content/aquarium.yaml
    - The moment a hero panel is clicked, it grows slightly and keeps its
      orange border, and the other two fade back a little, before the break
      sequence carries on as before (they still rise and fade out at the
      top of his leap).
    - New in aquarium.yaml hero: picked_scale 1.06, picked_fade 0.45 (how
      visible the other two stay), picked_time 0.35s.
    - Aquarium.reset() puts them back.

42. Shaders in Unity: feature videos
    Files: media/hobby/shaders-unity/contributions/material.mp4, sine.mp4,
           sine-2d.mp4, surface.mp4, sphere.mp4, torous.mp4,
           media/hobby/shaders-unity/thumbnail.jpg (new)
    - Made from the screen recordings in Temp/OBS/Portfolio/Shaders (old
      Bandicam captures played full screen on YouTube). From each
      recording only the last play of the clip is used, starting 0.5s in
      so YouTube's play flash is gone, and ending just before its end
      screen.
    - Each one is cropped to the Unity game view: under the Bandicam
      watermark, left of the inspector, clear of the YouTube controls.
      Wide views are cut to 16:9, tall ones are padded to 16:9 with the
      editor's flat grey (#3d3d3d), so no shape is cut off.
    - Where the YouTube controls were showing, their dark gradient over
      the bottom of the picture is taken back out, frame by frame, measured
      from the empty grey down the sides of the game view. The full-height
      recordings (material, sphere 3, torus) use only stretches where the
      controls were hidden.
    - The cleaned single clips (1280x720, 30 fps) are kept in
      Temp/OBS/Portfolio/Shaders/trimmed for checking; each feature video
      joins its clips with 0.4s crossfades: material (6.8s), sine (6.4s),
      sine-2d (2 clips, 10.3s), surface (surface 1-2, complex-surface 1-2,
      overlapping-sine 1-2, 29.1s), sphere (3 clips, 15.3s), torous
      (3 clips, 14.2s). No audio.
    - thumbnail.jpg is a stand-in: a frame of the first torus clip.


43. Shaders in Unity: sine-2d, sphere and torus re-recorded
    Files: media/hobby/shaders-unity/contributions/sine-2d.mp4, sphere.mp4,
           torous.mp4
    - Remade from the new, already trimmed recordings in
      Temp/OBS/Portfolio/Shaders/final-cut, which run smoother than the old
      captures. Each keeps its source frame rate: sine-2d 60 fps, sphere and
      torous 25 fps (all 1280x720, no audio).
    - Each recording switches layout once, so it is split into two clips at
      that cut and the two are joined with a 0.4s crossfade:
        sine-2d   Wave (0.1-6.2s) → Multi Wave (6.25s-end), 11.2s
        sphere    editor view (0-11.24s) → full game view, 16.9s
        torous    small window (0-5.88s) → full game view, 22.1s
    - Crops, all clear of the Bandicam watermark; no YouTube controls show
      in these takes (sine-2d's first 0.1s, which had the progress bar
      under the picture, is dropped):
        editor view: the game view left of the inspector, from just under
          the watermark. Sine-2d fills it, so it is padded to 16:9 with the
          editor grey (#3d3d3d); sphere's shapes sit in the middle, so it
          is cut to 16:9 instead.
        torous small window: cut to 16:9 across the full window width.
        full game view: sphere cut to 16:9, torous (which fills the whole
          height) padded to 16:9.
    - The single clips are kept in Temp/OBS/Portfolio/Shaders/final-cut/
      trimmed for checking (the old ones in Shaders/trimmed are untouched).


44. Shaders in Unity: sine and surface re-recorded
    Files: media/hobby/shaders-unity/contributions/sine.mp4, surface.mp4
    - Remade from the new, already trimmed recordings in
      Temp/OBS/Portfolio/Shaders/final-cut (1920x1080). Each keeps its
      source frame rate: sine 25 fps (6.9s), surface 60 fps (40.4s); both
      1280x720, no audio.
    - Crops, all under the Bandicam watermark and its shadow:
        sine: the game view left of the inspector, cut to 16:9 around the
          wave (it sits in the middle, so nothing is lost).
        surface: the recording switches from the editor view to a bigger
          zoomed-in view at 11.48s, so it is split into two clips there and
          joined with a 0.4s crossfade. The editor view is cut to 16:9 like
          sine; the zoomed view fills the height, so it is padded to 16:9
          with the editor grey (#3d3d3d). The tip of the point column that
          rises above the plane is clipped by the watermark crop.
    - Where the YouTube controls showed (surface 5.7-8.3s and around the
      cut, then 0-3s and 5.5-8.5s into the zoomed view), their dark
      gradient over the bottom of the picture is taken back out frame by
      frame, measured from the empty grey at the left edge of the game
      view. Sine has no overlay.
    - The single clips (sine, surface-1, surface-2) are kept in
      Temp/OBS/Portfolio/Shaders/final-cut/trimmed for checking.


45. Shaders in Unity: text proofread
    Files: src/content/hobby.yaml
    - Grammar and typos in the overview and feature texts ("praph" → graph,
      "who know's" → who knows, "Torous" → Torus, "In the end I ended up
      writing" → In the end I wrote, the Surfaces and More 3D sentences
      reworded), "Go to 3D" retitled "Going 3D".
    - Spelling kept American ("favourite" → favorite, "Ok" → Okay,
      "heat-map" → heat map).


46. Shaders in Unity: sine joined with a second take
    Files: media/hobby/shaders-unity/contributions/sine.mp4
    - Temp/OBS/Portfolio/Shaders/final-cut/sine-additional.mp4 (1920x1080,
      25 fps, 7.5s; the plain sine wave) is cropped like sine in 44: the
      game view left of the inspector, from under the Bandicam watermark
      and its shadow, cut to 16:9 (1136x639 at 3,222) around the wave,
      scaled to 1280x720. No overlay.
    - The feature video now plays that clip first, then the original sine
      clip from 44 (sine, Multi Wave, ripple), joined with a 0.4s
      crossfade: 14.0s, 25 fps, 1280x720, no audio.
    - Both single clips are kept in final-cut/trimmed (sine.mp4,
      sine-additional.mp4) for checking.


47. Shaders in Unity: summary, tags and overview
    Files: src/content/hobby.yaml
    - Summary "shaders and graphs" → "shaders and shapes"; HLSL added to
      the tags; the overview's first sentence now says the shaders were
      written in HLSL.


48. Skills and Infernal Dante text
    Files: src/content/experience.yaml, src/content/hobby.yaml
    - Skills: Languages are now C#, C++, Python, HLSL (Blueprint dropped).
      Engines & tools: Unity Engine, Unreal Engine 4/5, Anvil Engine
      (proprietary Ubisoft engine), Visual Studio added in place of
      "Unreal Engine" and "In-house AAA engine". Gameplay list: UI/UX
      solutions, Architecture and game design added; "notify-driven hit
      detection" → event-driven.
    - Infernal Dante: tag Unreal Engine 5 → 5.5.4; the Blueprint sentence
      shortened (comma after C++ removed); "Most importantly I'm trying to have fun with it." added
      to the overview and "Have fun with it!" to the goals.


49. Experience: roles
    Files: src/content/experience.yaml
    - Ubisoft Belgrade: Gameplay programmer → UI programmer (matches its
      project page).
    - Llamaware now comes before Brave Giant. New lines: Llamaware
      "Ambitious indie production with a small team.", Brave Giant
      "Fast-paced mobile development of multiple projects with one
      publication, mentoring."


50. Experience: Llamaware line
    Files: src/content/experience.yaml
    - "Push to early access and release." added after "Ambitious indie
      production with a small team."


51. Sound off by default
    Files: src/content/aquarium.yaml, src/templates/base.html, Guide.md
    - sound.enabled is now false, so the page starts silent until the
      Sound button is clicked (the click creates the audio and plays the
      tap as before).
    - The button's aria-pressed and tooltip are written from
      sound.enabled at build time, so it shows the cross from the first
      frame instead of flipping when the script runs.
    - A viewer who already clicked the button keeps their saved choice
      (localStorage "portfolio.sound").


52. Settings: scroll lock note
    Files: src/templates/base.html, Guide.md
    - "The hero dive keeps the page to the end" → "The dive keeps
      scrolling the page to the end".


53. Footer line
    Files: src/content/site.yaml
    - Colophon "Built by hand, fish included." → "aka *Fish*." (Fish in
      the accent colour), so the bottom line reads "© 2026 Luka Miletić.
      aka Fish."


54. Guide brought up to date
    Files: Guide.md
    - Contact: the colophon is now "aka Fish." (from 53).
    - Content still missing: the contact links are real now, and the
      Ubisoft role matches in both files (from 49), so both notes are gone.


55. Footer: a.k.a.
    Files: src/content/site.yaml, Guide.md
    - Colophon "aka *Fish*." → "a.k.a. *Fish*.", so the bottom line reads
      "© 2026 Luka Miletić. a.k.a. Fish."


56. Recorded break and splash sounds
    Files: src/assets/js/05-sound.js, src/content/aquarium.yaml,
           media/README.md, Guide.md
    - The bowl breaking plays media/audio/sfx/glass-break.mp3 and the fish
      hitting the water plays media/audio/sfx/splash.mp3, in place of the
      synthesised shatter and splash.
    - All sound effect files live in media/audio/sfx/. aquarium.yaml names
      them under sound.files (shatter, splash); the shatter/splash volumes
      there still apply.
    - They're fetched and decoded the first time sound plays. Opened from
      disk (file://, no fetch) they play through an <audio> element instead.
    - Each play nudges the pitch slightly; a harder splash is louder and a
      little lower.
    - Until a file has loaded, or if it can't load, the old synthesised
      sound plays. Tap, crack and bubbles are still synthesised.


57. Big splash for the dive, at 60%
    Files: src/assets/js/05-sound.js, 09-fish.js, 01-core.js,
           src/content/aquarium.yaml, media/README.md, Guide.md
    - The landing after the break (the dive) plays
      media/audio/sfx/splash-big.mp3 instead of the ordinary splash. Every
      other surface break keeps splash.mp3.
    - Its volume is sound.big_splash: 0.6 in aquarium.yaml (60% of the
      file's own level, before the master volume).
    - Until it loads, or if it can't, the ordinary splash plays at full
      strength instead.


58. Sound on by default
    Files: src/content/aquarium.yaml, Guide.md
    - sound.enabled: false → true. The button starts in its "on" state.
    - A viewer who already turned it off keeps that (localStorage
      "portfolio.sound" still wins over the yaml).
    - Browsers hold back audio until the viewer's first click or key press
      on the page, so nothing plays before that.


59. Big splash trimmed to the splash
    Files: media/audio/sfx/splash-big.mp3, Guide.md
    - The clip opened with 0.39s of near silence, so the sound landed late.
      Cut it there (with a 5ms fade-in against a click); the splash now
      starts at once. 3.19s → 2.80s, re-encoded at the same 128kbps.


60. Big splash fades out
    Files: media/audio/sfx/splash-big.mp3, Guide.md
    - The end used to cut off. It now fades out in the file itself, from
      1.0s after the splash to complete silence at 2.55s, exactly where
      the recording itself stops (it used to stop dead there). The silent
      tail after it is cut, so the clip is 2.55s.
    - Made from the untrimmed original in one pass (the 0.39s trim and 5ms
      fade-in from 59, then the fade-out), so it was only re-encoded once.


61. He circles anything hovered, either way round
    Files: src/assets/js/09-fish.js, src/content/aquarium.yaml, Guide.md
    - Circling used to be only for a set list (gallery rows, contact rows,
      skill groups, roles, headings, nav, two buttons). Now hovering any
      element he can be seen behind makes him circle it: text, headings,
      links, buttons, pictures, videos, list items, chips, the settings
      panel, detail pages and the Game Mode view included.
    - fish.circle_targets stays as the list of whole things, circled as one
      even when the cursor is on something inside them. New
      fish.circle_any is everything else, circled on its own. Open water
      and the page background aren't in either, so there he still just
      follows the cursor.
    - Direction is random: clockwise or anticlockwise, picked each time a
      new thing is hovered (it was always the same way before).


62. The name and subtitle aren't circled
    Files: src/assets/js/09-fish.js, src/content/aquarium.yaml, Guide.md
    - New fish.circle_skip: ".title-copy h1, .title-copy .tagline,
      .pond-name, .pond-tagline". Hovering the name or the subtitle under
      it, on the opening screen or above the water after the dive, doesn't
      make him circle it; there he just follows the cursor, as in open
      water.


63. Contribution slideshows change every 3–4s
    Files: src/assets/js/03-media.js, src/content/aquarium.yaml, Guide.md
    - On a professional project's page, a contribution whose media is a
      folder of pictures now holds each picture 3–4s (new
      hero.contribution_hold: [3, 4]) instead of 5–8s.
    - Every other slideshow (hero panels, thumbnails, covers, hobby
      features) keeps hero.hold, 5–8s. The 2s fade is unchanged.


64. Game Mode: The Fishy Adventure (start screen and three dummy levels)
    Files: src/assets/js/14-adventure.js (new), src/assets/js/13-game.js,
           src/assets/js/07-water.js, src/templates/sections/game.html,
           src/assets/css/11-game.css, src/content/site.yaml,
           src/content/aquarium.yaml, build.py, Guide.md
    - The "Under construction" view is replaced by a game with its own
      canvas. Fish swims after the cursor; a click is a dash (Arrow keys /
      WASD and Space too). He wears a hat per level.
    - Start screen: "The Fishy Adventure" in big orange letters, the story
      from TODO.md centred on a frosted pane, and a coral wall at the right
      edge with a hole in the middle. Into the hole starts Level 1.
    - Tunnel between levels, 3s: he faces right but drifts left while the
      rock passes faster; "LEVEL N" above, the project title below.
    - Levels: full screen with thin borders, entrance middle left, exit
      middle right (barred until beaten). Levels 1–3 are dummies for Push
      Puzzle Rescue Adventure, Apocalypse Express and Assassin's Creed –
      Black Flag Resynced, in that order (game.levels in site.yaml, a list
      separate from the portfolio's order): dash into the crate to break it.
    - Beating a level opens the exit, fades the water off the project's
      title page (cover + title), and opens a hole in the bottom border.
      Down the hole is a 2s shaft (nose down, drifting up, the shaft passing
      upwards faster, getting darker) into a scrollable details room: the
      project's own professional detail page. "Swim back up" returns.
    - After Level 3 the tunnel says "The end? / More levels coming soon"
      and goes back to the start.
    - The water darkens going down: lighter at the top of each screen, darker
      in the shaft, darker again the further the details room is scrolled.
    - The portfolio's water loop doesn't draw while Game Mode is open.
    - build.py checks every game.levels project id exists.
    - New settings: game.* in aquarium.yaml (fish size, swim and dash
      speeds, tunnel/dive/reveal times, border, gap, crate size, hat
      placement). New text: game.title, story, hint, start_hint, goal, done,
      room_up, end_kicker, end_title, levels in site.yaml (heading and note
      are gone).
    - Tested headless in Chrome: start → tunnel → all three levels →
      details room → back up → ending → start, and Escape from inside a
      details room (the detail page goes back to the portfolio). No console
      errors.


65. Game Mode transitions slide, no fading
    Files: src/assets/js/14-adventure.js, src/assets/css/11-game.css,
           src/content/aquarium.yaml, Guide.md
    - From the notes in TODO.md. The crossfade between places is gone, and
      so are the fades on the start text, tunnel text and level text.
    - A transition lays the place he's leaving, the tunnel and the next
      place end to end and slides them past the screen, easing in and out
      (slow away, fastest in the middle, slow to a stop), so he picks up
      pace and slows down with it.
    - The tunnel slides in from the right after the screen he left, so he
      is seen going in. Its length is set so its far wall reaches the left
      of the screen exactly when he does, with the next level filling the
      screen behind it (new game.tunnel_length: 2.2 screen widths).
    - The level and project text ride in on the tunnel's mouth, hold in the
      middle, and leave with its far wall, clipped to the tunnel.
    - The start's title and story, a level's goal text and title page, and
      the details room slide with their place.
    - The shafts to and from a details room work the same way, vertically
      (new game.shaft_length: 1.6 screen heights). He turns nose down (or
      up) over the first part and levels out at the end.
    - The hat changes halfway along.


66. Game Mode: organic rock, rock level walls, 5s tunnel, text layer
    Files: src/assets/js/14-adventure.js, src/content/aquarium.yaml, Guide.md
    - One rock renderer for the whole game: an uneven face (three layered
      waves, fixed to the stone so a sliding face keeps its shape), rounded
      lips where faces meet, light along the face fading darker inward,
      pits and pebbles, and a soft shadow on the water.
    - Start page: the coral wall is that rock, and the hole through it is a
      lipped passage with the same rough faces, lit warm at its mouth (the
      dashed ring is gone). Coral grows off the face.
    - Levels: the thin glowing borders are now walls of the same rock,
      game.border 14 → 30px (the collision edge too), with a little coral.
      The bars sit in the openings in the rock.
    - Transitions: the tunnel and the shafts use the start page's rock and
      water, instead of a darker, level-tinted scheme. The shafts still
      darken with depth.
    - The level transition takes 5s (game.tunnel_time 3 → 5).
    - The level and project text are their own layer: they slide in from
      the right once the tunnel is coming in, settle in the middle, wait,
      and slide out left with the tunnel's far wall. No longer clipped to
      the tunnel.


67. Game Mode: breaking rock, the way back, rock-walled details room
    Files: src/assets/js/14-adventure.js, src/assets/js/13-game.js,
           src/templates/sections/game.html, src/assets/css/11-game.css,
           src/content/site.yaml, Guide.md
    - The floor opening and the right opening are solid rock until the level
      is beaten, then break open (right after 0.35s, floor after 0.8s): the
      wall across the opening is cut into chunks along its face, they crack
      apart for 0.32s, then tumble loose into the level and sink (the
      floor's pop up and drop back through the hole), with a crack sound
      and bubbles. The orange bars are gone.
    - The left opening is always open and leads back: to the level before
      (the tunnel run the other way round, him facing left, the text sliding
      in from the left), or from Level 1 to the start ("Back to the start",
      new game.back_kicker in site.yaml). The goal text says so.
    - Details room: the same as a portfolio detail page (frosted water,
      detail-bar, detail-close buttons, the article), inside a rock frame
      with the shaft through its ceiling. "Back to the portfolio" moved into
      its bar; the corner one hides while the room is on screen. Swimming up
      into the shaft goes back up too.
    - No light beams in the levels or the details room (the start keeps them).
    - Tunnels and shafts: the water is the joined place's colour at each end
      and dark through the middle.


68. Game Mode: title pages on their own colour, no bar in the room
    Files: src/assets/js/14-adventure.js, src/assets/js/13-game.js,
           src/templates/sections/game.html, src/assets/css/11-game.css,
           src/content/site.yaml, Guide.md
    - Details room: the top bar (Swim back up, Back to the portfolio) is
      gone; the way up is swimming into the shaft (an orange chevron points
      at it) and the corner "Back to the portfolio" shows again. The shaft
      ends in the room's frosted colour, and its mouth in the ceiling is
      painted that colour, so the two meet without a step. game.room_up is
      gone from site.yaml.
    - He can't go through a wall on the way up or anywhere else: in every
      tunnel and shaft he is kept inside the channel.
    - A beaten level's title page: only the cover (the big level text is
      gone), as large as fits under the title line, its edges fading into
      the colour sampled from round its edges. That colour is also where
      every tunnel and shaft joining the level starts.
    - The title line reads LEVEL N · Project · Studio, larger
      (1.05–1.6rem, bold caps); the hint under it keeps its size. It is
      centred without a transform now, so it no longer jumps sideways
      while sliding.
    - Transitions slide in whole pixels (no hairline where places meet).


69. Game Mode: Swim back up button, thinner picture fade
    Files: src/assets/js/14-adventure.js, src/templates/sections/game.html,
           src/assets/css/11-game.css, src/content/site.yaml, Guide.md
    - The "↑ Swim back up" button is back in the details room, in the
      mouth of the shaft on the line of the ceiling (game.room_up in
      site.yaml again), sliding with the room. It replaces the chevron.
    - Pressing it from anywhere in the room: he swims himself (cursor and
      dash ignored) to just under the mouth, then straight up into the
      shaft, so he never goes through the rock. Tested from the far left of
      the room: every point of his path near the ceiling was within 14px of
      the shaft's middle.
    - The fade on the edges of a beaten level's picture is 18px instead of
      14% of the picture.


70. Game Mode: vignette title pages; the fish behaves the same in both detail views
    Files: src/assets/js/14-adventure.js, src/assets/js/09-fish.js,
           src/assets/js/07-water.js, src/assets/css/11-game.css, Guide.md
    - A beaten level's title page: the cover now fills the level inside its
      rock (cover-cropped) and is vignetted instead of framed: at most 20px
      of solid edge colour, a 100px fade into the picture, wide rounded
      corners. The mask is generated for the screen size; the edge colour is
      read from the part of the picture that shows.
    - Normal mode: the fish is no longer hidden while a project detail page
      is open, and a click there is no longer ignored. He swims behind the
      frosted page doing everything he does elsewhere, including circling
      hovered text, list items and pictures.
    - Game details room: the fish now uses the portfolio fish's free-swimming
      rules with the same settings (the `fish` block): follow a moving
      cursor, go straight to a click (with the occasional roll on turning
      back), circle hovered text/list/picture elements in a random direction,
      wander when idle, roll every so often. The Swim back up button still
      comes first, and a cursor in the shaft's mouth takes him up it.
    - Tested: in the room he circled a hovered paragraph; on a normal detail
      page he came over to the hovered paragraph behind the page.


71. Game Mode: the details room's scroll bar is a stone in the rock
    Files: src/assets/js/14-adventure.js, src/templates/sections/game.html,
           src/assets/css/11-game.css, Guide.md
    - The browser's scroll bar is hidden in the room. In its place a groove
      runs down the right rock wall with a cracked stone as the handle, sized
      to the page as a scroll bar's handle is. The wall keeps its thickness.
    - Drag the stone, press the groove to jump there, or use the wheel over
      it; the wheel, keys and touch still scroll the page. The fish ignores
      the pointer while it's on the bar. No groove when the page fits.
    - Tested in Chrome at 1280x800: drag, drag to the end, press, wheel on the
      bar and on the page all scrolled the room, with no script errors.


72. Game Mode: the rest of TODO.md
    Files: src/assets/js/14-adventure.js, Guide.md
    - Hat: picked up in the tunnel. The new one floats there and drifts
      towards him, drops onto his head 38% of the way through, and knocks the
      old one off, which is left behind.
    - Flip: going into a shaft in the middle of a turn no longer leaves him
      squashed. The turn finishes on the way.
    - Swim back up: the way up starts the moment it's pressed, and he darts
      to the mouth in at most 0.45s, kept under the ceiling until he's there.
      The old swim over first (the autopilot) is gone.
    - The cut where a place meets a tunnel or shaft is gone: the place's rock
      runs on 90px past the screen, faces straight, and the passage's rock
      fades in over it.
    - Openings: cracks spread through the wall for 1.1s, the pieces (cut from
      a picture of the wall) rumble apart for 1.1s shrinking to 90–95%, then
      the way opens and they sink slowly through the screen edge. The way is
      only passable, and the chevrons only show, from then on. Wall pits and
      coral no longer jump when an opening breaks.
    - Tested in Chrome at 1280x800 on captured frames of each, with no script
      errors. Timings were not watched at full speed, and no real sound was
      heard.


73. Game Mode: faster painting, whole contributions circled, quicker rocks
    Files: src/assets/js/14-adventure.js, src/assets/js/09-fish.js,
           src/assets/css/11-game.css, src/content/aquarium.yaml, Guide.md
    - Lag: script time was small; nearly all of it was the browser painting.
      Rock is now painted once and stamped each frame, instead of redrawn
      every frame. The blur behind the room, the start's story, the buttons
      and the corner buttons is gone from Game Mode (the panels are a little
      more solid to make up for it), and the fish behind the room is frosted
      on the canvas. Page sizes are read on change, not every frame. The
      canvas is capped at game.max_pixels. The files weren't split: that
      wouldn't have made it faster.
    - Measured at 1920x1080 with software rendering, before and after, frames
      per second: start 42/52, tunnel 45/43, level 41/55, breaking 41/54,
      won level 53/60, room 22/46. Worst frame in the level 117ms/33ms, in
      the room 133ms/33ms.
    - A contribution is circled whole, text and picture, in the room and on a
      normal detail page (fish.circle_whole). Tested in the room: he covered
      x 94–1182 round a box 81–1198. Not tried on a normal detail page.
    - Falling rocks follow an exponential curve and are gone about a second
      after they start.


74. Game Mode: a recorded sound for the rock giving way
    Files: src/assets/js/05-sound.js, src/assets/js/14-adventure.js,
           src/content/aquarium.yaml, media/README.md, Guide.md
    - media/audio/sfx/crumbling.mp3 plays once per beaten level, from the
      first crack, and replaces the synthesised cracks and taps of the
      openings. Its level is sound.crumble. Without the file it falls back to
      a synthesised crack.
    - The crate smashing keeps its own sound.


75. Game Mode: no first-visit stutter, feathered story, no sunbeams
    Files: src/assets/js/14-adventure.js, src/assets/css/11-game.css,
           src/assets/css/06-title.css, Guide.md
    - Falling pieces: the ones from the middle of an opening fall away sooner
      than those at its edges (FALL_MIDDLE, FALL_EDGE).
    - The stutter in the tunnel the first time a level is reached: its rock
      was being painted right then. Rock is now painted ahead while the
      browser is idle: tunnels, shafts and every level on entering Game Mode,
      a level's broken walls and room when it's beaten. Cover pictures are
      decoded on entering, and a level's picture is only shown once beaten.
      Measured at 1920x1080 with software rendering: the worst frame on a
      first visit went from 117ms to 67ms and no longer falls at that point.
    - The start's story has no panel any more: transparent, a blur feathered
      out at the edges, like the portfolio's overview (a shared rule in
      06-title.css). The blur showed no measurable cost once settled
      (58-60fps with it, 50-53 without, so within the noise).
    - The sunbeams are gone from the start, so `water` no longer draws any.


76. Game Mode: rocks go from the middle, the story is circled, a true frost
    Files: src/assets/js/14-adventure.js, src/assets/js/09-fish.js,
           src/content/aquarium.yaml, Guide.md
    - Crumbling: the pieces in the middle of an opening start falling as soon
      as the cracks are done and the rumble starts; the further out, the later,
      the outermost when the way opens. Falling, each tips 0.2-0.4 radians
      towards the middle of the hole.
    - The start's story is circled while the cursor is on it.
    - The fish behind the details page: a real blur at the panes' strength
      (--panel-blur) on the patch round him, in place of the stretched-up
      small copy that looked pixelated. Where a browser has no canvas filter,
      he's drawn many times over in rings instead. Bubbles aren't drawn behind
      the page any more.


77. Game Mode: a button to reset the level
    Files: src/assets/js/14-adventure.js, src/templates/sections/game.html,
           src/templates/partials/icons.html, src/assets/css/11-game.css,
           src/content/site.yaml, Guide.md
    - A round corner button on the left of Sound, shown only while in a level.
      It starts the current level over: crate back, walls whole, the title
      page gone and him at the way in. Other levels stay beaten.


78. Game Mode: no freeze on the first break, reset through black
    Files: src/assets/js/14-adventure.js, src/templates/sections/game.html,
           src/assets/css/11-game.css, src/content/aquarium.yaml, Guide.md
    - First break in a level: its title page (a big picture through a mask)
      was shown for the first time right then, and its broken walls and room
      were painted right then too. All of it is now painted ahead on entering
      Game Mode, the title page onto a canvas of its own.
    - Reset fades to black (game.reset_fade, 0.4s each way), puts the level
      back while nothing can be seen, and fades in. He holds still meanwhile.


79. Game Mode: sublevels
    Files: src/assets/js/14-adventure.js, src/templates/sections/game.html,
           src/content/site.yaml, Guide.md
    - Each level has three dummy sublevels (game.levels[].sublevels), a crate
      in a different place in each. Beating one opens the right wall only;
      beating the last shows the title page and opens right and floor.
    - Left from a finished level, or the first sublevel of the next, goes to
      the title room of the level before, skipping its sublevels. Left within
      an unfinished level goes to the sublevel before.
    - The rooms of a level share its rock, so no more is painted ahead.


80. Game Mode: from the start to a finished Level 1, a woosh on the swipe
    Files: src/assets/js/14-adventure.js, src/assets/js/13-game.js,
           src/assets/js/05-sound.js, src/content/aquarium.yaml,
           media/audio/sfx/woosh-single.mp3, media/README.md, Guide.md
    - From the start, a finished Level 1 now goes straight to its title room,
      skipping 1.1 and 1.2.
    - woosh-single.mp3 is the first woosh of woosh.mp3 (0.25s to 1.85s, a short
      fade at the end). It plays on the swipe both ways, loudest as the band
      covers the screen. woosh.mp3 itself is unchanged and no longer needed.


81. Game Mode: a quieter woosh
    Files: src/content/aquarium.yaml
    - sound.woosh goes from 1.0 to 0.6.


82. Game Mode: openings glow as they break
    Files: src/assets/js/14-adventure.js, Guide.md
    - A soft warm light at each opening, the same colour as the start's
      passage: it comes up over the 2.2s of cracks and rumble, then dies away
      over 1.6s once the way is open.


83. Settings: volume slider and mute button; a quieter woosh still
    Files: src/templates/base.html, src/assets/js/05-sound.js,
           src/assets/css/06-title.css, src/content/aquarium.yaml, Guide.md
    - Settings has a Volume slider and a mute button. The mute button and the
      Sound button by the gear are one setting and always match. The volume is
      remembered in the browser, and moving the slider while muted unmutes.
    - sound.woosh goes from 0.6 to 0.3.


84. Game Mode start room laid out; scroll bars styled
    Files: src/templates/sections/game.html, src/assets/css/11-game.css,
           src/assets/css/03-layout.css, src/assets/js/14-adventure.js,
           src/content/site.yaml, Guide.md
    - Start room: the title on one line (a little smaller on narrower screens);
      under it the overview at its left edge, and at its right edge the hints,
      larger, one instruction to a line, over the start hint, left edges in
      line. game.hint is a list now. He starts mid-screen below them. Under
      760px wide they stack and the title may wrap.
    - Scroll bars across the site: no track, a pale rounded thumb, koi under
      the cursor.


85. Structure: scripts in folders, Game Mode's own content file, mechanics
    Files: all of src/assets/js (moved), build.py, src/content/game.yaml (new),
           src/content/site.yaml, src/content/aquarium.yaml,
           src/templates/sections/game.html, src/assets/css/11-game.css,
           src/assets/css/09-contact.css, Guide.md, README.md
    - The 14 scripts are now 67 files in 8 numbered folders. script.js is still
      one bundle. The long scripts are split at their sections, in `*.scope`
      folders the build wraps in one function. The bundle's code was compared
      line by line with the one before the split: 6250 lines, identical.
    - game.yaml holds Game Mode's words, levels and (`settings`) numbers, out
      of site.yaml and aquarium.yaml.
    - Each level has a `mechanic`, shared by its sublevels; a mechanic is an
      entry in `mechanics` in 07-mechanics.js. All are `crate` for now, and the
      build refuses an unknown one.
    - Each sublevel has its own `hint` under the level's name, replacing `goal`.
    - An opening's glow keeps pulsing until he leaves the room, and a room he
      comes back to doesn't glow again.
    - The start's overview is justified.
    - The contact note runs the width of the shell.


86. Game Mode: an engine and mechanics, in a script of its own
    Files: src/assets/game/ (moved from src/assets/js/08-game/2-adventure.scope),
           src/assets/game/2-mechanics/crate.js (new),
           src/assets/js/08-game/1-view.js, src/templates/sections/game.html,
           build.py, src/content/game.yaml, Guide.md, README.md
    - The game is built to its own game.js (2800 lines), fetched the first time
      its button is hovered, focused or pressed. script.js is down to 4400 lines.
    - The crate, its planks and its smashing live in 2-mechanics/crate.js and use
      only the `game` object the engine hands to a mechanic. The planks now
      belong to the room rather than the engine.
    - A new mechanic is a new file there; the build finds it and refuses a level
      naming one that doesn't exist. `python build.py --watch` now sees files in
      folders, which it had stopped doing since the move to folders.
    - Tested over http and opened from disk: bump, dash, planks, reset, sublevels,
      title room, details room, leaving and coming back (fetched once).


87. Game Mode: the opening's light stops as he enters the tunnel
    Files: src/assets/game/1-engine.scope/18-level-break.js, Guide.md
    - The pulsing light at an opening goes out over 0.3s as soon as he enters a
      tunnel or shaft, instead of pulsing until he arrives in the next room.


88. Game Mode: the buttons sit in the rock
    Files: src/assets/css/11-game.css, src/assets/game/1-engine.scope/
           (02-canvas, 16-start-room, 17-level-walls), Guide.md
    - Back to the portfolio, Reset, Sound and Settings are now 26px tall and sit
      along the top wall, tucked into its corners. Coral no longer grows there.


89. Game Mode: rock buttons
    Files: src/assets/css/11-game.css, Guide.md
    - Back to the portfolio, Sound and Settings look like hollows in the rock of
      the top wall.
    - Reset is larger (52px), in the top right corner of the play area under
      Sound and Settings, and looks like a round stone floating in the water,
      bobbing gently. Swim back up is the same stone, longer.


90. Game Mode: jagged buttons, a thicker top wall, a ding
    Files: src/assets/css/11-game.css, src/assets/game/1-engine.scope,
           src/assets/js/03-sound/sound.js, src/content/game.yaml,
           src/content/aquarium.yaml, media/README.md, Guide.md
    - Every game button has a jagged rock outline.
    - The top wall is 5px thicker (game.border_top_extra), and its buttons 5px
      taller. The details room and the fish's limits follow it.
    - media/audio/sfx/ding.mp3 plays when a level's last sublevel is beaten, at
      sound.ding (0.7).


91. Game Mode: the ding comes with the openings
    Files: src/assets/game/1-engine.scope/, Guide.md
    - On a level's last sublevel, the ding plays as the openings start to break,
      along with the crumbling, rather than as the crate breaks.


92. Game Mode: the push puzzle, Level 1
    Files: src/assets/game/2-mechanics/pushpuzzle.js (new),
           src/assets/game/1-engine.scope/ (04-sizes, 05-state, 07-mechanics,
           10-input, 22-tunnels, 23-frame, 24-api, 01-setup),
           src/content/game.yaml, src/templates/sections/game.html,
           src/assets/css/11-game.css, Game-PushPuzzle.md, Guide.md
    - Level 1's three rooms are the puzzles in Game-PushPuzzle.md, on an 8 by 5
      grid: hermit crabs, clams, algae, rock and a chest, with a move counter, stars,
      Out of moves / Retry and a Results plate.
    - A mechanic can now hold the fish and take the keys and clicks, and can
      keep words on the page. The fish's size can change without changing the
      openings.
    - The level's title is a little smaller, to stay on one line at 1280 wide.
      On phones the words sit under the reset stone rather than behind it.


93. Game Mode: the push puzzle, second pass
    Files: src/assets/game/2-mechanics/pushpuzzle.js,
           src/assets/game/1-engine.scope/07-mechanics.js, src/content/game.yaml,
           src/assets/css/11-game.css, Game-PushPuzzle.md, Guide.md
    - The grid is 11 by 6 and fills most of the water, with three new puzzles.
    - He goes with what he pushes, in one move. Anything that does nothing, like
      a blocked crab, costs nothing.
    - The floor is a dense gravel shore. Rock spaces are the walls' own stone,
      fused with each other and with the walls.
    - The level's name is in the top wall, the hint just under it.


94. Game Mode: push puzzle, third pass, and the settings
    Files: src/assets/game/ (2-mechanics/pushpuzzle.js and 1-engine.scope: 02-canvas,
           05-state, 07-mechanics, 10-input, 12-details-room-fish, 16-start-room,
           17-level-walls, 18-level-break, 22-tunnels, 23-frame, 24-api),
           src/assets/js/07-controls/1-settings.js, src/content/game.yaml,
           src/templates/base.html, src/templates/sections/game.html,
           src/assets/css/11-game.css, Game-PushPuzzle.md, Guide.md
    - The grid is 8 by 5 again, nearly as tall as the screen, the sides filled
      with wall, with three new puzzles and small gaps between the gravel beds.
    - All of a puzzle room's rock is one outline, so nothing shows a join.
    - The start's light comes from the edge of the screen.
    - Everything a puzzle room paints is painted ahead when Game Mode opens.
    - The Results panel is large, lit from behind, with a total row, and
      collapses to a small stone.
    - In Game Mode the settings are a stone mid-screen with only Volume, and a
      game on a clock waits while they're open.

95. Local server: never cached
    - `--serve` tells the browser not to keep a copy, so a reload always shows
      the last build. Before, it could show an older page for a while.

96. Game Mode: the frame rate on the way in, and the TODO list
    Files: src/assets/game/1-engine.scope/ (01-setup, 02-canvas, 05-state,
           07-mechanics, 08-places-water, 10-input, 11-swimming, 15-rock,
           16-start-room, 17-level-walls, 18-level-break, 22-tunnels, 24-api),
           src/assets/game/2-mechanics/pushpuzzle.js,
           src/assets/js/08-game/1-view.js, src/assets/css/11-game.css,
           src/content/game.yaml, Guide.md
    - The stutter from the sweep on, and the seconds of it in the start room,
      came from painting the whole game ahead as Game Mode opened, on canvases
      that queue their drawing for the graphics card. The gravel alone is about
      40,000 clipped shapes. The card stalled for over a second at a time, and
      every frame on the screen waited behind it.
    - Those pictures are now painted by the processor (softCanvas), and only
      what can come up next is painted ahead (paintNear).
    - What the first room needs is painted while the band covers the screen
      (game.paint_under_sweep, 0.6s at most), and the band waits there until
      the new view has been drawn. Opening again repaints nothing.
    - Measured at 1920x1080 on an Intel Arc B580: the worst stall in the start
      room went from about 2.7s to none, a steady 60 frames a second. The tunnel
      and a puzzle room hold about 60 as well.
    - The light in a tunnel's mouth comes from the edge of the screen and is
      drawn past it, so it isn't cut off as he goes in (mouthLight). A level's
      way back and way on are lit the same.
    - After a key is used he stops following the mouse until it moves or clicks.
    - The Results and Game Mode settings panels are real stone, painted with
      the same rock as the walls (stoneBehind).
    - The total row in the Results panel is bigger.

97. Game Mode: Level 2 is under construction
    Files: src/assets/game/2-mechanics/construction.js (new),
           src/content/game.yaml, Guide.md
    - Level 2's three crate rooms are replaced by one room: a big Under
      Construction sign, scaffolding and cones, all of it scenery.
    - A barricade stands in the room. Swimming only bumps it; a dash breaks it,
      which beats the room, so the title page, the details room and Level 3
      can all still be reached.
    - The sign's words, the barricade's place and the hint are in game.yaml.
      To bring the crates back, or use the room for another level, change that
      level's `mechanic` and `sublevels`.

98. Game Mode: only the sign in Level 2, and the stars' stone
    Files: src/assets/game/2-mechanics/construction.js, pushpuzzle.js,
           src/assets/game/1-engine.scope/ (06-places, 07-mechanics, 08-places-water,
           15-rock, 22-tunnels), src/content/game.yaml, Guide.md
    - The under-construction room is only the big sign now. The barricade,
      scaffolding, cones and the sign's posts are gone.
    - The sign also says "New games will come as soon as *Fish* is done with
      them" (`note` in game.yaml).
    - With nothing left to break, the room's ways on and down are open from the
      start. It keeps its water, so the sign stays, and has no reset button.
    - The stone under the stars earned in a push puzzle is the walls' own rock.

99. Game Mode: the under-construction room is the last level
    Files: src/content/game.yaml, src/templates/sections/game.html,
           src/assets/game/1-engine.scope/22-tunnels.js, Guide.md
    - Level 3 (Ubisoft Belgrade's crates) is out of the game; the project stays
      in the portfolio. Right from Level 2, the tunnel leads back to the start page.
    - The line at the top of the last level says so (game.done_last).
