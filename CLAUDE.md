# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"TEN MINUTE PLANNER" — a Korean-language diary-style daily planner (calendar, to-dos with categories/deadlines, D-DAY, comment/memo/diary, mood, 10-minute timetable). The entire app is a single self-contained `index.html` (inline CSS + vanilla JS). No build step, dependencies, package manager, linter, or tests. Git repo, pushed to the public GitHub repo `heotaeuk/my-diary` (branch `master`).

`about.html` is a separate static self-introduction page (hero → 3 interest cards → contact footer), linked both ways with `index.html` (topbar "자기소개" button ↔ "← 플래너로 가기"). It copies the planner's CSS color tokens and shares the `planner_theme` localStorage key, so theme changes carry across pages — keep the tokens in sync if you change the palette.

`index_backup_*.html` is a stale snapshot of an older planner version — don't edit it or treat it as current.

**Run:** open `index.html` in a browser (e.g. `start index.html` on Windows). To reset state, clear the page's `localStorage` in DevTools — sample data is re-seeded on next load.

**Verify:** there is no test suite; check changes with headless Chrome against a copy in a temp folder (inject a script that seeds `localStorage` and asserts). Headless `--window-size` can't go below about 758px, so check mobile layout by loading the page inside a 390px-wide `<iframe>`.

UI text and code comments are in Korean; keep new strings consistent with that.

## Scope rule

Do only what the user explicitly asked for. Do not add extra changes on your own judgment (refactors, new features, styling tweaks, edits to other files, etc.). If you think additional work is needed, propose it and wait for the user's approval instead of doing it.

## Architecture

### Persistence (localStorage only)
Keys are centralized in the `KEYS` object:
- `todos` — array of `{ id, text, done, date, due? }`. `date` is a local `YYYY-MM-DD` key; legacy items without `date` are migrated to today on load. `due` is an optional local `YYYY-MM-DD` deadline set from `#dueInput` when adding (omitted entirely when empty). `renderList()` shows it as a `마감 M/D` button and adds the `overdue` class (red via `var(--red)`) when the item is not done and `due < todayKey`, or the `due-today` class (blue via `var(--blue)`) when it is not done and `due === todayKey`. Done items get neither. Items without `due` get a `+ 마감` button (`.add-due`, visible on hover like `.del`). Clicking either opens `startDueEdit()`, which swaps in a date input like `startEdit()` does for text: Enter/blur saves, Escape cancels, and saving an empty value deletes the `due` field. Optional `cat` (1–5) is a category color reusing `--c1`…`--c5`: chosen with `#catPick` in the add form (`newCat`, sticky between adds), cycled none→1…5→none by clicking the `.cat` dot in the list, and used for the calendar dots (`.dots i[data-c]`).
- `planner_days` — map of date key → `{ comment, memo, diary, mood, time }`. `diary` is the DIARY textarea; `mood` is 1–5 (5 = best, see `MOODS`; 0 = none), set by the `#moodRow` emoji buttons (clicking the active one clears it) and shown in calendar cells and the tooltip. `saveDays()` prunes days with no comment, memo, diary, mood, or painted slots, so always go through `updateDay(key, patch)` / `dayData(key)` (which fills defaults) rather than touching `days` directly.
- `planner_dday` — `{ title, date }` or absent.
- `planner_theme` — `'dark'` / `'light'`; absent means follow `prefers-color-scheme`. Applied by a small `<head>` script before first paint (sets `data-theme="dark"` on `<html>`), toggled by `#themeBtn`. Dark palette overrides the CSS vars under `:root[data-theme="dark"]` — use vars (`--field`, `--muted`, `--faint`, `--hour-bg`, …) instead of hardcoded colors so both themes work.
- `todos_seeded` / `planner_seeded` — one-time flags guarding `seed()`, which inserts sample to-dos, timetable blocks, and a D-DAY relative to today.

### Backup
The topbar `백업` menu exports every `KEYS` value as raw localStorage strings in `{ app: 'ten-minute-planner', version: 1, exportedAt, data }` (`backupPayload()`, file `planner-backup-YYYY-MM-DD.json`). Import runs `isValidBackup()` (known keys only, string values, `todos` must be an array, `planner_days` an object) before a confirm; `restoreBackup()` then replaces all keys, sets both seeded flags, and the page reloads. An invalid file changes nothing. If you add a storage key, add it to `KEYS` so it is backed up.

### Dates
All dates are local-time string keys (`toKey`, `fromKey`, `shiftKey`). Never use `toISOString()` for date keys — it would shift days across the UTC boundary (the backup's `exportedAt` timestamp is the only use). `todayKey` is a `let`: `checkDayChange()` re-reads it every minute and on tab focus, moving the selection to the new day if it was on the old today; it postpones while an input/textarea is focused. Helpers: `dayOfYear()`, `yearAgoKey()` (Feb 29 → Feb 28), `streakDays()` (consecutive days with diary or memo text, counting from today or from yesterday if today is empty).

### Timetable model
`time` is an array of 144 slots (24h × 6 ten-minute cells); each value is a color index `0`–`5` (`0` = empty), mapped to CSS vars `--c1`…`--c5` via `.slot[data-c]`. Slot 0 is **06:00**, not midnight (`START_HOUR = 6`); use `slotIndex(hour, minute)` to convert. Painting uses pointer events: `pointerdown` snapshots the day's array into `paintTime`, `pointermove` paints via `elementFromPoint` (works for touch drag), and only `pointerup` persists via `updateDay` and triggers a full `render()`. Clicking a slot that already has the current color erases instead.

### Rendering
State lives in module-level variables (`todos`, `days`, `dday`, `selectedKey`, `viewYear`/`viewMonth`, `currentColor`). `render()` rebuilds header (incl. mood row and day-of-year), D-DAY card, to-do list, calendar, timetable colors, streak, and the "1년 전 오늘" card (`renderAgo()`) from state. `renderDayFields()` (comment/memo/diary inputs) is called only from `selectDate()` — not from `render()` — so typing isn't clobbered; the memo/diary input handlers call `renderStreak()` directly.

Deleting a to-do or clearing done items shows a 5-second undo toast (`showUndo(message, restore)`); the restore callback re-inserts items at their original indexes, then the undo button saves and re-renders. The timetable palette handler is scoped to `#palette` so it doesn't touch the `#catPick` swatches. Change the selected day through `selectDate(key)`, which also syncs the calendar month and the add-form date input.

DOM is built with `createElement`/`textContent` (user text is never injected via `innerHTML`); keep it that way. The only `innerHTML` use is `el.innerHTML = ''` to clear a container before rebuilding it.
