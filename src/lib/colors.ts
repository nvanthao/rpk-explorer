// Color roles for the graph canvas, validated with the dataviz palette
// validator (scripts/validate_palette.js) against both surfaces:
//   node -> "#2a78d6,#0d9488" --mode light   => ALL PASS
//   node -> "#3987e5,#0d9488" --mode dark    => ALL PASS
//
// Only two hues are used across the whole graph, each with a single fixed
// job — this is a hierarchy diagram, not a categorical chart, so 21 top
// level command groups are told apart by position/label, not by 21 competing
// hues (which the palette can't support safely anyway: it only clears CVD
// checks for up to 8 categorical slots, and only 3 under all-pairs adjacency,
// which is what a force layout gives you).
//
//   structure (blue) — categories & the graph's structural chrome
//   highlight (teal) — reserved exclusively for the active search match path
export interface GraphPalette {
  surface: string
  pagePlane: string
  ink: string
  inkSecondary: string
  muted: string
  gridline: string
  border: string
  root: string
  category: string
  categoryFill: string
  leafFill: string
  leafStroke: string
  link: string
  highlight: string
  highlightFill: string
  dimOpacity: number
}

const light: GraphPalette = {
  surface: '#fcfcfb',
  pagePlane: '#f9f9f7',
  ink: '#0b0b0b',
  inkSecondary: '#52514e',
  muted: '#898781',
  gridline: '#e1e0d9',
  border: 'rgba(11,11,11,0.10)',
  root: '#0b0b0b',
  category: '#2a78d6',
  categoryFill: '#eaf2fc',
  leafFill: '#fcfcfb',
  leafStroke: '#898781',
  link: '#c3c2b7',
  highlight: '#0d9488',
  highlightFill: '#e3f4f1',
  dimOpacity: 0.12,
}

const dark: GraphPalette = {
  surface: '#1a1a19',
  pagePlane: '#0d0d0d',
  ink: '#ffffff',
  inkSecondary: '#c3c2b7',
  muted: '#898781',
  gridline: '#2c2c2a',
  border: 'rgba(255,255,255,0.10)',
  root: '#ffffff',
  category: '#3987e5',
  categoryFill: '#1c2d42',
  leafFill: '#1a1a19',
  leafStroke: '#57564f',
  link: '#383835',
  highlight: '#0d9488',
  highlightFill: '#173733',
  dimOpacity: 0.15,
}

export function currentPalette(): GraphPalette {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? dark : light
}

export function watchPalette(onChange: (p: GraphPalette) => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => onChange(currentPalette())
  mq.addEventListener('change', listener)
  return () => mq.removeEventListener('change', listener)
}
