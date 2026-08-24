print-tree:
    rpk --print-tree > public/data.json

# Snapshot the rpk cloud byoc subtree, which CI can't generate itself (its
# plugin needs a real Cloud login to even download). Requires it to already
# be present locally — e.g. run `rpk cloud login` first.
extract-cloud-byoc:
    rpk --print-tree | jq '.commands[] | select(.name == "cloud") | .commands[] | select(.name == "byoc")' > data-fragments/cloud-byoc.json

# Splice the checked-in cloud-byoc fragment into public/data.json's rpk
# cloud subtree, replacing any existing byoc entry. CI does this
# automatically after print-tree; run it locally to preview the result.
merge-cloud-byoc:
    jq --argjson byoc "$(cat data-fragments/cloud-byoc.json)" \
        '(.commands[] | select(.name == "cloud") | .commands) |= (map(select(.name != "byoc")) + [$byoc])' \
        public/data.json > public/data.json.tmp
    mv public/data.json.tmp public/data.json

dev:
    pnpm run dev

build:
    pnpm run build