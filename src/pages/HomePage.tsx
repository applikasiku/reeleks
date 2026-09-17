import { useMemo, useState } from 'react'
import { Bell, Flame, Play, Search, Sparkles } from 'lucide-react'
import type { Drama } from '../types'

const categoryTabs = [
  'Untukmu',
  'Populer',
  'Baru',
  'Romantis',
  'CEO',
  'Wuxia',
  'Fantasi',
  'Balas Dendam',
  'Time Travel',
  'Keluarga',
  'Komedi',
  'Thriller'
]

type Layout = 'carousel' | 'grid3' | 'list' | 'wide'

type DiscoverySection = {
  title: string
  kicker: string
  layout: Layout
}

const discoverySections: DiscoverySection[] = [
  { title: 'Rekomendasi Untukmu', kicker: 'DIPILIH UNTUK KAMU', layout: 'carousel' },
  { title: 'Sedang Tren', kicker: 'PALING BANYAK DITONTON', layout: 'grid3' },
  { title: 'Populer Minggu Ini', kicker: 'TOP CHART', layout: 'list' },
  { title: 'Baru Rilis', kicker: 'UPDATE TERBARU', layout: 'carousel' },
  { title: 'Romantis', kicker: 'BIKIN BAPER', layout: 'wide' },
  { title: 'CEO & Cinta Kontrak', kicker: 'DRAMA FAVORIT', layout: 'grid3' },
  { title: 'Wuxia & Kultivasi', kicker: 'DUNIA PENDEKAR', layout: 'carousel' },
  { title: 'Balas Dendam', kicker: 'PLOT PENUH KEJUTAN', layout: 'list' },
  { title: 'Time Travel', kicker: 'KEMBALI KE MASA LALU', layout: 'wide' },
  { title: 'Keluarga', kicker: 'CERITA HANGAT', layout: 'grid3' },
  { title: 'Fantasi', kicker: 'DUNIA LAIN', layout: 'carousel' },
  { title: 'Pilihan Editor', kicker: 'WAJIB DITONTON', layout: 'list' }
]

function rotateItems(dramas: Drama[], offset: number, count = 6) {
  if (dramas.length === 0) return []
  return Array.from({ length: Math.max(count, dramas.length) }, (_, index) => dramas[(index + offset) % dramas.length])
}

