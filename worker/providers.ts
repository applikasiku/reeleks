export type UnifiedEpisode = {
  id: string
  number: number
  title: string
  duration: string
  hlsUrl: string
  poster: string
  protected: boolean
  playable: boolean
  source: string
  sourceId: string
}

export type UnifiedDrama = {
  id: string
  title: string
  genres: string[]
  poster: string
  cover: string
  synopsis: string
  views: string
  rating: number
  episodes: UnifiedEpisode[]
  episodeCount?: number
  source: string
  sourceId: string
  providerLabel: string
  playable: boolean
  year?: string
}

export type ProviderStatus = {
  id: string
  label: string
  enabled: boolean
  kind: 'streaming' | 'metadata' | 'scraper'
  note?: string
}

export interface ProviderEnv {
  PROVIDER_NAME?: string
  PROVIDER_BASE_URL?: string
  PROVIDER_API_PREFIX?: string
  PROVIDER_API_KEY?: string
  PROVIDER_AUTH_MODE?: 'bearer' | 'x-api-key' | 'header' | 'query' | 'none'
  PROVIDER_API_KEY_HEADER?: string
  PROVIDER_API_KEY_QUERY?: string
  PROVIDER_PUBLIC_KEY?: string
  PROVIDER_PRIVATE_KEY?: string
  PROVIDER_PUBLIC_KEY_HEADER?: string
  PROVIDER_PRIVATE_KEY_HEADER?: string
  PROVIDER_HOME_PATH?: string
  PROVIDER_SEARCH_PATH?: string
  PROVIDER_DETAIL_PATH?: string
  PROVIDER_EPISODES_PATH?: string
  PROVIDER_PLAYBACK_PATH?: string
  PROVIDER_PLAYBACK_MODE?: 'direct-template' | 'json'
  TMDB_BEARER_TOKEN?: string
  TMDB_API_KEY?: string
  OMDB_API_KEY?: string
  APIFY_TOKEN?: string
  APIFY_PINEDRAMA_ACTOR_ID?: string
}

const POSTER_FALLBACK = 'https://placehold.co/600x900/111111/ffffff?text=REELEKS'
const COVER_FALLBACK = 'https://placehold.co/1200x675/111111/ffffff?text=REELEKS'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function firstValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function firstString(record: Record<string, unknown>, keys: string[], fallback = '') {
  const value = firstValue(record, keys)
  if (value === undefined) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function firstNumber(record: Record<string, unknown>, keys: string[], fallback = 0) {
  const value = firstValue(record, keys)
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function listOfStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === 'string' ? item : firstString(asRecord(item), ['name', 'title', 'label']))
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(/[,|/]/).map(item => item.trim()).filter(Boolean)
  }
  return []
}

function arrayFrom(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  for (const key of ['dramas', 'items', 'results', 'list', 'books', 'records', 'episodes']) {
    if (Array.isArray(record[key])) return record[key] as unknown[]
  }
  const data = record.data
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const nested = asRecord(data)
    for (const key of ['dramas', 'items', 'results', 'list', 'books', 'records']) {
      if (Array.isArray(nested[key])) return nested[key] as unknown[]
    }
  }
  return []
}

function makeId(source: string, rawId: string | number) {
  return `${source}:${String(rawId)}`
}

export function splitUnifiedId(value: string) {
  const index = value.indexOf(':')
  if (index < 0) return { source: 'primary', rawId: value }
  return {
    source: value.slice(0, index),
    rawId: value.slice(index + 1)
  }
}

function formatViews(value: number | string | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return '—'
  if (parsed >= 1_000_000) return `${(parsed / 1_000_000).toFixed(parsed >= 10_000_000 ? 0 : 1)}M`
  if (parsed >= 1_000) return `${(parsed / 1_000).toFixed(parsed >= 100_000 ? 0 : 1)}K`
  return String(Math.round(parsed))
}

function durationLabel(minutes: number | string | undefined) {
  const parsed = typeof minutes === 'number' ? minutes : Number(minutes)
  return Number.isFinite(parsed) && parsed > 0 ? `${Math.round(parsed)} min` : '—'
}

