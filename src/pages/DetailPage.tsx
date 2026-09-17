import { useState } from 'react'
import { ArrowLeft, ChevronRight, Play, ShieldCheck, Star } from 'lucide-react'
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
            <span className="protected-chip"><ShieldCheck size={14} /> Protected stream</span>
          </div>
          <h1>{drama.title}</h1>
          <div className="tags">{drama.genres.map(g => <span key={g}>{g}</span>)}</div>
          <div className="detail-stats">
            <span><Star size={15} fill="currentColor" /> {drama.rating}</span>
            <span>{drama.views} penonton</span>
            <span>{drama.episodes.length} episode</span>
          </div>
          <button className="primary wide" onClick={() => onPlay(drama.episodes[0])}>
            <Play size={18} fill="currentColor" /> Mulai dari Episode 1
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
          <section className="protected-note">
            <ShieldCheck size={20} />
            <span>Video dilindungi. Tombol unduh tidak disediakan pada konten protected.</span>
          </section>

          <section>
            <div className="section-title episode-heading">
              <div>
                <span className="section-kicker">DAFTAR TONTON</span>
                <h2>Semua Episode ({drama.episodes.length})</h2>
              </div>
              <span className="episode-range">1–{Math.min(10, drama.episodes.length)}</span>
            </div>
            <div className="episode-list">
              {drama.episodes.map(ep => (
                <button key={ep.id} className="episode-row" onClick={() => onPlay(ep)}>
                  <div className="episode-thumb">
                    <img src={ep.poster} alt={`Episode ${ep.number}`} loading="lazy" />
                    <span className="episode-play"><Play size={14} fill="currentColor" /></span>
                  </div>
                  <div>
                    <strong>Episode {ep.number}</strong>
                    <span>{ep.title}</span>
                    <small>{ep.duration} · Sub Indo</small>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
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
            <div><span>Rating</span><strong>{drama.rating}/10</strong></div>
            <div><span>Penonton</span><strong>{drama.views}</strong></div>
            <div><span>Episode</span><strong>{drama.episodes.length}</strong></div>
            <div><span>Subtitle</span><strong>Indonesia</strong></div>
          </div>
        </section>
      )}

      {tab === 'recommendation' && (
        <section className="detail-copy-card empty-recommendation">
          <span className="section-kicker">UNTUKMU</span>
          <h2>Rekomendasi berikutnya</h2>
          <p>Mesin rekomendasi akan dihubungkan ke API katalog pada versi berikutnya.</p>
        </section>
      )}
    </main>
  )
}
