#!/usr/bin/env node
// Extract a subtree from an `rpk --print-tree` JSON dump, identified by its
// space-separated command path (e.g. "rpk cloud byoc"), and write it as a
// small, independently-committable fragment. Pairs with merge-fragment.mjs.
//
// Some rpk subtrees (rpk connect, rpk cloud byoc) only appear once their
// managed plugin is installed, which for rpk cloud byoc requires a real
// Redpanda Cloud login — something CI can't do unattended. Fragments let a
// developer snapshot those subtrees locally (where they're already logged
// in) and check the snapshot in for CI to splice back in on every run. See
// merge-fragment.mjs and the README for the full workflow.
//
// Usage:
//   rpk --print-tree | node scripts/extract-fragment.mjs "rpk cloud byoc" > data-fragments/cloud-byoc.json

import { readFileSync } from 'node:fs';

function findNode(node, remainingPath) {
  if (remainingPath.length === 0) return node;
  const [head, ...rest] = remainingPath;
  const child = (node.commands || []).find((c) => c.name === head);
  if (!child) return null;
  return findNode(child, rest);
}

const path = process.argv[2];
if (!path) {
  console.error('usage: rpk --print-tree | extract-fragment.mjs "<space separated command path>"');
  process.exit(1);
}

const tree = JSON.parse(readFileSync(0, 'utf8')); // stdin
const segments = path.trim().split(/\s+/);
if (segments[0] !== tree.name) {
  console.error(`root mismatch: tree root is "${tree.name}", path starts with "${segments[0]}"`);
  process.exit(1);
}

const node = findNode(tree, segments.slice(1));
if (!node) {
  console.error(`path not found in input tree: ${path}`);
  process.exit(1);
}

const fragment = {
  path: segments.join(' '),
  extractedAt: new Date().toISOString(),
  extractedWithRpkVersion: tree.version ?? null,
  node,
};

process.stdout.write(JSON.stringify(fragment, null, 2) + '\n');
