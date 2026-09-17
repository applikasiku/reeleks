import { Clock3, Heart, Bookmark, ShieldCheck } from 'lucide-react'
import { dramas } from '../data/mock'
import { getFavorites, getHistory } from '../lib/storage'

export default function ProfilePage() {
  const history = getHistory()
  const favorites = getFavorites()
  const favoriteDramas = dramas.filter(d => favorites.includes(d.id))

  return (
    <main className="page">
      <header className="profile-header">
        <div className="avatar">R</div>
        <div><h2>REELEKS User</h2><span>ID: demo-v1</span></div>
      </header>

      <section className="profile-tools">
        <div><Clock3 /><span>Riwayat</span></div>
        <div><Heart /><span>Favorit</span></div>
        <div><Bookmark /><span>Koleksi</span></div>
        <div><ShieldCheck /><span>Aman</span></div>
      </section>

      <section>
        <div className="section-title"><h2>Riwayat</h2></div>
        <div className="history-list">
          {history.length === 0 && <p className="muted">Belum ada riwayat menonton.</p>}
          {history.map(item => (
            <div key={`${item.dramaId}-${item.episodeId}`} className="history-row">
              <strong>{item.dramaId}</strong>
              <span>{Math.round(item.progress * 100)}%</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-title"><h2>Favorit</h2></div>
        <div className="poster-grid">
          {favoriteDramas.map(d => (
            <div className="poster-card" key={d.id}>
              <img src={d.poster} alt={d.title} />
              <div className="poster-info"><strong>{d.title}</strong></div>
            </div>
          ))}
          {favoriteDramas.length === 0 && <p className="muted">Belum ada favorit.</p>}
        </div>
      </section>
    </main>
  )
}
