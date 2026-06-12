import { IconSitemap } from '@tabler/icons-react'
import { lazy } from 'react'

import type { ToolDefinition } from '@/app/tool-registry'

export const mermaidToolDefinition: ToolDefinition = {
  id: 'mermaid-viewer',
  name: 'Mermaid Viewer',
  description: 'Render Mermaid diagrams live and export them as SVG or PNG, all in your browser.',
  icon: IconSitemap,
  keywords: ['mermaid', 'diagram', 'flowchart', 'sequence', 'gantt', 'graph', 'viewer'],
  category: 'utility',
  component: lazy(async () => {
    const module = await import('./components/MermaidViewer')
    return { default: module.MermaidViewer }
  }),
}
