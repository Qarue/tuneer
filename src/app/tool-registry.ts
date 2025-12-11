import type { ComponentType, LazyExoticComponent } from 'react'

import { backgroundRemoveToolDefinition } from '@/features/background-remove'
import { base64ToolDefinition } from '@/features/base64'
import { imageConvertToolDefinition } from '@/features/image-convert/index'
import { jwtToolDefinition } from '@/features/jwt/index'
import { passportPhotoToolDefinition } from '@/features/passport-photo'
import { pdfCompressToolDefinition, pdfJoinToolDefinition, pdfSplitToolDefinition } from '@/features/pdf'

export type ToolDefinition = {
  id: string
  name: string
  description: string
  icon: ComponentType<{ size?: number }>
  keywords: string[]
  component: LazyExoticComponent<ComponentType>
  category: 'text' | 'pdf' | 'media' | 'utility'
}

export const toolRegistry: ToolDefinition[] = [
  base64ToolDefinition,
  jwtToolDefinition,
  imageConvertToolDefinition,
  passportPhotoToolDefinition,
  backgroundRemoveToolDefinition,
  pdfJoinToolDefinition,
  pdfSplitToolDefinition,
  pdfCompressToolDefinition,
]

export const toolMap = new Map(toolRegistry.map(tool => [tool.id, tool]))

export const defaultToolId = toolRegistry[0]?.id ?? ''
