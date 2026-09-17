import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react'
import SecureHlsPlayer from '../components/SecureHlsPlayer'
import type { Drama, Episode } from '../types'

export default function FeedPage({
  dramas,
  onOpenDrama
}: {
  dramas: Drama[]
  onOpenDrama: (drama: Drama) => void
}) {
  const feed = useMemo<{ drama: Drama; episode: Episode }[]>(
    () => dramas.flatMap(drama => drama.episodes.slice(0, 5).map(episode => ({ drama, episode }))),
    [dramas]
  )
  const [activeId, setActiveId] = useState(feed[0]?.episode.id ?? '')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target) setActiveId((visible.target as HTMLElement).dataset.episodeId || '')
      },
      { root, threshold: [0.6, 0.75, 0.9] }
    )

    root.querySelectorAll<HTMLElement>('[data-episode-id]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [feed])

  return (
    <div className="feed" ref={containerRef}>
      {feed.map(({ drama, episode }) => {
        const active = activeId === episode.id
        return (
          <section className="feed-item" key={episode.id} data-episode-id={episode.id}>
            <SecureHlsPlayer
              src={episode.hlsUrl}
              poster={episode.poster}
              dramaId={drama.id}
              episodeId={episode.id}
              protectedContent={episode.protected}
              watermark={`REELEKS • ${drama.id.slice(0, 8)}`}
              autoPlay={active}
              muted={!active}
              showControls={false}
            />

            <div className="feed-topbar">
              <span className="feed-brand"><b>R</b>EELEKS</span>
              <span className="feed-mode">Untukmu</span>
            </div>
            <div className="feed-gradient" />

            <div className="feed-meta">
              <strong>@REELEKS <span className="verified">✓</span></strong>
              <h2>{drama.title}</h2>
              <p className="feed-episode">Episode {episode.number} dari {drama.episodes.length} · {episode.duration}</p>
              <p className="feed-caption">{drama.synopsis}</p>
              <button className="text-link" onClick={() => onOpenDrama(drama)}>
                Lihat detail & semua episode ›
              </button>
            </div>

            <aside className="feed-actions">
              <button aria-label="Suka"><Heart /><span>128.7K</span></button>
              <button aria-label="Komentar"><MessageCircle /><span>3.2K</span></button>
              <button aria-label="Bagikan"><Share2 /><span>Bagikan</span></button>
              <button aria-label="Simpan"><Bookmark /><span>Simpan</span></button>
              <button aria-label="Lainnya"><MoreHorizontal /></button>
            </aside>

            <div className="swipe-hint">↑ Geser untuk episode berikutnya</div>
          </section>
        )
      })}
    </div>
  )
}
