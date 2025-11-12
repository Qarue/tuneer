export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif'

export type ConversionOptions = {
  format: ImageFormat
  quality?: number // 0 - 1 for lossy formats
}

export type LoadedImage = {
  image: HTMLImageElement
  width: number
  height: number
  url: string
}

export const loadImageFromFile = async (file: File): Promise<LoadedImage> => {
  const url = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Unable to load the selected image.'))
      img.src = url
    })

    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      url,
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error instanceof Error ? error : new Error('Unable to load the selected image.')
  }
}

export const convertImage = async (
  image: HTMLImageElement,
  options: ConversionOptions,
): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas context unavailable')
  }

  context.drawImage(image, 0, 0)

  const mimeType = getMimeType(options.format)
  const quality = options.format === 'jpeg' || options.format === 'webp' ? options.quality ?? 0.92 : undefined

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => {
      if (!result) {
        reject(new Error('Unable to convert image.'))
        return
      }

      resolve(result)
    }, mimeType, quality)
  })

  return blob
}

export const getMimeType = (format: ImageFormat): string => {
  switch (format) {
    case 'png':
      return 'image/png'
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    default:
      return 'image/png'
  }
}
