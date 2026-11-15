# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MatchTracker tracks handloaded ammunition for long-range rifle competition and ties it to match results. The owner shoots PRS and ELR steel matches (e.g. the Nightforce ELR Steel Challenge). Range sessions exist only to gather velocity and group data for load development; matches are where the ammunition is used and scored.

The chain the app exists to preserve is: component lots → load (recipe) → ammo batch → range strings (chronograph and group data) and match stages (impacts). Any result should trace back to the exact load and lots that produced it.

Status: early skeleton. The domain model and storage layer exist; there are no real screens yet. The feature that sets this apart from existing reloading apps has not been decided, so ask the owner before designing around an assumed one.

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

It is single-user today but may be opened to other shooters later. Three rules keep that door open:

- `src/domain/` is plain types and pure functions (units, statistics, scoring). It imports nothing from `src/data/` or React.
- `src/data/` is the only code that touches Dexie. Screens go through it rather than calling IndexedDB directly, so a sync backend can be added behind it.
- Every stored record extends `Entity`: a UUID `id` generated on the device, `createdAt`/`updatedAt` ISO strings, and `deletedAt` for soft deletes. Create records with `newEntity()` and change them with `touch()` from `src/data/entity.ts`; do not use auto-increment keys or hard deletes.

## Conventions

- Units are part of the field name: `chargeGr`, `cbtoIn`, `velocitiesFps`, `distanceYd`. Do not add a bare numeric measurement field.
- Standard deviation is the sample SD (n − 1), matching what chronographs report.
- A different lot of powder, bullets, primers or brass is a different `ComponentLot`, and a `Load` references lots, not products.
- Dexie schema: only indexed fields are declared in `src/data/db.ts`. Never edit a released `version()`; add a new version with an upgrade function.
- Imports use explicit `.ts`/`.tsx` extensions (`verbatimModuleSyntax` and `erasableSyntaxOnly` are on, so no enums or parameter properties).
- Data-layer tests use `fake-indexeddb/auto` and a uniquely named `MatchTrackerDb` per test.
