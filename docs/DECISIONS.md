# Decisions

Append-only. Newest last.

- 2026-11-14. Plan approved by the owner. Root commit `Added design plan` pushed to `main` by the orchestrator under the owner's identity, as the owner allowed. All later work is on `feature/museum`.
- 2026-11-14. Models. Test, code, and merge agents run on the newest Sonnet 5 release at medium effort. The review agent runs on the newest Opus 5 release at medium effort.
- 2026-11-14. Language split. Game code under `src/` is TypeScript. Scripts under `tools/` are plain ES modules (`.mjs`) so that git hooks run with bare `node` and no build step. Tests are TypeScript under `tests/`, run by Vitest.
- 2026-11-14. Coverage gate scope. The "every new line is executed by a test" gate applies to `src/` and to library modules under `tools/**/lib/`. Thin hook entry scripts are exercised by tests that spawn them as child processes.
- 2026-11-14. The merge agent does not push. The orchestrator pushes `feature/museum` after auditing each commit.
- 2026-11-14. Style mockups are kept outside the repository in an untracked `mockups/` folder, excluded through `.git/info/exclude`.
- 2026-11-14. Owner request: quality tooling. Linter is ESLint, style checker is Prettier, mutation testing is StrykerJS with the Vitest runner. `npm run check` runs linter, style checker, and type checker. From the item that adds it onward, the orchestrator runs mutation testing on the product files each item changes; CI runs it in full with a break threshold of 80.
- 2026-11-14. Split M1-03 in two. Its irregular-verb tests passed on arrival only because the validator still accepted everything, so they could not be shown red. The rejection rule is now M1-03 and the irregular-verb list is M1-03b, each with its own red, green, and commit.
