import type { Area } from 'react-easy-crop'

export type ChromaKeyOptions = {
  enabled: boolean
  sampleColor: string | null
  tolerance: number
}

export function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

export function cropImageToCanvas(
  image: HTMLImageElement,
  crop: Area,
  rotation: number,
  backgroundColor?: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  if (!ctx) {
    throw new Error('Could not create drawing context')
  }

  const boundingBox = rotateSize(image.width, image.height, rotation)
  canvas.width = boundingBox.width
  canvas.height = boundingBox.height

  ctx.translate(boundingBox.width / 2, boundingBox.height / 2)
  ctx.rotate(getRadianAngle(rotation))
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const safeCrop = {
    x: Math.max(0, Math.round(crop.x)),
    y: Math.max(0, Math.round(crop.y)),
    width: Math.max(1, Math.round(crop.width)),
    height: Math.max(1, Math.round(crop.height)),
  }

  const maxWidth = canvas.width - safeCrop.x
  const maxHeight = canvas.height - safeCrop.y
  safeCrop.width = Math.min(safeCrop.width, maxWidth)
  safeCrop.height = Math.min(safeCrop.height, maxHeight)

  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = safeCrop.width
  croppedCanvas.height = safeCrop.height
  const croppedCtx = croppedCanvas.getContext('2d', { willReadFrequently: true })

  if (!croppedCtx) {
    throw new Error('Could not create cropped context')
  }

  if (backgroundColor) {
    croppedCtx.fillStyle = backgroundColor
    croppedCtx.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height)
  }

  croppedCtx.drawImage(
    canvas,
    safeCrop.x,
    safeCrop.y,
    safeCrop.width,
    safeCrop.height,
    0,
    0,
    safeCrop.width,
    safeCrop.height,
  )

  return croppedCanvas
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.replace('#', '')
  if (value.length !== 6) {
    return null
  }

  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)

  if ([r, g, b].some(Number.isNaN)) {
    return null
  }

  return { r, g, b }
}

export function applyChromaKey(
  ctx: CanvasRenderingContext2D,
  sampleColor: string,
  toleranceValue: number,
): void {
  const base = hexToRgb(sampleColor)
  if (!base) {
    return
  }

  const { width, height } = ctx.canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const { data } = imageData
  const tolerance = (toleranceValue / 100) * Math.sqrt(255 ** 2 * 3)

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]

    const distance = Math.sqrt((r - base.r) ** 2 + (g - base.g) ** 2 + (b - base.b) ** 2)
    if (distance <= tolerance) {
      data[index + 3] = 0
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

export async function canvasToBlobUrl(canvas: HTMLCanvasElement, mime = 'image/jpeg'): Promise<string> {
  const blob = await new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, mime, mime === 'image/jpeg' ? 0.95 : undefined)
  })

  if (!blob) {
    throw new Error('Export failed: unable to generate image blob')
  }

  return URL.createObjectURL(blob)
}