function metadataEpisode(source: string, sourceId: string, number: number, poster: string, title?: string, duration?: string): UnifiedEpisode {
  return {
    id: makeId(source, `${sourceId}-ep-${number}`),
    number,
    title: title || `Episode ${number}`,
    duration: duration || '—',
    hlsUrl: '',
    poster: poster || POSTER_FALLBACK,
    protected: false,
    playable: false,
    source,
    sourceId: `${sourceId}-ep-${number}`
  }
}

function genericEpisode(raw: unknown, index: number, source: string, poster: string, assumePlayable: boolean): UnifiedEpisode {
  const record = asRecord(raw)
  const sourceId = firstString(record, ['id', 'episodeId', 'episode_id', 'chapterId', 'chapter_id', 'vid', 'videoId'], String(index + 1))
  const number = firstNumber(record, ['number', 'episode', 'episodeNumber', 'episode_number', 'index', 'sort'], index + 1)
  const hlsUrl = firstString(record, ['hlsUrl', 'hls_url', 'playbackUrl', 'playback_url', 'videoUrl', 'video_url', 'm3u8', 'url'])
  const duration = firstString(record, ['duration', 'durationText', 'duration_text']) || durationLabel(firstNumber(record, ['durationMinutes', 'duration_minutes'], 0))
  const playable = assumePlayable || Boolean(hlsUrl)

  return {
    id: makeId(source, sourceId),
    number,
    title: firstString(record, ['title', 'name', 'episodeTitle', 'episode_title'], `Episode ${number}`),
    duration: duration || '—',
    hlsUrl,
    poster: firstString(record, ['poster', 'cover', 'thumbnail', 'image', 'imageUrl', 'image_url'], poster || POSTER_FALLBACK),
    protected: playable,
    playable,
    source,
    sourceId
  }
}

