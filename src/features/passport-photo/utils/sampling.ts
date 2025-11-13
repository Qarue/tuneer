import type { Area } from 'react-easy-crop'

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => value.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function sampleBackgroundColor(
  image: HTMLImageElement,
  crop: Area,
): string | null {
  const safeCrop = {
    x: Math.max(0, Math.round(crop.x)),
    y: Math.max(0, Math.round(crop.y)),
    width: Math.max(1, Math.round(crop.width)),
    height: Math.max(1, Math.round(crop.height)),
  }

  const canvas = document.createElement('canvas')
  canvas.width = safeCrop.width
  canvas.height = safeCrop.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  if (!ctx) {
    return null
  }

  ctx.drawImage(
    image,
    safeCrop.x,
    safeCrop.y,
    safeCrop.width,
    safeCrop.height,
    0,
    0,
    safeCrop.width,
    safeCrop.height,
  )

  const { data, width, height } = ctx.getImageData(0, 0, safeCrop.width, safeCrop.height)
  const samples: Array<[number, number]> = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
  ]

  const totals = samples.reduce(
    (acc, [x, y]) => {
      const index = (y * width + x) * 4
      acc.r += data[index]
      acc.g += data[index + 1]
      acc.b += data[index + 2]
      return acc
    },
    { r: 0, g: 0, b: 0 },
  )

  const count = samples.length
  const avgR = Math.round(totals.r / count)
  const avgG = Math.round(totals.g / count)
  const avgB = Math.round(totals.b / count)

  return rgbToHex(avgR, avgG, avgB)
}
