import { IconBinaryTree } from '@tabler/icons-react'
import { lazy } from 'react'

import type { ToolDefinition } from '@/app/tool-registry'

export const base64ToolDefinition: ToolDefinition = {
  id: 'base64-encoder',
  name: 'Base64 Encode / Decode',
  description: 'Convert text between UTF-8 strings and Base64 safely inside your browser.',
  icon: IconBinaryTree,
  keywords: ['base64', 'encode', 'decode', 'text'],
  category: 'text',
  component: lazy(async () => {
    const module = await import('./components/Base64Tool')
    return { default: module.Base64Tool }
  }),
}
