import '@/styles/global.css'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

import { ColorSchemeScript } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <App />
  </StrictMode>,
)
