import { ArrowLeft, Play, Plus, ShieldCheck } from 'lucide-react'
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
  return (
    <main className="page detail">
      <button className="back" onClick={onBack}><ArrowLeft /></button>

      <section
        className="detail-hero"
        style={{ backgroundImage: `linear-gradient(0deg, #070707 6%, rgba(7,7,7,.1) 70%), url(${drama.cover})` }}
      >
        <div className="detail-overlay">
          <div className="brand small"><span className="brand-r">R</span>EELEKS</div>
          <h1>{drama.title}</h1>
          <div className="tags">{drama.genres.map(g => <span key={g}>{g}</span>)}</div>
          <p>⭐ {drama.rating} · {drama.views} menonton</p>
          <button className="primary wide" onClick={() => onPlay(drama.episodes[0])}>
            <Play size={18} fill="currentColor" /> Lanjutkan Ep. 1
          </button>
        </div>
      </section>

      <div className="tab-row"><button className="active">Episode</button><button>Detail</button><button>Rekomendasi</button></div>

      <section className="protected-note">
        <ShieldCheck size={20} />
        <span>Video dilindungi. Tombol unduh tidak tersedia pada versi V1.</span>
      </section>

      <section>
        <div className="section-title"><h2>Semua Episode ({drama.episodes.length})</h2></div>
        <div className="episode-list">
          {drama.episodes.map(ep => (
            <button key={ep.id} className="episode-row" onClick={() => onPlay(ep)}>
              <img src={ep.poster} alt="" loading="lazy" />
              <div>
                <strong>Ep. {ep.number}</strong>
                <span>{ep.title}</span>
                <small>{ep.duration}</small>
              </div>
              <Play size={18} />
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
