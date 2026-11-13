# Maintaining the Disposable registry

For the Disposable team. Contributors only need [README.md](README.md) and [FORMAT.md](FORMAT.md).

## When the repository is created

1. Create a **public** repository and push this folder as its root (`tools/`, `skills/`, `.github/`, `FORMAT.md`, `README.md`, `reviewed.json`, this file).
2. Replace `@OWNER` in `.github/CODEOWNERS` with the team (a user or `@org/team`), and list the team's logins in `.github/team.txt`.
3. Set `metadata.repository` in `skills/disposable/SKILL.md` to `owner/name`.
4. Protect `main`:
   - require a pull request (no approving review is required while the team is one person; raise this when a second maintainer joins);
   - require the `check` status from "Check tools";
   - block force pushes and deletion;
   - administrator bypass stays technically available (`enforce_admins: false`), but merges go through the normal path: open a pull request and merge it once `check` passes.
5. Actions settings:
   - require approval to run workflows for **first-time contributors who are new to GitHub** (the GitHub default). A fork pull request runs only **Check tools**, which reads it as data with the base branch's rules; **Test registry** skips forks, so no fork code runs;
   - default workflow permissions: read repository contents.
6. Create the labels `question`, `tried-it` and `rebuilt-it`. `tool:<slug>` labels are created automatically.
7. Point the site at the repository: set `REGISTRY_REPO` to `https://github.com/owner/name`.

## Reviewing a pull request

- The "Check tools" summary lists problems (must be fixed) and notes (risk signals, more than one tool).
- Read every changed file. The check is a limited text check; a risk signal is a reason to read closely, not a verdict.
- A skill registration with an external `source` is checked without reading that source. Open it at `source_commit` under `source_path`, read its `SKILL.md`, and confirm the license, `author` and `origin`. After merge, the index build holds the skill if that `SKILL.md` is missing or breaks the format.
- A maintainer of a tool may change it; anyone else needs that maintainer's approval or the team's.
- Merge triggers **Publish index**. It validates folders with the skill checker, inspects pinned external sources, applies `reviewed.json`, and builds a deterministic `registry.json` with `source.repo` and `source.commit`.
- Only after a successful build does the workflow replace the orphan `index` branch with that one file, authored by `github-actions[bot]`. A failed build leaves the last published index intact. The concurrency group serializes publication; only `main` may publish.
- The site fetches https://raw.githubusercontent.com/x-ify/disposable/index/registry.json at runtime with a 10-minute cache, so a merged tool appears after publication and cache refresh without a site redeploy. On network or malformed-index failures it uses its bundled snapshot.
- **Test registry** runs `node --test .github/scripts/*.test.mjs` on main pushes and on PRs from branches of this repository, with a read-only token; it skips PRs from forks, which would run their own copy of the scripts. **Check tools** still judges PR files using the base branch rules. All actions are pinned to commit SHAs.
- To retry publication, dispatch **Publish index** on main. To reproduce locally: Node 22+, `node --test .github/scripts/*.test.mjs`, then `node .github/scripts/build-index.mjs build`. The generated file is ignored on main; do not edit the index branch by hand.

## Clearing a held tool

A tool with a risk signal stays off the site until it is reviewed. Review it before merging, so it appears as soon as it merges:

1. The pull request check's notes give the tool's `version` and `findings` (the same version the index build computes). For a tool already merged, run `node .github/scripts/build-index.mjs build` instead.
2. If the signals are needed and safe in context, add to `reviewed.json`:

   ```json
   { "tools": { "<slug>": { "version": "<12 hex>", "findings": ["secret-access"], "reason": "Creates a new key for the person; never reads or sends an existing one.", "reviewer": "<login>" } } }
   ```

3. Merge that change through its own pull request first, then update the tool's pull request branch (the version covers only the folder, so it does not change) and merge it. Any later change to the tool's folder changes its version and needs a new review.

A review cannot clear a tool held because its external `source` could not be read, or because a skill's `SKILL.md` there is missing or breaks the format (`sourceError`; the reason is in `sourceProblem` and printed by the build as `held:`). Its maintainers fix `source_commit` or `source_path` in a new pull request.

## Removing a tool

Requests come through the site's private feedback form. Never ask anyone to repeat the material in public. No response time is promised.

1. **Every case: take it down going forward.** Hide the tool on the site's admin screen right away (its download stops too) and give the reason, then delete its folder in a pull request. It leaves the site and the index after publication and cache refresh, but stays in git history, in forks and behind install links pinned to earlier commits.
2. **Personal data, a secret or a legal request: also remove it from history.** Rewrite history to drop the files, allow force pushes on `main` only for that push, then restore the protection. Ask GitHub Support to purge cached views and pull request references ([removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)). Copies in forks remain, and install links pinned to the rewritten commits break.
3. **A secret** is never safe again once published: tell the person to revoke or rotate it first, whatever happens to the history.
4. **A copyright claim** goes through GitHub's [DMCA takedown policy](https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy); the team hides the tool on the site meanwhile.
