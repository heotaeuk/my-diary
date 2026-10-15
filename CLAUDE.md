# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"TEN MINUTE PLANNER" — a Korean-language daily planner (calendar, to-dos, D-DAY, comment/memo, 10-minute timetable). The entire app is a single self-contained `index.html` (inline CSS + vanilla JS). No build step, dependencies, package manager, linter, or tests; not a git repo.

`about.html` is a separate static self-introduction page (hero → 3 interest cards → contact footer), linked both ways with `index.html` (topbar "자기소개" button ↔ "← 플래너로 가기"). It copies the planner's CSS color tokens and shares the `planner_theme` localStorage key, so theme changes carry across pages — keep the tokens in sync if you change the palette.

`index_backup_*.html` is a stale snapshot of an older planner version — don't edit it or treat it as current.

**Run:** open `index.html` in a browser (e.g. `start index.html` on Windows). To reset state, clear the page's `localStorage` in DevTools — sample data is re-seeded on next load.

UI text and code comments are in Korean; keep new strings consistent with that.

## Scope rule

Do only what the user explicitly asked for. Do not add extra changes on your own judgment (refactors, new features, styling tweaks, edits to other files, etc.). If you think additional work is needed, propose it and wait for the user's approval instead of doing it.

## Architecture

### Persistence (localStorage only)
Keys are centralized in the `KEYS` object:
- `todos` — array of `{ id, text, done, date, due? }`. `date` is a local `YYYY-MM-DD` key; legacy items without `date` are migrated to today on load. `due` is an optional local `YYYY-MM-DD` deadline set from `#dueInput` when adding (omitted entirely when empty). `renderList()` shows it as a `마감 M/D` button and adds the `overdue` class (red via `var(--red)`) when the item is not done and `due < todayKey`, or the `due-today` class (blue via `var(--blue)`) when it is not done and `due === todayKey`. Done items get neither. Items without `due` get a `+ 마감` button (`.add-due`, visible on hover like `.del`). Clicking either opens `startDueEdit()`, which swaps in a date input like `startEdit()` does for text: Enter/blur saves, Escape cancels, and saving an empty value deletes the `due` field.
- `planner_days` — map of date key → `{ comment, memo, time }`. `saveDays()` prunes days with no comment, memo, or painted slots, so always go through `updateDay(key, patch)` / `dayData(key)` (which fills defaults) rather than touching `days` directly.
- `planner_dday` — `{ title, date }` or absent.
- `planner_theme` — `'dark'` / `'light'`; absent means follow `prefers-color-scheme`. Applied by a small `<head>` script before first paint (sets `data-theme="dark"` on `<html>`), toggled by `#themeBtn`. Dark palette overrides the CSS vars under `:root[data-theme="dark"]` — use vars (`--field`, `--muted`, `--faint`, `--hour-bg`, …) instead of hardcoded colors so both themes work.
- `todos_seeded` / `planner_seeded` — one-time flags guarding `seed()`, which inserts sample to-dos, timetable blocks, and a D-DAY relative to today.

### Dates
All dates are local-time string keys (`toKey`, `fromKey`, `shiftKey`). Never use `toISOString()` — it would shift days across the UTC boundary.

### Timetable model
`time` is an array of 144 slots (24h × 6 ten-minute cells); each value is a color index `0`–`5` (`0` = empty), mapped to CSS vars `--c1`…`--c5` via `.slot[data-c]`. Slot 0 is **06:00**, not midnight (`START_HOUR = 6`); use `slotIndex(hour, minute)` to convert. Painting uses pointer events: `pointerdown` snapshots the day's array into `paintTime`, `pointermove` paints via `elementFromPoint` (works for touch drag), and only `pointerup` persists via `updateDay` and triggers a full `render()`. Clicking a slot that already has the current color erases instead.

### Rendering
State lives in module-level variables (`todos`, `days`, `dday`, `selectedKey`, `viewYear`/`viewMonth`, `currentColor`). `render()` rebuilds header, D-DAY card, to-do list, calendar, and timetable colors from state. `renderDayFields()` (comment/memo inputs) is called only from `selectDate()` — not from `render()` — so typing isn't clobbered. Change the selected day through `selectDate(key)`, which also syncs the calendar month and the add-form date input.

DOM is built with `createElement`/`textContent` (user text is never injected via `innerHTML`); keep it that way. The only `innerHTML` use is `el.innerHTML = ''` to clear a container before rebuilding it.
