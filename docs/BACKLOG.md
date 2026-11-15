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
- [x] M4-45 The built engine passes the full phase suite and the live draft preview serves the M4 flow with the catalog and listening media
- [x] M4-46 Usability follow-up. The avatar's face, neck, and hands retain the selected skin tone, and all six shirts contrast with the preview background.
- [x] M4-47 Usability follow-up. The explorer takes visible steps while moving and stands still when idle or when reduced motion is enabled.

## M5 Audio core

The first four items were developed on `feature/museum-audio`. The audio core continues on `feature/museum`, with modules under `src/audio/` and focused tests under `tests/audio/`.

- [x] M5-01 `midiToHz` converts MIDI note numbers to frequency with A4 (note 69) at 440 Hz
- [x] M5-02 `scaleNote` maps a 0–1 value onto a named scale (major pentatonic, minor pentatonic, Dorian, Phrygian, whole tone, chromatic) from a root note over a number of octaves
- [x] M5-03 `euclideanRhythm` spreads k pulses over n steps as evenly as possible
- [x] M5-04 `seededRandom` returns the same sequence of numbers in [0, 1) for the same seed
- [x] M5-05 `validateScore` accepts events that carry a voice, start, duration, pitch, loudness, pan, and an image location, and rejects an event without a location
- [x] M5-06 `validateScore` rejects non-finite or out-of-range values and events out of start order
- [x] M5-07 Locations are points, lines, rings, paths, or regions in image-relative 0–1 coordinates, and `validateScore` rejects malformed ones
- [x] M5-08 `eventsAt` returns the events sounding at a time, and `scoreDuration` returns the end of the last event
- [x] M5-09 `decodeFeaturePack` reads the ingest feature-pack binary into named channel planes per frame and rejects a bad header
- [x] M5-10 `envelope` shapes a note with attack and release so it starts and ends at zero and never exceeds its loudness
- [x] M5-11 The pulse voice produces the requested fundamental with a chosen duty cycle
- [x] M5-12 The triangle voice produces the requested fundamental with only odd harmonics
- [x] M5-13 The noise voice is deterministic for a seed and has no stable pitch
- [x] M5-14 The pluck voice (Karplus–Strong) produces the requested fundamental and decays
- [x] M5-15 The organ voice (additive) contains the requested fundamental and its drawbar harmonics
- [x] M5-16 The bell voice (FM) has inharmonic partials and a decaying tail
- [x] M5-17 The pad voice (detuned, low-passed) has a slow attack and a dull spectrum
- [x] M5-18 `renderScore` mixes events into stereo at their start times with equal-power panning, and is silent elsewhere
- [x] M5-19 `renderScore` is deterministic and keeps every sample within −1 to 1
- [x] M5-20 The console bus reduces bit depth and sample rate to the chosen settings
- [x] M5-21 The scheduler hands each event out exactly once as the clock advances through its lookahead window
- [x] M5-22 The player reports progress from 0 to 1 against the clock and reports no active events after stop
- [x] M5-23 `validateRecipe` accepts the lab's scans, sources, scales, voices, rhythms, and tempos, and rejects anything else
- [x] M5-24 `lineSweepScore` turns a feature pack and a recipe into a valid score whose event locations sweep left to right
- [x] M5-25 The browser player renders a score to an audio buffer and plays it through an injected audio context, starting only after a user gesture

## M6 Rooms 1–9

- [x] M6-01 Select eight to ten distinct artifacts for each exhibit by evaluating the image and its sonification. Remove repeated views and source additional distinct artifacts for any exhibit that falls below eight.

- [x] M6-02 Add documented Biodiversity sources through the existing ingest pipeline to bring the exhibit to eight distinct artifacts.
- [x] M6-03 Load explicit exhibit selections in order while preserving the full catalog for the lab library.
- [x] M6-04 Draw and walk continuous room-specific paths with grounded artifacts, doors, and camera bounds.
- [x] M6-05 Render each room backdrop as at least four layers on the Dusk ramp and respect reduced motion and the protected play lane.
- [x] M6-06 Route the selected artifact through the current room’s score mapper and pass its active locations to the listening overlay.

### Sea Level

- [x] M6-07 Draw a flooding harbour with icebergs, a tide gauge, and submerged structures with at least ten distinct motifs.
- [x] M6-08 Build a pier walkway with a rising harbour ramp and show its numbered cassette banner.
- [x] M6-09 Analyze image features in a way that extracts current directions and traces streamlines through still or animated data.
- [ ] M6-10 Apply the room recipe that uses drifting pads and tide bass with cumulative pitch motion and path markers.
- [x] M6-11 Verify room traversal, the listening image, and the playhead in the browser.

### Air Quality

- [x] M6-12 Draw rooftops, layered haze, and atmospheric monitoring instruments with at least ten distinct motifs.
- [x] M6-13 Build a continuous roofline and rooftop walkways and show its numbered cassette banner.
- [ ] M6-14 Analyze image features in a way that inverts the colour bar and follows a Hilbert curve through concentration tiles.
- [ ] M6-15 Apply the room recipe that turns concentration into granular noise and pulses with point markers.
- [x] M6-16 Verify room traversal, the listening image, and the playhead in the browser.

