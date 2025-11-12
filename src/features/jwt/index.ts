import { IconShieldLock } from '@tabler/icons-react'
import { lazy } from 'react'

import type { ToolDefinition } from '@/app/tool-registry'

export const jwtToolDefinition: ToolDefinition = {
  id: 'jwt-encode-decode',
  name: 'JWT Encode / Decode',
  description: 'Inspect, verify, and build JSON Web Tokens directly in your browser.',
  icon: IconShieldLock,
  keywords: ['jwt', 'json web token', 'token', 'decode', 'encode'],
  category: 'utility',
  component: lazy(async () => {
    const module = await import('./components/JWTTool')
    return { default: module.JWTTool }
  }),
}
