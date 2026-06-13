import { type ReactElement, useEffect, useRef } from 'react'

import { type DraggableController, enableNodeDragging } from '../utils/draggable'

type DragSurfaceProps = {
  html: string
  zoom: number
  grow?: boolean
  onMount: (controller: DraggableController, svg: SVGSVGElement) => void
  onUnmount: (controller: DraggableController, svg: SVGSVGElement) => void
}

/**
 * Renders a rendered Mermaid SVG and makes its nodes draggable. Each instance
 * wires up its own SVG on mount, so independently mounted copies (e.g. the
 * fullscreen modal) get drag handlers as soon as they appear in the DOM.
 */
export function DragSurface({
  html,
  zoom,
  grow = false,
  onMount,
  onUnmount,
}: DragSurfaceProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svg = ref.current?.querySelector<SVGSVGElement>('svg')
    if (!svg) {
      return
    }

    const controller = enableNodeDragging(svg)
    onMount(controller, svg)

    return () => {
      controller.destroy()
      onUnmount(controller, svg)
    }
  }, [html, onMount, onUnmount])

  return (
    <div
      ref={ref}
      className="mermaid-drag-surface"
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
        width: grow ? '100%' : 'fit-content',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
