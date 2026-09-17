import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bookmark,
  Check,
  Heart,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Volume2,
  VolumeX
} from 'lucide-react'
import SecureHlsPlayer from '../components/SecureHlsPlayer'
import { getFavorites, toggleFavorite } from '../lib/storage'
import type { Drama, Episode } from '../types'

type FeedMode = 'episode' | 'title'
type FeedEntry = { drama: Drama; episode: Episode }

function getStoredSet(key: string) {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'))
  } catch {
    return new Set<string>()
  }
}

export default function FeedPage({
  dramas,
  onOpenDrama
}: {
  dramas: Drama[]
  onOpenDrama: (drama: Drama) => void
}) {
  const [mode, setMode] = useState<FeedMode>('episode')
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [likedIds, setLikedIds] = useState<Set<string>>(() => getStoredSet('reeleks.likes.v2'))
  const [savedDramaIds, setSavedDramaIds] = useState<Set<string>>(() => new Set(getFavorites()))
  const containerRef = useRef<HTMLDivElement>(null)

  const feed = useMemo<FeedEntry[]>(() => {
    if (mode === 'title') {
      return dramas
        .filter(drama => drama.episodes.length > 0)
        .map(drama => ({ drama, episode: drama.episodes[0] }))
    }

    return dramas.flatMap(drama =>
      drama.episodes.slice(0, 8).map(episode => ({ drama, episode }))
    )
  }, [dramas, mode])

  useEffect(() => {
    setActiveIndex(0)
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [mode])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (!visible?.target) return
        const index = Number((visible.target as HTMLElement).dataset.feedIndex || 0)
        setActiveIndex(index)
      },
      { root, threshold: [0.55, 0.7, 0.85] }
    )

    root.querySelectorAll<HTMLElement>('[data-feed-index]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [feed])

  const toggleLike = (episodeId: string) => {
    setLikedIds(current => {
      const next = new Set(current)
      if (next.has(episodeId)) next.delete(episodeId)
      else next.add(episodeId)
      localStorage.setItem('reeleks.likes.v2', JSON.stringify([...next]))
      return next
    })
  }

  const toggleSave = (dramaId: string) => {
    const updated = toggleFavorite(dramaId)
    setSavedDramaIds(new Set(updated))
  }

  const shareDrama = async (drama: Drama) => {
    const shareData = {
      title: `${drama.title} • REELEKS`,
      text: `Tonton ${drama.title} di REELEKS`,
      url: window.location.href
    }

    try {
      if (navigator.share) await navigator.share(shareData)
      else await navigator.clipboard.writeText(window.location.href)
    } catch {
      // User cancelled share or clipboard is unavailable.
    }
  }

  const handleStageClick = async (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button, a, input')) return

    const stage = event.currentTarget
    const video = stage.querySelector('video') as HTMLVideoElement | null

    if (!document.fullscreenElement) {
      try {
        await stage.requestFullscreen()
        return
      } catch {
        const safariVideo = video as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
        safariVideo?.webkitEnterFullscreen?.()
        return
      }
    }

    if (!video) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }

  return (
    <div className="feed v2-feed" ref={containerRef}>
      {feed.map(({ drama, episode }, index) => {
        const active = index === activeIndex
        const shouldLoad = Math.abs(index - activeIndex) <= 1
        const liked = likedIds.has(episode.id)
        const saved = savedDramaIds.has(drama.id)

        return (
          <section
            className="feed-item tiktok-stage"
            key={`${mode}-${episode.id}`}
            data-feed-index={index}
            onClick={handleStageClick}
            onDoubleClick={() => toggleLike(episode.id)}
          >
            <SecureHlsPlayer
              src={episode.hlsUrl}
              poster={episode.poster}
              dramaId={drama.id}
              episodeId={episode.id}
              protectedContent={episode.protected}
              watermark={`REELEKS • ${drama.id.slice(0, 8)} • EP${episode.number}`}
              autoPlay={active}
              muted={muted}
              showControls={false}
              showProgress
              loop={mode === 'title'}
              shouldLoad={shouldLoad}
            />

            <div className="feed-topbar v2-feed-topbar">
              <span className="feed-brand"><b>R</b>EELEKS</span>
              <div className="feed-mode-switch" role="tablist" aria-label="Mode feed">
                <button
                  className={mode === 'episode' ? 'active' : ''}
                  onClick={() => setMode('episode')}
                >
                  Episode
                </button>
                <button
                  className={mode === 'title' ? 'active' : ''}
                  onClick={() => setMode('title')}
                >
                  Judul
                </button>
              </div>
              <button
                className="feed-sound"
                onClick={() => setMuted(value => !value)}
                aria-label={muted ? 'Aktifkan suara' : 'Matikan suara'}
              >
                {muted ? <VolumeX /> : <Volume2 />}
              </button>
            </div>

            <div className="feed-gradient" />

            <div className="feed-meta v2-feed-meta">
              <strong>@REELEKS <span className="verified"><Check size={12} /></span></strong>
              <h2>{drama.title}</h2>
              <p className="feed-episode">
                {mode === 'episode'
                  ? `Episode ${episode.number} dari ${drama.episodes.length} · ${episode.duration}`
                  : `${drama.episodes.length} episode · ⭐ ${drama.rating}`}
              </p>
              <p className="feed-caption">{drama.synopsis}</p>
              <button className="text-link" onClick={() => onOpenDrama(drama)}>
                Detail & semua episode ›
              </button>
            </div>

            <aside className="feed-actions v2-feed-actions">
              <button
                className={liked ? 'active-action' : ''}
                onClick={() => toggleLike(episode.id)}
                aria-label="Suka"
              >
                <Heart fill={liked ? 'currentColor' : 'none'} />
                <span>{liked ? 'Disukai' : '128.7K'}</span>
              </button>
              <button aria-label="Komentar">
                <MessageCircle />
                <span>3.2K</span>
              </button>
              <button onClick={() => void shareDrama(drama)} aria-label="Bagikan">
                <Share2 />
                <span>Bagikan</span>
              </button>
              <button
                className={saved ? 'active-action saved' : ''}
                onClick={() => toggleSave(drama.id)}
                aria-label="Simpan"
              >
                <Bookmark fill={saved ? 'currentColor' : 'none'} />
                <span>{saved ? 'Tersimpan' : 'Simpan'}</span>
              </button>
              <button aria-label="Layar penuh" className="fullscreen-action">
                <Maximize2 />
                <span>Fullscreen</span>
              </button>
              <button aria-label="Lainnya"><MoreHorizontal /></button>
            </aside>

            <div className="tap-fullscreen-hint">Ketuk video → fullscreen</div>
          </section>
        )
      })}
    </div>
  )
}
