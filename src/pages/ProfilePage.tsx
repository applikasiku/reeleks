import { Bell, ChevronRight, HelpCircle, LogIn, ShieldCheck, Smartphone, UserRound } from 'lucide-react'

export default function ProfilePage() {
  const menu = [
    { icon: UserRound, title: 'Akun Saya', subtitle: 'Profil, nama, dan preferensi' },
    { icon: ShieldCheck, title: 'Privasi & Keamanan', subtitle: 'Perangkat dan perlindungan akun' },
    { icon: Bell, title: 'Notifikasi', subtitle: 'Drama baru dan episode terbaru' },
    { icon: Smartphone, title: 'PWA & Perangkat', subtitle: 'Instal aplikasi dan perangkat aktif' },
    { icon: HelpCircle, title: 'Pusat Bantuan', subtitle: 'FAQ dan dukungan pengguna' }
  ]

  return (
    <main className="page profile-page">
      <header className="profile-hero">
        <div className="avatar">R</div>
        <div>
          <span className="section-kicker">AKUN REELEKS</span>
          <h1>REELEKS User</h1>
          <p>Mode tamu · ID demo-v1</p>
        </div>
      </header>

      <section className="vip-card">
        <div>
          <span>REELEKS VIP</span>
          <h2>Nonton lebih nyaman</h2>
          <p>Fondasi untuk paket premium, bebas iklan, dan benefit eksklusif.</p>
        </div>
        <button>Segera</button>
      </section>

      <section className="settings-list">
        {menu.map(item => {
          const Icon = item.icon
          return (
            <button key={item.title}>
              <span className="settings-icon"><Icon size={19} /></span>
              <span className="settings-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
              <ChevronRight size={18} />
            </button>
          )
        })}
      </section>

      <button className="login-button"><LogIn size={18} /> Login / Daftar</button>
      <p className="app-version">REELEKS V1 · PWA Secure Streaming</p>
    </main>
  )
}
