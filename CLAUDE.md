# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MatchTracker is a streamlined reloading tracker for long-range rifle competition. The owner shoots PRS and ELR steel matches (e.g. the Nightforce ELR Steel Challenge) and uses an iPhone.

It exists because other reloading apps demand too much input up front. The owner's process is fixed and does not change per batch; they care about charge weight, bullet weight and perhaps brass, and consider the shooter and conditions the biggest variables in a match. The workflow is three steps:

1. Build a few loads (batches of ammunition) that differ in a small way, usually charge weight.
2. Compare them using chronograph data imported from Garmin ShotView plus a rough group size and notes.
3. Record which load was used at which match.

Design rule that follows from this: **never add a required field or a setup step.** A load needs only a charge weight, bullet type and bullet weight (the owner made the bullet mandatory: it defines the external ballistics, and they need the weight to hand when setting up the chronograph). Everything else is optional, free text where possible, and prefilled from the previous load. Do not add separate records for rifles, barrels, component lots, brass firings or anything else that must be set up before a load can be created; an earlier model had these and was removed for this reason. Ask the owner before adding a new thing to measure.

Status: steps 1 and 2 are built (loads list with comparison table, load form, load detail with ShotView import). Step 3, matches, has types and tables but no screens.

## Commands

- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc -b`) then production build
- `npm run typecheck` — typecheck only
- `npm run lint` — oxlint
- `npm test` — run all tests once (Vitest)
- `npx vitest run src/domain/stats.test.ts` — one file
- `npx vitest run -t "single shot"` — tests matching a name
- `npx vitest` — watch mode

## Architecture

Installable, offline-first web app: React + TypeScript + Vite, data in IndexedDB via Dexie, service worker via `vite-plugin-pwa`. There is no server. It is used at matches where signal is unreliable, so every feature must work with no network.

It is mobile-first, and the primary target is an iPhone: the owner installs it from Safari with Add to Home Screen. Design screens for a phone held in one hand first and treat desktop as secondary. Check that any browser API works in iOS Safari before relying on it (Web Bluetooth, for example, does not). If App Store distribution or native device access is needed later, the planned route is wrapping this same app with Capacitor, not a rewrite.

It is single-user today but may be opened to other shooters later. Three rules keep that door open:

- `src/domain/` is plain types and pure functions (statistics, ShotView parsing, load grouping). It imports nothing from `src/data/` or React.
- `src/data/` is the only code that touches Dexie. Screens in `src/ui/` read through the live-query hooks in `hooks.ts` and write through the `Store` in `store.ts`, so a sync backend can be added behind them.
- Every stored record extends `Entity`: a UUID `id` generated on the device, `createdAt`/`updatedAt` ISO strings, and `deletedAt` for soft deletes. Create records with `newEntity()` and change them with `touch()` from `src/data/entity.ts`; do not use auto-increment keys or hard deletes.

Navigation is a `Route` value held in `App.tsx` state (`src/ui/nav.ts`); there is no router library or URL routing. Styling is plain CSS in `src/index.css` with light and dark themes from CSS variables.

The loads screen is the comparison view: `groupLoads()` puts loads sharing rifle, bullet and powder in one table sorted by charge, so a charge ladder reads top to bottom.

## Conventions

- Units are part of the field name: `chargeGr`, `cbtoIn`, `velocitiesFps`, `distanceYd`. The UI is imperial only (grains, fps, inches, yards). Do not add a bare numeric measurement field.
- Standard deviation is the sample SD (n − 1), decided by the owner. Garmin's ShotView reports the population SD (n), which is lower for the same shots (18.4 vs 20.6 fps in the fixture); show Garmin's figure only as a labelled cross-check on an imported session. Always show the shot count next to an SD. To combine strings from the same ammo batch use `pooledVelocityStats()`, which measures each string around its own average so a velocity shift between sessions is not counted as inconsistency; do not concatenate the shots.
- Chronograph data comes in by importing the CSV that Garmin's ShotView app exports, parsed by `src/domain/shotview.ts`. There is no Bluetooth link to the chronograph and no public Garmin protocol for one. The file is not a regular table; `src/domain/fixtures/shotview-session.csv` is a real export, and it is the only sample seen so far, so how excluded shots or the bore flags appear is unverified.
- Dexie schema: only indexed fields are declared in `src/data/db.ts`. The app has no real data yet, so version 1 may still be edited; once the owner starts using it, add a new version with an upgrade function instead.
- Imports use explicit `.ts`/`.tsx` extensions (`verbatimModuleSyntax` and `erasableSyntaxOnly` are on, so no enums or parameter properties).
- Data-layer tests use `fake-indexeddb/auto` and a `Store` over a uniquely named `MatchTrackerDb` per test.
- There are no component tests. Check screen changes by driving the dev server in a phone-sized browser (Playwright with the iPhone device profile), including importing `src/domain/fixtures/shotview-session.csv`.
- Text inputs must stay at 16px or larger, or iOS Safari zooms the page on focus.
