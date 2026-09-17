import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  ChevronRight,
  HelpCircle,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound
} from 'lucide-react'
import {
  apiConfigured,
  getSession,
  loginWithGoogleCredential,
  logout,
  syncLocalLibrary,
  type Session
} from '../services/accountApi'
import { disableEpisodeNotifications, enableEpisodeNotifications } from '../services/push'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function loadGoogleIdentity() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-reeleks-google]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Google Sign-In')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.reeleksGoogle = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Gagal memuat Google Sign-In'))
    document.head.appendChild(script)
  })
}

export default function ProfilePage() {
  const [session, setSession] = useState<Session | null>(() => getSession())
  const [status, setStatus] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(Notification.permission === 'granted')
  const googleButtonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onAuth = () => setSession(getSession())
    window.addEventListener('reeleks-auth-changed', onAuth)
    return () => window.removeEventListener('reeleks-auth-changed', onAuth)
  }, [])

  useEffect(() => {
    if (session || !GOOGLE_CLIENT_ID || !apiConfigured() || !googleButtonRef.current) return

    let cancelled = false
    void loadGoogleIdentity()
      .then(() => {
        if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: response => {
            setStatus('Memproses login Google...')
            void loginWithGoogleCredential(response.credential)
              .then(next => {
                setSession(next)
                setStatus('Login berhasil. Koleksi sedang disinkronkan.')
              })
              .catch(error => setStatus(error instanceof Error ? error.message : 'Login gagal'))
          }
        })

        googleButtonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 300
        })
      })
      .catch(error => setStatus(error instanceof Error ? error.message : 'Google Sign-In gagal dimuat'))

    return () => {
      cancelled = true
    }
  }, [session])

  const handleSync = async () => {
    setSyncing(true)
    setStatus('Menyinkronkan riwayat dan favorit...')
    try {
      await syncLocalLibrary()
      setStatus('Riwayat dan favorit sudah sinkron.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sinkronisasi gagal')
    } finally {
      setSyncing(false)
    }
  }

  const handleNotifications = async () => {
    setStatus('')
    try {
      if (notificationsEnabled) {
        await disableEpisodeNotifications()
        setNotificationsEnabled(false)
        setStatus('Notifikasi episode baru dimatikan.')
      } else {
        await enableEpisodeNotifications()
        setNotificationsEnabled(true)
        setStatus('Notifikasi episode baru aktif.')
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Gagal mengubah notifikasi')
    }
  }

  const handleLogout = () => {
    window.google?.accounts?.id.disableAutoSelect()
    logout()
    setSession(null)
    setStatus('Anda sudah keluar dari akun.')
  }

  const menu = [
    { icon: UserRound, title: 'Akun Saya', subtitle: session ? session.user.email : 'Login untuk sinkronisasi antar perangkat' },
    { icon: ShieldCheck, title: 'Privasi & Keamanan', subtitle: 'Perangkat dan perlindungan akun' },
    { icon: Bell, title: 'Notifikasi', subtitle: notificationsEnabled ? 'Episode baru aktif' : 'Aktifkan pengingat episode terbaru', action: handleNotifications },
    { icon: Smartphone, title: 'PWA & Perangkat', subtitle: 'Instal aplikasi dan perangkat aktif' },
    { icon: HelpCircle, title: 'Pusat Bantuan', subtitle: 'FAQ dan dukungan pengguna' }
  ]

  const initial = session?.user.name?.slice(0, 1).toUpperCase() || 'R'

  return (
    <main className="page profile-page v25-profile">
      <header className="profile-hero">
        <div className="avatar">{session?.user.picture ? <img src={session.user.picture} alt="" /> : initial}</div>
        <div>
          <span className="section-kicker">AKUN REELEKS</span>
          <h1>{session?.user.name || 'REELEKS User'}</h1>
          <p>{session ? session.user.email : 'Mode tamu · data tersimpan di perangkat ini'}</p>
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

      {session && (
        <button className="profile-sync-button" onClick={() => void handleSync()} disabled={syncing}>
          <RefreshCw size={18} className={syncing ? 'spin-icon' : ''} />
          {syncing ? 'Menyinkronkan...' : 'Sinkronkan riwayat & favorit'}
        </button>
      )}

      <section className="settings-list">
        {menu.map(item => {
          const Icon = item.icon
          return (
            <button key={item.title} onClick={item.action}>
              <span className="settings-icon"><Icon size={19} /></span>
              <span className="settings-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
              <ChevronRight size={18} />
            </button>
          )
        })}
      </section>

      {!session && (
        <section className="profile-login-card">
          <div className="login-title"><LogIn size={18} /> Login / Daftar</div>
          {!apiConfigured() && <p>Hubungkan VITE_API_BASE_URL terlebih dahulu agar login server aktif.</p>}
          {apiConfigured() && !GOOGLE_CLIENT_ID && <p>Tambahkan VITE_GOOGLE_CLIENT_ID untuk mengaktifkan Google Sign-In.</p>}
          <div ref={googleButtonRef} className="google-login-host" />
        </section>
      )}

      {session && (
        <button className="login-button logout-button" onClick={handleLogout}><LogOut size={18} /> Keluar</button>
      )}

      {status && <p className="profile-status" role="status">{status}</p>}
      <p className="app-version">REELEKS V2.5 · PWA Secure Streaming</p>
    </main>
  )
}
