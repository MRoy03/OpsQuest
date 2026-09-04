'use client'

import { createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'

export interface ThemeCtx {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

export const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}
