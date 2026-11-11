# DISPOSABLE.md format

Every shared tool is an [Open Disposable](OPEN-DISPOSABLE.md): a folder `tools/<slug>/` with a `DISPOSABLE.md` file and, optionally, its materials.
The pull request check (`.github/scripts/pr-check.mjs`) enforces everything below. The site only shows merged tools.

## Folder

- `<slug>`: lowercase letters, digits and single hyphens, up to 60 characters. It never changes after merge.
- Up to 100 files and 1 MiB in total. Text files must be UTF-8.
- Up to 3 images (`.png`, `.jpg`, `.jpeg`, `.webp`), each up to 1 MiB. SVG is not accepted.
- No executables, libraries or archives. Large or compiled programs stay in their own GitHub repository and are linked with `source`.
- A `skill` keeps its `SKILL.md` in this folder, or links an external repository with `source`.

## Front matter

Flat `key: value` lines between `---` markers. Lists are comma separated.

| Key | Required | Value |
| --- | --- | --- |
| `title` | yes | What it gets done, up to 100 characters |
| `summary` | yes | One sentence, up to 240 characters |
| `type` | yes | `program`, `recipe` or `skill` |
| `mode` | yes | `browser`, `local`, `ai` or `source` |
| `device` | yes | `any`, `windows`, `mac`, `linux` or `mobile` |
| `language` | yes | Original language: `en`, `ko`, `zh-Hans`, `zh-Hant` or `ja` |
| `license` | yes | `CC0-1.0`, `CC-BY-4.0`, `MIT` or `Apache-2.0` |
| `maintainers` | yes | GitHub logins allowed to change this folder. The first is shown as the publisher |
| `author` | yes | Original author or attribution, up to 100 characters |
| `added` | yes | `YYYY-MM-DD`, set by the first pull request |
| `cost` | yes | What it may cost to use or rebuild |
| `support` | yes | Whether the maker answers questions |
| `tags` | no | Up to 150 characters |
| `origin` | no | `https://` link to what this is based on |
| `live` | no | `https://` link where it already runs |
| `source` | no | `https://github.com/owner/repo` for code kept elsewhere |
| `source_path` | no | Folder inside `source` |
| `source_commit` | with `source` | Full 40-character commit SHA that was reviewed |
| `art` | no | Thumbnail style: `files`, `table`, `draw`, `notes`, `timer` or `text` |

## Sections

These `##` headings, in any order. Write the content in the tool's original language.

| Heading | Required | What to write |
| --- | --- | --- |
| `## Result` | yes | Example input and output, as plain text |
| `## Before you start` | yes | What someone needs first |
| `## Quick start` | yes | About three steps to use it |
| `## Rebuild` | yes | Enough of a spec or recipe that someone's own agent can build it again. For a recipe, this is the recipe |
| `## Limits` | yes | What it does not handle |

## Changes and ownership

- A pull request that changes `tools/<slug>/` must come from someone in `maintainers`, or be approved by one of them or by the Disposable team.
- Removing a tool from `main` does not remove it from git history. Do not include personal data or secrets.
- Merging is not a safety guarantee. Checks are limited static text checks.
- A tool with a risk signal is held off the site until the Disposable team records a review for that exact content in `reviewed.json`. Any later change needs a new review.
