import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3'

// Shape of a single flag, as emitted by `rpk --print-tree`.
export interface RpkFlag {
  name: string
  shorthand?: string
  type: string
  description: string
  default: unknown
  required: boolean
  deprecated?: boolean
}

// Shape of a single command node, as emitted by `rpk --print-tree`.
// The tree is recursive: every command may have child subcommands.
export interface RpkCommand {
  name: string
  description: string
  usage: string
  aliases?: string[]
  flags: RpkFlag[]
  commands: RpkCommand[]
}

// A flattened, graph-friendly view of one RpkCommand, indexed by its
// root-to-node path id (e.g. "rpk topic create"). Built once from the raw
// tree by buildIndex() and never mutated afterwards.
export interface GraphNodeData {
  id: string
  name: string
  depth: number
  parentId: string | null
  childIds: string[]
  isLeaf: boolean
  descendantLeafCount: number
  raw: RpkCommand
}

// Live simulation node — GraphNodeData plus the mutable fields d3-force
// reads and writes on every tick. Kept as a single long-lived object per
// node id so position/velocity survive expand/collapse updates.
export interface SimNode extends SimulationNodeDatum {
  id: string
  data: GraphNodeData
  radius: number
}

export interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string
}
