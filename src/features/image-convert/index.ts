import { IconPhotoScan } from '@tabler/icons-react'
import { lazy } from 'react'

import type { ToolDefinition } from '@/app/tool-registry'

export const imageConvertToolDefinition: ToolDefinition = {
  id: 'image-convert',
  name: 'Image Format Convert',
  description: 'Transform a single image into PNG, JPEG, WebP, or GIF formats instantly in the browser.',
  icon: IconPhotoScan,
  keywords: ['image', 'convert', 'png', 'jpeg', 'webp', 'gif'],
  category: 'media',
  component: lazy(async () => {
    const module = await import('./components/ImageConvertTool')
    return { default: module.ImageConvertTool }
  }),
}
