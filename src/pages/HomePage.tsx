import { Search, Bell, Play, Plus } from 'lucide-react'
import type { Drama } from '../types'

export default function HomePage({
  dramas,
  onOpen,
  onPlay
}: {
  dramas: Drama[]
  onOpen: (drama: Drama) => void
  onPlay: (drama: Drama) => void
}) {
  const featured = dramas[0]

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand"><span className="brand-r">R</span>EELEKS</div>
        <div className="top-actions"><Bell size={20} /></div>
      </header>

      <div className="searchbox">
        <Search size={18} />
        <input placeholder="Cari judul, aktor, atau genre..." />
      </div>

      <div className="chips">
        {['Populer', 'Anime', 'Baru', 'CEO', 'Wuxia'].map((c, i) => (
          <button className={i === 0 ? 'chip active' : 'chip'} key={c}>{c}</button>
        ))}
      </div>

      <section className="hero-card" style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.92), rgba(0,0,0,.12)), url(${featured.cover})` }}>
        <div className="hero-content">
          <span className="hot">🔥 Populer</span>
          <h1>{featured.title}</h1>
          <p>{featured.genres.join(' • ')} · {featured.views}</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => onPlay(featured)}><Play size={17} fill="currentColor" /> Tonton</button>
            <button className="icon-btn" onClick={() => onOpen(featured)}><Plus size={20} /></button>
          </div>
        </div>
      </section>

      <section>
        <div className="section-title"><h2>Sedang Tren 🔥</h2><button>Lihat semua</button></div>
        <div className="poster-grid">
          {dramas.map(d => (
            <button className="poster-card" key={d.id} onClick={() => onOpen(d)}>
              <img src={d.poster} alt={d.title} loading="lazy" />
              <div className="poster-info">
                <strong>{d.title}</strong>
                <span>{d.views} · ⭐ {d.rating}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
