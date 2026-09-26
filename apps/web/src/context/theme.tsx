import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'auto'
export const INTERFACE_SIZES = ['default', 'large', 'xlarge'] as const
export type InterfaceSize = typeof INTERFACE_SIZES[number]

export function parseInterfaceSize(value: string | null): InterfaceSize {
 return INTERFACE_SIZES.find(size => size === value) ?? 'default'
}

function readInterfaceSize(): InterfaceSize {
 try {
 const size = parseInterfaceSize(localStorage.getItem('interface-size'))
 document.documentElement.dataset.interfaceSize = size
 return size
 } catch {
 return 'default'
 }
}

type ResolvedTheme = Exclude<Theme, 'auto'>
type ThemeContextValue = {
 theme: Theme
 resolvedTheme: ResolvedTheme
 setTheme: (theme: Theme) => void
 interfaceSize: InterfaceSize
 setInterfaceSize: (size: InterfaceSize) => void
}

const STORAGE_KEY = 'theme'
const DEFAULT_THEME: Theme = 'auto'

function resolveTheme(theme: Theme): ResolvedTheme {
 if (theme !== 'auto') return theme
 if (typeof window === 'undefined') return 'dark'
 return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
 const root = document.documentElement
 const resolvedTheme = resolveTheme(theme)
 root.dataset.theme = resolvedTheme
 root.classList.toggle('dark', resolvedTheme === 'dark')
 return resolvedTheme
}

function readAndApplyStoredTheme(): Theme {
 try {
 const stored = localStorage.getItem(STORAGE_KEY)
 const theme: Theme = stored === 'light' || stored === 'auto' ? stored : 'dark'
 applyTheme(theme)
 return theme
 } catch {
 return DEFAULT_THEME
 }
}

const ThemeContext = createContext<ThemeContextValue>({
 theme: DEFAULT_THEME,
 resolvedTheme: 'dark',
 setTheme: () => {},
 interfaceSize: 'default',
 setInterfaceSize: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
 const [theme, setTheme] = useState<Theme>(readAndApplyStoredTheme)
 const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme))
 const [interfaceSize, setInterfaceSize] = useState<InterfaceSize>(readInterfaceSize)

 useEffect(() => {
 document.documentElement.dataset.interfaceSize = interfaceSize
 try {
 localStorage.setItem('interface-size', interfaceSize)
 } catch {
 // Keep the size usable for this session when browser storage is unavailable.
 }
 }, [interfaceSize])

 useEffect(() => {
 const syncTheme = () => setResolvedTheme(applyTheme(theme))
 syncTheme()
 try {
 localStorage.setItem(STORAGE_KEY, theme)
 } catch {
 // ignore
 }
 if (theme !== 'auto') return
 const media = window.matchMedia('(prefers-color-scheme: dark)')
 media.addEventListener('change', syncTheme)
 return () => media.removeEventListener('change', syncTheme)
 }, [theme])

 return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, interfaceSize, setInterfaceSize }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
