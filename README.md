# REELEKS V1

Starter project untuk aplikasi drama pendek mobile-first / PWA dengan:
- 5 nav bottom: Untukmu, Beranda, Hadiah, Daftar Saya, Profil
- feed vertikal ala TikTok dengan scroll-snap
- detail drama dan daftar episode
- HLS.js adaptive streaming
- tanpa tombol download pada konten terlindungi
- controlsList="nodownload"
- watermark dinamis pada player
- Cloudflare Worker contoh untuk signed playback URL
- Android native wrapper contoh dengan FLAG_SECURE

## Menjalankan

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
```

## Keamanan penting

PWA / browser tidak bisa memblokir screenshot 100%.
Untuk Android gunakan wrapper native dengan `FLAG_SECURE`.

`controlsList="nodownload"` hanya menyembunyikan UI download browser; ini bukan DRM.
Untuk produksi gunakan video berlisensi, signed HLS URL pendek, autentikasi, rate limit,
watermark dinamis, dan jika vendor mendukung, DRM (Widevine/FairPlay/PlayReady).

Jangan meletakkan API key provider di frontend.

## Sumber video demo

Project menggunakan public HLS test stream hanya untuk demo teknis.
Ganti endpoint playback dengan sumber yang Anda punya hak distribusi/streaming-nya.