export function normalizeGenericDrama(raw: unknown, source: string, providerLabel: string, assumePlayable = false): UnifiedDrama {
  const record = asRecord(raw)
  const title = firstString(record, ['title', 'name', 'bookName', 'book_name', 'dramaName', 'drama_name', 'seriesName', 'series_name'], 'Tanpa Judul')
  const sourceId = firstString(record, ['id', 'collectionId', 'collection_id', 'bookId', 'book_id', 'dramaId', 'drama_id', 'seriesId', 'series_id', 'imdbID', 'imdbId'], title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
  const poster = firstString(record, ['poster', 'cover', 'coverUrl', 'cover_url', 'verticalCover', 'vertical_cover', 'image', 'imageUrl', 'image_url'], POSTER_FALLBACK)
  const cover = firstString(record, ['banner', 'backdrop', 'coverHorizontal', 'horizontalCover', 'background', 'backgroundUrl', 'background_url'], poster || COVER_FALLBACK)
  const episodesRaw = firstValue(record, ['episodes', 'episodeList', 'episode_list', 'chapters', 'chapterList'])
  const episodesArray = Array.isArray(episodesRaw) ? episodesRaw : []
  const episodes = episodesArray.length
    ? episodesArray.map((episode, index) => genericEpisode(episode, index, source, poster, assumePlayable))
    : [metadataEpisode(source, sourceId, 1, poster)]
  const episodeCount = firstNumber(record, ['episodeCount', 'episode_count', 'episodesCount', 'totalEpisodes', 'total_episodes'], episodesArray.length || 0)
  const genres = listOfStrings(firstValue(record, ['genres', 'genre', 'categories', 'category', 'tags']))
  const ratingRaw = firstNumber(record, ['rating', 'score', 'voteAverage', 'vote_average'], 0)
  const rating = ratingRaw > 10 ? ratingRaw / 10 : ratingRaw
  const playable = assumePlayable || episodes.some(episode => episode.playable)

  return {
    id: makeId(source, sourceId),
    title,
    genres: genres.length ? genres : ['Drama'],
    poster,
    cover: cover || poster || COVER_FALLBACK,
    synopsis: stripHtml(firstString(record, ['synopsis', 'description', 'overview', 'summary', 'intro'], 'Metadata tersedia dari provider.')),
    views: formatViews(firstValue(record, ['views', 'viewCount', 'view_count', 'popularity']) as number | string | undefined),
    rating: Number.isFinite(rating) ? Math.round(rating * 10) / 10 : 0,
    episodes,
    episodeCount: episodeCount || episodesArray.length || undefined,
    source,
    sourceId,
    providerLabel,
    playable,
    year: firstString(record, ['year', 'releaseYear', 'release_year', 'firstAirDate', 'first_air_date']).slice(0, 4) || undefined
  }
}

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = 7500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

function primaryConfigured(env: ProviderEnv) {
  const base = (env.PROVIDER_BASE_URL || '').trim()
  return Boolean(base && !base.includes('your-licensed-video-provider.example.com'))
}

function primaryUrl(env: ProviderEnv, path: string) {
  const base = (env.PROVIDER_BASE_URL || '').replace(/\/$/, '')
  const prefix = (env.PROVIDER_API_PREFIX || '').trim()
  const normalizedPrefix = prefix && !prefix.startsWith('/') ? `/${prefix}` : prefix
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${base}${normalizedPrefix}${normalizedPath}`)
  const mode = env.PROVIDER_AUTH_MODE || 'bearer'
  if (mode === 'query' && env.PROVIDER_API_KEY) {
    url.searchParams.set(env.PROVIDER_API_KEY_QUERY || 'api_key', env.PROVIDER_API_KEY)
  }
  return url
}

function primaryHeaders(env: ProviderEnv) {
  const headers = new Headers({ Accept: 'application/json' })
  const mode = env.PROVIDER_AUTH_MODE || 'bearer'
  const key = env.PROVIDER_API_KEY

  if (key && mode === 'bearer') headers.set('Authorization', `Bearer ${key}`)
  if (key && mode === 'x-api-key') headers.set('X-API-Key', key)
  if (key && mode === 'header') headers.set(env.PROVIDER_API_KEY_HEADER || 'X-API-Key', key)
  if (env.PROVIDER_PUBLIC_KEY) headers.set(env.PROVIDER_PUBLIC_KEY_HEADER || 'X-Public-Key', env.PROVIDER_PUBLIC_KEY)
  if (env.PROVIDER_PRIVATE_KEY) headers.set(env.PROVIDER_PRIVATE_KEY_HEADER || 'X-Private-Key', env.PROVIDER_PRIVATE_KEY)
  return headers
}

function fillTemplate(template: string, values: Record<string, string>) {
  let output = template
  Object.entries(values).forEach(([key, value]) => {
    output = output.replaceAll(`{${key}}`, encodeURIComponent(value))
  })
  return output
}

export async function primaryFetch(env: ProviderEnv, path: string) {
  return fetchJson(primaryUrl(env, path).toString(), { headers: primaryHeaders(env) })
}

async function primaryHome(env: ProviderEnv) {
  if (!primaryConfigured(env)) return []
  const data = await primaryFetch(env, env.PROVIDER_HOME_PATH || '/home')
  return arrayFrom(data).map(item => normalizeGenericDrama(item, 'primary', env.PROVIDER_NAME || 'AgenAPI', true))
}

async function primarySearch(env: ProviderEnv, query: string) {
  if (!primaryConfigured(env)) return []
  const template = env.PROVIDER_SEARCH_PATH || '/search?q={query}'
  const data = await primaryFetch(env, fillTemplate(template, { query }))
  return arrayFrom(data).map(item => normalizeGenericDrama(item, 'primary', env.PROVIDER_NAME || 'AgenAPI', true))
}

async function primaryDetail(env: ProviderEnv, rawId: string) {
  if (!primaryConfigured(env)) throw new Error('Primary provider is not configured')
  const detailPath = fillTemplate(env.PROVIDER_DETAIL_PATH || '/drama/{id}', { id: rawId })
  const detailData = await primaryFetch(env, detailPath)
  const detailItem = arrayFrom(detailData)[0] || asRecord(detailData).data || detailData
  const drama = normalizeGenericDrama(detailItem, 'primary', env.PROVIDER_NAME || 'AgenAPI', true)

  try {
    const episodesPath = fillTemplate(env.PROVIDER_EPISODES_PATH || '/drama/{id}/episodes', { id: rawId })
    const episodeData = await primaryFetch(env, episodesPath)
    const episodeItems = arrayFrom(episodeData)
    if (episodeItems.length) {
      drama.episodes = episodeItems.map((episode, index) => genericEpisode(episode, index, 'primary', drama.poster, true))
      drama.episodeCount = drama.episodes.length
      drama.playable = true
    }
  } catch {
    // Some providers include episodes inside the detail payload.
  }

  return drama
}

function mapTvMazeShow(raw: unknown): UnifiedDrama {
  const record = asRecord(raw)
  const show = asRecord(record.show || raw)
  const image = asRecord(show.image)
  const rating = asRecord(show.rating)
  const network = asRecord(show.network)
  const webChannel = asRecord(show.webChannel)
  const sourceId = firstString(show, ['id'])
  const poster = firstString(image, ['medium', 'original'], POSTER_FALLBACK)
  const genres = listOfStrings(show.genres)
  return {
    id: makeId('tvmaze', sourceId),
    title: firstString(show, ['name'], 'TV Show'),
    genres: genres.length ? genres : ['TV'],
    poster,
    cover: firstString(image, ['original', 'medium'], poster),
    synopsis: stripHtml(firstString(show, ['summary'], 'Metadata TVMaze.')),
    views: firstString(network, ['name']) || firstString(webChannel, ['name']) || 'TVMaze',
    rating: firstNumber(rating, ['average'], 0),
    episodes: [metadataEpisode('tvmaze', sourceId, 1, poster)],
    source: 'tvmaze',
    sourceId,
    providerLabel: 'TVmaze',
    playable: false,
    year: firstString(show, ['premiered']).slice(0, 4) || undefined
  }
}

async function tvMazeSearch(query: string) {
  const data = await fetchJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`)
  return arrayFrom(data).slice(0, 12).map(mapTvMazeShow)
}

