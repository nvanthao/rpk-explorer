<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import type { CommandIndex } from '../lib/tree'
import { computeVisible, pathTo, search as searchTree } from '../lib/tree'
import { currentPalette, watchPalette, type GraphPalette } from '../lib/colors'
import type { SimLink, SimNode } from '../types'

const props = defineProps<{
  index: CommandIndex
  expanded: Set<string>
  selectedLeafId: string | null
  searchQuery: string
}>()

const emit = defineEmits<{
  toggleCategory: [id: string]
  selectLeaf: [id: string]
}>()

const container = ref<HTMLDivElement | null>(null)

let palette: GraphPalette = currentPalette()
let unwatchPalette: (() => void) | null = null

// Nodes/links that d3-force owns and mutates every tick. Kept as plain
// (non-reactive) state — Vue's proxy overhead has no upside on objects that
// change 60x/second, and d3 wants to hold stable references across updates
// so positions survive expand/collapse.
const liveNodes = new Map<string, SimNode>()
let liveLinks: SimLink[] = []

let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
let viewport: d3.Selection<SVGGElement, unknown, null, undefined>
let linkSel: d3.Selection<SVGLineElement, SimLink, SVGGElement, unknown>
let nodeSel: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>
let simulation: d3.Simulation<SimNode, SimLink>
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>
let resizeObserver: ResizeObserver
// Set by the drag behavior's 'end' handler and read by the click handler that
// the browser fires right after — lets a real drag suppress the tap action
// (expand/select) that would otherwise fire on mouseup.
let suppressNextClick = false

const maxLeafCount = Math.max(
  1,
  ...Array.from(props.index.byId.values())
    .filter((n) => !n.isLeaf)
    .map((n) => n.descendantLeafCount),
)
const categoryRadius = d3.scaleSqrt().domain([1, maxLeafCount]).range([9, 20]).clamp(true)

function radiusFor(id: string): number {
  const node = props.index.byId.get(id)!
  if (node.id === props.index.rootId) return 24
  if (node.isLeaf) return 7
  return categoryRadius(node.descendantLeafCount)
}

function linkDistanceFor(link: SimLink): number {
  const target = link.target as SimNode
  // The 21 top-level categories fan out directly around the root, so they
  // need real room to breathe; deeper levels have far fewer siblings per
  // parent and can sit closer without crowding.
  return target.data.depth <= 1 ? 170 : 55
}

/** Collision radius padded for the node's own label so text doesn't overlap its neighbors. */
function collideRadiusFor(d: SimNode): number {
  return d.radius + 10 + Math.min(40, d.data.name.length * 3.2)
}

/** Ids (nodes) and "parentId>childId" keys (edges) on the active search's highlighted paths. */
function computeHighlight(query: string): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>()
  const edges = new Set<string>()
  const matches = searchTree(props.index, query)
  for (const m of matches) {
    for (let i = 0; i < m.path.length; i++) {
      nodes.add(m.path[i])
      if (i > 0) edges.add(`${m.path[i - 1]}>${m.path[i]}`)
    }
  }
  return { nodes, edges }
}

function dims(): { width: number; height: number } {
  const el = container.value
  return { width: el?.clientWidth ?? 800, height: el?.clientHeight ?? 600 }
}

function seedPosition(id: string): { x: number; y: number } {
  const node = props.index.byId.get(id)!
  const { width, height } = dims()
  if (node.parentId && liveNodes.has(node.parentId)) {
    const parent = liveNodes.get(node.parentId)!
    const angle = Math.random() * Math.PI * 2
    const r = 20 + Math.random() * 10
    return { x: (parent.x ?? width / 2) + Math.cos(angle) * r, y: (parent.y ?? height / 2) + Math.sin(angle) * r }
  }
  return { x: width / 2 + (Math.random() - 0.5) * 20, y: height / 2 + (Math.random() - 0.5) * 20 }
}

