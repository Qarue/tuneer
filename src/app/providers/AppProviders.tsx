import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { type PropsWithChildren, type ReactElement, useEffect } from 'react'

import { selectColorScheme, useThemeStore } from '@/state/theme-store'

const theme = {
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '600',
  },
  colors: {
    brand: [
      '#e7f0ff',
      '#d0deff',
      '#a9c0ff',
      '#82a1ff',
      '#5c84ff',
      '#4c6aef',
      '#4057d1',
      '#3244a5',
      '#253279',
      '#192050',
    ],
  },
  primaryColor: 'brand',
  defaultRadius: 'md',
} as const

export function AppProviders({ children }: PropsWithChildren): ReactElement {
  const colorScheme = useThemeStore(selectColorScheme)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.body.classList.toggle('light-theme', colorScheme === 'light')
  }, [colorScheme])

  return (
    <MantineProvider defaultColorScheme="auto" forceColorScheme={colorScheme} theme={theme}>
      <Notifications position="top-right" limit={3} autoClose={4500} />
      {children}
    </MantineProvider>
  )
}
