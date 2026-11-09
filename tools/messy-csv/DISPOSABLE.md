---
title: Make a messy CSV easier to read
summary: Trim extra spaces and flag duplicate rows while keeping the original data untouched.
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
tags: csv, spreadsheets, data, cleanup
art: table
---

## Result

name, city
" Ana "," Seoul "
→
name,city
Ana,Seoul

Duplicates: 2 flagged, not deleted.

## Before you start

An AI coding tool, a CSV with made-up sample data, and a spreadsheet app for checking the output.

## Quick start

1. Give your AI the recipe and a sample header.
2. Test quoted commas, empty cells and non-English text.
3. Compare row counts and open the output in a spreadsheet.

## Rebuild

Build a local CSV cleaner for one exported table. Let me choose a file and encoding. Parse CSV correctly, including quotes, embedded newlines and commas; do not split lines or commas manually. Trim leading and trailing spaces in text cells. Preserve leading zeros, date strings, blank cells and row order. Flag exact duplicate rows in a separate report without deleting them. Export a new file and show input/output row counts. Do not modify the original, upload data or evaluate spreadsheet formulas. Flag cells starting with =, +, - or @ and ask how to export them safely. Test with entirely invented data, including Korean, Japanese and Chinese text.

## Limits

CSV dialects vary. Review encoding, delimiters, leading zeros and formula-like values. Do not use real personal data during development.
