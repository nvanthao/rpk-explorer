#!/usr/bin/env node
// Splice a previously-extracted subtree fragment (see extract-fragment.mjs)
// back into a full `rpk --print-tree` JSON dump, inserting or replacing it
// under its parent by name.
//
// If the fragment file doesn't exist, this is a no-op (exit 0) — CI runs
// fine before anyone has extracted a fragment yet, it just won't have that
// subtree until one is checked in.
//
// Usage:
//   node scripts/merge-fragment.mjs public/data.json data-fragments/cloud-byoc.json

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function findNode(node, remainingPath) {
  if (remainingPath.length === 0) return node;
  const [head, ...rest] = remainingPath;
  const child = (node.commands || []).find((c) => c.name === head);
  if (!child) return null;
  return findNode(child, rest);
}

const [, , treePath, fragmentPath] = process.argv;
if (!treePath || !fragmentPath) {
  console.error('usage: merge-fragment.mjs <tree.json> <fragment.json>');
  process.exit(1);
}

if (!existsSync(fragmentPath)) {
  console.log(`no fragment at ${fragmentPath}, skipping merge`);
  process.exit(0);
}

const tree = JSON.parse(readFileSync(treePath, 'utf8'));
const fragment = JSON.parse(readFileSync(fragmentPath, 'utf8'));

const segments = fragment.path.trim().split(/\s+/);
if (segments[0] !== tree.name) {
  console.error(`root mismatch: tree root is "${tree.name}", fragment path starts with "${segments[0]}"`);
  process.exit(1);
}

const childName = segments[segments.length - 1];
const parent = findNode(tree, segments.slice(1, -1));
if (!parent) {
  console.error(`parent path not found in ${treePath}: ${segments.slice(0, -1).join(' ')}`);
  process.exit(1);
}

parent.commands = parent.commands || [];
const idx = parent.commands.findIndex((c) => c.name === childName);
if (idx === -1) {
  parent.commands.push(fragment.node);
} else {
  parent.commands[idx] = fragment.node;
}

writeFileSync(treePath, JSON.stringify(tree) + '\n');
console.log(`merged "${fragment.path}" fragment (extracted ${fragment.extractedAt}) into ${treePath}`);