function syncSimulationData(visible: Set<string>) {
  // Drop nodes that are no longer visible so old branches don't keep exerting force.
  for (const id of Array.from(liveNodes.keys())) {
    if (!visible.has(id)) liveNodes.delete(id)
  }
  // Add newly-visible nodes, seeded near their parent.
  for (const id of visible) {
    if (liveNodes.has(id)) continue
    const pos = seedPosition(id)
    liveNodes.set(id, { id, data: props.index.byId.get(id)!, radius: radiusFor(id), ...pos })
  }

  liveLinks = []
  for (const id of visible) {
    const node = props.index.byId.get(id)!
    if (node.parentId && visible.has(node.parentId)) {
      liveLinks.push({ id: `${node.parentId}>${id}`, source: liveNodes.get(node.parentId)!, target: liveNodes.get(id)! })
    }
  }

  simulation.nodes(Array.from(liveNodes.values()))
  ;(simulation.force('link') as d3.ForceLink<SimNode, SimLink>).links(liveLinks)
  simulation.alpha(Math.max(simulation.alpha(), 0.6)).restart()

  renderStructure()
}

function renderStructure() {
  const nodesArr = Array.from(liveNodes.values())

  linkSel = viewport
    .select<SVGGElement>('.links')
    .selectAll<SVGLineElement, SimLink>('line')
    .data(liveLinks, (d) => d.id)
    .join('line')
    .attr('class', 'graph-link')
    .attr('stroke', palette.link)
    .attr('stroke-width', 1.5)

  const nodeEnter = (enter: d3.Selection<d3.EnterElement, SimNode, SVGGElement, unknown>) => {
    const g = enter.append('g').attr('class', 'graph-node').style('cursor', 'pointer')
    g.append('circle').attr('class', 'graph-node-circle')
    g.append('text')
      .attr('class', 'graph-node-label')
      .attr('dy', '0.32em')
      .style('paint-order', 'stroke')
      .style('stroke', palette.surface)
      .style('stroke-width', '3px')
      .style('stroke-linejoin', 'round')
      .style('user-select', 'none')
    g.call(drag(simulation))
    g.on('click', (event, d) => onTap(event, d))
    return g
  }

  nodeSel = viewport
    .select<SVGGElement>('.nodes')
    .selectAll<SVGGElement, SimNode>('g.graph-node')
    .data(nodesArr, (d) => d.id)
    .join(nodeEnter, (update) => update, (exit) => exit.remove())

  nodeSel
    .select<SVGTextElement>('.graph-node-label')
    .text((d) => d.data.name)
    .attr('x', (d) => d.radius + 6)
    .attr('font-size', (d) => (d.id === props.index.rootId ? 13 : d.data.isLeaf ? 11 : 12))
    .attr('font-weight', (d) => (d.id === props.index.rootId || !d.data.isLeaf ? 600 : 400))

  applyStyles()
}

/** Repaint colors/opacity/radius without touching layout — cheap, called on every search/select change. */
function applyStyles() {
  const query = props.searchQuery.trim()
  const { nodes: hlNodes, edges: hlEdges } = query ? computeHighlight(query) : { nodes: new Set<string>(), edges: new Set<string>() }
  const searching = query.length > 0

  nodeSel
    .select<SVGCircleElement>('.graph-node-circle')
    .attr('r', (d) => d.radius)
    .attr('fill', (d) => {
      if (d.id === props.index.rootId) return palette.root
      if (searching && hlNodes.has(d.id)) return palette.highlightFill
      return d.data.isLeaf ? palette.leafFill : palette.categoryFill
    })
    .attr('stroke', (d) => {
      if (d.id === props.index.rootId) return palette.root
      if (searching && hlNodes.has(d.id)) return palette.highlight
      return d.data.isLeaf ? palette.leafStroke : palette.category
    })
    .attr('stroke-width', (d) => (props.selectedLeafId === d.id ? 3 : searching && hlNodes.has(d.id) ? 2.5 : 1.5))
    .style('filter', (d) => (props.selectedLeafId === d.id ? 'drop-shadow(0 0 4px rgba(13, 148, 136, 0.55))' : 'none'))

  // D3-appended elements never get Vue's scoped-style attribute, so the
  // selected look is set here directly rather than via a CSS class.
  nodeSel.classed('is-selected', (d) => d.id === props.selectedLeafId)

  nodeSel.attr('opacity', (d) => (searching && !hlNodes.has(d.id) ? palette.dimOpacity : 1))

  nodeSel.select('.graph-node-label').attr('fill', (d) => {
    if (searching && hlNodes.has(d.id)) return palette.highlight
    return d.id === props.index.rootId ? palette.ink : palette.inkSecondary
  })

  linkSel
    .attr('stroke', (d) => (searching && hlEdges.has(d.id) ? palette.highlight : palette.link))
    .attr('stroke-width', (d) => (searching && hlEdges.has(d.id) ? 2.5 : 1.5))
    .attr('opacity', (d) => (searching && !hlEdges.has(d.id) ? palette.dimOpacity : 1))
}

