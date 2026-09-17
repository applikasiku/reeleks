import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Heart, Send, X } from 'lucide-react'
import {
  commentsApiConfigured,
  getComments,
  postComment,
  reactToComment,
  subscribeToComments,
  type CommentItem,
  type CommentReaction
} from '../services/commentApi'
import { getSession } from '../services/accountApi'

const seedComments: CommentItem[] = [
  { id: 'seed-1', episodeId: 'seed', name: 'MeiDrama', text: 'Episode ini bikin penasaran banget 😭', createdAt: Date.now() - 120000, likes: 128 },
  { id: 'seed-2', episodeId: 'seed', name: 'CDramaID', text: 'Plot twist-nya akhirnya keluar juga 🔥', createdAt: Date.now() - 480000, likes: 76 },
  { id: 'seed-3', episodeId: 'seed', name: 'Rina', text: 'Lanjut episode berikutnya!', createdAt: Date.now() - 840000, likes: 42 },
  { id: 'seed-4', episodeId: 'seed', name: 'Andi', text: 'Visualnya bagus dan alurnya cepat.', createdAt: Date.now() - 1860000, likes: 18 }
]

function storageKey(episodeId: string) {
  return `reeleks.comments.v2.${episodeId}`
}

function readLocalComments(episodeId: string): CommentItem[] {
  try {
    const stored = localStorage.getItem(storageKey(episodeId))
    if (!stored) return seedComments.map(item => ({ ...item, episodeId }))
    const parsed = JSON.parse(stored) as CommentItem[]
    return Array.isArray(parsed) ? parsed : seedComments.map(item => ({ ...item, episodeId }))
  } catch {
    return seedComments.map(item => ({ ...item, episodeId }))
  }
}

