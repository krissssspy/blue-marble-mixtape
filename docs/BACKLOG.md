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
- [ ] M1-11 `npm run format:check` runs the style checker (Prettier) over the repository and passes
- [ ] M1-12 `npm run check` runs the linter, the style checker, and the type checker, and passes
- [ ] M1-13 `npm run mutation` runs mutation testing (StrykerJS with the Vitest runner) over `src/` and `tools/**/lib/` and fails below a mutation score of 80
- [ ] M1-14 The CI workflow runs check, tests, mutation testing, and the history audit on every pull request
- [ ] M1-15 `npm install` points `core.hooksPath` at `tools/hooks`

## M2 Deploy

Itemised when M1 is done. Needs owner steps U2 and U5.

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
