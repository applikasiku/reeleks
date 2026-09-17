# REELEKS V2

REELEKS adalah PWA drama pendek mobile-first dengan pengalaman menonton vertikal bergaya TikTok.

## Fitur V2

- 5 nav bottom: Untukmu, Beranda, Hadiah, Daftar Saya, Profil
- feed vertikal full-screen dengan scroll-snap per episode
- pilihan mode feed `Episode` dan `Judul`
- autoplay hanya video yang sedang aktif
- hanya video aktif + tetangga terdekat yang dimuat untuk mengurangi beban jaringan
- ketuk area video untuk masuk fullscreen
- ketika sudah fullscreen, ketuk video untuk pause/play
- tombol fullscreen manual
- mute/unmute ala short-video app
- double-tap untuk like
- favorit/simpan memakai localStorage
- Web Share API dengan fallback copy link
- progress bar tipis seperti short-video player
- HLS.js adaptive streaming dengan network/media recovery
- buffer dibuat pendek agar perpindahan episode terasa cepat
- watermark dinamis
- tombol download browser disembunyikan untuk protected content
- Picture-in-Picture dinonaktifkan pada protected content
- Cloudflare Worker V2 sebagai provider API gateway
- fallback data demo jika API production belum dikonfigurasi
- Android native wrapper dengan `FLAG_SECURE`

## Frontend

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
```

## API production

Frontend membaca environment variable:

```env
VITE_API_BASE_URL=https://api-domain-anda.example.com
```

Jika variable tersebut kosong, REELEKS otomatis memakai data demo lokal.

Endpoint V2 yang digunakan/disiapkan:

```text
GET /api/health
GET /api/home
GET /api/search?q=keyword
GET /api/drama/:id
GET /api/drama/:id/episodes
GET /api/playback/:episodeId
```

Cloudflare Worker berada di folder `worker/`.

Contoh secret production:

```bash
npx wrangler secret put PLAYBACK_SECRET
npx wrangler secret put PROVIDER_API_KEY
```

`PROVIDER_BASE_URL` harus diarahkan ke vendor/konten yang memang memiliki izin distribusi atau streaming untuk aplikasi Anda.

## Keamanan video

PWA/browser tidak dapat memblokir screenshot atau screen recording 100%.
Untuk Android native wrapper gunakan `WindowManager.LayoutParams.FLAG_SECURE`.

`controlsList="nodownload"` hanya menyembunyikan kontrol download browser dan bukan DRM.
Untuk produksi disarankan menggabungkan:

- signed/short-lived playback URL
- autentikasi user
- rate limiting
- watermark dinamis per user/session
- audit/log abuse
- DRM jika provider mendukung

Jangan pernah meletakkan API key provider di frontend.

## Demo video

Sumber HLS di data demo hanya digunakan untuk pengujian teknis. Ganti playback production dengan sumber video yang Anda punya hak streaming/distribusinya.
