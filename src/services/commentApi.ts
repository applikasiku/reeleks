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

// V2.5 uses resilient short polling so it works on a standard Worker without
// requiring a Durable Object/WebSocket server. This can later be swapped to
// WebSockets without changing CommentSheet.
export function subscribeToComments(_episodeId: string, onChange: () => void) {
  if (!API_BASE) return () => undefined

  let hidden = document.hidden
  const onVisibility = () => { hidden = document.hidden }
  document.addEventListener('visibilitychange', onVisibility)

  const timer = window.setInterval(() => {
    if (!hidden) onChange()
  }, 5000)

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.clearInterval(timer)
  }
}
