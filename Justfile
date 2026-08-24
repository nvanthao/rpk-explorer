print-tree:
    rpk --print-tree > public/data.json

# Snapshot a plugin-gated subtree (e.g. rpk cloud byoc) that CI can't
# generate itself, so it can be merged back in on every CI run. Requires
# the subtree to actually be present locally — e.g. run `rpk cloud login`
# first for cloud byoc.
extract-cloud-byoc:
    rpk --print-tree | node scripts/extract-fragment.mjs "rpk cloud byoc" > data-fragments/cloud-byoc.json

# Splice the checked-in cloud-byoc fragment into public/data.json. CI does
# this automatically after print-tree; run it locally to preview the result.
merge-cloud-byoc:
    node scripts/merge-fragment.mjs public/data.json data-fragments/cloud-byoc.json

dev:
    pnpm run dev

build:
    pnpm run build