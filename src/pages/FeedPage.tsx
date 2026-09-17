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
import CommentSheet from '../components/CommentSheet'
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
  onOpenDrama,
  onChromeChange
}: {
  dramas: Drama[]
  onOpenDrama: (drama: Drama) => void
  onChromeChange?: (visible: boolean) => void
}) {
  const [mode, setMode] = useState<FeedMode>('episode')
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [chromeVisible, setChromeVisible] = useState(false)
  const [commentEntry, setCommentEntry] = useState<FeedEntry | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(() => getStoredSet('reeleks.likes.v2'))
  const [savedDramaIds, setSavedDramaIds] = useState<Set<string>>(() => new Set(getFavorites()))
  const containerRef = useRef<HTMLDivElement>(null)
  const chromeTimerRef = useRef<number | null>(null)
  const tapTimerRef = useRef<number | null>(null)
  const lastTapRef = useRef(0)
  const pointerStartYRef = useRef(0)

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

  const clearChromeTimer = () => {
    if (chromeTimerRef.current !== null) {
      window.clearTimeout(chromeTimerRef.current)
      chromeTimerRef.current = null
    }
  }

  const clearTapTimer = () => {
    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
    }
  }

  const setChrome = (visible: boolean) => {
    setChromeVisible(visible)
    onChromeChange?.(visible)
  }

  const hideChrome = () => {
    clearChromeTimer()
    setChrome(false)
  }

  const showChromeTemporarily = () => {
    clearChromeTimer()
    setChrome(true)
    chromeTimerRef.current = window.setTimeout(() => {
      setChrome(false)
      chromeTimerRef.current = null
    }, 3500)
  }

  useEffect(() => {
    setChrome(false)
    return () => {
      clearChromeTimer()
      clearTapTimer()
      onChromeChange?.(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setActiveIndex(0)
    setCommentEntry(null)
    hideChrome()
    clearTapTimer()
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    return clearChromeTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    setCommentEntry(null)
    hideChrome()
    clearTapTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

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

  const enterStageFullscreen = async (stage: HTMLElement) => {
    const video = stage.querySelector('video') as HTMLVideoElement | null

    try {
      if (!document.fullscreenElement) await stage.requestFullscreen()
    } catch {
      const safariVideo = video as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
      safariVideo?.webkitEnterFullscreen?.()
    }
  }

  const toggleStagePlayback = (stage: HTMLElement) => {
    const video = stage.querySelector('video') as HTMLVideoElement | null
    if (!video) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }

  const scrollToFeedIndex = (index: number) => {
    const nextIndex = Math.max(0, Math.min(feed.length - 1, index))
    const root = containerRef.current
    const target = root?.querySelector<HTMLElement>(`[data-feed-index="${nextIndex}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openComments = (drama: Drama, episode: Episode) => {
    clearChromeTimer()
    setChrome(false)
    setCommentEntry({ drama, episode })
  }

  const closeComments = () => {
    setCommentEntry(null)
    hideChrome()
  }

  const handleStagePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (commentEntry) return
    pointerStartYRef.current = event.clientY
  }

  const handleStagePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (commentEntry) return

    const target = event.target as HTMLElement
    if (target.closest('button, a, input, .comment-layer')) return

    const moved = Math.abs(event.clientY - pointerStartYRef.current)
    if (moved > 18) {
      clearTapTimer()
      lastTapRef.current = 0
      return
    }

    const stage = event.currentTarget
    const now = Date.now()
    const delta = now - lastTapRef.current

    if (delta > 0 && delta < 340) {
      clearTapTimer()
      lastTapRef.current = 0
      if (chromeVisible) hideChrome()
      else showChromeTemporarily()
      return
    }

    lastTapRef.current = now
    clearTapTimer()
    tapTimerRef.current = window.setTimeout(() => {
      toggleStagePlayback(stage)
      tapTimerRef.current = null
      lastTapRef.current = 0
    }, 340)
  }

  return (
    <div className="feed v2-feed" ref={containerRef}>
      {feed.map(({ drama, episode }, index) => {
        const active = index === activeIndex
        const shouldLoad = Math.abs(index - activeIndex) <= 1
        const liked = likedIds.has(episode.id)
        const saved = savedDramaIds.has(drama.id)
        const showChrome = active && chromeVisible
        const chromeClass = `watch-chrome ${showChrome ? 'chrome-visible' : 'chrome-hidden'}`
        const commentsOpen = commentEntry?.episode.id === episode.id

        return (
          <section
            className={`feed-item tiktok-stage clean-watch-stage ${active ? 'feed-active' : ''}`}
            key={`${mode}-${episode.id}`}
            data-feed-index={index}
            onPointerDown={handleStagePointerDown}
            onPointerUp={handleStagePointerUp}
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
              showProgress={showChrome}
              showSecurityOverlay={showChrome}
              loop={false}
              shouldLoad={shouldLoad}
              onEnded={() => {
                if (active && index < feed.length - 1) scrollToFeedIndex(index + 1)
              }}
            />

            <div className={`feed-topbar v2-feed-topbar ${chromeClass}`}>
              <span className="feed-brand"><b>R</b>EELEKS</span>
              <div className="feed-mode-switch" role="tablist" aria-label="Mode feed">
                <button className={mode === 'episode' ? 'active' : ''} onClick={() => setMode('episode')}>Episode</button>
                <button className={mode === 'title' ? 'active' : ''} onClick={() => setMode('title')}>Judul</button>
              </div>
              <button className="feed-sound" onClick={() => setMuted(value => !value)} aria-label={muted ? 'Aktifkan suara' : 'Matikan suara'}>
                {muted ? <VolumeX /> : <Volume2 />}
              </button>
            </div>

            <div className={`feed-gradient ${chromeClass}`} />

            <div className={`feed-meta v2-feed-meta ${chromeClass}`}>
              <strong>@REELEKS <span className="verified"><Check size={12} /></span></strong>
              <h2>{drama.title}</h2>
              <p className="feed-episode">
                {mode === 'episode'
                  ? `Episode ${episode.number} dari ${drama.episodes.length} · ${episode.duration}`
                  : `${drama.episodes.length} episode · ⭐ ${drama.rating}`}
              </p>
              <p className="feed-caption">{drama.synopsis}</p>
              <button className="text-link" onClick={() => onOpenDrama(drama)}>Detail & semua episode ›</button>
            </div>

            <aside className={`feed-actions v2-feed-actions ${chromeClass}`}>
              <button className={liked ? 'active-action' : ''} onClick={() => toggleLike(episode.id)} aria-label="Suka">
                <Heart fill={liked ? 'currentColor' : 'none'} />
                <span>{liked ? 'Disukai' : '128.7K'}</span>
              </button>
              <button onClick={() => openComments(drama, episode)} aria-label="Komentar"><MessageCircle /><span>Komentar</span></button>
              <button onClick={() => void shareDrama(drama)} aria-label="Bagikan"><Share2 /><span>Bagikan</span></button>
              <button className={saved ? 'active-action saved' : ''} onClick={() => toggleSave(drama.id)} aria-label="Simpan">
                <Bookmark fill={saved ? 'currentColor' : 'none'} />
                <span>{saved ? 'Tersimpan' : 'Simpan'}</span>
              </button>
              <button
                aria-label="Layar penuh"
                className="fullscreen-action"
                onClick={(event) => {
                  event.stopPropagation()
                  const stage = event.currentTarget.closest('.tiktok-stage') as HTMLElement | null
                  if (stage) void enterStageFullscreen(stage)
                }}
              >
                <Maximize2 />
                <span>Fullscreen</span>
              </button>
              <button aria-label="Lainnya"><MoreHorizontal /></button>
            </aside>

            <CommentSheet
              open={commentsOpen}
              episodeId={episode.id}
              dramaTitle={drama.title}
              onClose={closeComments}
            />
          </section>
        )
      })}
    </div>
  )
}
