import { IconEraser } from '@tabler/icons-react'
import { lazy } from 'react'

import type { ToolDefinition } from '@/app/tool-registry'

export const backgroundRemoveToolDefinition: ToolDefinition = {
  id: 'background-remove',
  name: 'Background Remover',
  description: 'Remove image backgrounds automatically using AI.',
  icon: IconEraser,
  keywords: ['background', 'remove', 'transparent', 'ai', 'magic'],
  component: lazy(() =>
    import('./components/BackgroundRemoveTool').then(m => ({ default: m.BackgroundRemoveTool })),
  ),
  category: 'media',
}
