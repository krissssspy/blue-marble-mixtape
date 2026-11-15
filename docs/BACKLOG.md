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
- [ ] M3-25 The preview serves the catalog and its referenced assets, and the PR lists authored alt text and room assignments for owner review

## M4 Engine

Itemised when M3 is done.

## M5 Audio core

Itemised when M4 is done.

## M6 Rooms 1–9

Itemised when M5 is done.

## M7 Lab and release

Itemised when M6 is done.
