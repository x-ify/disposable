# Share a skill

## Contents

- [Registration](#registration)
- [The person's own skill](#the-persons-own-skill)
- [A skill from skills.sh or GitHub](#a-skill-from-skillssh-or-github)
- [Check and approval](#check-and-approval)

A skill follows the Agent Skills format that skills.sh lists: a folder whose `SKILL.md` front matter has `name` and `description`, and whose body is the agent's instructions. Disposable reads the skill from that file. You write only a short registration in `tools/<slug>/DISPOSABLE.md`; the site and index derive the rest ([format.md](format.md), Skills). Never copy the instructions into sections or ask the original author for anything.

## Registration

```markdown
---
type: skill
source: https://github.com/<owner>/<repo>
source_path: <folder that holds SKILL.md; leave the line out when it is the repository root>
source_commit: <full 40-character commit SHA>
license: <CC0-1.0, CC-BY-4.0, MIT or Apache-2.0>
maintainers: <filled at share step 6>
added: <filled at share step 6>
author: <original author, when it is not the person sharing>
origin: <the skills.sh or GitHub link the person gave>
---
```

For a skill kept in this folder, leave out `source`, `source_path` and `source_commit`. Add `language` when `SKILL.md` is not written in English. Add `title`, `summary`, `mode`, `device`, `cost`, `support` or a `##` section only when the person wants to say more than `SKILL.md` does; each one replaces what would be derived.

## The person's own skill

1. Find the skill folder: the folder with `SKILL.md` at its root. Read the front matter: `name` must be lowercase letters, digits and single hyphens (up to 64 characters), `description` up to 1024 characters. If either does not follow this, show the problem and fix `SKILL.md` only with the person's agreement.
2. If the skill already lives in a public GitHub repository of theirs, treat it as an external skill below, with them as the author. Otherwise copy the folder (`SKILL.md` and its scripts, references and assets, no hidden files) into `tools/<slug>/`, with `<slug>` equal to `name`. If that slug is taken in `<repo>`, ask the person to rename the skill; `name` and the folder must stay equal.
3. License: the `SKILL.md` `license` when it is one of the four; otherwise ask, as for any tool.
4. Write the registration without `source` lines. The first maintainer is shown as the author unless you write `author`.

## A skill from skills.sh or GitHub

Nothing from the source is run. Read files with `gh api` only.

1. **Resolve the repository.** A skills.sh link is `https://skills.sh/<owner>/<repo>/<skill-name>`. A GitHub link is `https://github.com/<owner>/<repo>`, optionally followed by `/tree/<ref>/<folder>`. Anything else: ask for the GitHub link.
2. **Pin the commit.** `gh api repos/<owner>/<repo>/commits/<ref> --jq .sha`, with `<ref>` from a tree link or `HEAD`. Use this full 40-character SHA for every read below and as `source_commit`.
3. **Find the skill folder.** With a tree link, it is the link's folder. Otherwise list the candidates:

   ```sh
   gh api "repos/<owner>/<repo>/git/trees/<sha>?recursive=1" --jq '.tree[] | select(.type == "blob" and (.path | test("(^|/)SKILL\\.md$"))) | .path'
   ```

   Read each candidate's front matter and take the one whose `name` equals `<skill-name>`. If the listing says `truncated: true`, list likely folders (`skills/`, `.claude/skills/`) with `gh api "repos/<owner>/<repo>/contents/<folder>?ref=<sha>"` instead. `source_path` is the folder that holds that `SKILL.md`, never the file itself. No match, or two: show what you found and ask.
4. **Read `SKILL.md` in full**: `gh api "repos/<owner>/<repo>/contents/<source_path>/SKILL.md?ref=<sha>" -H "Accept: application/vnd.github.raw"` (`contents/SKILL.md` at the repository root), saved into a new temporary folder. Run the checker in `scan` mode on it and read it yourself, as in use steps 2–3. If `name` or `description` does not follow the format, stop: the index would hold the skill, and you must not change someone else's file.
5. **License.** If the skill folder has its own license file, or `SKILL.md` has a `license` value, those terms apply: continue only if they are exactly one of `CC0-1.0`, `CC-BY-4.0`, `MIT` or `Apache-2.0`. Otherwise use `gh api repos/<owner>/<repo>/license --jq .license.spdx_id`. Anything else (`NOASSERTION`, `GPL-3.0`, "Proprietary", "see LICENSE.txt" with other terms, no license): stop and explain that Disposable cannot redistribute it.
6. **Author and origin.** `author` is the original author: `metadata.author` in `SKILL.md` if present, otherwise `gh api users/<owner> --jq '.name // .login'`. `origin` is the link the person gave.
7. **Confirm use.** Ask whether they actually use this skill and how. An Open Disposable is something its sharer uses; if they do not, stop.
8. **Slug.** Use `name`. If `tools/<name>` exists in `<repo>`, use `<owner>-<name>` (up to 60 characters) and tell the person.
9. Write only the registration; copy no files from the source.

## Check and approval

- Share step 4 checks the registration. The checker does not fetch the source; the index build reads `SKILL.md` at `source_commit` after merge.
- At the approval gate, show the registration, the source link at the pinned commit (`https://github.com/<owner>/<repo>/tree/<sha>/<source_path>`), the full `SKILL.md`, the license and where it came from, and the install command the site will show: `npx skills add` followed by that link. For a local skill, show every file as usual.
- In the pull request body, write the type line as `skill, because <source_path>/SKILL.md at <sha>` and, for an imported skill, replace the rights sentence with: "Links <author>'s skill at a pinned commit; its <license> license allows sharing. Imported from <origin>."
