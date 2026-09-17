import { useMemo, useState } from 'react'
import BottomNav, { type Tab } from './components/BottomNav'
import FeedPage from './pages/FeedPage'
import HomePage from './pages/HomePage'
import DetailPage from './pages/DetailPage'
import ProfilePage from './pages/ProfilePage'
import SecureHlsPlayer from './components/SecureHlsPlayer'
import { dramas } from './data/mock'
import type { Drama, Episode } from './types'
import { ArrowLeft, Heart, Bookmark } from 'lucide-react'
import { toggleFavorite } from './lib/storage'

type Screen = 'tabs' | 'detail' | 'player'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [screen, setScreen] = useState<Screen>('tabs')
  const [selectedDrama, setSelectedDrama] = useState<Drama>(dramas[0])
  const [selectedEpisode, setSelectedEpisode] = useState<Episode>(dramas[0].episodes[0])

  const currentEpisodeIndex = useMemo(
    () => selectedDrama.episodes.findIndex(e => e.id === selectedEpisode.id),
    [selectedDrama, selectedEpisode]
  )

  const openDrama = (drama: Drama) => {
    setSelectedDrama(drama)
    setSelectedEpisode(drama.episodes[0])
    setScreen('detail')
  }

  const playDrama = (drama: Drama) => {
    setSelectedDrama(drama)
    setSelectedEpisode(drama.episodes[0])
    setScreen('player')
  }

  const playEpisode = (ep: Episode) => {
    setSelectedEpisode(ep)
    setScreen('player')
  }

  const nextEpisode = () => {
    const next = selectedDrama.episodes[currentEpisodeIndex + 1]
    if (next) setSelectedEpisode(next)
  }

  if (screen === 'detail') {
    return (
      <div className="app-shell">
        <DetailPage drama={selectedDrama} onBack={() => setScreen('tabs')} onPlay={playEpisode} />
        <BottomNav active={tab} onChange={(t) => { setTab(t); setScreen('tabs') }} />
      </div>
    )
  }

  if (screen === 'player') {
    return (
      <div className="player-screen">
        <button className="player-back" onClick={() => setScreen('detail')}><ArrowLeft /></button>
        <SecureHlsPlayer
          src={selectedEpisode.hlsUrl}
          poster={selectedEpisode.poster}
          dramaId={selectedDrama.id}
          episodeId={selectedEpisode.id}
          protectedContent
          watermark={`REELEKS • ${selectedDrama.id.slice(0, 8)} • ${selectedEpisode.number}`}
        />
        <div className="player-overlay">
          <h2>{selectedDrama.title}</h2>
          <p>Ep. {selectedEpisode.number} / {selectedDrama.episodes.length}</p>
          <div className="player-buttons">
            <button onClick={() => toggleFavorite(selectedDrama.id)}><Heart /> Favorit</button>
            <button><Bookmark /> Simpan</button>
          </div>
          <button className="primary wide" disabled={currentEpisodeIndex >= selectedDrama.episodes.length - 1} onClick={nextEpisode}>
            Episode Berikutnya
          </button>
          <p className="protected-copy">Screenshot tidak dapat diblokir penuh di PWA. Gunakan wrapper Android untuk FLAG_SECURE.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {tab === 'for-you' && <FeedPage dramas={dramas} onOpenDrama={openDrama} />}
      {tab === 'home' && <HomePage dramas={dramas} onOpen={openDrama} onPlay={playDrama} />}
      {tab === 'reward' && (
        <main className="page centered">
          <div className="reward-card">
            <div className="gift-emoji">🎁</div>
            <h1>Hadiah</h1>
            <p>Versi 1: halaman placeholder untuk reward, koin, atau bonus nonton.</p>
          </div>
        </main>
      )}
      {tab === 'list' && <ProfilePage />}
      {tab === 'profile' && <ProfilePage />}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
