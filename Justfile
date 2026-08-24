print-tree:
    rpk --print-tree > public/data.json

# Snapshot the whole rpk cloud command, whose byoc subtree CI can't
# generate itself (its plugin needs a real Cloud login to even download).
# Requires it to already be present locally — e.g. run `rpk cloud login`
# first.
extract-cloud:
    rpk --print-tree | jq '.commands[] | select(.name == "cloud")' > data-fragments/cloud.json

# Splice the checked-in cloud fragment into public/data.json, replacing
# any existing top-level cloud entry. CI does this automatically after
# print-tree; run it locally to preview the result.
merge-cloud:
    jq --argjson cloud "$(cat data-fragments/cloud.json)" \
        '.commands |= (map(select(.name != "cloud")) + [$cloud])' \
        public/data.json > public/data.json.tmp
    mv public/data.json.tmp public/data.json

dev:
    pnpm run dev

build:
    pnpm run build