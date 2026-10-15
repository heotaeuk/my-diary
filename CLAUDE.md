# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"TEN MINUTE PLANNER" — a Korean-language diary-style daily planner (calendar, to-dos with categories/deadlines, routines, D-DAY, comment/memo/diary, mood, photos, 10-minute timetable, weekly/monthly/yearly review, PIN lock). The app itself is a single self-contained `index.html` (inline CSS + vanilla JS); the only other app files are the PWA shell: `manifest.webmanifest`, `sw.js`, and `icons/` (`icon.svg` is the source; the PNGs were rendered from it). No build step, dependencies, package manager, linter, or tests. Git repo, pushed to the public GitHub repo `heotaeuk/my-diary` (branch `master`), served by GitHub Pages at https://heotaeuk.github.io/my-diary/.

`about.html` is a separate static self-introduction page (hero → 3 interest cards → contact footer), linked both ways with `index.html` (topbar "자기소개" button ↔ "← 플래너로 가기"). It copies the planner's CSS color tokens and shares the `planner_theme` localStorage key, so theme changes carry across pages — keep the tokens in sync if you change the palette.

`index_backup_*.html` is a stale snapshot of an older planner version — don't edit it or treat it as current.

**Run:** open `index.html` in a browser (e.g. `start index.html` on Windows). To reset state, clear the page's `localStorage` (and the `ten-minute-planner` IndexedDB for photos) in DevTools — sample data is re-seeded on next load. The service worker only registers over http(s), so offline/install behavior can only be checked on the Pages URL or a local http server.

**Deploy:** pushing `master` redeploys GitHub Pages. When you change any file listed in `sw.js` `ASSETS`, bump the `CACHE` name (`ten-minute-planner-vN`) so installed copies drop the old cache; HTML is fetched network-first, everything else cache-first.

**Verify:** there is no test suite; check changes with headless Chrome against a copy in a temp folder (inject a script that seeds `localStorage` and asserts). Headless `--window-size` can't go below about 758px, so check mobile layout by loading the page inside a 390px-wide `<iframe>`. With `--virtual-time-budget`, IndexedDB and image work run in real time while virtual time races ahead (one IDB call can "take" ~20s), so poll for the expected state instead of fixed waits, and expect 5-second toasts to expire before a slow assertion.

UI text and code comments are in Korean; keep new strings consistent with that.

## Scope rule

Do only what the user explicitly asked for. Do not add extra changes on your own judgment (refactors, new features, styling tweaks, edits to other files, etc.). If you think additional work is needed, propose it and wait for the user's approval instead of doing it.

## Architecture