function onTap(_event: MouseEvent, d: SimNode) {
  if (suppressNextClick) {
    suppressNextClick = false
    return
  }
  if (d.data.isLeaf) emit('selectLeaf', d.id)
  else emit('toggleCategory', d.id)
}

function drag(sim: d3.Simulation<SimNode, SimLink>) {
  let start = { x: 0, y: 0 }
  let moved = false

  return d3
    .drag<SVGGElement, SimNode>()
    .on('start', (event) => {
      moved = false
      start = { x: event.x, y: event.y }
      if (!event.active) sim.alphaTarget(0.25).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    })
    .on('drag', (event) => {
      if (Math.hypot(event.x - start.x, event.y - start.y) > 4) moved = true
      event.subject.fx = event.x
      event.subject.fy = event.y
    })
    .on('end', (event) => {
      if (!event.active) sim.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
      suppressNextClick = moved
    })
}

function tick() {
  linkSel
    .attr('x1', (d) => (d.source as SimNode).x ?? 0)
    .attr('y1', (d) => (d.source as SimNode).y ?? 0)
    .attr('x2', (d) => (d.target as SimNode).x ?? 0)
    .attr('y2', (d) => (d.target as SimNode).y ?? 0)
  nodeSel.attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
}

function resize() {
  const { width, height } = dims()
  svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`)
  simulation.force('x', d3.forceX(width / 2).strength(0.04))
  simulation.force('y', d3.forceY(height / 2).strength(0.06))
  simulation.alpha(0.3).restart()
}

function repaintPalette() {
  palette = currentPalette()
  svg.style('background', palette.surface)
  nodeSel.select('.graph-node-label').style('stroke', palette.surface)
  applyStyles()
}

onMounted(() => {
  const { width, height } = dims()

  svg = d3
    .select(container.value!)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', palette.surface)
    .style('display', 'block')

  viewport = svg.append('g').attr('class', 'viewport')
  viewport.append('g').attr('class', 'links')
  viewport.append('g').attr('class', 'nodes')

  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.15, 3])
    .on('zoom', (event) => viewport.attr('transform', event.transform))
  svg.call(zoomBehavior)

  simulation = d3
    .forceSimulation<SimNode>()
    .force('link', d3.forceLink<SimNode, SimLink>().id((d) => d.id).distance(linkDistanceFor).strength(0.7))
    .force('charge', d3.forceManyBody().strength(-260).distanceMax(600))
    .force('collide', d3.forceCollide<SimNode>(collideRadiusFor).strength(0.9))
    .force('x', d3.forceX(width / 2).strength(0.04))
    .force('y', d3.forceY(height / 2).strength(0.06))
    .on('tick', tick)

  syncSimulationData(computeVisible(props.index, props.expanded))

  resizeObserver = new ResizeObserver(() => resize())
  resizeObserver.observe(container.value!)

  unwatchPalette = watchPalette(repaintPalette)
})

onBeforeUnmount(() => {
  simulation?.stop()
  resizeObserver?.disconnect()
  unwatchPalette?.()
})

watch(
  () => computeVisible(props.index, props.expanded),
  (visible) => syncSimulationData(visible),
  { flush: 'post' },
)

watch([() => props.searchQuery, () => props.selectedLeafId], () => applyStyles())

defineExpose({
  focusOn(id: string) {
    const node = liveNodes.get(id)
    if (!node || !svg) return
    const { width, height } = dims()
    const t = d3.zoomIdentity.translate(width / 2 - (node.x ?? 0), height / 2 - (node.y ?? 0))
    svg.transition().duration(400).call(zoomBehavior.transform, t)
  },
  pathTo(id: string) {
    return pathTo(props.index, id)
  },
})
</script>

<template>
  <div ref="container" class="h-full w-full"></div>
</template>
