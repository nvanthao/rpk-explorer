import type { GraphNodeData, RpkCommand } from '../types'

export const ROOT_ID = 'root'

/** Everything derived once from the raw rpk tree, keyed by node id. */
export interface CommandIndex {
  byId: Map<string, GraphNodeData>
  rootId: string
}

/**
 * Flattens the recursive RpkCommand tree into a flat map of GraphNodeData,
 * keyed by a stable id (the space-joined command path, e.g. "rpk topic
 * create"). Doing this once up front means every later step (visibility,
 * search, layout) just walks plain ids instead of re-touching the raw tree.
 */
export function buildIndex(root: RpkCommand): CommandIndex {
  const byId = new Map<string, GraphNodeData>()

  function visit(cmd: RpkCommand, id: string, parentId: string | null, depth: number): number {
    const childIds: string[] = []
    let leafCount = 0

    for (const child of cmd.commands) {
      const childId = `${id} ${child.name}`
      childIds.push(childId)
      leafCount += visit(child, childId, id, depth + 1)
    }

    const isLeaf = cmd.commands.length === 0
    byId.set(id, {
      id,
      name: cmd.name,
      depth,
      parentId,
      childIds,
      isLeaf,
      descendantLeafCount: isLeaf ? 1 : leafCount,
      raw: cmd,
    })

    return isLeaf ? 1 : leafCount
  }

  visit(root, ROOT_ID, null, 0)
  return { byId, rootId: ROOT_ID }
}

/** Full ancestor chain from the root down to (and including) `id`. */
export function pathTo(index: CommandIndex, id: string): string[] {
  const path: string[] = []
  let cur: string | null = id
  while (cur !== null) {
    path.unshift(cur)
    cur = index.byId.get(cur)?.parentId ?? null
  }
  return path
}

/** The runnable command string for a node, e.g. "rpk topic create". */
export function commandPath(index: CommandIndex, id: string): string {
  return pathTo(index, id)
    .map((nid) => index.byId.get(nid)!.name)
    .join(' ')
}

/**
 * Given the set of expanded category ids, computes which node ids are
 * currently visible: the root, plus any node whose entire ancestor chain
 * (excluding itself) is expanded.
 */
export function computeVisible(index: CommandIndex, expanded: Set<string>): Set<string> {
  const visible = new Set<string>([index.rootId])
  const queue = [index.rootId]
  while (queue.length) {
    const id = queue.shift()!
    if (!expanded.has(id)) continue
    const node = index.byId.get(id)
    if (!node) continue
    for (const childId of node.childIds) {
      visible.add(childId)
      queue.push(childId)
    }
  }
  return visible
}

/** All descendant ids of `id`, not including `id` itself. */
export function descendantsOf(index: CommandIndex, id: string): string[] {
  const out: string[] = []
  const node = index.byId.get(id)
  if (!node) return out
  const stack = [...node.childIds]
  while (stack.length) {
    const cur = stack.pop()!
    out.push(cur)
    const curNode = index.byId.get(cur)
    if (curNode) stack.push(...curNode.childIds)
  }
  return out
}

export interface SearchMatch {
  id: string
  path: string[]
}

/**
 * Finds every node whose name or description contains `query`
 * (case-insensitive), and returns each match with its full root path.
 */
export function search(index: CommandIndex, query: string): SearchMatch[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const matches: SearchMatch[] = []
  for (const node of index.byId.values()) {
    if (node.id === index.rootId) continue
    const haystack = `${node.name} ${node.raw.description}`.toLowerCase()
    if (haystack.includes(q)) {
      matches.push({ id: node.id, path: pathTo(index, node.id) })
    }
  }
  return matches
}
