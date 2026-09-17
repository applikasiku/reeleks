const HISTORY_KEY = 'reeleks.history.v1'
const FAVORITE_KEY = 'reeleks.favorite.v1'

export type HistoryItem = {
  dramaId: string
  episodeId: string
  progress: number
  updatedAt: number
}

export function saveHistory(item: HistoryItem) {
  const current = getHistory().filter(x => !(x.dramaId === item.dramaId && x.episodeId === item.episodeId))
  localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...current].slice(0, 50)))
}

export function getHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function toggleFavorite(dramaId: string) {
  const favorites = getFavorites()
  const next = favorites.includes(dramaId)
    ? favorites.filter(id => id !== dramaId)
    : [dramaId, ...favorites]
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(next))
  return next
}

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITE_KEY) || '[]')
  } catch {
    return []
  }
}
