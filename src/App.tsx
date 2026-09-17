import { useEffect, useMemo, useRef, useState } from 'react'
import BottomNav, { type Tab } from './components/BottomNav'
import FeedPage from './pages/FeedPage'
import HomePage from './pages/HomePage'
import DetailPage from './pages/DetailPage'
import ProfilePage from './pages/ProfilePage'
import MyListPage from './pages/MyListPage'
import RewardPage from './pages/RewardPage'
import SecureHlsPlayer from './components/SecureHlsPlayer'
import { dramas as fallbackDramas } from './data/mock'
import { getHomeDramas, getPlaybackUrl, hasRemoteApi } from './services/dramaApi'
import type { Drama, Episode } from './types'
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

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [screen, setScreen] = useState<Screen>('tabs')
  const [dramas, setDramas] = useState<Drama[]>(fallbackDramas)
  const [selectedDrama, setSelectedDrama] = useState<Drama>(fallbackDramas[0])
  const [selectedEpisode, setSelectedEpisode] = useState<Episode>(fallbackDramas[0].episodes[0])
  const [playerMuted, setPlayerMuted] = useState(false)
  const [savedDramaIds, setSavedDramaIds] = useState<Set<string>>(() => new Set(getFavorites()))
  const [apiStatus, setApiStatus] = useState<'demo' | 'remote' | 'loading'>('loading')
  const playerStageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true

    void getHomeDramas().then(result => {
      if (!mounted || result.length === 0) return
      setDramas(result)
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

  const openDrama = (drama: Drama) => {
    setSelectedDrama(drama)
    setSelectedEpisode(drama.episodes[0])
    setScreen('detail')
  }

  const resolveAndPlay = async (drama: Drama, episode: Episode) => {
    const playbackUrl = await getPlaybackUrl(episode)
    setSelectedDrama(drama)
    setSelectedEpisode({ ...episode, hlsUrl: playbackUrl })
    setScreen('player')
  }

  const playDrama = (drama: Drama) => {
    const firstEpisode = drama.episodes[0]
    if (firstEpisode) void resolveAndPlay(drama, firstEpisode)
  }

  const playEpisode = (episode: Episode) => {
    void resolveAndPlay(selectedDrama, episode)
  }

  const nextEpisode = () => {
    const next = selectedDrama.episodes[currentEpisodeIndex + 1]
    if (next) void resolveAndPlay(selectedDrama, next)
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

  const handlePlayerStageClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button, a')) return

    const stage = playerStageRef.current
    const video = stage?.querySelector('video') as HTMLVideoElement | null
    if (!stage || !video) return

    if (!document.fullscreenElement) {
      await requestStageFullscreen()
      return
    }

    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
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

    return (
      <div
        ref={playerStageRef}
        className="player-screen v2-player-stage"
        onClick={handlePlayerStageClick}
      >
        <SecureHlsPlayer
          src={selectedEpisode.hlsUrl}
          poster={selectedEpisode.poster}
          dramaId={selectedDrama.id}
          episodeId={selectedEpisode.id}
          protectedContent
          watermark={`REELEKS • ${selectedDrama.id.slice(0, 8)} • EP${selectedEpisode.number}`}
          autoPlay
          muted={playerMuted}
          showControls={false}
          showProgress
          shouldLoad
        />

        <div className="feed-gradient" />

        <div className="player-topbar-v2">
          <button onClick={() => setScreen('detail')} aria-label="Kembali"><ArrowLeft /></button>
          <span><b>R</b>EELEKS</span>
          <button onClick={() => setPlayerMuted(value => !value)} aria-label="Suara">
            {playerMuted ? <VolumeX /> : <Volume2 />}
          </button>
        </div>

        <aside className="player-actions-v2">
          <button onClick={toggleSaved} className={saved ? 'active-action' : ''}>
            <Heart fill={saved ? 'currentColor' : 'none'} />
            <span>{saved ? 'Favorit' : 'Suka'}</span>
          </button>
          <button>
            <MessageCircle />
            <span>Komentar</span>
          </button>
          <button onClick={() => void shareCurrent()}>
            <Share2 />
            <span>Bagikan</span>
          </button>
          <button onClick={toggleSaved} className={saved ? 'active-action saved' : ''}>
            <Bookmark fill={saved ? 'currentColor' : 'none'} />
            <span>Simpan</span>
          </button>
          <button onClick={() => void requestStageFullscreen()}>
            <Maximize2 />
            <span>Fullscreen</span>
          </button>
        </aside>

        <div className="player-meta-v2">
          <strong>@REELEKS ✓</strong>
          <h2>{selectedDrama.title}</h2>
          <p>Episode {selectedEpisode.number} / {selectedDrama.episodes.length} · {selectedEpisode.duration}</p>
          <small>{selectedEpisode.title}</small>
          <div className="player-next-row">
            <span className="api-status-dot">{apiStatus === 'remote' ? 'API LIVE' : 'DEMO V2'}</span>
            <button disabled={isLastEpisode} onClick={nextEpisode}>
              {isLastEpisode ? 'Episode terakhir' : `Episode ${currentEpisodeIndex + 2} ›`}
            </button>
          </div>
        </div>

        <div className="tap-fullscreen-hint player-hint">Ketuk video → fullscreen · ketuk lagi → pause/play</div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {tab === 'for-you' && <FeedPage dramas={dramas} onOpenDrama={openDrama} />}
      {tab === 'home' && <HomePage dramas={dramas} onOpen={openDrama} onPlay={playDrama} />}
      {tab === 'reward' && <RewardPage />}
      {tab === 'list' && <MyListPage onOpen={openDrama} />}
      {tab === 'profile' && <ProfilePage />}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
