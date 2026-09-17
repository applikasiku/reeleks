import { dramas as fallbackDramas } from '../data/mock'
import type { Drama, Episode } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const playbackCache = new Map<string, { url: string; expiresAt: number }>()

async function requestJson<T>(path: string): Promise<T> {
  if (!API_BASE) throw new Error('API base URL is not configured')

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`REELEKS API ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function getHomeDramas(): Promise<Drama[]> {
  if (!API_BASE) return fallbackDramas

  try {
    const result = await requestJson<{ dramas?: Drama[] } | Drama[]>('/api/home')
    const dramas = Array.isArray(result) ? result : result.dramas
    return dramas?.length ? dramas : fallbackDramas
  } catch {
    return fallbackDramas
  }
}

export async function searchDramas(query: string): Promise<Drama[]> {
  const q = query.trim()
  if (!q) return getHomeDramas()

  if (!API_BASE) {
    const keyword = q.toLowerCase()
    return fallbackDramas.filter(drama =>
      drama.title.toLowerCase().includes(keyword) ||
      drama.genres.some(genre => genre.toLowerCase().includes(keyword))
    )
  }

  try {
    const result = await requestJson<{ dramas?: Drama[] } | Drama[]>(`/api/search?q=${encodeURIComponent(q)}`)
    return Array.isArray(result) ? result : result.dramas || []
  } catch {
    return []
  }
}

export async function getDramaById(id: string): Promise<Drama | null> {
  if (!API_BASE) return fallbackDramas.find(drama => drama.id === id) || null

  try {
    return await requestJson<Drama>(`/api/drama/${encodeURIComponent(id)}`)
  } catch {
    return fallbackDramas.find(drama => drama.id === id) || null
  }
}

export async function getPlaybackUrl(episode: Episode): Promise<string> {
  if (!API_BASE) return episode.hlsUrl

  const now = Math.floor(Date.now() / 1000)
  const cached = playbackCache.get(episode.id)
  if (cached && cached.expiresAt - now > 20) return cached.url

  try {
    const response = await requestJson<{ playbackUrl: string; expiresAt?: number }>(
      `/api/playback/${encodeURIComponent(episode.id)}`
    )
    const url = response.playbackUrl || episode.hlsUrl
    const expiresAt = response.expiresAt || now + 180
    playbackCache.set(episode.id, { url, expiresAt })
    return url
  } catch {
    return episode.hlsUrl
  }
}

export async function preloadPlayback(episode: Episode): Promise<string> {
  const url = await getPlaybackUrl(episode)

  // Fetch only the small HLS manifest ahead of time. If the CDN does not allow
  // CORS prefetching, playback still works normally because this is best-effort.
  if (/^https?:\/\//i.test(url)) {
    void fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
      headers: {
        Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, text/plain, */*'
      }
    }).catch(() => undefined)
  }

  return url
}

export function clearPlaybackCache(episodeId?: string) {
  if (episodeId) playbackCache.delete(episodeId)
  else playbackCache.clear()
}

export function hasRemoteApi() {
  return Boolean(API_BASE)
}
