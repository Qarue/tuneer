/**
 * Makes the nodes of a rendered Mermaid flowchart draggable so users can
 * rearrange the layout. Connected edges (arrows) and their labels follow the
 * nodes they attach to. Only repositioning is supported - text, arrows and
 * structure are never edited.
 *
 * Association is driven by the attributes Mermaid emits on the rendered SVG:
 *   - each edge path carries `data-id="L_<source>_<target>_<n>"` and
 *     `data-points` (base64 JSON of its waypoints)
 *   - each node `<g class="node">` carries an id ending in `-<name>-<n>`
 * This is far more robust than matching geometry by proximity.
 */

type Point = { x: number; y: number }

type NodeBinding = {
  el: SVGGElement
  name: string
  baseTransform: string
  offset: Point
}

type EdgeBinding = {
  path: SVGPathElement
  originalD: string
  points: Point[]
  source: NodeBinding | null
  target: NodeBinding | null
}

type LabelBinding = {
  el: SVGGElement
  originalTransform: string
  source: NodeBinding | null
  target: NodeBinding | null
}

export type DraggableController = {
  reset: () => void
  destroy: () => void
}

const clientToSvg = (svg: SVGSVGElement, clientX: number, clientY: number): Point => {
  const ctm = svg.getScreenCTM()
  if (!ctm) {
    return { x: clientX, y: clientY }
  }
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const local = pt.matrixTransform(ctm.inverse())
  return { x: local.x, y: local.y }
}

const decodePoints = (encoded: string | null): Point[] => {
  if (!encoded) {
    return []
  }
  try {
    const json = JSON.parse(atob(encoded)) as Array<{ x: number; y: number }>
    return json.map(p => ({ x: p.x, y: p.y }))
  } catch {
    return []
  }
}

const nodeNameFromId = (svgId: string, id: string): string => {
  let key = id.startsWith(`${svgId}-`) ? id.slice(svgId.length + 1) : id
  // Drop the diagram-type prefix (e.g. "flowchart-") if present.
  const dash = key.indexOf('-')
  if (dash !== -1 && /^[a-z]+$/i.test(key.slice(0, dash))) {
    key = key.slice(dash + 1)
  }
  // Drop the trailing "-<number>" Mermaid appends.
  return key.replace(/-\d+$/, '')
}

/** Parses `L_<source>_<target>_<n>` against the known node names. */
const parseEdgeEndpoints = (
  dataId: string | null,
  names: Set<string>,
): { source: string; target: string } | null => {
  if (!dataId) {
    return null
  }
  const stripped = dataId.replace(/^L_/, '').replace(/_\d+$/, '')
  const parts = stripped.split('_')
  for (let i = 1; i < parts.length; i += 1) {
    const source = parts.slice(0, i).join('_')
    const target = parts.slice(i).join('_')
    if (names.has(source) && names.has(target)) {
      return { source, target }
    }
  }
  return null
}

const rootBBox = (
  node: NodeBinding,
): { minX: number; minY: number; maxX: number; maxY: number } => {
  const box = node.el.getBBox()
  const m = parseTranslate(node.baseTransform)
  const x = box.x + m.x + node.offset.x
  const y = box.y + m.y + node.offset.y
  return { minX: x, minY: y, maxX: x + box.width, maxY: y + box.height }
}

const parseTranslate = (transform: string): Point => {
  const match = /translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/.exec(transform)
  if (!match) {
    return { x: 0, y: 0 }
  }
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) }
}

const nearestNode = (point: Point, nodes: NodeBinding[]): NodeBinding | null => {
  let best: NodeBinding | null = null
  let bestDist = Infinity
  for (const node of nodes) {
    const box = rootBBox(node)
    const dx = Math.max(box.minX - point.x, 0, point.x - box.maxX)
    const dy = Math.max(box.minY - point.y, 0, point.y - box.maxY)
    const dist = Math.hypot(dx, dy)
    if (dist < bestDist) {
      bestDist = dist
      best = node
    }
  }
  return best
}