export default function HomePage({
  dramas,
  onOpen,
  onPlay
}: {
  dramas: Drama[]
  onOpen: (drama: Drama) => void
  onPlay: (drama: Drama) => void
}) {
  const [category, setCategory] = useState('Untukmu')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return dramas
    return dramas.filter(drama =>
      drama.title.toLowerCase().includes(q) ||
      drama.genres.some(genre => genre.toLowerCase().includes(q))
    )
  }, [dramas, query])

  const heroItems = useMemo(() => rotateItems(dramas, 0, 5), [dramas])

  return (
    <main className="page home-page home-v21">
      <header className="topbar home-v21-topbar">
        <button className="brand-button" aria-label="REELEKS">
          <span className="brand"><span className="brand-r">R</span>EELEKS</span>
        </button>
        <button className="round-action" aria-label="Notifikasi"><Bell size={20} /></button>
      </header>

      <div className="searchbox home-search">
        <Search size={18} />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Cari judul, genre, atau episode..."
          aria-label="Cari drama"
        />
        {query && <span className="search-count">{filtered.length}</span>}
      </div>

      <div className="home-v21-tabs" role="tablist" aria-label="Kategori drama">
        {categoryTabs.map(item => (
          <button
            key={item}
            className={category === item ? 'active' : ''}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {query ? (
        <section className="home-search-results">
          <div className="section-title">
            <div>
              <span className="section-kicker">HASIL PENCARIAN</span>
              <h2>{filtered.length} drama ditemukan</h2>
            </div>
          </div>
          <div className="home-grid3">
            {filtered.map((drama, index) => (
              <button className="home-mini-card" key={`${drama.id}-${index}`} onClick={() => onOpen(drama)}>
                <div className="home-mini-poster">
                  <img src={drama.poster} alt={drama.title} loading="lazy" />
                  <span>SUB ID</span>
                </div>
                <strong>{drama.title}</strong>
                <small>⭐ {drama.rating}</small>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="home-hero-section">
            <div className="section-title compact-title">
              <div>
                <span className="section-kicker">PILIHAN UTAMA</span>
                <h2>Geser untuk menjelajah</h2>
              </div>
              <Sparkles size={18} />
            </div>

            <div className="home-hero-reels" aria-label="Drama unggulan">
              {heroItems.map((drama, index) => (
                <article className="home-hero-reel" key={`${drama.id}-hero-${index}`}>
                  <img src={drama.poster || drama.cover} alt={drama.title} loading={index === 0 ? 'eager' : 'lazy'} />
                  <div className="home-hero-shade" />
                  <span className="home-hero-rank"><Flame size={12} fill="currentColor" /> #{index + 1}</span>
                  <div className="home-hero-copy">
                    <h2>{drama.title}</h2>
                    <p>{drama.genres.slice(0, 2).join(' • ')}</p>
                    <div>
                      <button className="home-play" onClick={() => onPlay(drama)}><Play size={14} fill="currentColor" /> Tonton</button>
                      <button className="home-detail" onClick={() => onOpen(drama)}>Detail</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {discoverySections.map((section, sectionIndex) => {
            const items = rotateItems(dramas, sectionIndex, section.layout === 'grid3' ? 6 : 7)

            return (
              <section className="home-discovery" key={section.title}>
                <div className="section-title compact-title">
                  <div>
                    <span className="section-kicker">{section.kicker}</span>
                    <h2>{section.title}</h2>
                  </div>
                  <button onClick={() => setCategory(section.title)}>Lihat semua</button>
                </div>

                {section.layout === 'grid3' && (
                  <div className="home-grid3">
                    {items.slice(0, 6).map((drama, index) => (
                      <button className="home-mini-card" key={`${section.title}-${drama.id}-${index}`} onClick={() => onOpen(drama)}>
                        <div className="home-mini-poster">
                          <img src={drama.poster} alt={drama.title} loading="lazy" />
                          <span>{index < 3 ? 'HOT' : 'SUB ID'}</span>
                        </div>
                        <strong>{drama.title}</strong>
                        <small>{drama.views} · ⭐ {drama.rating}</small>
                      </button>
                    ))}
                  </div>
                )}

                {section.layout === 'carousel' && (
                  <div className="home-carousel">
                    {items.map((drama, index) => (
                      <button className="home-carousel-card" key={`${section.title}-${drama.id}-${index}`} onClick={() => onOpen(drama)}>
                        <img src={drama.poster} alt={drama.title} loading="lazy" />
                        <strong>{drama.title}</strong>
                        <small>{drama.episodes.length} Episode</small>
                      </button>
                    ))}
                  </div>
                )}

                {section.layout === 'list' && (
                  <div className="home-list">
                    {items.slice(0, 5).map((drama, index) => (
                      <button className="home-list-row" key={`${section.title}-${drama.id}-${index}`} onClick={() => onOpen(drama)}>
                        <span className="home-list-rank">{String(index + 1).padStart(2, '0')}</span>
                        <img src={drama.poster} alt={drama.title} loading="lazy" />
                        <div>
                          <strong>{drama.title}</strong>
                          <span>{drama.genres.slice(0, 2).join(' • ')}</span>
                          <small>{drama.views} · ⭐ {drama.rating}</small>
                        </div>
                        <Play size={18} />
                      </button>
                    ))}
                  </div>
                )}

                {section.layout === 'wide' && (
                  <div className="home-wide-carousel">
                    {items.map((drama, index) => (
                      <button
                        className="home-wide-card"
                        key={`${section.title}-${drama.id}-${index}`}
                        onClick={() => onPlay(drama)}
                        style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.88), rgba(0,0,0,.12)), url(${drama.cover})` }}
                      >
                        <span>{drama.genres[0]}</span>
                        <strong>{drama.title}</strong>
                        <small>{drama.views} penonton</small>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </>
      )}
    </main>
  )
}
