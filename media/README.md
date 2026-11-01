# media

Every picture and clip the site shows lives here, one folder per project:

    media/
    ├─ audio/
    │  └─ sfx/                    every sound effect: glass-break.mp3, splash.mp3,
    │                             splash-big.mp3,
    │                             crumbling.mp3, ding.mp3, woosh-single.mp3 (the first of
    │                             the ten in woosh.mp3)
    ├─ hero/                      the three tiles on the opening screen
    │  ├─ aaa.jpeg
    │  ├─ mobile
    │  └─ indie
    ├─ logos/                     studio marks, for the corner of a professional thumbnail
    │  ├─ ubisoft.png
    │  ├─ llamaware.png
    │  └─ brave-giant.png
    ├─ professional/
    │  ├─ ubisoft-belgrade/
    │  │  ├─ cover.jpeg           gallery row, opening-screen tile, beside the title
    │  │  └─ contribution.avif    beside Contribution on the project's page
    │  ├─ llamaware/              cover, contribution
    │  └─ brave-giant/            cover, contribution
    └─ hobby/
       ├─ infernal-dante/         cover, movement, abilities, animation
       ├─ combat-demo/            cover, breakdown-1 … breakdown-4
       └─ attack-tower-defence/   cover, breakdown-1, breakdown-2

Folders are named after the project's `id`. The yaml files in `src/content/`
name each file by its path from here without the extension, e.g.
`media: professional/llamaware/cover`. The hero tiles are named in
`site.yaml` under `hero.showcase`. Rename or move anything freely: change
the name in the yaml to match and rebuild.

## Sound effects

All of the site's sound effects live in `audio/sfx/`. Which file plays for
which sound is set in `src/content/aquarium.yaml` under `sound.files`
(full path from the site root, extension included). A sound with no file
there is synthesised in the browser instead.

## Pictures and clips

- A picture can be `.jpg`, `.jpeg`, `.png`, `.webp` or `.avif`. The build finds
  whichever one is there. That alone fills the panel.
- An `.mp4` with the same name (`cover.mp4` next to `cover.jpeg`) is optional.
  When it's there, it plays on hover.
- Until a picture exists, its panel shows as empty water, not a broken box.
  Every build lists the ones it's still waiting on.

Panels are 16:9 and render up to 600px wide, so about 1200×675 covers retina
screens. Anything that isn't 16:9 is cropped to fill.

## Studio logos

A professional project's thumbnail is cut corner to corner: the game above
the diagonal, the studio's mark below it. The mark is `logos/<studio>`, named
by the `logo` field in `professional.yaml`. It can be `.png`, `.svg`, `.webp`
or `.avif`.

Use a light mark on a transparent background, roughly square and a few
hundred pixels across. Until the file is there, that corner shows the studio's
name.

## Encoding clips

Clips play muted and looped on hover, so keep them short (5–10s) and small:

```bash
ffmpeg -i raw.mp4 -t 8 -an -vf "scale=1200:-2" -c:v libx264 -crf 24 -movflags +faststart cover.mp4
ffmpeg -i cover.mp4 -vframes 1 -q:v 3 cover.jpg
```
