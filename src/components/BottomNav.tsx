import { Gift, Home, Compass, Bookmark, UserRound } from 'lucide-react'

export type Tab = 'for-you' | 'home' | 'reward' | 'list' | 'profile'

export default function BottomNav({
  active,
  onChange
}: {
  active: Tab
  onChange: (tab: Tab) => void
}) {
  const items = [
    { key: 'for-you' as Tab, label: 'Untukmu', icon: Home },
    { key: 'home' as Tab, label: 'Beranda', icon: Compass },
    { key: 'reward' as Tab, label: 'Hadiah', icon: Gift },
    { key: 'list' as Tab, label: 'Daftar Saya', icon: Bookmark },
    { key: 'profile' as Tab, label: 'Profil', icon: UserRound }
  ]

  return (
    <nav className="bottom-nav">
      {items.map(item => {
        const Icon = item.icon
        const selected = active === item.key
        return (
          <button
            key={item.key}
            className={selected ? 'nav-item active' : 'nav-item'}
            onClick={() => onChange(item.key)}
            aria-label={item.label}
          >
            <Icon size={21} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
