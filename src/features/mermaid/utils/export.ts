const SVG_MIME = 'image/svg+xml'

// Target the longest side of the exported PNG so small diagrams still render
// crisply, while capping the scale to avoid enormous canvases.
const TARGET_LONGEST_SIDE = 2400
const MIN_SCALE = 2
const MAX_SCALE = 10

export const downloadSvg = (svg: string, fileName = 'diagram.svg'): void => {
  const blob = new Blob([svg], { type: `${SVG_MIME};charset=utf-8` })
  triggerDownload(blob, fileName)
}

const computeScale = (width: number, height: number): number => {
  const longest = Math.max(width, height) || 1
  const target = TARGET_LONGEST_SIDE / longest
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, target))
}

/**
 * Rasterizes an SVG string to a PNG Blob by drawing it onto a canvas. The
 * scale is derived from the diagram size so small diagrams stay sharp. Pass an
 * explicit `scale` to override the automatic calculation.
 */
export const svgToPngBlob = async (
  svg: string,
  scale?: number,
  background?: string,
): Promise<Blob> => {
  const dimensions = readSvgDimensions(svg)
  const width = dimensions.width || 800
  const height = dimensions.height || 600
  const effectiveScale = scale ?? computeScale(width, height)

  // Mermaid emits width="100%" with no height, which leaves an <img> without
  // an intrinsic size. Inject explicit pixel dimensions so it rasterizes.
  const sized = withExplicitSize(svg, width, height)
  const url = URL.createObjectURL(new Blob([sized], { type: SVG_MIME }))

  try {
    const image = await loadImage(url)

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * effectiveScale)
    canvas.height = Math.round(height * effectiveScale)

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas context unavailable.')
    }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    if (background) {
      context.fillStyle = background
      context.fillRect(0, 0, canvas.width, canvas.height)
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => {
        if (!result) {
          reject(new Error('Unable to export the diagram as PNG.'))
          return
        }

        resolve(result)
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const downloadPng = async (
  svg: string,
  fileName = 'diagram.png',
  scale?: number,
  background?: string,
): Promise<void> => {
  const blob = await svgToPngBlob(svg, scale, background)
  triggerDownload(blob, fileName)
}

const triggerDownload = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load the rendered diagram.'))
    image.src = url
  })

const withExplicitSize = (svg: string, width: number, height: number): string => {
  const w = Math.round(width)
  const h = Math.round(height)

  return svg.replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '')
    return `<svg width="${w}" height="${h}"${cleaned}>`
  })
}

const readSvgDimensions = (svg: string): { width: number; height: number } => {
  // Only inspect the opening <svg> tag — inner elements (nodes, rects) also
  // carry width/height attributes and must not be mistaken for the root size.
  const openingTag = svg.match(/<svg\b[^>]*>/)?.[0] ?? ''

  let width = 0
  let height = 0

  // The viewBox is the most reliable source for the diagram's true size, since
  // mermaid sets width="100%" with no explicit height on the root element.
  const viewBoxMatch = openingTag.match(/viewBox="([\d.\s-]+)"/)

  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number)

    if (parts.length === 4) {
      width = parts[2]
      height = parts[3]
    }
  }

  if (!width || !height) {
    const widthMatch = openingTag.match(/\bwidth="([\d.]+)(px)?"/)
    const heightMatch = openingTag.match(/\bheight="([\d.]+)(px)?"/)

    width = width || (widthMatch ? Number.parseFloat(widthMatch[1]) : 0)
    height = height || (heightMatch ? Number.parseFloat(heightMatch[1]) : 0)
  }

  return { width, height }
}