function timeLabel(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return 'baru'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}j`
  return `${Math.floor(hours / 24)}h`
}

function reactionEmoji(reaction?: CommentReaction | null) {
  if (reaction === 'love') return '❤️'
  if (reaction === 'laugh') return '😂'
  if (reaction === 'wow') return '😮'
  return '👍'
}

export default function CommentSheet({
  open,
  episodeId,
  dramaTitle,
  onClose
}: {
  open: boolean
  episodeId: string
  dramaTitle: string
  onClose: () => void
}) {
  const [comments, setComments] = useState<CommentItem[]>(() => readLocalComments(episodeId))
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const loadRemote = async () => {
    if (!commentsApiConfigured()) return
    try {
      const remote = await getComments(episodeId)
      setComments(remote)
      setStatus('')
    } catch {
      setStatus('Mode lokal · komentar server belum tersambung')
    }
  }

  useEffect(() => {
    if (!open) return
    setComments(readLocalComments(episodeId))
    setText('')
    setReplyTo(null)
    setStatus('')
    void loadRemote()

    if (!commentsApiConfigured()) return
    const unsubscribe = subscribeToComments(episodeId, () => void loadRemote())
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId, open])

  const count = comments.reduce((total, item) => total + 1 + (item.replies?.length || 0), 0)
  const countLabel = useMemo(() => `${count} komentar`, [count])

  const persistLocal = (next: CommentItem[]) => {
    setComments(next)
    localStorage.setItem(storageKey(episodeId), JSON.stringify(next))
  }

  const submit = async () => {
    const value = text.trim()
    if (!value || loading) return

    setLoading(true)
    try {
      if (commentsApiConfigured() && getSession()) {
        await postComment(episodeId, value, replyTo?.id || null)
        await loadRemote()
      } else {
        const localComment: CommentItem = {
          id: `local-${Date.now()}`,
          episodeId,
          parentId: replyTo?.id || null,
          name: getSession()?.user.name || 'Kamu',
          text: value,
          createdAt: Date.now(),
          likes: 0
        }

        if (replyTo) {
          persistLocal(comments.map(item => item.id === replyTo.id ? { ...item, replies: [...(item.replies || []), localComment] } : item))
        } else {
          persistLocal([...comments, localComment])
        }
      }
      setText('')
      setReplyTo(null)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Gagal mengirim komentar')
    } finally {
      setLoading(false)
    }
  }

  const applyLocalReaction = (commentId: string, reaction: CommentReaction | null) => {
    const updateItem = (item: CommentItem): CommentItem => {
      if (item.id === commentId) {
        const changed = item.reaction !== reaction
        return {
          ...item,
          reaction: changed ? reaction : null,
          likes: Math.max(0, item.likes + (changed ? 1 : item.reaction ? -1 : 0))
        }
      }
      return { ...item, replies: item.replies?.map(updateItem) }
    }
    persistLocal(comments.map(updateItem))
  }

  const react = async (commentId: string, reaction: CommentReaction) => {
    if (commentsApiConfigured() && getSession()) {
      try {
        await reactToComment(commentId, reaction)
        await loadRemote()
        return
      } catch {
        // fall through to local optimistic reaction
      }
    }
    applyLocalReaction(commentId, reaction)
  }

  const renderComment = (comment: CommentItem, nested = false): ReactNode => (
    <div key={comment.id} className={nested ? 'comment-thread-reply' : 'comment-thread-root'}>
      <article className="comment-row">
        <div className="comment-avatar">{comment.name.slice(0, 1).toUpperCase()}</div>
        <div className="comment-body">
          <div className="comment-name">{comment.name}</div>
          <p>{comment.text}</p>
          <div className="comment-meta">
            <span>{timeLabel(comment.createdAt)}</span>
            {!nested && <button onClick={() => setReplyTo(comment)}>Balas</button>}
          </div>
          <div className="comment-reactions" aria-label="Reaksi komentar">
            {(['like', 'love', 'laugh', 'wow'] as CommentReaction[]).map(reaction => (
              <button
                key={reaction}
                className={comment.reaction === reaction ? 'selected' : ''}
                onClick={() => void react(comment.id, reaction)}
                aria-label={`Reaksi ${reaction}`}
              >
                {reactionEmoji(reaction)}
              </button>
            ))}
          </div>
        </div>
        <button
          className={comment.reaction ? 'comment-like liked' : 'comment-like'}
          onClick={() => void react(comment.id, 'like')}
          aria-label="Sukai komentar"
        >
          <Heart fill={comment.reaction ? 'currentColor' : 'none'} />
          <span>{comment.likes}</span>
        </button>
      </article>
      {comment.replies?.map(reply => renderComment(reply, true))}
    </div>
  )

  if (!open) return null

  return (
    <div
      className="comment-layer"
      role="dialog"
      aria-modal="true"
      aria-label={`Komentar ${dramaTitle}`}
      onPointerDown={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
    >
      <button className="comment-backdrop" aria-label="Tutup komentar" onClick={onClose} />

      <section className="comment-sheet">
        <div className="comment-handle" />
        <header className="comment-header">
          <div>
            <strong>Komentar</strong>
            <span>{countLabel} · {dramaTitle}</span>
          </div>
          <button className="comment-close" onClick={onClose} aria-label="Tutup"><X /></button>
        </header>

        {status && <div className="comment-status">{status}</div>}

        <div className="comment-list">
          {comments.map(comment => renderComment(comment))}
        </div>

        {replyTo && (
          <div className="comment-replying">
            Membalas <strong>{replyTo.name}</strong>
            <button onClick={() => setReplyTo(null)}>Batal</button>
          </div>
        )}

        <form
          className="comment-composer"
          onSubmit={event => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="comment-avatar me">{getSession()?.user.name?.slice(0, 1).toUpperCase() || 'K'}</div>
          <input
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder={replyTo ? `Balas ${replyTo.name}...` : 'Tulis komentar...'}
            maxLength={280}
            autoComplete="off"
          />
          <button type="submit" className="comment-send" disabled={!text.trim() || loading} aria-label="Kirim komentar">
            <Send />
          </button>
        </form>
      </section>
    </div>
  )
}