async function tvMazeDetail(rawId: string) {
  const [showData, episodesData] = await Promise.all([
    fetchJson(`https://api.tvmaze.com/shows/${encodeURIComponent(rawId)}`),
    fetchJson(`https://api.tvmaze.com/shows/${encodeURIComponent(rawId)}/episodes`).catch(() => [])
  ])
  const drama = mapTvMazeShow(showData)
  const episodes = arrayFrom(episodesData).map((item, index) => {
    const record = asRecord(item)
    const image = asRecord(record.image)
    const sourceId = firstString(record, ['id'], `${rawId}-${index + 1}`)
    return {
      ...metadataEpisode('tvmaze', sourceId, firstNumber(record, ['number'], index + 1), firstString(image, ['original', 'medium'], drama.poster), firstString(record, ['name'], `Episode ${index + 1}`), durationLabel(firstNumber(record, ['runtime'], 0))),
      id: makeId('tvmaze', sourceId),
      sourceId
    }
  })
  if (episodes.length) {
    drama.episodes = episodes
    drama.episodeCount = episodes.length
  }
  return drama
}

const ANILIST_QUERY = `
query ($search: String, $id: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, id: $id, type: ANIME, isAdult: false, sort: TRENDING_DESC) {
      id
      title { romaji english native }
      genres
      description(asHtml: false)
      averageScore
      popularity
      episodes
      duration
      seasonYear
      coverImage { large extraLarge }
      bannerImage
    }
  }
}`

