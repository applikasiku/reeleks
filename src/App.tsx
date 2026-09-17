import { useEffect, useMemo, useRef, useState } from 'react'
import BottomNav, { type Tab } from './components/BottomNav'
import CommentSheet from './components/CommentSheet'
import FeedPage from './pages/FeedPage'
import HomePage from './pages/HomePage'
import DetailPage from './pages/DetailPage'
import ProfilePage from './pages/ProfilePage'
import MyListPage from './pages/MyListPage'
import RewardPage from './pages/RewardPage'
import SecureHlsPlayer from './components/SecureHlsPlayer'
import { dramas as fallbackDramas } from './data/mock'
import {
  getDramaById,
  getHomeCatalog,
  getPlaybackUrl,
  hasRemoteApi,
  preloadPlayback
} from './services/dramaApi'
import type { CatalogSection, Drama, Episode, ProviderStatus } from './types'
import {
  ArrowLeft,
  Bookmark,
  Heart,
  Maximize2,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX
} from 'lucide-react'
import { getFavorites, toggleFavorite } from './lib/storage'

type Screen = 'tabs' | 'detail' | 'player'
type TransitionDirection = 'none' | 'up' | 'down'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [screen, setScreen] = useState<Screen>('tabs')
  const [dramas, setDramas] = useState<Drama[]>(fallbackDramas)
  const [catalogSections, setCatalogSections] = useState<CatalogSection[]>([])
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [selectedDrama, setSelectedDrama] = useState<Drama>(fallbackDramas[0])
  const [selectedEpisode, setSelectedEpisode] = useState<Episode>(fallbackDramas[0].episodes[0])
  const [playerMuted, setPlayerMuted] = useState(false)
  const [playerChromeVisible, setPlayerChromeVisible] = useState(false)
  const [playerCommentsOpen, setPlayerCommentsOpen] = useState(false)
  const [episodeTransition, setEpisodeTransition] = useState<TransitionDirection>('none')
  const [feedChromeVisible, setFeedChromeVisible] = useState(false)
  const [savedDramaIds, setSavedDramaIds] = useState<Set<string>>(() => new Set(getFavorites()))
  const [apiStatus, setApiStatus] = useState<'demo' | 'remote' | 'loading'>('loading')
  const playerStageRef = useRef<HTMLDivElement>(null)
  const playerChromeTimerRef = useRef<number | null>(null)
  const playerTapTimerRef = useRef<number | null>(null)
  const playerTransitionTimerRef = useRef<number | null>(null)
  const playerLastTapRef = useRef(0)
  const playerPointerStartYRef = useRef(0)
  const preloadedPlaybackRef = useRef(new Map<string, string>())

  useEffect(() => {
    let mounted = true

    void getHomeCatalog().then(result => {
      if (!mounted) return
      if (result.dramas.length) setDramas(result.dramas)
      setCatalogSections(result.sections)
      setProviders(result.providers)
      setApiStatus(hasRemoteApi() ? 'remote' : 'demo')
    })

    return () => {
      mounted = false
    }
  }, [])

  const currentEpisodeIndex = useMemo(
    () => selectedDrama.episodes.findIndex(e => e.id === selectedEpisode.id),
    [selectedDrama, selectedEpisode]
  )

  const playableFeedDramas = useMemo(() => {
    const available = dramas.filter(drama =>
      drama.playable !== false && drama.episodes.some(episode => episode.playable !== false)
    )
    return available.length ? available : fallbackDramas
  }, [dramas])

  const clearPlayerChromeTimer = () => {
    if (playerChromeTimerRef.current !== null) {
      window.clearTimeout(playerChromeTimerRef.current)
      playerChromeTimerRef.current = null
    }
  }

  const clearPlayerTapTimer = () => {
    if (playerTapTimerRef.current !== null) {
      window.clearTimeout(playerTapTimerRef.current)
      playerTapTimerRef.current = null
    }
  }

  const clearTransitionTimer = () => {
    if (playerTransitionTimerRef.current !== null) {
      window.clearTimeout(playerTransitionTimerRef.current)
      playerTransitionTimerRef.current = null
    }
  }

  const hidePlayerChrome = () => {
    clearPlayerChromeTimer()
    setPlayerChromeVisible(false)
  }

  const showPlayerChromeTemporarily = () => {
    clearPlayerChromeTimer()
    setPlayerChromeVisible(true)
    playerChromeTimerRef.current = window.setTimeout(() => {
      setPlayerChromeVisible(false)
      playerChromeTimerRef.current = null
    }, 3500)
  }

  useEffect(() => {
    hidePlayerChrome()
    clearPlayerTapTimer()
    setPlayerCommentsOpen(false)
    return () => {
      clearPlayerChromeTimer()
      clearPlayerTapTimer()
      clearTransitionTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, selectedEpisode.id])

  useEffect(() => {
    if (screen !== 'player' || currentEpisodeIndex < 0) return

    const candidates = selectedDrama.episodes
      .slice(currentEpisodeIndex + 1, currentEpisodeIndex + 3)
      .filter(episode => episode.playable !== false)

    candidates.forEach(episode => {
      void preloadPlayback(episode).then(url => {
        if (url) preloadedPlaybackRef.current.set(episode.id, url)
      })
    })
  }, [screen, selectedDrama, currentEpisodeIndex])

  const requestAppFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Some mobile browsers do not allow page fullscreen; the player remains edge-to-edge.
    }
  }

  const openDrama = (drama: Drama) => {
    const initialEpisode = drama.episodes[0] || fallbackDramas[0].episodes[0]
    setSelectedDrama(drama)
    setSelectedEpisode(initialEpisode)
    setScreen('detail')

    if (hasRemoteApi()) {
      void getDramaById(drama.id).then(detail => {
        if (!detail) return
        setSelectedDrama(detail)
        if (detail.episodes[0]) setSelectedEpisode(detail.episodes[0])
      })
    }
  }

  const startEpisodeTransition = (direction: TransitionDirection) => {
    clearTransitionTimer()
    setEpisodeTransition(direction)
    if (direction !== 'none') {
      playerTransitionTimerRef.current = window.setTimeout(() => {
        setEpisodeTransition('none')
        playerTransitionTimerRef.current = null
      }, 360)
    }
  }

  const resolveAndPlay = async (
    drama: Drama,
    episode: Episode,
    direction: TransitionDirection = 'none'
  ) => {
    if (drama.playable === false || episode.playable === false) {
      openDrama(drama)
      return
    }

    const cached = preloadedPlaybackRef.current.get(episode.id)
    const playbackUrl = cached || await getPlaybackUrl(episode)

    if (!playbackUrl) {
      openDrama({ ...drama, playable: false })
      return
    }

    startEpisodeTransition(direction)
    setSelectedDrama(drama)
    setSelectedEpisode({ ...episode, hlsUrl: playbackUrl })
    setScreen('player')
  }

  const playDrama = (drama: Drama) => {
    const firstEpisode = drama.episodes.find(episode => episode.playable !== false) || drama.episodes[0]
    if (!firstEpisode || drama.playable === false || firstEpisode.playable === false) {
      openDrama(drama)
      return
    }
    void requestAppFullscreen()
    void resolveAndPlay(drama, firstEpisode)
  }

  const playEpisode = (episode: Episode) => {
    if (selectedDrama.playable === false || episode.playable === false) return
    void requestAppFullscreen()
    void resolveAndPlay(selectedDrama, episode)
  }

  const nextEpisode = () => {
    const next = selectedDrama.episodes[currentEpisodeIndex + 1]
    if (next?.playable !== false) void resolveAndPlay(selectedDrama, next, 'up')
  }

  const previousEpisode = () => {
    const previous = selectedDrama.episodes[currentEpisodeIndex - 1]
    if (previous?.playable !== false) void resolveAndPlay(selectedDrama, previous, 'down')
  }

  const toggleSaved = () => {
    const updated = toggleFavorite(selectedDrama.id)
    setSavedDramaIds(new Set(updated))
  }

  const shareCurrent = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${selectedDrama.title} • REELEKS`,
          text: `Tonton ${selectedDrama.title} di REELEKS`,
          url: window.location.href
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
      }
    } catch {
      // Ignore cancelled share.
    }
  }

  const requestStageFullscreen = async () => {
    const stage = playerStageRef.current
    if (!stage) return

    try {
      if (!document.fullscreenElement) await stage.requestFullscreen()
    } catch {
      const video = stage.querySelector('video') as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
      video?.webkitEnterFullscreen?.()
    }
  }

  const togglePlayerPlayback = () => {
    const video = playerStageRef.current?.querySelector('video') as HTMLVideoElement | null
    if (!video) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }

  const openPlayerComments = () => {
    clearPlayerChromeTimer()
    setPlayerChromeVisible(false)
    setPlayerCommentsOpen(true)
  }

  const closePlayerComments = () => {
    setPlayerCommentsOpen(false)
    hidePlayerChrome()
  }

  const handlePlayerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (playerCommentsOpen) return
    playerPointerStartYRef.current = event.clientY
  }

  const handlePlayerPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (playerCommentsOpen) return

    const target = event.target as HTMLElement
    if (target.closest('button, a, input, .comment-layer')) return

    const deltaY = event.clientY - playerPointerStartYRef.current
    const swipeThreshold = 70

    if (Math.abs(deltaY) >= swipeThreshold) {
      clearPlayerTapTimer()
      playerLastTapRef.current = 0
      hidePlayerChrome()
      if (deltaY < 0) nextEpisode()
      else previousEpisode()
      return
    }

    const now = Date.now()
    const deltaTap = now - playerLastTapRef.current

    if (deltaTap > 0 && deltaTap < 340) {
      clearPlayerTapTimer()
      playerLastTapRef.current = 0
      if (playerChromeVisible) hidePlayerChrome()
      else showPlayerChromeTemporarily()
      return
    }

    playerLastTapRef.current = now
    clearPlayerTapTimer()
    playerTapTimerRef.current = window.setTimeout(() => {
      togglePlayerPlayback()
      playerTapTimerRef.current = null
      playerLastTapRef.current = 0
    }, 340)
  }

  if (screen === 'detail') {
    return (
      <div className="app-shell">
        <DetailPage drama={selectedDrama} onBack={() => setScreen('tabs')} onPlay={playEpisode} />
        <BottomNav active={tab} onChange={(nextTab) => { setTab(nextTab); setScreen('tabs') }} />
      </div>
    )
  }

  if (screen === 'player') {
    const saved = savedDramaIds.has(selectedDrama.id)
    const isLastEpisode = currentEpisodeIndex >= selectedDrama.episodes.length - 1
    const chromeClass = `watch-chrome ${playerChromeVisible ? 'chrome-visible' : 'chrome-hidden'}`
    const transitionClass = episodeTransition === 'none' ? '' : `episode-transition-${episodeTransition}`

    return (
      <div
        ref={playerStageRef}
        className={`player-screen v2-player-stage clean-watch-stage ${transitionClass}`}
        onPointerDown={handlePlayerPointerDown}
        onPointerUp={handlePlayerPointerUp}
      >
        <SecureHlsPlayer
          key={selectedEpisode.id}
          src={selectedEpisode.hlsUrl}
          poster={selectedEpisode.poster}
          dramaId={selectedDrama.id}
          episodeId={selectedEpisode.id}
          protectedContent
          watermark={`REELEKS • ${selectedDrama.id.slice(0, 8)} • EP${selectedEpisode.number}`}
          autoPlay
          muted={playerMuted}
          showControls={false}
          showProgress={playerChromeVisible}
          showSecurityOverlay={playerChromeVisible}
          shouldLoad
          onEnded={nextEpisode}
        />

        <div className={`feed-gradient ${chromeClass}`} />

        <div className={`player-topbar-v2 ${chromeClass}`}>
          <button onClick={() => setScreen('detail')} aria-label="Kembali"><ArrowLeft /></button>
          <span><b>R</b>EELEKS</span>
          <button onClick={() => setPlayerMuted(value => !value)} aria-label="Suara">
            {playerMuted ? <VolumeX /> : <Volume2 />}
          </button>
        </div>

        <aside className={`player-actions-v2 ${chromeClass}`}>
          <button onClick={toggleSaved} className={saved ? 'active-action' : ''}>
            <Heart fill={saved ? 'currentColor' : 'none'} />
            <span>{saved ? 'Favorit' : 'Suka'}</span>
          </button>
          <button onClick={openPlayerComments}><MessageCircle /><span>Komentar</span></button>
          <button onClick={() => void shareCurrent()}><Share2 /><span>Bagikan</span></button>
          <button onClick={toggleSaved} className={saved ? 'active-action saved' : ''}>
            <Bookmark fill={saved ? 'currentColor' : 'none'} />
            <span>Simpan</span>
          </button>
          <button onClick={() => void requestStageFullscreen()}><Maximize2 /><span>Fullscreen</span></button>
        </aside>

        <div className={`player-meta-v2 ${chromeClass}`}>
          <div className="player-copy-v21">
            <strong>@REELEKS ✓</strong>
            <h2>{selectedDrama.title}</h2>
            <p>Episode {selectedEpisode.number} / {selectedDrama.episodeCount || selectedDrama.episodes.length} · {selectedEpisode.duration}</p>
            <small>{selectedEpisode.title}</small>
          </div>
          <div className="player-next-row">
            <span className="api-status-dot">{apiStatus === 'remote' ? 'MULTI API' : 'DEMO V2.6'}</span>
            <button disabled={isLastEpisode} onClick={nextEpisode}>
              {isLastEpisode ? 'Episode terakhir' : `Episode ${currentEpisodeIndex + 2} ›`}
            </button>
          </div>
        </div>

        <CommentSheet
          open={playerCommentsOpen}
          episodeId={selectedEpisode.id}
          dramaTitle={selectedDrama.title}
          onClose={closePlayerComments}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      {tab === 'for-you' && (
        <FeedPage dramas={playableFeedDramas} onOpenDrama={openDrama} onChromeChange={setFeedChromeVisible} />
      )}
      {tab === 'home' && (
        <HomePage
          dramas={dramas}
          sections={catalogSections}
          providers={providers}
          onOpen={openDrama}
          onPlay={playDrama}
        />
      )}
      {tab === 'reward' && <RewardPage />}
      {tab === 'list' && <MyListPage onOpen={openDrama} />}
      {tab === 'profile' && <ProfilePage />}
      {(tab !== 'for-you' || feedChromeVisible) && <BottomNav active={tab} onChange={setTab} />}
    </div>
  )
}
