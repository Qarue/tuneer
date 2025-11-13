import { IconIdBadge2 } from '@tabler/icons-react'
import { lazy } from 'react'

import type { ToolDefinition } from '@/app/tool-registry'

export const passportPhotoToolDefinition: ToolDefinition = {
  id: 'passport-photo-resizer',
  name: 'Passport Photo Resizer',
  description:
    'Create compliant passport photos for USA, India, and Canada with precise cropping, background cleanup, and ready-to-export sizes.',
  icon: IconIdBadge2,
  keywords: ['passport', 'photo', 'image', 'resize'],
  category: 'media',
  component: lazy(async () => {
    const module = await import('./components/PassportPhotoTool')
    return { default: module.PassportPhotoTool }
  }),
}
