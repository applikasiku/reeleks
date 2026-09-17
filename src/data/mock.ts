import type { Drama } from '../types'

const sample = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

export const dramas: Drama[] = [
  {
    id: 'cinta-ujung-waktu',
    title: 'Cinta di Ujung Waktu',
    genres: ['Romantis', 'Time Travel'],
    poster: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=700&q=80',
    cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
    synopsis: 'Takdir mempertemukan dua insan dari waktu berbeda. Setiap episode membuka rahasia baru.',
    views: '12.4M',
    rating: 9.6,
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `cinta-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      duration: '02:18',
      hlsUrl: sample,
      poster: `https://picsum.photos/seed/reeleks-cinta-${i + 1}/700/1200`,
      protected: true
    }))
  },
  {
    id: 'dewa-turun-gunung',
    title: 'Dewa Turun Gunung',
    genres: ['Wuxia', 'Fantasi'],
    poster: 'https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?auto=format&fit=crop&w=700&q=80',
    cover: 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=1400&q=80',
    synopsis: 'Seorang pendekar turun gunung dan menemukan dunia modern yang penuh konflik.',
    views: '4.8M',
    rating: 9.2,
    episodes: Array.from({ length: 10 }, (_, i) => ({
      id: `dewa-${i + 1}`,
      number: i + 1,
      title: `Kekuatan yang Bangkit ${i + 1}`,
      duration: '02:20',
      hlsUrl: sample,
      poster: `https://picsum.photos/seed/reeleks-dewa-${i + 1}/700/1200`,
      protected: true
    }))
  },
  {
    id: 'kembali-2002',
    title: 'Kembali ke 2002',
    genres: ['Modern', 'Komedi'],
    poster: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=700&q=80',
    cover: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1400&q=80',
    synopsis: 'Kesempatan kedua untuk mengubah hidup, cinta, dan masa depan.',
    views: '6.1M',
    rating: 9.1,
    episodes: Array.from({ length: 8 }, (_, i) => ({
      id: `2002-${i + 1}`,
      number: i + 1,
      title: `Kembali ${i + 1}`,
      duration: '02:05',
      hlsUrl: sample,
      poster: `https://picsum.photos/seed/reeleks-2002-${i + 1}/700/1200`,
      protected: true
    }))
  }
]
