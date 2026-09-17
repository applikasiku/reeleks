import { CalendarCheck, Coins, Gift, PlayCircle } from 'lucide-react'

export default function RewardPage() {
  return (
    <main className="page reward-page">
      <header className="reward-header">
        <div>
          <span className="section-kicker">REWARD CENTER</span>
          <h1>Hadiah</h1>
        </div>
        <div className="coin-pill"><Coins size={17} /> 1.250</div>
      </header>

      <section className="reward-hero">
        <div>
          <span className="reward-label">BONUS HARIAN</span>
          <h2>Nonton drama, kumpulkan koin</h2>
          <p>Koin demo V1 dapat digunakan sebagai fondasi reward episode, check-in, atau event.</p>
        </div>
        <div className="gift-emoji">🎁</div>
      </section>

      <section className="reward-tasks">
        <article>
          <div className="reward-icon"><CalendarCheck /></div>
          <div><strong>Check-in hari ini</strong><span>Masuk aplikasi setiap hari</span></div>
          <b>+20</b>
        </article>
        <article>
          <div className="reward-icon"><PlayCircle /></div>
          <div><strong>Tonton 3 episode</strong><span>Selesaikan target menonton</span></div>
          <b>+50</b>
        </article>
        <article>
          <div className="reward-icon"><Gift /></div>
          <div><strong>Bonus mingguan</strong><span>Hadiah akan aktif di versi berikutnya</span></div>
          <b>+100</b>
        </article>
      </section>
    </main>
  )
}