### Biodiversity

- [x] M6-17 Draw a canopy bridge with emergent trees, plants, birds, and forest lidar with at least ten distinct motifs.
- [x] M6-18 Build a canopy walk with a continuous research bridge and show its numbered cassette banner.
- [ ] M6-19 Analyze image features in a way that reads columns as a spectrogram and traces connected ecosystem features.
- [x] M6-20 Apply the room recipe that uses tuned notes and short calls across image positions.
- [x] M6-21 Verify room traversal, the listening image, and the playhead in the browser.

### Wildfires

- [x] M6-22 Draw a burn scar with charred trees, a firebreak, and a lookout with at least ten distinct motifs.
- [x] M6-23 Build a connected path through the burn scar and across the creek and show its numbered cassette banner.
- [ ] M6-24 Analyze image features in a way that detects fire-front changes, burned area, and new hot spots.
- [ ] M6-25 Apply the room recipe that maps newly active cells to crackles and Euclidean percussion with front markers.
- [x] M6-26 Verify room traversal, the listening image, and the playhead in the browser.

### Greenhouse Gases

- [x] M6-27 Draw an observatory above clouds with sampling instruments and a CO₂-shaped ridge with at least ten distinct motifs.
- [x] M6-28 Build an observatory path that follows the ridge without blocking the lane and show its numbered cassette banner.
- [ ] M6-29 Analyze image features in a way that traces plotted curves or clusters colours into four source groups.
- [ ] M6-30 Apply the room recipe that arranges organ parts with seasonal ornaments and marks the source curves.
- [x] M6-31 Verify room traversal, the listening image, and the playhead in the browser.

### Energy

- [x] M6-32 Draw a night grid with power lines, wind turbines, solar roofs, and an Earth horizon with at least ten distinct motifs.
- [x] M6-33 Build a lit walkway through the power grid and show its numbered cassette banner.
- [ ] M6-34 Analyze image features in a way that finds clustered lights and builds a minimum spanning tree between them.
- [x] M6-35 Apply the room recipe that walks the tree as synth arpeggios and highlights nodes or edges.
- [x] M6-36 Verify room traversal, the listening image, and the playhead in the browser.

### Disasters

- [x] M6-37 Draw a storm coast with an eye wall, surge barrier, and weather radar with at least ten distinct motifs.
- [x] M6-38 Build an elevated seawall route with connected entry and exit points and show its numbered cassette banner.
- [ ] M6-39 Analyze image features in a way that locates a storm centre and samples the log-polar radar sweep.
- [x] M6-40 Apply the room recipe that maps wind and lightning to cinematic voices and a rotating radar playhead.
- [x] M6-41 Verify room traversal, the listening image, and the playhead in the browser.

### Water Resources

- [x] M6-42 Draw an aquifer cutaway with a reservoir, river, strata, wells, and satellites with at least ten distinct motifs.
- [x] M6-43 Build a path connecting the reservoir and exposed hillside and show its numbered cassette banner.
- [ ] M6-44 Analyze image features in a way that samples wet areas and traces downhill runoff into basins.
- [ ] M6-45 Apply the room recipe that voices drops and basins as lo-fi resonances and draws rings and runoff paths.
- [x] M6-46 Verify room traversal, the listening image, and the playhead in the browser.

### Agriculture

- [x] M6-47 Draw patchwork fields with a barn, silo, tractor, irrigation, and satellite with at least ten distinct motifs.
- [x] M6-48 Build a continuous farm track past the field boundaries and show its numbered cassette banner.
- [ ] M6-49 Analyze image features in a way that segments neighbouring fields and reads them in alternating rows.
- [ ] M6-50 Apply the room recipe that uses field transitions for plucked melodies with plough paths and field outlines.
- [x] M6-51 Verify room traversal, the listening image, and the playhead in the browser.

### Phase verification

- [x] M6-52 Compare short renders from all nine exhibits for distinct spectra, onset rates, and pitch-class distributions.
- [x] M6-53 Run the full suite, including static mutants, and verify the curated exhibits in the live draft preview.

## M7 Lab and release

- [x] M7-01 Put a final door at the end of the museum that opens a thank-you message for visitors.
- [x] M7-02 Run the browser voices in an AudioWorklet where available, with the validated buffer player as the fallback.
- [x] M7-03 Browse the full catalog from the Lab's thumbnail strip without changing the curated exhibits.
- [x] M7-04 Edit each of the seven recipe settings using the existing arrow and touch controls.
- [x] M7-05 Play each of the seven Lab scans with an image-relative playhead and the visitor's chosen instrument and mappings.
- [x] M7-06 Round-trip a validated artifact and recipe through a URL fragment and reopen it in the Lab.
- [x] M7-07 Show readable, linkable source credits and NASA affiliation language in the liner notes.
- [x] M7-08 Verify the Lab, sharing, liner notes, and farewell in desktop and touch browsers.
- [ ] M7-09 Run the full release suite and verify the live Azure preview while keeping PR #1 in draft.
