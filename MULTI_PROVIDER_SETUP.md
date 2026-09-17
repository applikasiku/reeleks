# REELEKS V2.6 — Multi-Provider API Setup

REELEKS memakai dua lapisan data:

1. **Primary licensed provider** untuk drama/episode/playback yang memang Anda berhak tayangkan.
2. **Metadata providers** untuk memperkaya katalog dan pencarian.

## Provider yang didukung

| Provider | Fungsi | Secret |
|---|---|---|
| AgenAPI / provider resmi Anda | Drama China + playback bila lisensi mengizinkan | Ya |
| TVmaze | Metadata serial TV | Tidak |
| AniList | Metadata anime + trending | Tidak |
| Jikan | Metadata anime fallback | Tidak |
| TMDB | Metadata TV/film | Ya |
| OMDb | Metadata pencarian/detail | Ya |
| Apify PineDrama | Enrichment metadata on-demand | Ya |

> Metadata API tidak otomatis memberi hak untuk menayangkan ulang video. Playback harus berasal dari provider yang memang Anda punya izin distribusi/streaming.

## Cloudflare Worker

Masuk ke folder `worker`.

### Primary provider / AgenAPI

Sesuaikan nilai non-secret di `wrangler.toml` berdasarkan dokumentasi resmi provider:

- `PROVIDER_BASE_URL`
- `PROVIDER_API_PREFIX`
- `PROVIDER_AUTH_MODE`
- `PROVIDER_PUBLIC_KEY_HEADER`
- `PROVIDER_PRIVATE_KEY_HEADER`
- `PROVIDER_HOME_PATH`
- `PROVIDER_SEARCH_PATH`
- `PROVIDER_DETAIL_PATH`
- `PROVIDER_EPISODES_PATH`
- `PROVIDER_PLAYBACK_PATH`
- `PROVIDER_PLAYBACK_MODE`

Simpan key sebagai Cloudflare secret, **jangan commit ke GitHub**:

```bash
npx wrangler secret put PROVIDER_API_KEY
npx wrangler secret put PROVIDER_PUBLIC_KEY
npx wrangler secret put PROVIDER_PRIVATE_KEY
npx wrangler secret put PLAYBACK_SECRET
```

### TMDB opsional

```bash
npx wrangler secret put TMDB_BEARER_TOKEN
```

atau:

```bash
npx wrangler secret put TMDB_API_KEY
```

### OMDb opsional

```bash
npx wrangler secret put OMDB_API_KEY
```

### Apify PineDrama opsional

Actor ID sudah disiapkan dari actor yang Anda tunjukkan.

```bash
npx wrangler secret put APIFY_TOKEN
```

Deploy:

```bash
npx wrangler deploy
```

## Hubungkan frontend

Setelah Worker mendapatkan URL, isi environment frontend:

```env
VITE_API_BASE_URL=https://reeleks-v26-api.<subdomain-anda>.workers.dev
```

Endpoint gateway:

```text
GET /api/health
GET /api/providers
GET /api/home
GET /api/search?q=kata
GET /api/drama/:source:id
GET /api/drama/:source:id/episodes
GET /api/playback/:episodeId
GET /api/apify/pinedrama/:collectionId
```

## Fallback tanpa Worker

Jika `VITE_API_BASE_URL` belum diisi, GitHub Pages tetap bisa menampilkan katalog metadata gratis langsung dari:

- TVmaze
- AniList
- Jikan

Playback demo REELEKS tetap terpisah dari metadata provider.
