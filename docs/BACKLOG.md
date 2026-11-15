# Backlog

One item is one behaviour, one TDD cycle, and one commit. Work the first unchecked item. The merge agent ticks the box inside that item's commit. See `DESIGN_PLAN.md` §3 for the cycle and §12 for how to resume.

## M1 Guardrails

- [x] M1-01 `validateCommitMessage` accepts a one-line message that starts with a capitalised regular past-tense verb
- [x] M1-02 `validateCommitMessage` rejects a message with more than one non-empty line
- [x] M1-03 `validateCommitMessage` rejects a first word that is not a capitalised regular past-tense verb
- [x] M1-03b `validateCommitMessage` accepts irregular past-tense verbs listed in `tools/hooks/irregular-verbs.txt`
- [x] M1-04 `validateCommitMessage` rejects a subject longer than 72 characters
- [x] M1-05 `validateCommitMessage` rejects any banned agent or tool word, in any letter case
- [x] M1-06 The `commit-msg` hook exits non-zero and prints the reason when the message file fails validation, and exits zero when it passes
- [x] M1-07 The `pre-commit` hook exits non-zero when the current branch is `main` or `master`
- [x] M1-08 The `pre-push` hook exits non-zero when any pushed ref targets `main` or `master`
- [x] M1-09 The history audit reports every commit in a range whose message fails validation, whose author and committer emails differ, or which is a merge commit
- [x] M1-10 `npm run lint` runs the linter (ESLint) over the repository and passes
- [x] M1-11 `npm run format:check` runs the style checker (Prettier) over the repository and passes
- [x] M1-12 `npm run check` runs the linter, the style checker, and the type checker, and passes
- [x] M1-13 `npm run mutation` runs mutation testing (StrykerJS with the Vitest runner) over `src/` and `tools/**/lib/` and fails below a mutation score of 80
- [x] M1-14 The CI workflow runs check, tests, mutation testing, and the history audit on every pull request
- [x] M1-15 `npm install` points `core.hooksPath` at `tools/hooks`
- [x] M1-16 Tests that launch the linter, style checker, type checker, or npm allow 60 seconds, so they do not fail on a busy machine

## M2 Deploy

Owner steps U2 and U5 are needed before the first live deploy, not before these items.

- [x] M2-01 `npm run build` writes `dist/index.html`: an English-language page titled "Blue Marble Mixtape" with a mobile viewport
- [x] M2-02 The built site includes `staticwebapp.config.json` with a navigation fallback to `/index.html`
- [x] M2-03 `staticwebapp.config.json` sends a content security policy that allows scripts, styles, and media from the site itself, and images from the site and `https://svs.gsfc.nasa.gov` only
- [x] M2-03b The content security policy also sets `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'`, which do not inherit from `default-src`
- [x] M2-04 The deploy workflow builds the site and deploys it with the Static Web Apps action on pull requests (preview) and on pushes to `main` (production), and removes the preview when a pull request closes
- [x] M2-05 The smoke check exits zero when a URL serves the page title, and non-zero otherwise
- [x] M2-06 The smoke check passes against the built site when `dist/` is served over HTTP

## M3 Ingest

