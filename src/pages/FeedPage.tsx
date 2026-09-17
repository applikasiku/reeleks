import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react'
import SecureHlsPlayer from '../components/SecureHlsPlayer'
import type { Drama, Episode } from '../types'

export default function FeedPage({
  dramas,
  onOpenDrama
}: {
  dramas: Drama[]
  onOpenDrama: (drama: Drama) => void
}) {
  const feed: { drama: Drama; episode: Episode }[] = dramas.flatMap(drama =>
    drama.episodes.slice(0, 4).map(episode => ({ drama, episode }))
  )

  return (
    <div className="feed">
      {feed.map(({ drama, episode }) => (
        <section className="feed-item" key={episode.id}>
          <SecureHlsPlayer
            src={episode.hlsUrl}
            poster={episode.poster}
            dramaId={drama.id}
            episodeId={episode.id}
            protectedContent={episode.protected}
            watermark={`REELEKS • ${drama.id.slice(0, 8)}`}
          />

          <div className="feed-gradient" />

          <div className="feed-meta">
            <strong>@REELEKS ✓</strong>
            <h2>{drama.title}</h2>
            <p>Ep. {episode.number} / {drama.episodes.length}</p>
            <button className="text-link" onClick={() => onOpenDrama(drama)}>
              Lihat detail drama
            </button>
          </div>

          <aside className="feed-actions">
            <button><Heart /><span>128.7K</span></button>
            <button><MessageCircle /><span>3.2K</span></button>
            <button><Share2 /><span>Bagikan</span></button>
            <button><Bookmark /><span>Simpan</span></button>
            <button><MoreHorizontal /></button>
          </aside>

          <div className="swipe-hint">↑ Swipe episode berikutnya</div>
        </section>
      ))}
    </div>
  )
}