### Persistence (localStorage, photos in IndexedDB)
Keys are centralized in the `KEYS` object:
- `todos` — array of `{ id, text, done, date, due?, cat? }`. `date` is a local `YYYY-MM-DD` key; legacy items without `date` are migrated to today on load. `due` is an optional local `YYYY-MM-DD` deadline set from `#dueInput` when adding (omitted entirely when empty). `renderList()` shows it as a `마감 M/D` button and adds the `overdue` class (red via `var(--red)`) when the item is not done and `due < todayKey`, or the `due-today` class (blue via `var(--blue)`) when it is not done and `due === todayKey`. Done items get neither. Items without `due` get a `+ 마감` button (`.add-due`, visible on hover like `.del`). Clicking either opens `startDueEdit()`, which swaps in a date input like `startEdit()` does for text: Enter/blur saves, Escape cancels, and saving an empty value deletes the `due` field. Optional `cat` (1–5) is a category color reusing `--c1`…`--c5`: chosen with `#catPick` in the add form (`newCat`, sticky between adds), cycled none→1…5→none by clicking the `.cat` dot (`makeCatDot(item, save)`), and used for the calendar dots (`.dots i[data-c]`).
- `planner_routines` — repeating to-dos `{ id, text, days: [0–6 weekdays], start, end?, cat?, done: { dateKey: true } }`. Created from the add form when any `#repeatPick` weekday is pressed (`newRepeat`; the form's date becomes `start`, and `#dueInput` is disabled). `routinesOn(key)` = start ≤ key ≤ end and weekday matches. They render after the date's to-dos via `routineRow()` with a `↻ 매일/평일/주말/월·수·금` badge (`repeatLabel()`). Deleting on a later day sets `end` to the previous day (past checks stay); deleting on the start day removes it. "완료 항목 삭제" never touches routines. Use `itemsOn(key)` (to-dos + routines in one shape) for progress, calendar dots, tooltip and stats.
- `planner_days` — map of date key → `{ comment, memo, diary, mood, time }`. `diary` is the DIARY textarea; `mood` is 1–5 (5 = best, see `MOODS`; 0 = none), set by the `#moodRow` emoji buttons (clicking the active one clears it) and shown in calendar cells and the tooltip. `saveDays()` prunes days with no comment, memo, diary, mood, or painted slots, so always go through `updateDay(key, patch)` / `dayData(key)` (which fills defaults) rather than touching `days` directly.
- `planner_reviews` — `{ 'W<monday key>': {good, bad, next}, 'M<YYYY-MM>': {...} }`, the weekly/monthly reflection answers; an entry whose fields are all blank is deleted.
- `planner_lock` — `{ salt, hash }` where hash = SHA-256 hex of `` `${salt}:${pin}` ``; absent = no lock.
- `planner_dday` — `{ title, date }` or absent.
- `planner_theme` — `'dark'` / `'light'`; absent means follow `prefers-color-scheme`. Applied by a small `<head>` script before first paint (sets `data-theme="dark"` on `<html>`), toggled by `#themeBtn`. Dark palette overrides the CSS vars under `:root[data-theme="dark"]` — use vars (`--field`, `--muted`, `--faint`, `--hour-bg`, …) instead of hardcoded colors so both themes work.
- `todos_seeded` / `planner_seeded` — one-time flags guarding `seed()`, which inserts sample to-dos, one sample routine, timetable blocks, and a D-DAY relative to today.

Photos live in IndexedDB database `ten-minute-planner`, store `photos` (keyPath `id`, index `date`), records `{ id, date, data, createdAt }` where `data` is a JPEG data URL shrunk to 1280px on the long side (`compressImage()`); max `MAX_PHOTOS` (6) per day. Helpers: `photosOn`, `allPhotos`, `putPhoto`, `deletePhoto`, `clearPhotos`. The photo strip under DIARY stays hidden until `photoDb()` opens; `renderPhotos()` is async and only the latest call applies (`photoRender` ticket), so call it freely after any change.

### Backup
The topbar `설정` menu (`#settingsMenu`) exports every `KEYS` value as raw localStorage strings plus all photos in `{ app: 'ten-minute-planner', version: 2, exportedAt, data, photos }` (`backupPayload()` is async; file `planner-backup-YYYY-MM-DD.json`). Import runs `isValidBackup()` (known keys only, string values, `todos`/`planner_routines` arrays, `planner_days`/`planner_reviews`/`planner_lock` objects, photos with a date key and `data:image/` data) before a confirm; version-1 files without `photos` are still accepted. `restoreBackup()` replaces all keys and photos, sets both seeded flags, and the page reloads. An invalid file changes nothing. If you add a storage key, add it to `KEYS` so it is backed up. A backup carries `planner_lock`, so restoring it brings back that PIN.

### PIN lock
A screen cover, not encryption — data stays readable in browser storage. The `<head>` script adds `html.locked` before first paint when `planner_lock` exists, which hides everything except `#lockScreen`. One keypad screen serves all modes via `openLock(mode)`: `unlock`, `set1`→`set2` (enter twice), `change` (current PIN → `set1`), `off`. While it is open a capturing `keydown` listener takes digits/Backspace and stops other shortcuts. 5 wrong tries disable the keypad for 30 s. "PIN을 잊었어요" can only wipe all planner data. The app re-locks after 5+ minutes hidden. Lock options are hidden when `crypto.subtle` is unavailable (non-secure http).

### Review (회고)
`#reviewDlg` (a `<dialog>`, opened by `#reviewBtn`) has three tabs rendered by `renderReview()`: **연간 기분** (`renderYear`: a 12-month × 31-day grid of `.px` cells colored by mood, with a hover/focus tooltip `#pxTip` inside the dialog, a legend, summary tiles, and a month table whose rows open the month tab), **주간/월간 회고** (`renderPeriod`: stat tiles, a per-day table for weeks or a mood distribution for months, and the three reflection questions). Weeks start on Monday (`weekStart()`). Mood colors are a diverging scale `--mood1`…`--mood5` (red ↔ gray ↔ blue), each arm validated for both themes; keep any other mood visual on these tokens. Clicking a cell or day row closes the dialog and calls `selectDate()`. The ←/→ date shortcut is ignored while any `dialog[open]` exists.

### Dates
All dates are local-time string keys (`toKey`, `fromKey`, `shiftKey`). Never use `toISOString()` for date keys — it would shift days across the UTC boundary (the backup's `exportedAt` timestamp is the only use). `todayKey` is a `let`: `checkDayChange()` re-reads it every minute and on tab focus, moving the selection to the new day if it was on the old today; it postpones while an input/textarea is focused. Helpers: `dayOfYear()`, `yearAgoKey()` (Feb 29 → Feb 28), `streakDays()` (consecutive days with diary or memo text, counting from today or from yesterday if today is empty), `weekStart()`, `monthKeys()`.

### Timetable model
`time` is an array of 144 slots (24h × 6 ten-minute cells); each value is a color index `0`–`5` (`0` = empty), mapped to CSS vars `--c1`…`--c5` via `.slot[data-c]`. Slot 0 is **06:00**, not midnight (`START_HOUR = 6`); use `slotIndex(hour, minute)` to convert. Painting uses pointer events: `pointerdown` snapshots the day's array into `paintTime`, `pointermove` paints via `elementFromPoint` (works for touch drag), and only `pointerup` persists via `updateDay` and triggers a full `render()`. Clicking a slot that already has the current color erases instead.

### Rendering
State lives in module-level variables (`todos`, `routines`, `days`, `reviews`, `dday`, `selectedKey`, `viewYear`/`viewMonth`, `currentColor`). `render()` rebuilds header (incl. mood row and day-of-year), D-DAY card, to-do list, calendar, timetable colors, streak, and the "1년 전 오늘" card (`renderAgo()`) from state. `renderDayFields()` (comment/memo/diary inputs) is called only from `selectDate()` — not from `render()` — so typing isn't clobbered; the memo/diary input handlers call `renderStreak()` directly. `selectDate()` also calls `renderPhotos()`.

Deleting a to-do, routine or photo, or clearing done items, shows a 5-second undo toast (`showUndo(message, restore)`); the restore callback puts items back (to-dos at their original indexes), then the undo button saves and re-renders. `showUndo(message, null)` shows a plain notice without the undo button. The timetable palette handler is scoped to `#palette` so it doesn't touch the `#catPick` swatches. Change the selected day through `selectDate(key)`, which also syncs the calendar month and the add-form date input.

DOM is built with `createElement`/`textContent` (user text is never injected via `innerHTML`); keep it that way. The only `innerHTML` use is `el.innerHTML = ''` to clear a container before rebuilding it.
