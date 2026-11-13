# Disposable

Small tools people actually use, shared so others can run them or rebuild them with their own agent. Every tool here is an **[Open Disposable](OPEN-DISPOSABLE.md)**: open source shares code to maintain together; Open Disposables share what worked, to rebuild on your own. This repository is the single source of tools and format/risk rules. Merges publish an index that the site, disposable.xify.kr, reads at runtime (cached for 10 minutes); no site redeploy is needed. Network failures use the site’s bundled snapshot.

## Share a tool

The easiest way is to ask your agent. Install the Disposable skill from `skills/disposable` (for example `npx skills add x-ify/disposable`), then say:

> Share this tool on Disposable.

The skill interviews you, writes `tools/<slug>/DISPOSABLE.md`, shows you every file, and opens a pull request only after you approve. No GitHub account yet? The skill walks you through creating one.

You can also open a pull request yourself: add a folder `tools/<slug>/` following [FORMAT.md](FORMAT.md).

A tool is a program, a recipe, a skill or a rule (an instruction file an agent always follows, such as `AGENTS.md`). A skill needs only its `SKILL.md` and a short registration in `DISPOSABLE.md`, so a skill listed on skills.sh that you use can be shared this way: it is linked at a pinned commit when its license allows, and its author is asked for nothing. Hidden files and folders (names starting with `.`) are not accepted.

## What happens next

- Automatic checks run the same rules as `skills/disposable/scripts/check.mjs` (format, size limits, file types and risk signals) and reject hidden files.
- The Disposable team reviews and merges. Your GitHub account is shown as the publisher; only the listed `maintainers` change the folder later.
- License: by default CC0-1.0 for text you wrote and MIT for code; something from another repository keeps its own license, which must be CC0-1.0, CC-BY-4.0, MIT or Apache-2.0. By opening a pull request you confirm you may share it; Disposable republishes merged tools under their license with attribution. Removing a tool later does not remove it from git history, so never include personal data or secrets.
- Checks are limited static text checks. Merging is not a safety guarantee.

## Use or rebuild a tool

Give your agent the tool's link with the skill installed. It downloads the tool, shows you the full text and any risk signals, and waits for your yes before each step that changes something. A skill is installed with the pinned `npx skills add` command on its page, after you have read its `SKILL.md`.

Questions and "I tried it" or "I rebuilt it" notes go to this repository's issues.

## Index pipeline

`main` → **Publish index** → [`index/registry.json`](https://raw.githubusercontent.com/x-ify/disposable/index/registry.json). The deterministic index records the source commit; failed validation publishes nothing. Run `node --test .github/scripts/*.test.mjs` to test the rules and build, or `node .github/scripts/build-index.mjs build` to build locally. See [MAINTAINING.md](MAINTAINING.md) for reviews and operation.