function mapAniListMedia(raw: unknown): UnifiedDrama {
  const record = asRecord(raw)
  const titles = asRecord(record.title)
  const cover = asRecord(record.coverImage)
  const sourceId = firstString(record, ['id'])
  const poster = firstString(cover, ['extraLarge', 'large'], POSTER_FALLBACK)
  const episodeCount = firstNumber(record, ['episodes'], 0)
  const generated = Array.from({ length: Math.max(1, Math.min(episodeCount || 1, 30)) }, (_, index) =>
    metadataEpisode('anilist', sourceId, index + 1, poster, `Episode ${index + 1}`, durationLabel(firstNumber(record, ['duration'], 0)))
  )
  return {
    id: makeId('anilist', sourceId),
    title: firstString(titles, ['english', 'romaji', 'native'], 'Anime'),
    genres: listOfStrings(record.genres),
    poster,
    cover: firstString(record, ['bannerImage'], poster),
    synopsis: stripHtml(firstString(record, ['description'], 'Metadata AniList.')),
    views: formatViews(firstNumber(record, ['popularity'], 0)),
    rating: firstNumber(record, ['averageScore'], 0) / 10,
    episodes: generated,
    episodeCount: episodeCount || undefined,
    source: 'anilist',
    sourceId,
    providerLabel: 'AniList',
    playable: false,
    year: firstString(record, ['seasonYear']) || undefined
  }
}

async function aniListRequest(variables: Record<string, unknown>) {
  const data = await fetchJson('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: ANILIST_QUERY, variables })
  })
  const page = asRecord(asRecord(data).data).Page
  return arrayFrom(asRecord(page).media)
}

async function aniListHome() {
  const media = await aniListRequest({ page: 1, perPage: 12 })
  return media.map(mapAniListMedia)
}

async function aniListSearch(query: string) {
  const media = await aniListRequest({ search: query, page: 1, perPage: 12 })
  return media.map(mapAniListMedia)
}

async function aniListDetail(rawId: string) {
  const media = await aniListRequest({ id: Number(rawId), page: 1, perPage: 1 })
  if (!media[0]) throw new Error('AniList title not found')
  return mapAniListMedia(media[0])
}

function mapJikanAnime(raw: unknown): UnifiedDrama {
  const record = asRecord(raw)
  const images = asRecord(asRecord(record.images).jpg)
  const trailer = asRecord(record.trailer)
  const sourceId = firstString(record, ['mal_id'])
  const poster = firstString(images, ['large_image_url', 'image_url'], POSTER_FALLBACK)
  const episodeCount = firstNumber(record, ['episodes'], 0)
  const duration = firstString(record, ['duration'], '—')
  return {
    id: makeId('jikan', sourceId),
    title: firstString(record, ['title_english', 'title', 'title_japanese'], 'Anime'),
    genres: listOfStrings(record.genres),
    poster,
    cover: firstString(trailer, ['images']) || poster,
    synopsis: stripHtml(firstString(record, ['synopsis', 'background'], 'Metadata Jikan/MyAnimeList.')),
    views: formatViews(firstNumber(record, ['members'], 0)),
    rating: firstNumber(record, ['score'], 0),
    episodes: Array.from({ length: Math.max(1, Math.min(episodeCount || 1, 30)) }, (_, index) => metadataEpisode('jikan', sourceId, index + 1, poster, `Episode ${index + 1}`, duration)),
    episodeCount: episodeCount || undefined,
    source: 'jikan',
    sourceId,
    providerLabel: 'Jikan',
    playable: false,
    year: firstString(record, ['year']) || undefined
  }
}

async function jikanHome() {
  const data = await fetchJson('https://api.jikan.moe/v4/top/anime?limit=12&filter=bypopularity')
  return arrayFrom(asRecord(data).data).map(mapJikanAnime)
}

async function jikanSearch(query: string) {
  const data = await fetchJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=12&sfw=true`)
  return arrayFrom(asRecord(data).data).map(mapJikanAnime)
}

async function jikanDetail(rawId: string) {
  const data = await fetchJson(`https://api.jikan.moe/v4/anime/${encodeURIComponent(rawId)}/full`)
  const item = asRecord(data).data
  if (!item) throw new Error('Jikan title not found')
  return mapJikanAnime(item)
}

