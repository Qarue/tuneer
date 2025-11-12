import { IconFiles, IconGauge, IconScissors } from '@tabler/icons-react'
import { lazy } from 'react'

import type { ToolDefinition } from '@/app/tool-registry'

export const pdfJoinToolDefinition: ToolDefinition = {
  id: 'pdf-join',
  name: 'PDF Join',
  description: 'Combine multiple PDFs into a single document without leaving your browser.',
  icon: IconFiles,
  keywords: ['pdf', 'merge', 'combine', 'join'],
  category: 'pdf',
  component: lazy(async () => {
    const module = await import('./components/PDFJoinTool')
    return { default: module.PDFJoinTool }
  }),
}

export const pdfSplitToolDefinition: ToolDefinition = {
  id: 'pdf-split',
  name: 'PDF Split',
  description: 'Extract specific page ranges from a PDF into separate files in your browser.',
  icon: IconScissors,
  keywords: ['pdf', 'split', 'pages', 'extract'],
  category: 'pdf',
  component: lazy(async () => {
    const module = await import('./components/PDFSplitTool')
    return { default: module.PDFSplitTool }
  }),
}

export const pdfCompressToolDefinition: ToolDefinition = {
  id: 'pdf-compress',
  name: 'PDF Compress',
  description: 'Shrink your PDF size in the browser so it is easier to share.',
  icon: IconGauge,
  keywords: ['pdf', 'compress', 'optimize', 'reduce'],
  category: 'pdf',
  component: lazy(async () => {
    const module = await import('./components/PDFCompressTool')
    return { default: module.PDFCompressTool }
  }),
}
