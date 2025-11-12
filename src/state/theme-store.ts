import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ColorScheme = 'light' | 'dark'

type ThemeState = {
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
  toggleColorScheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      colorScheme: 'dark',
      setColorScheme: scheme => set({ colorScheme: scheme }),
      toggleColorScheme: () =>
        set(({ colorScheme }) => ({
          colorScheme: colorScheme === 'dark' ? 'light' : 'dark',
        })),
    }),
    { name: 'tuneer:theme' },
  ),
)

export const selectColorScheme = (state: ThemeState) => state.colorScheme
export const selectSetColorScheme = (state: ThemeState) => state.setColorScheme
export const selectToggleColorScheme = (state: ThemeState) => state.toggleColorScheme