- [x] M3-01 The ingest reader loads the recorded EIC root (SVS 40467) and identifies child cards using their instance IDs and types
- [x] M3-02 The crawler follows every nested gallery from 40467 in source order and collects detail pages, media-group references, and links
- [x] M3-03 Repeated pages and media references are collected once by SVS ID, preserving all referring galleries and terminating cycles
- [x] M3-04 The crawler reports an unresolved expected SVS page with its referring gallery, so an incomplete snapshot cannot pass silently
- [x] M3-05 A manual refresh records NASA API responses and retrieval dates for offline ingest, and tests replay the recorded responses
- [x] M3-06 Detail and linked media records supply canonical source URLs, titles, credits, release dates, and media groups
- [x] M3-07 Each source contributes its main image first and at most two additional distinct views in source order
- [x] M3-08 Media selection skips thumbnails, placeholders, colour bars, and alternate sizes or formats of the same view
- [x] M3-09 Produced Video and B-Roll contribute only their NASA poster still and are never sent to movie processing
- [x] M3-10 Each view selects the largest NASA JPEG or PNG at or below 3840 pixels wide and keeps its original dimensions and HTTPS URL
- [x] M3-11 Selected images produce local WebP listening fallbacks at up to 1280 pixels wide
- [x] M3-12 Selected images produce 48×27 thumbnails quantised to the Dusk palette
- [x] M3-13 Eligible featured visualisations, animations, and hyperwall visuals with movies produce 48 evenly spaced frames without reading source audio
- [x] M3-14 Frame sets are stored as sprite sheets with one 320×180 cell per frame and no file over 2 MB
- [x] M3-15 Each still produces a 96×54 grid of luminance, hue, and saturation
- [x] M3-16 Each feature grid includes Sobel edge magnitude and direction
- [x] M3-17 Feature grids from frame sets include block-matched motion vectors and frame-difference energy
- [x] M3-18 Feature grids serialize deterministically to compact binary packs with a tested layout
- [x] M3-18b Media selection excludes standalone colour bars identified by NASA's description when the filename is ambiguous
- [x] M3-19 Missing or placeholder NASA alt text is replaced with a view-specific description grounded in NASA's material and marked authored
- [x] M3-20 The explicit room table assigns every accepted source, including daily imagery, with four to six featured artifacts per room
- [x] M3-21 The catalog records every required field, including a short title of at most 18 characters and retrieval date for daily imagery
- [x] M3-21b SVS 5072 uses NASA's current January–December single-year image in place of its broken main-image URL
- [x] M3-21c Ingest uses decoded image dimensions and serves the local fallback when a source has no published image within the 3840-pixel width cap
- [x] M3-22 The offline completeness check accounts for every collected source with catalog entries or a documented reason for exclusion
- [x] M3-23a Stage processed media batch 1 of 20 (18 artifacts, 54 files)
- [x] M3-23b Stage processed media batch 2 of 20 (23 artifacts, 69 files)
- [x] M3-23c Stage processed media batch 3 of 20 (1 artifacts, 4 files)
- [x] M3-23d Stage processed media batch 4 of 20 (4 artifacts, 13 files)
- [x] M3-23e Stage processed media batch 5 of 20 (3 artifacts, 10 files)
- [x] M3-23f Stage processed media batch 6 of 20 (13 artifacts, 39 files)
- [x] M3-23g Stage processed media batch 7 of 20 (5 artifacts, 17 files)
- [x] M3-23h Stage processed media batch 8 of 20 (1 artifacts, 3 files)
- [x] M3-23i Stage processed media batch 9 of 20 (1 artifacts, 4 files)
- [x] M3-23j Stage processed media batch 10 of 20 (12 artifacts, 37 files)
- [x] M3-23k Stage processed media batch 11 of 20 (6 artifacts, 20 files)
- [x] M3-23l Stage processed media batch 12 of 20 (4 artifacts, 14 files)
- [x] M3-23m Stage processed media batch 13 of 20 (12 artifacts, 37 files)
- [x] M3-23n Stage processed media batch 14 of 20 (16 artifacts, 50 files)
- [x] M3-23o Stage processed media batch 15 of 20 (14 artifacts, 44 files)
- [x] M3-23p Stage processed media batch 16 of 20 (6 artifacts, 19 files)
- [x] M3-23q Stage processed media batch 17 of 20 (2 artifacts, 7 files)
- [x] M3-23r Stage processed media batch 18 of 20 (11 artifacts, 34 files)
- [x] M3-23s Stage processed media batch 19 of 20 (12 artifacts, 38 files)
- [x] M3-23t Stage processed media batch 20 of 20 (16 artifacts, 50 files)
- [x] M3-23 The refresh builds the catalog and all referenced media from a recorded snapshot, and the committed outputs serve in the site build
- [x] M3-24 The built site fails verification above 150 MB total or 2 MB for any individual file
- [x] M3-24b The recorded views without NASA alt text use descriptions checked against their images
- [x] M3-25 The preview serves the catalog and its referenced assets, and the PR lists authored alt text and room assignments for owner review

## M4 Engine

### Framebuffer and display

- [x] M4-01 A new 320×180 framebuffer stores one Dusk palette index per pixel and clears to a selected index
- [x] M4-02 Filled rectangles clip at the framebuffer boundary and preserve pixels outside the requested area
- [x] M4-03 An 8×8 indexed tile blits at its world position, clips at the edges, and leaves transparent pixels alone
- [x] M4-04 The 16-colour Dusk palette matches the ingest thumbnails and retains the five-tone backdrop ramp
- [x] M4-05 Indexed frames expand to opaque RGBA in row order for canvas presentation
- [x] M4-06 The canvas presents at a fitting integer scale with crisp pixels and letterboxes spare space
- [x] M4-07 A bitmap font draws 16-pixel-high uppercase letters, numbers, punctuation, and all four arrows
- [x] M4-08 The engine's visible copy lives in one string table and stays within 18 characters per line and two lines per label

