import { useMemo, useState } from 'react'
import BottomNav, { type Tab } from './components/BottomNav'
import FeedPage from './pages/FeedPage'
import HomePage from './pages/HomePage'
import DetailPage from './pages/DetailPage'
import ProfilePage from './pages/ProfilePage'
import MyListPage from './pages/MyListPage'
import RewardPage from './pages/RewardPage'
import SecureHlsPlayer from './components/SecureHlsPlayer'
import { dramas } from './data/mock'
import type { Drama, Episode } from './types'
import { ArrowLeft, Bookmark, Heart } from 'lucide-react'
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
        <button className="player-back" onClick={() => setScreen('detail')} aria-label="Kembali"><ArrowLeft /></button>
        <SecureHlsPlayer
          src={selectedEpisode.hlsUrl}
          poster={selectedEpisode.poster}
          dramaId={selectedDrama.id}
          episodeId={selectedEpisode.id}
          protectedContent
          watermark={`REELEKS • ${selectedDrama.id.slice(0, 8)} • ${selectedEpisode.number}`}
          autoPlay
          showControls
        />
        <div className="player-overlay">
          <span className="section-kicker">EPISODE {selectedEpisode.number}</span>
          <h2>{selectedDrama.title}</h2>
          <p>{selectedEpisode.title} · {selectedEpisode.duration}</p>
          <div className="player-buttons">
            <button onClick={() => toggleFavorite(selectedDrama.id)}><Heart /> Favorit</button>
            <button><Bookmark /> Simpan</button>
          </div>
          <button className="primary wide" disabled={currentEpisodeIndex >= selectedDrama.episodes.length - 1} onClick={nextEpisode}>
            {currentEpisodeIndex >= selectedDrama.episodes.length - 1 ? 'Episode Terakhir' : `Lanjut Episode ${currentEpisodeIndex + 2}`}
          </button>
          <p className="protected-copy">Konten protected: tanpa tombol download. Perlindungan screenshot penuh membutuhkan wrapper Android FLAG_SECURE.</p>
        </div>
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
