import { getSession } from './accountApi'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export type CommentReaction = 'like' | 'love' | 'laugh' | 'wow'

export type CommentItem = {
  id: string
  episodeId: string
  parentId?: string | null
  userId?: string
  name: string
  picture?: string
  text: string
  createdAt: number
  likes: number
  reaction?: CommentReaction | null
  replies?: CommentItem[]
}

function authHeaders() {
  const headers = new Headers({ Accept: 'application/json' })
  const token = getSession()?.token
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new Error('API belum dikonfigurasi')
  const headers = authHeaders()
  if (init.body) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error((body as { message?: string }).message || `REELEKS API ${response.status}`)
  return body as T
}

export function commentsApiConfigured() {
  return Boolean(API_BASE)
}

export async function getComments(episodeId: string) {
  const result = await request<{ comments: CommentItem[] }>(`/api/comments?episodeId=${encodeURIComponent(episodeId)}`)
  return result.comments || []
}

export async function postComment(episodeId: string, text: string, parentId?: string | null) {
  const result = await request<{ comment: CommentItem }>('/api/comments', {
    method: 'POST',
    body: JSON.stringify({ episodeId, text, parentId: parentId || null })
  })
  return result.comment
}

export async function reactToComment(commentId: string, reaction: CommentReaction | null) {
  return request<{ ok: boolean; likes: number; reaction: CommentReaction | null }>(`/api/comments/${encodeURIComponent(commentId)}/reaction`, {
    method: 'POST',
    body: JSON.stringify({ reaction })
  })
}

export function subscribeToComments(episodeId: string, onChange: () => void) {
  if (!API_BASE) return () => undefined

  const websocketBase = API_BASE.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
  const token = getSession()?.token || ''
  let socket: WebSocket | null = null
  let retryTimer: number | null = null
  let closed = false

  const connect = () => {
    if (closed) return
    const url = `${websocketBase}/api/comments/live?episodeId=${encodeURIComponent(episodeId)}&token=${encodeURIComponent(token)}`
    socket = new WebSocket(url)
    socket.onmessage = () => onChange()
    socket.onclose = () => {
      if (!closed) retryTimer = window.setTimeout(connect, 1800)
    }
    socket.onerror = () => socket?.close()
  }

  connect()

  return () => {
    closed = true
    if (retryTimer !== null) window.clearTimeout(retryTimer)
    socket?.close()
  }
}
