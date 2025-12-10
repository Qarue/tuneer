import type { ProgressCallback, ProgressInfo, RawImage } from '@huggingface/transformers'

// Singleton to hold the pipeline promise
type ImageSegmentationOutput = { label: string | null; score: number | null; mask: RawImage }
type Segmenter = (url: string) => Promise<ImageSegmentationOutput[]>
export type ProgressEvent = ProgressInfo
let segmenterPromise: Promise<Segmenter> | null = null

/**
 * Initializes and caches the segmentation pipeline.
 * Notes on progress reporting:
 * - The `progress_callback` provided here only reports during initial model downloads.
 * - Subsequent calls reuse the cached pipeline and won't emit model-download progress.
 * - Inference itself does not report progress via this callback.
 */
function getSegmenter(onProgress?: ProgressCallback) {
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
          const p = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
            device: 'webgpu', // Try WebGPU first
            progress_callback: onProgress,
          })
          return p as unknown as Segmenter
        } catch (error) {
          console.warn('WebGPU failed, falling back to WASM:', error)
          const p = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
            device: 'wasm',
            progress_callback: onProgress,
          })
          return p as unknown as Segmenter
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
  onProgress?: ProgressCallback,
): Promise<string> {
  const model = await getSegmenter(onProgress)

  let imageUrl: string
  let shouldRevoke = false

  if (typeof input === 'string') {
    imageUrl = input
  } else if (input instanceof Blob) {
    imageUrl = URL.createObjectURL(input)
    shouldRevoke = true
  } else {
    imageUrl = input.src
  }

  try {
    // Run inference
    const output = await model(imageUrl)

    // For RMBG-1.4, the output is a mask. We need to apply it.
    const mask = output[0].mask

    // We need to composite this mask with the original image.
    const { RawImage } = await import('@huggingface/transformers')
    const image = await RawImage.fromURL(imageUrl)

    // Create new image with alpha
    const result = image.clone().putAlpha(mask)

    // Convert to Blob URL
    const blob = (await result.toBlob()) as Blob
    return URL.createObjectURL(blob)
  } finally {
    if (shouldRevoke) {
      URL.revokeObjectURL(imageUrl)
    }
  }
}
