import { useState, useEffect, useCallback } from 'react'

const SEARCH_HISTORY_KEY = 'search_history'
const MAX_HISTORY_ITEMS = 10

/**
 * Custom hook for managing search history
 */
export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
      if (stored) {
        setSearchHistory(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading search history:', error)
    }
  }, [])

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory))
    } catch (error) {
      console.error('Error saving search history:', error)
    }
  }, [searchHistory])

  const addToHistory = useCallback((query: string) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || trimmedQuery.length < 2) return

    setSearchHistory(prev => {
      // Remove existing entry if it exists
      const filtered = prev.filter(item => item.toLowerCase() !== trimmedQuery.toLowerCase())
      // Add to beginning and limit to MAX_HISTORY_ITEMS
      return [trimmedQuery, ...filtered].slice(0, MAX_HISTORY_ITEMS)
    })
  }, [])

  const removeFromHistory = useCallback((query: string) => {
    setSearchHistory(prev => prev.filter(item => item !== query))
  }, [])

  const clearHistory = useCallback(() => {
    setSearchHistory([])
  }, [])

  return {
    searchHistory,
    addToHistory,
    removeFromHistory,
    clearHistory
  }
}