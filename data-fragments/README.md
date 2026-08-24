# data-fragments/

Snapshots of `rpk` commands that CI's `update-rpk-tree` workflow can't
generate itself, because part of them only appears once a plugin is
installed that requires interactive setup — currently `rpk cloud`, whose
`byoc` subcommand needs a real Redpanda Cloud login before its plugin will
even download.

Each fragment is just the raw `rpk --print-tree` JSON node for that
command — e.g. `cloud.json` is exactly the `"cloud"` command object,
`byoc` subtree and all.

## Refreshing a fragment

On a machine that already has the subtree available locally (e.g. you've run
`rpk cloud login` and used `rpk cloud byoc` before, so the plugin is
installed):

```sh
just extract-cloud   # writes data-fragments/cloud.json
just merge-cloud     # preview: splices it into public/data.json
```

Commit the updated fragment. The CI workflow merges whatever's currently
checked in here into every run's freshly generated tree — you don't need to
run it on every update, just whenever the `rpk cloud` command surface
itself changes (new subcommands/flags), which is far less often than rpk's
overall release cadence.
