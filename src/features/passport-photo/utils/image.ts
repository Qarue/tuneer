import exifr from 'exifr'

export type LoadedImage = {
  dataUrl: string
  width: number
  height: number
}

const ORIENTATION_OPERATIONS: Record<number, (ctx: CanvasRenderingContext2D, width: number, height: number) => void> = {
  2: (ctx, width) => {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  },
  3: (ctx, width, height) => {
    ctx.translate(width, height)
    ctx.rotate(Math.PI)
  },
  4: (ctx, _width, height) => {
    ctx.translate(0, height)
    ctx.scale(1, -1)
  },
  5: (ctx, _width, height) => {
    ctx.rotate(0.5 * Math.PI)
    ctx.scale(1, -1)
    ctx.translate(0, -height)
  },
  6: (ctx, width) => {
    ctx.rotate(0.5 * Math.PI)
    ctx.translate(0, -width)
  },
  7: (ctx, width, height) => {
    ctx.rotate(0.5 * Math.PI)
    ctx.translate(height, -width)
    ctx.scale(-1, 1)
  },
  8: (ctx, height) => {
    ctx.rotate(-0.5 * Math.PI)
    ctx.translate(-height, 0)
  },
}

async function loadHtmlImage(source: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load image'))
    image.src = source
  })
}

export async function loadFileWithOrientation(file: File): Promise<LoadedImage> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const orientation = await exifr.orientation(file).catch(() => undefined)
    const baseImage = await loadHtmlImage(objectUrl)
    const needsRotation = orientation && orientation !== 1

    if (!needsRotation) {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error('Unable to read image data'))
          }
        }
        reader.onerror = () => reject(new Error('Unable to read image data'))
        reader.readAsDataURL(file)
      })

      return {
        dataUrl,
        width: baseImage.width,
        height: baseImage.height,
      }
    }

    const swapDimensions = [5, 6, 7, 8].includes(orientation ?? 1)
    const canvas = document.createElement('canvas')
    canvas.width = swapDimensions ? baseImage.height : baseImage.width
    canvas.height = swapDimensions ? baseImage.width : baseImage.height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to initialise canvas context')
    }

    ctx.save()
    ORIENTATION_OPERATIONS[orientation ?? 1]?.(ctx, baseImage.width, baseImage.height)
    ctx.drawImage(baseImage, 0, 0)
    ctx.restore()

    const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.98)

    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
