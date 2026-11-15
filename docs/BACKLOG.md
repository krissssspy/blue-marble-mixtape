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
- [ ] M2-06 The pull request checks also build the site

## M3 Ingest

Itemised when M2 is done.

## M4 Engine

Itemised when M3 is done.

## M5 Audio core

Itemised when M4 is done.

## M6 Rooms 1–9

Itemised when M5 is done.

## M7 Lab and release

Itemised when M6 is done.