### Input, simulation, and camera

- [x] M4-09 Only the four arrow keys map to movement and yes/no actions
- [x] M4-10 Horizontal movement holds while a key is down, and yes/no dispatch once per press across repeat, release, and blur
- [x] M4-11 Four labelled touch buttons send the keyboard's four actions and safely release held movement
- [x] M4-12 Touch controls stay hidden on non-touch devices and place 48 CSS px targets under the correct thumbs in portrait and landscape
- [x] M4-13 Frame time advances the pure simulation in fixed 60 Hz steps and delivers each discrete press once
- [x] M4-14 The explorer walks horizontally at a fixed speed, cancels opposing movement, and stops at the ends of the walkway
- [x] M4-15 The explorer stays on the continuous walkway as it passes through ramps and steps
- [x] M4-16 The side-scrolling camera follows the explorer and clamps at both room edges

### Welcome, avatar, and tutorial

- [x] M4-17 The flow begins on Welcome and Up enters the avatar builder and signals the start gesture
- [x] M4-18 The Welcome framebuffer shows the cassette label, a single centred Earth, and the start prompt on an opaque panel
- [x] M4-19 The centre Earth turns deterministically while the cassette stays still
- [x] M4-20 The four avatar steps each offer six named choices and Left and Right cycle the current choices
- [x] M4-21 Up confirms an avatar step and Down goes back, with the last confirmation entering the tutorial
- [x] M4-22 Confirmed avatar choices are restored from browser storage with usable defaults for invalid saved data
- [x] M4-23 The avatar screen previews each choice immediately and the explorer sprite uses the same choices on the walkway
- [x] M4-24 The tutorial displays the three control hints and renders a practice artifact on a continuous tiled walkway
- [x] M4-25 The engine loads the committed catalog and the local images it needs for the tutorial, with progress based on completed loads
- [x] M4-26 The tutorial cassette shows a progress counter and winds tape between its two reels as assets load
- [x] M4-27 The tutorial exit stays closed while loading and opens when the loader reads READY
- [x] M4-28 Door traversal follows the room order in both directions and positions the explorer on entry
- [x] M4-28b Each room shows its track number and name on an opaque cassette banner

### Artifact interaction and listening

- [x] M4-29 The explorer's range opens a prompt for the nearest artifact and walking out closes it
- [x] M4-30 Down dismisses an artifact prompt and it stays dismissed until the explorer leaves that artifact's range
- [x] M4-31 Up opens the prompted artifact and Down closes its listening view, returning the explorer to the walkway
- [x] M4-32 Artifact thumbnails fit their frames on posts and the focused frame renders a two-pixel pulse, sparkles, and a bobbing diamond
- [x] M4-33 An opaque cassette-shaped prompt draws LISTEN? and the two answer hints in the 16-pixel font
- [x] M4-34 The listening view uses a real image with catalog alt text and keeps the whole NASA frame smoothly fitted on screen
- [x] M4-35 Listening shows the local WebP immediately, upgrades to the eligible NASA image after loading, and keeps the WebP if the remote load fails
- [x] M4-36 The listening overlay shows the short title, display date, genre, close hint, and cassette tape progress strip
- [x] M4-37 A shape-marked playhead maps image-relative positions into the fitted image and clears when playback has no active position
- [x] M4-38 A named canvas and polite live region announce avatar choices, room titles, artifact prompts, and listening titles and credits

### Background rules and integration

- [x] M4-39 Background specifications enforce four or more depth layers and ten or more distinct named motifs per room with no reuse between rooms
- [x] M4-40 Background colours stay on the five-tone Dusk ramp, the ramp stays within 2:1, play-lane elements reach 3:1, and opaque text panels reach 4.5:1
- [x] M4-41 Ambient motion is limited to three animations, one change per second, and under 2% of screen pixels per change outside protected areas
- [x] M4-42 Reduced-motion preferences freeze background layers and disable sparkle and parallax while retaining slower focus cues
- [x] M4-43 The browser entry point connects the canvas, input, catalog loading, engine screens, and accessible overlays through the real site build
- [x] M4-44 Desktop and touch browser tests verify the M4 flow, image accessibility, portrait controls, and reduced motion
- [ ] M4-45 The built engine passes the full phase suite and the live draft preview serves the M4 flow with the catalog and listening media

## M5 Audio core

Itemised when M4 is done.

## M6 Rooms 1–9

Itemised when M5 is done.

## M7 Lab and release

Itemised when M6 is done.
