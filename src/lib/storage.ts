const HISTORY_KEY = 'reeleks.history.v1'
const FAVORITE_KEY = 'reeleks.favorite.v1'

export type HistoryItem = {
  dramaId: string
  episodeId: string
  progress: number
  updatedAt: number
}

function emitLibraryChanged() {
  window.dispatchEvent(new CustomEvent('reeleks-library-changed'))
}

export function saveHistory(item: HistoryItem) {
  const current = getHistory().filter(x => !(x.dramaId === item.dramaId && x.episodeId === item.episodeId))
  localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...current].slice(0, 50)))
  emitLibraryChanged()
}

export function getHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function replaceHistory(items: HistoryItem[]) {
  const normalized = [...items]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 100)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(normalized))
  emitLibraryChanged()
}

export function toggleFavorite(dramaId: string) {
  const favorites = getFavorites()
  const next = favorites.includes(dramaId)
    ? favorites.filter(id => id !== dramaId)
    : [dramaId, ...favorites]
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(next))
  emitLibraryChanged()
  return next
}

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITE_KEY) || '[]')
  } catch {
    return []
  }
}

export function replaceFavorites(items: string[]) {
  const unique = [...new Set(items)].slice(0, 200)
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(unique))
  emitLibraryChanged()
}
