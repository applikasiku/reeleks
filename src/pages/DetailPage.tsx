import { useState } from 'react'
import { ArrowLeft, ChevronRight, Info, Play, ShieldCheck, Star } from 'lucide-react'
import type { Drama, Episode } from '../types'

export default function DetailPage({
  drama,
  onBack,
  onPlay
}: {
  drama: Drama
  onBack: () => void
  onPlay: (episode: Episode) => void
}) {
  const [tab, setTab] = useState<'episode' | 'detail' | 'recommendation'>('episode')
  const playable = drama.playable !== false
  const totalEpisodes = drama.episodeCount || drama.episodes.length
  const firstPlayable = drama.episodes.find(episode => episode.playable !== false)
  const provider = drama.providerLabel || drama.source?.toUpperCase() || 'REELEKS'

  return (
    <main className="page detail">
      <button className="back" onClick={onBack} aria-label="Kembali"><ArrowLeft /></button>

      <section
        className="detail-hero"
        style={{ backgroundImage: `linear-gradient(0deg, #070707 3%, rgba(7,7,7,.28) 62%, rgba(7,7,7,.12)), url(${drama.cover})` }}
      >
        <div className="detail-overlay">
          <div className="detail-brand-row">
            <div className="brand small"><span className="brand-r">R</span>EELEKS</div>
            <span className={playable ? 'protected-chip' : 'protected-chip metadata-chip'}>
              {playable ? <ShieldCheck size={14} /> : <Info size={14} />}
              {playable ? 'Protected stream' : `${provider} metadata`}
            </span>
          </div>
          <h1>{drama.title}</h1>
          <div className="tags">{drama.genres.map(g => <span key={g}>{g}</span>)}</div>
          <div className="detail-stats">
            <span><Star size={15} fill="currentColor" /> {drama.rating || '—'}</span>
            <span>{drama.views} {drama.views === '—' ? '' : 'penonton'}</span>
            <span>{totalEpisodes} episode</span>
            <span>{provider}</span>
          </div>
          <button
            className="primary wide"
            disabled={!playable || !firstPlayable}
            onClick={() => firstPlayable && onPlay(firstPlayable)}
          >
            <Play size={18} fill="currentColor" />
            {playable && firstPlayable ? 'Mulai Menonton' : 'Playback belum tersedia'}
          </button>
        </div>
      </section>

      <div className="tab-row">
        <button className={tab === 'episode' ? 'active' : ''} onClick={() => setTab('episode')}>Episode</button>
        <button className={tab === 'detail' ? 'active' : ''} onClick={() => setTab('detail')}>Detail</button>
        <button className={tab === 'recommendation' ? 'active' : ''} onClick={() => setTab('recommendation')}>Rekomendasi</button>
      </div>

      {tab === 'episode' && (
        <>
          <section className={playable ? 'protected-note' : 'protected-note metadata-note'}>
            {playable ? <ShieldCheck size={20} /> : <Info size={20} />}
            <span>
              {playable
                ? 'Video dilindungi. Tombol unduh tidak disediakan pada konten protected.'
                : `Judul ini berasal dari ${provider} sebagai metadata. REELEKS tidak mengaktifkan playback sampai ada sumber streaming yang Anda berhak tayangkan.`}
            </span>
          </section>

          <section>
            <div className="section-title episode-heading">
              <div>
                <span className="section-kicker">DAFTAR EPISODE</span>
                <h2>{playable ? 'Semua Episode' : 'Informasi Episode'} ({totalEpisodes})</h2>
              </div>
              <span className="episode-range">1–{Math.min(10, totalEpisodes)}</span>
            </div>
            <div className="episode-list">
              {drama.episodes.map(ep => {
                const canPlay = playable && ep.playable !== false
                return (
                  <button
                    key={ep.id}
                    className={`episode-row ${canPlay ? '' : 'episode-disabled'}`}
                    onClick={() => canPlay && onPlay(ep)}
                    disabled={!canPlay}
                  >
                    <div className="episode-thumb">
                      <img src={ep.poster} alt={`Episode ${ep.number}`} loading="lazy" />
                      <span className="episode-play">{canPlay ? <Play size={14} fill="currentColor" /> : <Info size={14} />}</span>
                    </div>
                    <div>
                      <strong>Episode {ep.number}</strong>
                      <span>{ep.title}</span>
                      <small>{ep.duration} · {canPlay ? 'Siap diputar' : provider}</small>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                )
              })}
            </div>
          </section>
        </>
      )}

      {tab === 'detail' && (
        <section className="detail-copy-card">
          <span className="section-kicker">SINOPSIS</span>
          <h2>{drama.title}</h2>
          <p>{drama.synopsis}</p>
          <div className="detail-info-grid">
            <div><span>Rating</span><strong>{drama.rating || '—'}/10</strong></div>
            <div><span>Popularitas</span><strong>{drama.views}</strong></div>
            <div><span>Episode</span><strong>{totalEpisodes}</strong></div>
            <div><span>Sumber</span><strong>{provider}</strong></div>
          </div>
        </section>
      )}

      {tab === 'recommendation' && (
        <section className="detail-copy-card empty-recommendation">
          <span className="section-kicker">MULTI-PROVIDER</span>
          <h2>Rekomendasi berikutnya</h2>
          <p>Katalog REELEKS sekarang dapat menggabungkan AgenAPI/provider berlisensi, TVmaze, TMDB, AniList, Jikan, OMDb, dan enrichment Apify.</p>
        </section>
      )}
    </main>
  )
}
