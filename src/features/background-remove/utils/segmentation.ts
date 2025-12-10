// Singleton to hold the pipeline promise
let segmenterPromise: Promise<any> | null = null

export type SegmentationResult = {
  originalUrl: string
  processedUrl: string
  maskUrl?: string
}

/**
 * Lazy loads the transformers library and initializes the segmentation pipeline.
 */
function getSegmenter(onProgress?: (progress: any) => void) {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      try {
        // Dynamic import for code splitting
        const { pipeline, env } = await import('@huggingface/transformers')

        // Configure environment
        env.allowLocalModels = false
        env.useBrowserCache = true

        // Initialize the pipeline
        // using 'image-segmentation' task with the RMBG-1.4 model
        try {
          return await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
            device: 'webgpu', // Try WebGPU first
            progress_callback: onProgress,
          })
        } catch (error) {
          console.warn('WebGPU failed, falling back to WASM:', error)
          return await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
            device: 'wasm',
            progress_callback: onProgress,
          })
        }
      } catch (error) {
        console.error('Failed to load segmentation model:', error)
        segmenterPromise = null // Reset promise so we can try again
        throw new Error('Could not initialize background removal model.')
      }
    })()
  }
  return segmenterPromise
}

/**
 * Removes the background from an image URL or Blob.
 * Returns the processed image as a Blob URL.
 */
export async function removeBackground(
  input: string | Blob | HTMLImageElement,
  onProgress?: (progress: any) => void,
): Promise<string> {
  const model = await getSegmenter(onProgress)

  let imageUrl = input
  let shouldRevoke = false

  if (input instanceof Blob) {
    imageUrl = URL.createObjectURL(input)
    shouldRevoke = true
  } else if (input instanceof HTMLImageElement) {
    imageUrl = input.src
  }

  try {
    // Run inference
    const output = await model(imageUrl as string)

    // For RMBG-1.4, the output is a mask. We need to apply it.
    const mask = output[0].mask

    // We need to composite this mask with the original image.
    const { RawImage } = await import('@huggingface/transformers')
    const image = await RawImage.fromURL(imageUrl as string)

    // Create new image with alpha
    const result = image.clone().putAlpha(mask)

    // Convert to Blob URL
    const blob = await result.toBlob()
    return URL.createObjectURL(blob)
  } finally {
    if (shouldRevoke) {
      URL.revokeObjectURL(imageUrl as string)
    }
  }
}