function tmdbConfigured(env: ProviderEnv) {
  return Boolean(env.TMDB_BEARER_TOKEN || env.TMDB_API_KEY)
}

function tmdbUrl(env: ProviderEnv, path: string, params: Record<string, string> = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  url.searchParams.set('language', 'id-ID')
  if (!env.TMDB_BEARER_TOKEN && env.TMDB_API_KEY) url.searchParams.set('api_key', env.TMDB_API_KEY)
  return url
}

function tmdbHeaders(env: ProviderEnv) {
  const headers = new Headers({ Accept: 'application/json' })
  if (env.TMDB_BEARER_TOKEN) headers.set('Authorization', `Bearer ${env.TMDB_BEARER_TOKEN}`)
  return headers
}

function mapTmdb(raw: unknown): UnifiedDrama {
  const record = asRecord(raw)
  const sourceId = firstString(record, ['id'])
  const posterPath = firstString(record, ['poster_path'])
  const backdropPath = firstString(record, ['backdrop_path'])
  const poster = posterPath ? `https://image.tmdb.org/t/p/w780${posterPath}` : POSTER_FALLBACK
  const cover = backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : poster
  const genreNames = listOfStrings(record.genres)
  const episodeCount = firstNumber(record, ['number_of_episodes'], 0)
  return {
    id: makeId('tmdb', sourceId),
    title: firstString(record, ['name', 'original_name'], 'TV Series'),
    genres: genreNames.length ? genreNames : ['TV'],
    poster,
    cover,
    synopsis: stripHtml(firstString(record, ['overview'], 'Metadata TMDB.')),
    views: formatViews(firstNumber(record, ['popularity'], 0)),
    rating: firstNumber(record, ['vote_average'], 0),
    episodes: [metadataEpisode('tmdb', sourceId, 1, poster)],
    episodeCount: episodeCount || undefined,
    source: 'tmdb',
    sourceId,
    providerLabel: 'TMDB',
    playable: false,
    year: firstString(record, ['first_air_date']).slice(0, 4) || undefined
  }
}

async function tmdbHome(env: ProviderEnv) {
  if (!tmdbConfigured(env)) return []
  const data = await fetchJson(tmdbUrl(env, '/trending/tv/week').toString(), { headers: tmdbHeaders(env) })
  return arrayFrom(asRecord(data).results).slice(0, 12).map(mapTmdb)
}

async function tmdbSearch(env: ProviderEnv, query: string) {
  if (!tmdbConfigured(env)) return []
  const data = await fetchJson(tmdbUrl(env, '/search/tv', { query, include_adult: 'false' }).toString(), { headers: tmdbHeaders(env) })
  return arrayFrom(asRecord(data).results).slice(0, 12).map(mapTmdb)
}

async function tmdbDetail(env: ProviderEnv, rawId: string) {
  if (!tmdbConfigured(env)) throw new Error('TMDB is not configured')
  const detail = await fetchJson(tmdbUrl(env, `/tv/${encodeURIComponent(rawId)}`).toString(), { headers: tmdbHeaders(env) })
  const drama = mapTmdb(detail)
  try {
    const season = await fetchJson(tmdbUrl(env, `/tv/${encodeURIComponent(rawId)}/season/1`).toString(), { headers: tmdbHeaders(env) })
    const episodes = arrayFrom(asRecord(season).episodes).map((raw, index) => {
      const record = asRecord(raw)
      const stillPath = firstString(record, ['still_path'])
      const poster = stillPath ? `https://image.tmdb.org/t/p/w780${stillPath}` : drama.poster
      return metadataEpisode('tmdb', `${rawId}-s1e${index + 1}`, firstNumber(record, ['episode_number'], index + 1), poster, firstString(record, ['name'], `Episode ${index + 1}`), `${firstNumber(record, ['runtime'], 0) || '—'} min`)
    })
    if (episodes.length) drama.episodes = episodes
  } catch {
    // Keep the metadata placeholder when season data is unavailable.
  }
  return drama
}

