# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page Vue 3 app that visualizes the `rpk` (Redpanda CLI) command tree as an interactive, force-directed graph — click a category to expand/collapse it, click a leaf command for its flags/usage, search to highlight matching paths.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`); a `Justfile` wraps the common ones.

- `just dev` / `pnpm run dev` — start the Vite dev server.
- `just build` / `pnpm run build` — type-checks (`vue-tsc -b`) then builds via Vite. Run this to catch TS errors; there is no separate typecheck or lint script.
- `pnpm run preview` — serve the production build locally.
- `just print-tree` — regenerates `public/data.json` by running `rpk --print-tree` (requires the `rpk` binary on `PATH`). Do this after any change to what data the app expects, or when the visualized tree looks stale.
- `just extract-cloud` / `just merge-cloud` — refresh and preview the `rpk cloud` fragment in `data-fragments/` (see below).

There is no test suite and no linter configured in this repo.

## Data flow / architecture

1. **Source of truth**: `public/data.json` is a snapshot of `rpk --print-tree`'s output — a recursive `RpkCommand` tree (`src/types.ts`). It's checked in as static data the app fetches at runtime (`App.vue` does `fetch('/data.json')`), not bundled at build time. Regenerate it with `just print-tree`; don't hand-edit it. `.github/workflows/update-rpk-tree.yml` regenerates it weekly in CI, then uses `jq` to splice `data-fragments/cloud.json` into the top-level `commands` array, replacing whatever `rpk cloud` node CI generated — the `rpk cloud byoc` subtree needs a real Cloud login to appear at all, which CI can't do, so the whole `rpk cloud` command is snapshotted locally instead (`just extract-cloud`) and merged back in on every run. See `data-fragments/README.md`.
2. **Flattening (`src/lib/tree.ts`)**: `buildIndex()` walks the raw recursive tree once and produces a flat `CommandIndex` — a `Map<id, GraphNodeData>` where `id` is the space-joined command path (e.g. `"rpk topic create"`). Every other module operates on these flat ids rather than re-walking the raw tree: `pathTo`, `commandPath`, `computeVisible`, `descendantsOf`, `search` all take a `CommandIndex` and return/consume ids. This id-as-path scheme is the thing to preserve if the data shape ever changes.
3. **State lives in `App.vue`**: an `expanded: Set<id>` (which categories are open), `selectedLeafId`, and `searchQuery`. `computeVisible(index, expanded)` derives the currently-visible node set from `expanded` — nothing else tracks visibility. Search auto-expands the ancestor path to each match and snapshots/restores the prior `expanded` set on start/clear so exploring via search doesn't permanently rearrange the graph.
4. **Rendering split**: Vue owns the surrounding UI (header, search box, detail panel) and passes plain data down; `ForceGraph.vue` owns the actual `<svg>` and the d3-force simulation imperatively (D3 selections, not Vue templates, for the graph contents). Simulation nodes/links (`SimNode`/`SimLink` in `src/types.ts`) are kept as a plain (non-reactive) `Map`/array local to `ForceGraph.vue`, deliberately outside Vue's reactivity — they mutate 60x/second under d3-force and are diffed against the *visible* id set on every `expanded` change (`syncSimulationData`) so existing nodes keep their position/velocity across expand/collapse instead of restarting the layout.
5. **Styling vs. layout are separate passes** in `ForceGraph.vue`: `renderStructure()` (called when the visible set changes) handles enter/exit of nodes/links; `applyStyles()` (called on search/selection change, and on OS theme change) repaints fill/stroke/opacity without touching the simulation. Keep new visual states in `applyStyles()` if they don't need a new node/link to appear.
6. **Color palette (`src/lib/colors.ts`)**: intentionally two hues only — `category` (structure) and `highlight` (reserved for the active search match path). The header comment records the exact hex values validated for contrast in light/dark (via the `dataviz` skill's palette validator, not part of this repo); re-check the same way if palette values change. `currentPalette()`/`watchPalette()` read `prefers-color-scheme` directly (no app-level dark-mode toggle).

## Conventions

- Tailwind v4 via `@tailwindcss/postcss` (see `postcss.config.js`, `src/style.css`'s single `@import 'tailwindcss'`) — no `tailwind.config.js`, styling is done with utility classes plus `dark:` variants driven by `prefers-color-scheme`.
- TypeScript is strict (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` in `tsconfig.app.json`) — unused bindings fail the build, not just the linter.