/** Builds a smooth path through the points using a Catmull-Rom spline. */
const buildPath = (points: Point[]): string => {
  if (points.length === 0) {
    return ''
  }
  if (points.length === 1) {
    return `M${points[0].x},${points[0].y}`
  }
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`
  }

  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? points[i + 1]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += `C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

export const enableNodeDragging = (svg: SVGSVGElement): DraggableController => {
  const svgId = svg.id
  const nodeEls = Array.from(svg.querySelectorAll<SVGGElement>('g.node'))
  if (nodeEls.length === 0) {
    return { reset: () => {}, destroy: () => {} }
  }

  const nodes: NodeBinding[] = nodeEls.map(el => ({
    el,
    name: nodeNameFromId(svgId, el.id),
    baseTransform: el.getAttribute('transform') ?? '',
    offset: { x: 0, y: 0 },
  }))
  const nodeByName = new Map(nodes.map(node => [node.name, node]))
  const nodeNames = new Set(nodeByName.keys())

  const edgePaths = Array.from(
    svg.querySelectorAll<SVGPathElement>('g.edgePaths path[data-id], path.flowchart-link'),
  )
  const edges: EdgeBinding[] = edgePaths.map(path => {
    const dataId = path.getAttribute('data-id')
    const points = decodePoints(path.getAttribute('data-points'))
    const parsed = parseEdgeEndpoints(dataId, nodeNames)

    let source = parsed ? (nodeByName.get(parsed.source) ?? null) : null
    let target = parsed ? (nodeByName.get(parsed.target) ?? null) : null

    // Geometric fallback when the id can't be parsed (other diagram types).
    if ((!source || !target) && points.length >= 2) {
      source = source ?? nearestNode(points[0], nodes)
      target = target ?? nearestNode(points[points.length - 1], nodes)
    }

    return {
      path,
      originalD: path.getAttribute('d') ?? '',
      points,
      source,
      target,
    }
  })

  const labelEls = Array.from(svg.querySelectorAll<SVGGElement>('g.edgeLabel'))
  const labels: LabelBinding[] = labelEls.map(el => {
    const inner = el.querySelector('[data-id]')
    const parsed = parseEdgeEndpoints(inner?.getAttribute('data-id') ?? null, nodeNames)
    return {
      el,
      originalTransform: el.getAttribute('transform') ?? '',
      source: parsed ? (nodeByName.get(parsed.source) ?? null) : null,
      target: parsed ? (nodeByName.get(parsed.target) ?? null) : null,
    }
  })

  const edgesByNode = new Map<NodeBinding, EdgeBinding[]>()
  for (const edge of edges) {
    for (const node of [edge.source, edge.target]) {
      if (!node) {
        continue
      }
      const list = edgesByNode.get(node) ?? []
      list.push(edge)
      edgesByNode.set(node, list)
    }
  }
  const labelsByNode = new Map<NodeBinding, LabelBinding[]>()
  for (const label of labels) {
    for (const node of [label.source, label.target]) {
      if (!node) {
        continue
      }
      const list = labelsByNode.get(node) ?? []
      list.push(label)
      labelsByNode.set(node, list)
    }
  }

  // Preserve the original viewBox/size so the canvas can grow while dragging
  // (otherwise nodes pushed past the edge are clipped by the SVG viewport).
  const originalViewBox = svg.getAttribute('viewBox') ?? ''
  const originalStyleWidth = svg.style.width
  const originalStyleHeight = svg.style.height
  const originalStyleMaxWidth = svg.style.maxWidth
  const originalStyleOverflow = svg.style.overflow

  const vbParts = originalViewBox.split(/[ ,]+/).map(Number)
  const baseBounds =
    vbParts.length === 4
      ? {
          minX: vbParts[0],
          minY: vbParts[1],
          maxX: vbParts[0] + vbParts[2],
          maxY: vbParts[1] + vbParts[3],
        }
      : null

  const updateBounds = () => {
    if (!baseBounds) {
      return
    }
    const margin = 16
    let { minX, minY, maxX, maxY } = baseBounds
    for (const node of nodes) {
      const box = rootBBox(node)
      minX = Math.min(minX, box.minX - margin)
      minY = Math.min(minY, box.minY - margin)
      maxX = Math.max(maxX, box.maxX + margin)
      maxY = Math.max(maxY, box.maxY + margin)
    }
    const width = maxX - minX
    const height = maxY - minY
    svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`)
    svg.style.width = `${width}px`
    svg.style.height = `${height}px`
    svg.style.maxWidth = 'none'
  }

  const applyNode = (node: NodeBinding) => {
    node.el.setAttribute(
      'transform',
      `${node.baseTransform} translate(${node.offset.x}, ${node.offset.y})`.trim(),
    )
  }

  const applyEdgesFor = (node: NodeBinding) => {
    for (const edge of edgesByNode.get(node) ?? []) {
      if (edge.points.length === 0) {
        continue
      }
      const s = edge.source?.offset ?? { x: 0, y: 0 }
      const t = edge.target?.offset ?? { x: 0, y: 0 }
      const n = edge.points.length
      const moved = edge.points.map((p, i) => {
        const weightTarget = n <= 1 ? 1 : i / (n - 1)
        const weightSource = 1 - weightTarget
        return {
          x: p.x + s.x * weightSource + t.x * weightTarget,
          y: p.y + s.y * weightSource + t.y * weightTarget,
        }
      })
      edge.path.setAttribute('d', buildPath(moved))
    }
    for (const label of labelsByNode.get(node) ?? []) {
      const s = label.source?.offset ?? { x: 0, y: 0 }
      const t = label.target?.offset ?? { x: 0, y: 0 }
      label.el.setAttribute(
        'transform',
        `${label.originalTransform} translate(${(s.x + t.x) / 2}, ${(s.y + t.y) / 2})`.trim(),
      )
    }
  }

  let active: NodeBinding | null = null
  let startPointer: Point = { x: 0, y: 0 }
  let startOffset: Point = { x: 0, y: 0 }

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Element | null
    const group = target?.closest('g.node') as SVGGElement | null
    const node = group ? nodes.find(n => n.el === group) : undefined
    if (!node) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    active = node
    startPointer = clientToSvg(svg, event.clientX, event.clientY)
    startOffset = { ...node.offset }
    node.el.style.cursor = 'grabbing'
    svg.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!active) {
      return
    }
    const current = clientToSvg(svg, event.clientX, event.clientY)
    active.offset = {
      x: startOffset.x + (current.x - startPointer.x),
      y: startOffset.y + (current.y - startPointer.y),
    }
    applyNode(active)
    applyEdgesFor(active)
    updateBounds()
  }

  const endDrag = (event: PointerEvent) => {
    if (!active) {
      return
    }
    active.el.style.cursor = 'grab'
    active = null
    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId)
    }
  }

  for (const node of nodes) {
    node.el.style.cursor = 'grab'
  }
  const previousTouchAction = svg.style.touchAction
  svg.style.touchAction = 'none'
  svg.style.overflow = 'visible'

  svg.addEventListener('pointerdown', onPointerDown)
  svg.addEventListener('pointermove', onPointerMove)
  svg.addEventListener('pointerup', endDrag)
  svg.addEventListener('pointercancel', endDrag)

  const reset = () => {
    for (const node of nodes) {
      node.offset = { x: 0, y: 0 }
      node.el.setAttribute('transform', node.baseTransform)
    }
    for (const edge of edges) {
      edge.path.setAttribute('d', edge.originalD)
    }
    for (const label of labels) {
      label.el.setAttribute('transform', label.originalTransform)
    }
    if (originalViewBox) {
      svg.setAttribute('viewBox', originalViewBox)
    }
    svg.style.width = originalStyleWidth
    svg.style.height = originalStyleHeight
    svg.style.maxWidth = originalStyleMaxWidth
  }

  const destroy = () => {
    svg.removeEventListener('pointerdown', onPointerDown)
    svg.removeEventListener('pointermove', onPointerMove)
    svg.removeEventListener('pointerup', endDrag)
    svg.removeEventListener('pointercancel', endDrag)
    svg.style.touchAction = previousTouchAction
    svg.style.overflow = originalStyleOverflow
    for (const node of nodes) {
      node.el.style.cursor = ''
    }
  }

  return { reset, destroy }
}