function omdbConfigured(env: ProviderEnv) {
  return Boolean(env.OMDB_API_KEY)
}

function mapOmdb(raw: unknown): UnifiedDrama {
  const record = asRecord(raw)
  const sourceId = firstString(record, ['imdbID'])
  const poster = firstString(record, ['Poster'])
  const cleanPoster = poster && poster !== 'N/A' ? poster : POSTER_FALLBACK
  const totalSeasons = firstNumber(record, ['totalSeasons'], 0)
  return {
    id: makeId('omdb', sourceId),
    title: firstString(record, ['Title'], 'Series'),
    genres: listOfStrings(firstString(record, ['Genre'])),
    poster: cleanPoster,
    cover: cleanPoster,
    synopsis: firstString(record, ['Plot'], 'Metadata OMDb.'),
    views: firstString(record, ['imdbVotes'], 'OMDb'),
    rating: firstNumber(record, ['imdbRating'], 0),
    episodes: [metadataEpisode('omdb', sourceId, 1, cleanPoster)],
    source: 'omdb',
    sourceId,
    providerLabel: 'OMDb',
    playable: false,
    year: firstString(record, ['Year']).slice(0, 4) || undefined,
    episodeCount: totalSeasons || undefined
  }
}

async function omdbSearch(env: ProviderEnv, query: string) {
  if (!omdbConfigured(env)) return []
  const url = new URL('https://www.omdbapi.com/')
  url.searchParams.set('apikey', env.OMDB_API_KEY || '')
  url.searchParams.set('s', query)
  url.searchParams.set('type', 'series')
  const data = await fetchJson(url.toString())
  return arrayFrom(asRecord(data).Search).slice(0, 10).map(mapOmdb)
}

async function omdbDetail(env: ProviderEnv, rawId: string) {
  if (!omdbConfigured(env)) throw new Error('OMDb is not configured')
  const url = new URL('https://www.omdbapi.com/')
  url.searchParams.set('apikey', env.OMDB_API_KEY || '')
  url.searchParams.set('i', rawId)
  url.searchParams.set('plot', 'full')
  const detail = await fetchJson(url.toString())
  const drama = mapOmdb(detail)
  try {
    const seasonUrl = new URL('https://www.omdbapi.com/')
    seasonUrl.searchParams.set('apikey', env.OMDB_API_KEY || '')
    seasonUrl.searchParams.set('i', rawId)
    seasonUrl.searchParams.set('Season', '1')
    const season = await fetchJson(seasonUrl.toString())
    const episodes = arrayFrom(asRecord(season).Episodes).map((raw, index) => {
      const record = asRecord(raw)
      return metadataEpisode('omdb', firstString(record, ['imdbID'], `${rawId}-${index + 1}`), firstNumber(record, ['Episode'], index + 1), drama.poster, firstString(record, ['Title'], `Episode ${index + 1}`))
    })
    if (episodes.length) drama.episodes = episodes
  } catch {
    // Season data is optional.
  }
  return drama
}

async function apifyPineDramaDetail(env: ProviderEnv, collectionId: string) {
  if (!env.APIFY_TOKEN || !env.APIFY_PINEDRAMA_ACTOR_ID) throw new Error('Apify PineDrama adapter is not configured')
  const actorId = env.APIFY_PINEDRAMA_ACTOR_ID.replace('/', '~')
  const url = `https://api.apify.com/v2/actors/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?clean=true&format=json`
  const data = await fetchJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.APIFY_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ collectionId })
  }, 295_000)
  const item = arrayFrom(data)[0]
  if (!item) throw new Error('Apify actor returned no items')
  const drama = normalizeGenericDrama(item, 'apify', 'Apify PineDrama', false)
  drama.id = makeId('apify', collectionId)
  drama.sourceId = collectionId
  drama.playable = false
  drama.episodes = drama.episodes.map(episode => ({ ...episode, playable: false, hlsUrl: '', protected: false }))
  return drama
}

