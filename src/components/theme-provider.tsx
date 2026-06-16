import React, { createContext, useContext, useEffect } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // App is locked to light mode at all times.
  const theme: Theme = "light"

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add("light")
    try {
      // Clear any previously persisted theme so it can't override the lock.
      localStorage.removeItem("fampreneurs-ui-theme")
      localStorage.removeItem("family-dashboard-theme")
    } catch {}
  }, [])

  const value: ThemeProviderState = {
    theme,
    setTheme: () => {
      // No-op: theme is locked to light.
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
