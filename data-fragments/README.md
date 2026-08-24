# data-fragments/

Snapshots of `rpk` command subtrees that CI's `update-rpk-tree` workflow can't
generate itself, because they only appear once a plugin is installed that
requires interactive setup — currently just `rpk cloud byoc`, which needs a
real Redpanda Cloud login before its plugin will even download.

Each fragment is just the raw `rpk --print-tree` JSON node for that
subtree — e.g. `cloud-byoc.json` is exactly the `"byoc"` command object that
lives under `rpk cloud`.

## Refreshing a fragment

On a machine that already has the subtree available locally (e.g. you've run
`rpk cloud login` and used `rpk cloud byoc` before, so the plugin is
installed):

```sh
just extract-cloud-byoc   # writes data-fragments/cloud-byoc.json
just merge-cloud-byoc     # preview: splices it into public/data.json
```

Commit the updated fragment. The CI workflow merges whatever's currently
checked in here into every run's freshly generated tree — you don't need to
run it on every update, just whenever the `rpk cloud byoc` command surface
itself changes (new subcommands/flags), which is far less often than rpk's
overall release cadence.
