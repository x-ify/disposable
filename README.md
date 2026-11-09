# Disposable

Small tools people actually use, shared so others can run them or rebuild them with their own agent. The site, disposable.xify.kr, lists what is merged here.

## Share a tool

The easiest way is to ask your agent. Install the Disposable skill from `skills/disposable` (for example `npx skills add x-ify/disposable`), then say:

> Share this tool on Disposable.

The skill interviews you, writes `tools/<slug>/DISPOSABLE.md`, shows you every file, and opens a pull request only after you approve. No GitHub account yet? The skill walks you through creating one.

You can also open a pull request yourself: add a folder `tools/<slug>/` following [FORMAT.md](FORMAT.md).

## What happens next

- Automatic checks run the same rules as `skills/disposable/scripts/check.mjs`: format, size limits, file types and risk signals.
- The Disposable team reviews and merges. Your GitHub account is shown as the publisher; only the listed `maintainers` change the folder later.
- Choose an open license (CC0-1.0, CC-BY-4.0, MIT or Apache-2.0). Removing a tool later does not remove it from git history, so never include personal data or secrets.
- Checks are limited static text checks. Merging is not a safety guarantee.

## Use or rebuild a tool

Give your agent the tool's link with the skill installed. It downloads the tool, shows you the full text and any risk signals, and waits for your yes before each step that changes something.

Questions and "I tried it" or "I rebuilt it" notes go to this repository's issues.
