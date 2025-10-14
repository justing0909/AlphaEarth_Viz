import { useState, useEffect } from 'react'

export function useDarkMode() {
  // Initialize from window immediately if available
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return (window as any).__darkMode === true || (window as any).__darkMode === 'true'
    }
    return false
  })

  useEffect(() => {
    // Listen for changes from other tabs/components
    const checkDarkMode = () => {
      const stored = (window as any).__darkMode
      if (stored !== undefined) {
        const newValue = stored === 'true' || stored === true
        setDarkMode(newValue)
      }
    }
    
    // Check periodically in case changed on another page
    const interval = setInterval(checkDarkMode, 100)
    return () => clearInterval(interval)
  }, [])

  const toggleDarkMode = () => {
    const newValue = !darkMode
    setDarkMode(newValue)
    ;(window as any).__darkMode = newValue
  }

  return { darkMode, toggleDarkMode }
}