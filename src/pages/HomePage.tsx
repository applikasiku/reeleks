import { useMemo, useState } from 'react'
import { Bell, Flame, Play, Plus, Search, ShieldCheck, Sparkles } from 'lucide-react'
import type { Drama } from '../types'

const categories = ['Populer', 'Baru', 'Romantis', 'CEO', 'Wuxia', 'Fantasi']

export default function HomePage({
  dramas,
  onOpen,
  onPlay
}: {
  dramas: Drama[]
  onOpen: (drama: Drama) => void
  onPlay: (drama: Drama) => void
}) {
  const [category, setCategory] = useState('Populer')
  const [query, setQuery] = useState('')
  const featured = dramas[0]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return dramas
    return dramas.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.genres.some(g => g.toLowerCase().includes(q))
    )
  }, [dramas, query])

  return (
    <main className="page home-page">
      <header className="topbar">
        <button className="brand-button" aria-label="REELEKS">
          <span className="brand"><span className="brand-r">R</span>EELEKS</span>
        </button>
        <button className="round-action" aria-label="Notifikasi"><Bell size={21} /></button>
      </header>

      <div className="searchbox home-search">
        <Search size={19} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari drama, genre, atau episode..."
          aria-label="Cari drama"
        />
        {query && <span className="search-count">{filtered.length}</span>}
      </div>

      <div className="chips category-tabs" role="tablist" aria-label="Kategori drama">
        {categories.map(c => (
          <button
            className={category === c ? 'chip active' : 'chip'}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {!query && (
        <section
          className="hero-card"
          style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.94) 0%, rgba(0,0,0,.28) 55%, rgba(0,0,0,.08) 100%), url(${featured.cover})` }}
        >
          <div className="hero-topline">
            <span className="hero-pill"><Flame size={14} fill="currentColor" /> #1 Minggu Ini</span>
            <span className="hero-protected"><ShieldCheck size={14} /> Aman</span>
          </div>
          <div className="hero-content">
            <span className="eyebrow"><Sparkles size={14} /> Pilihan REELEKS</span>
            <h1>{featured.title}</h1>
            <p>{featured.genres.join(' • ')} · {featured.views} penonton</p>
            <div className="hero-actions">
              <button className="primary" onClick={() => onPlay(featured)}>
                <Play size={17} fill="currentColor" /> Tonton Sekarang
              </button>
              <button className="icon-btn" onClick={() => onOpen(featured)} aria-label="Detail drama">
                <Plus size={21} />
              </button>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="section-title">
          <div>
            <span className="section-kicker">{query ? 'HASIL PENCARIAN' : 'SEDANG RAMAI'}</span>
            <h2>{query ? `Ditemukan ${filtered.length} drama` : 'Sedang Tren 🔥'}</h2>
          </div>
          {!query && <button>Lihat semua</button>}
        </div>

        {filtered.length > 0 ? (
          <div className="poster-grid">
            {filtered.map((d, index) => (
              <button className="poster-card" key={d.id} onClick={() => onOpen(d)}>
                <div className="poster-wrap">
                  <img src={d.poster} alt={d.title} loading="lazy" />
                  <span className="poster-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="dub-badge">SUB ID</span>
                  <span className="views-badge">▶ {d.views}</span>
                </div>
                <div className="poster-info">
                  <strong>{d.title}</strong>
                  <span>{d.genres.slice(0, 2).join(' • ')}</span>
                  <small>⭐ {d.rating} · {d.episodes.length} Episode</small>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={30} />
            <h3>Drama belum ditemukan</h3>
            <p>Coba kata kunci atau genre lainnya.</p>
          </div>
        )}
      </section>
    </main>
  )
}
