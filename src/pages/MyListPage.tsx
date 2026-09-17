import { useMemo, useState } from 'react'
import { Clock3, Heart, ListVideo } from 'lucide-react'
import { dramas } from '../data/mock'
import { getFavorites, getHistory } from '../lib/storage'
import type { Drama } from '../types'

export default function MyListPage({ onOpen }: { onOpen: (drama: Drama) => void }) {
  const [tab, setTab] = useState<'history' | 'collection' | 'liked'>('history')
  const history = getHistory()
  const favorites = getFavorites()
  const favoriteDramas = useMemo(() => dramas.filter(d => favorites.includes(d.id)), [favorites])
  const historyDramas = useMemo(() => {
    const ids = [...new Set(history.map(h => h.dramaId))]
    return ids.map(id => dramas.find(d => d.id === id)).filter(Boolean) as Drama[]
  }, [history])

  const items = tab === 'history' ? historyDramas : favoriteDramas

  return (
    <main className="page library-page">
      <header className="library-header">
        <div>
          <span className="section-kicker">PERPUSTAKAAN</span>
          <h1>Daftar Saya</h1>
        </div>
        <div className="library-count">{items.length}</div>
      </header>

      <div className="library-tabs">
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><Clock3 size={16} /> Riwayat</button>
        <button className={tab === 'collection' ? 'active' : ''} onClick={() => setTab('collection')}><ListVideo size={16} /> Koleksi</button>
        <button className={tab === 'liked' ? 'active' : ''} onClick={() => setTab('liked')}><Heart size={16} /> Suka</button>
      </div>

      {items.length > 0 ? (
        <div className="library-grid">
          {items.map(drama => {
            const progress = history.find(h => h.dramaId === drama.id)?.progress ?? 0
            return (
              <button className="library-card" key={drama.id} onClick={() => onOpen(drama)}>
                <div className="library-poster">
                  <img src={drama.poster} alt={drama.title} />
                  {tab === 'history' && <div className="watch-progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
                </div>
                <div>
                  <strong>{drama.title}</strong>
                  <span>{drama.genres.slice(0, 2).join(' • ')}</span>
                  <small>{drama.episodes.length} Episode</small>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="empty-state library-empty">
          <ListVideo size={32} />
          <h3>Belum ada tontonan</h3>
          <p>Drama yang Anda tonton atau simpan akan muncul di sini.</p>
        </div>
      )}
    </main>
  )
}
