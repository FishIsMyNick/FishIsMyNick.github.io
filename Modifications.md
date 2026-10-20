# Modifications (v3.4, 2026-10-18, 11-14 on 2026-10-19, 23-39 on 2026-10-20)

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
