# rpk command explorer

An interactive, force-directed graph of the `rpk` (Redpanda CLI) command tree. Expand categories, click a command to see its flags and usage, and search to highlight matching commands.

![Searching for "partition" highlights every matching command and its ancestor path, dimming the rest of the tree](docs/assets/search-partition.png)

## Generate the data

The app reads a static snapshot of the command tree from `public/data.json`. Generate (or refresh) it from an installed `rpk` binary:

```sh
just print-tree
# equivalent to: rpk --print-tree > public/data.json
```

Run this whenever `rpk`'s command set changes, or before your first `dev`/`build` if `public/data.json` isn't present yet.

`.github/workflows/update-rpk-tree.yml` does this automatically on a weekly schedule (and via manual `workflow_dispatch`), opening a PR when the tree changes. It installs the `rpk connect` managed plugin first so that subtree isn't dropped from the output.

`rpk cloud byoc` is also a managed plugin, but every subcommand under it requires a real Redpanda Cloud login before it'll even download — not something CI can do unattended. The whole `rpk cloud` command instead comes from a fragment snapshotted locally and checked into `data-fragments/`, which CI splices into every generated tree. See `data-fragments/README.md` to refresh it.

## Develop

```sh
pnpm install
just dev      # or: pnpm run dev
```

## Build

```sh
just build    # or: pnpm run build
```

Type-checks with `vue-tsc` and builds with Vite.
