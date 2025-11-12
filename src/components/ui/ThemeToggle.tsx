import { ActionIcon, Tooltip } from '@mantine/core'
import { IconMoonStars, IconSunHigh } from '@tabler/icons-react'
import { type ReactElement } from 'react'

import { selectColorScheme, selectToggleColorScheme, useThemeStore } from '@/state/theme-store'

export function ThemeToggle(): ReactElement {
  const colorScheme = useThemeStore(selectColorScheme)
  const toggleTheme = useThemeStore(selectToggleColorScheme)

  const next = colorScheme === 'dark' ? 'light' : 'dark'

  return (
    <Tooltip label={`Switch to ${next} mode`} withArrow position="bottom">
      <ActionIcon
        variant="light"
        color="brand"
        size="lg"
        radius="xl"
        onClick={toggleTheme}
        aria-label="Toggle color scheme"
      >
        {colorScheme === 'dark' ? <IconSunHigh size={18} /> : <IconMoonStars size={18} />}
      </ActionIcon>
    </Tooltip>
  )
}
