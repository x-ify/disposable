# Maintaining the Disposable registry

For the Disposable team. Contributors only need [README.md](README.md) and [FORMAT.md](FORMAT.md).

## When the repository is created

1. Create a **public** repository and push this folder as its root (`tools/`, `skills/`, `.github/`, `FORMAT.md`, `README.md`, `reviewed.json`, this file).
2. Replace `@OWNER` in `.github/CODEOWNERS` with the team (a user or `@org/team`), and list the team's logins in `.github/team.txt`.
3. Set `metadata.repository` in `skills/disposable/SKILL.md` to `owner/name`.
4. Protect `main`:
   - require a pull request with one approving review and CODEOWNERS review;
   - require the `check` status from "Check tools";
   - block force pushes and deletion;
   - leave administrator bypass available for the sole owner (`enforce_admins: false`). This means the owner can bypass the review and check requirements.
5. Actions settings:
   - require approval to run workflows for **all external contributors**;
   - default workflow permissions: read repository contents.
6. Create the labels `question`, `tried-it` and `rebuilt-it`. `tool:<slug>` labels are created automatically.
7. Point the site at the repository: set `REGISTRY_REPO` to `https://github.com/owner/name`.

## Reviewing a pull request

- The "Check tools" summary lists problems (must be fixed) and notes (risk signals, more than one tool).
- Read every changed file. The check is a limited text check; a risk signal is a reason to read closely, not a verdict.
- A maintainer of a tool may change it; anyone else needs that maintainer's approval or the team's.
- Merge approves the published registry copy. The site currently builds from the monorepo working copy; sync the approved contents there and rebuild the index until repository ingestion is implemented.

## Clearing a held tool

A tool with a risk signal is merged but stays off the site until it is reviewed.

1. Build the index and note the tool's `version` and `findings`.
2. If the signals are needed and safe in context, add to `reviewed.json`:

   ```json
   { "tools": { "<slug>": { "version": "<12 hex>", "findings": ["secret-access"], "reason": "Creates a new key for the person; never reads or sends an existing one.", "reviewer": "<login>" } } }
   ```

3. Merge that change through a reviewed pull request. Any later change to the tool's folder changes its version and needs a new review.

## Removing a tool

Delete the folder in a pull request. It disappears from the site on the next build but stays in git history. If content must leave history too (rights or personal data), that needs a history rewrite and a force push, decided case by case.
