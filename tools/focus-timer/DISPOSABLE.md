---
title: A focus timer for one afternoon
summary: Make a quiet browser timer with just the intervals and controls you need.
type: recipe
mode: ai
device: any
language: en
license: CC0-1.0
maintainers: x-ify
author: Disposable · original starter recipe
added: 2026-11-09
cost: Your AI coding tool may require a paid plan. The resulting local tool has no specified hosting cost.
support: Starter example; questions are welcome, with no ongoing support commitment.
tags: timer, focus, study, browser
art: timer
---

## Result

Focus 25:00 → Break 05:00
Start / Pause / Reset
No account. No streaks.

## Before you start

An AI coding tool and a browser. The finished page can be opened locally.

## Quick start

1. Choose your focus and break lengths.
2. Generate a standalone HTML page using the recipe.
3. Test pause, resume, reset and a background tab.

## Rebuild

Create one standalone HTML file for a focus timer. Ask for focus and break durations, then show Start, Pause, Resume and Reset controls with explicit timer states. Calculate remaining time from timestamps rather than decrementing a counter, so background tab throttling does not accumulate timing drift. Do not start the next interval automatically. Make the interface keyboard accessible and respect reduced motion. Keep it offline without analytics, accounts or persistent records. Sound is optional and off by default. Explain that a sleeping device or closed tab can prevent alerts. Test with a ten-second interval and a one-second pause/resume sequence.

## Limits

Browsers and sleeping devices can delay alerts. It is unsuitable for tasks requiring guaranteed timing.