export function providerStatuses(env: ProviderEnv): ProviderStatus[] {
  return [
    {
      id: 'primary',
      label: env.PROVIDER_NAME || 'AgenAPI / Licensed Provider',
      enabled: primaryConfigured(env),
      kind: 'streaming',
      note: 'Provider utama. Playback hanya aktif jika endpoint dan hak streaming Anda valid.'
    },
    { id: 'tmdb', label: 'TMDB', enabled: tmdbConfigured(env), kind: 'metadata' },
    { id: 'tvmaze', label: 'TVmaze', enabled: true, kind: 'metadata' },
    { id: 'anilist', label: 'AniList', enabled: true, kind: 'metadata' },
    { id: 'jikan', label: 'Jikan', enabled: true, kind: 'metadata' },
    { id: 'omdb', label: 'OMDb', enabled: omdbConfigured(env), kind: 'metadata' },
    { id: 'apify', label: 'Apify PineDrama', enabled: Boolean(env.APIFY_TOKEN && env.APIFY_PINEDRAMA_ACTOR_ID), kind: 'scraper', note: 'Dipakai on-demand untuk enrichment detail, bukan playback.' }
  ]
}

function dedupe(items: UnifiedDrama[]) {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function safeList(task: () => Promise<UnifiedDrama[]>) {
  try { return await task() } catch { return [] }
}

export async function aggregateHome(env: ProviderEnv) {
  const [primary, tmdb, anilist, jikan] = await Promise.all([
    safeList(() => primaryHome(env)),
    safeList(() => tmdbHome(env)),
    safeList(() => aniListHome()),
    safeList(() => jikanHome())
  ])

  const sections = [
    { id: 'primary', title: 'Drama China', provider: env.PROVIDER_NAME || 'AgenAPI', dramas: primary },
    { id: 'tmdb', title: 'TV Populer', provider: 'TMDB', dramas: tmdb },
    { id: 'anilist', title: 'Anime Trending', provider: 'AniList', dramas: anilist },
    { id: 'jikan', title: 'Anime Populer', provider: 'Jikan', dramas: jikan }
  ].filter(section => section.dramas.length > 0)

  return {
    dramas: dedupe([...primary, ...tmdb, ...anilist, ...jikan]).slice(0, 60),
    sections,
    providers: providerStatuses(env)
  }
}

export async function aggregateSearch(env: ProviderEnv, query: string) {
  const [primary, tvmaze, tmdb, anilist, jikan, omdb] = await Promise.all([
    safeList(() => primarySearch(env, query)),
    safeList(() => tvMazeSearch(query)),
    safeList(() => tmdbSearch(env, query)),
    safeList(() => aniListSearch(query)),
    safeList(() => jikanSearch(query)),
    safeList(() => omdbSearch(env, query))
  ])

  return {
    dramas: dedupe([...primary, ...tmdb, ...tvmaze, ...anilist, ...jikan, ...omdb]).slice(0, 80),
    providers: providerStatuses(env)
  }
}

export async function getDramaDetail(env: ProviderEnv, unifiedId: string) {
  const { source, rawId } = splitUnifiedId(unifiedId)
  if (source === 'primary') return primaryDetail(env, rawId)
  if (source === 'tvmaze') return tvMazeDetail(rawId)
  if (source === 'anilist') return aniListDetail(rawId)
  if (source === 'jikan') return jikanDetail(rawId)
  if (source === 'tmdb') return tmdbDetail(env, rawId)
  if (source === 'omdb') return omdbDetail(env, rawId)
  if (source === 'apify') return apifyPineDramaDetail(env, rawId)
  throw new Error(`Unknown provider: ${source}`)
}

export function primaryPlaybackPath(env: ProviderEnv, episodeId: string) {
  const { rawId } = splitUnifiedId(episodeId)
  return fillTemplate(env.PROVIDER_PLAYBACK_PATH || '/playback/{episodeId}/master.m3u8', { episodeId: rawId })
}

export function isPrimaryPlaybackId(episodeId: string) {
  return splitUnifiedId(episodeId).source === 'primary'
}
