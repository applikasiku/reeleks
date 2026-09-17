import { useEffect, useMemo, useState } from 'react'
import { Heart, Send, X } from 'lucide-react'

type CommentItem = {
  id: string
  name: string
  text: string
  time: string
  likes: number
  liked?: boolean
}

const seedComments: CommentItem[] = [
  { id: 'seed-1', name: 'MeiDrama', text: 'Episode ini bikin penasaran banget 😭', time: '2m', likes: 128 },
  { id: 'seed-2', name: 'CDramaID', text: 'Plot twist-nya akhirnya keluar juga 🔥', time: '8m', likes: 76 },
  { id: 'seed-3', name: 'Rina', text: 'Lanjut episode berikutnya!', time: '14m', likes: 42 },
  { id: 'seed-4', name: 'Andi', text: 'Visualnya bagus dan alurnya cepat.', time: '31m', likes: 18 }
]

function storageKey(episodeId: string) {
  return `reeleks.comments.v2.${episodeId}`
}

function readComments(episodeId: string): CommentItem[] {
  try {
    const stored = localStorage.getItem(storageKey(episodeId))
    if (!stored) return seedComments
    const parsed = JSON.parse(stored) as CommentItem[]
    return Array.isArray(parsed) ? parsed : seedComments
  } catch {
    return seedComments
  }
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
  const [comments, setComments] = useState<CommentItem[]>(() => readComments(episodeId))
  const [text, setText] = useState('')

  useEffect(() => {
    if (!open) return
    setComments(readComments(episodeId))
    setText('')
  }, [episodeId, open])

  const countLabel = useMemo(() => `${comments.length} komentar`, [comments.length])

  const persist = (next: CommentItem[]) => {
    setComments(next)
    localStorage.setItem(storageKey(episodeId), JSON.stringify(next))
  }

  const submit = () => {
    const value = text.trim()
    if (!value) return

    const next: CommentItem[] = [
      ...comments,
      {
        id: `local-${Date.now()}`,
        name: 'Kamu',
        text: value,
        time: 'baru',
        likes: 0
      }
    ]

    persist(next)
    setText('')
  }

  const toggleLike = (id: string) => {
    persist(
      comments.map(comment =>
        comment.id === id
          ? {
              ...comment,
              liked: !comment.liked,
              likes: Math.max(0, comment.likes + (comment.liked ? -1 : 1))
            }
          : comment
      )
    )
  }

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

        <div className="comment-list">
          {comments.map(comment => (
            <article className="comment-row" key={comment.id}>
              <div className="comment-avatar">{comment.name.slice(0, 1).toUpperCase()}</div>
              <div className="comment-body">
                <div className="comment-name">{comment.name}</div>
                <p>{comment.text}</p>
                <div className="comment-meta">
                  <span>{comment.time}</span>
                  <button>Balas</button>
                </div>
              </div>
              <button
                className={comment.liked ? 'comment-like liked' : 'comment-like'}
                onClick={() => toggleLike(comment.id)}
                aria-label="Sukai komentar"
              >
                <Heart fill={comment.liked ? 'currentColor' : 'none'} />
                <span>{comment.likes}</span>
              </button>
            </article>
          ))}
        </div>

        <form
          className="comment-composer"
          onSubmit={event => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="comment-avatar me">K</div>
          <input
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder="Tulis komentar..."
            maxLength={280}
            autoComplete="off"
          />
          <button type="submit" className="comment-send" disabled={!text.trim()} aria-label="Kirim komentar">
            <Send />
          </button>
        </form>
      </section>
    </div>
  )
}
