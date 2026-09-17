import { useEffect, useMemo, useState } from 'react'
import { Bell, Database, Flame, Play, Search, Sparkles } from 'lucide-react'
import { hasRemoteApi, searchDramas } from '../services/dramaApi'
import type { CatalogSection, Drama, ProviderStatus } from '../types'

const categoryTabs = [
  'Untukmu',
  'Populer',
  'Baru',
  'Drama China',
  'Anime',
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

function providerLabel(drama: Drama) {
  return drama.providerLabel || drama.source?.toUpperCase() || 'REELEKS'
}

function episodeCount(drama: Drama) {
  return drama.episodeCount || drama.episodes.length
}

function categoryMatches(drama: Drama, category: string) {
  const haystack = `${drama.title} ${drama.genres.join(' ')}`.toLowerCase()
  if (category === 'Untukmu' || category === 'Populer') return true
  if (category === 'Baru') return true
  if (category === 'Drama China') return drama.source === 'primary'
  if (category === 'Anime') return drama.source === 'anilist' || drama.source === 'jikan' || haystack.includes('anime')
  return haystack.includes(category.toLowerCase())
}

export default function HomePage({
  dramas,
  sections = [],
  providers = [],
  onOpen,
  onPlay
}: {
  dramas: Drama[]
  sections?: CatalogSection[]
  providers?: ProviderStatus[]
  onOpen: (drama: Drama) => void
  onPlay: (drama: Drama) => void
}) {
  const [category, setCategory] = useState('Untukmu')
  const [query, setQuery] = useState('')
  const [remoteResults, setRemoteResults] = useState<Drama[]>([])
  const [searching, setSearching] = useState(false)

  const categoryItems = useMemo(() => {
    const filtered = dramas.filter(drama => categoryMatches(drama, category))
    if (category === 'Baru') {
      return [...filtered].sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
    }
    if (category === 'Populer') {
      return [...filtered].sort((a, b) => b.rating - a.rating)
    }
    return filtered.length ? filtered : dramas
  }, [dramas, category])

  const localSearch = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categoryItems
    return dramas.filter(drama =>
      drama.title.toLowerCase().includes(q) ||
      drama.genres.some(genre => genre.toLowerCase().includes(q)) ||
      providerLabel(drama).toLowerCase().includes(q)
    )
  }, [dramas, query, categoryItems])

  useEffect(() => {
    const value = query.trim()
    if (!value || !hasRemoteApi()) {
      setRemoteResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    const timer = window.setTimeout(() => {
      void searchDramas(value).then(results => {
        setRemoteResults(results)
        setSearching(false)
      }).catch(() => {
        setRemoteResults([])
        setSearching(false)
      })
    }, 350)

    return () => window.clearTimeout(timer)
  }, [query])

  const searchResults = query.trim() ? (remoteResults.length ? remoteResults : localSearch) : categoryItems
  const heroItems = useMemo(() => rotateItems(categoryItems, 0, 7), [categoryItems])
  const enabledProviders = providers.filter(provider => provider.enabled)

  const handlePlayOrDetail = (drama: Drama) => {
    if (drama.playable === false) onOpen(drama)
    else onPlay(drama)
  }

  return (
    <main className="page home-page home-v21 home-v26">
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
          placeholder="Cari drama China, TV, anime, genre..."
          aria-label="Cari drama"
        />
        {query && <span className="search-count">{searching ? '...' : searchResults.length}</span>}
      </div>

      {enabledProviders.length > 0 && (
        <div className="provider-strip" aria-label="Sumber katalog aktif">
          <span className="provider-strip-label"><Database size={13} /> Multi API</span>
          {enabledProviders.map(provider => (
            <span key={provider.id} className={`provider-chip provider-${provider.kind}`}>
              <i /> {provider.label}
            </span>
          ))}
        </div>
      )}

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
              <span className="section-kicker">PENCARIAN MULTI-PROVIDER</span>
              <h2>{searching ? 'Mencari di semua sumber...' : `${searchResults.length} judul ditemukan`}</h2>
            </div>
          </div>
          <div className="home-grid3">
            {searchResults.map((drama, index) => (
              <button className="home-mini-card" key={`${drama.id}-${index}`} onClick={() => onOpen(drama)}>
                <div className="home-mini-poster">
                  <img src={drama.poster} alt={drama.title} loading="lazy" />
                  <span>{drama.playable === false ? 'INFO' : 'PLAY'}</span>
                </div>
                <strong>{drama.title}</strong>
                <small>{providerLabel(drama)} · ⭐ {drama.rating || '—'}</small>
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
                  <span className="home-source-badge">{providerLabel(drama)}</span>
                  <div className="home-hero-copy">
                    <h2>{drama.title}</h2>
                    <p>{drama.genres.slice(0, 2).join(' • ')}</p>
                    <div>
                      <button className="home-play" onClick={() => handlePlayOrDetail(drama)}>
                        <Play size={14} fill="currentColor" /> {drama.playable === false ? 'Detail' : 'Tonton'}
                      </button>
                      <button className="home-detail" onClick={() => onOpen(drama)}>Info</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {sections.map(section => (
            <section className="home-discovery provider-section" key={`provider-${section.id}`}>
              <div className="section-title compact-title">
                <div>
                  <span className="section-kicker">{section.provider.toUpperCase()}</span>
                  <h2>{section.title}</h2>
                </div>
                <span className="provider-section-count">{section.dramas.length}</span>
              </div>
              <div className="home-carousel">
                {section.dramas.map((drama, index) => (
                  <button className="home-carousel-card" key={`${section.id}-${drama.id}-${index}`} onClick={() => onOpen(drama)}>
                    <div className="provider-poster-wrap">
                      <img src={drama.poster} alt={drama.title} loading="lazy" />
                      <span>{providerLabel(drama)}</span>
                    </div>
                    <strong>{drama.title}</strong>
                    <small>{episodeCount(drama)} Episode · ⭐ {drama.rating || '—'}</small>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {discoverySections.map((section, sectionIndex) => {
            const items = rotateItems(categoryItems, sectionIndex, section.layout === 'grid3' ? 6 : 7)

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
                          <span>{drama.playable === false ? providerLabel(drama) : index < 3 ? 'HOT' : 'PLAY'}</span>
                        </div>
                        <strong>{drama.title}</strong>
                        <small>{drama.views} · ⭐ {drama.rating || '—'}</small>
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
                        <small>{episodeCount(drama)} Episode · {providerLabel(drama)}</small>
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
                          <small>{providerLabel(drama)} · {drama.views} · ⭐ {drama.rating || '—'}</small>
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
                        onClick={() => handlePlayOrDetail(drama)}
                        style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.88), rgba(0,0,0,.12)), url(${drama.cover})` }}
                      >
                        <span>{providerLabel(drama)}</span>
                        <strong>{drama.title}</strong>
                        <small>{drama.playable === false ? 'Metadata / Info' : `${drama.views} penonton`}</small>
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
