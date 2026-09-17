import { getFavorites, getHistory, replaceFavorites, replaceHistory } from '../lib/storage'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const SESSION_KEY = 'reeleks.session.v2.5'

export type ReeleksUser = {
  id: string
  email: string
  name: string
  picture?: string
}

export type Session = {
  token: string
  user: ReeleksUser
}

function emitAuthChanged() {
  window.dispatchEvent(new CustomEvent('reeleks-auth-changed'))
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  emitAuthChanged()
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
  emitAuthChanged()
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new Error('API belum dikonfigurasi')

  const session = getSession()
  const headers = new Headers(init.headers || {})
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`)

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error((body as { message?: string }).message || `REELEKS API ${response.status}`)
  }

  return body as T
}

export async function loginWithGoogleCredential(credential: string): Promise<Session> {
  const session = await request<Session>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential })
  })
  saveSession(session)
  await syncLocalLibrary().catch(() => undefined)
  return session
}

export async function getMe(): Promise<ReeleksUser | null> {
  if (!getSession()) return null
  try {
    const result = await request<{ user: ReeleksUser }>('/api/me')
    return result.user
  } catch {
    return getSession()?.user || null
  }
}

export async function syncLocalLibrary() {
  if (!getSession() || !API_BASE) return

  const localHistory = getHistory()
  const localFavorites = getFavorites()

  const result = await request<{
    favorites: string[]
    history: ReturnType<typeof getHistory>
  }>('/api/me/sync', {
    method: 'POST',
    body: JSON.stringify({ favorites: localFavorites, history: localHistory })
  })

  replaceFavorites(result.favorites || localFavorites)
  replaceHistory(result.history || localHistory)
  window.dispatchEvent(new CustomEvent('reeleks-library-synced'))
}

export function apiConfigured() {
  return Boolean(API_BASE)
}
