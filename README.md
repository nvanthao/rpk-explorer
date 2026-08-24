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
