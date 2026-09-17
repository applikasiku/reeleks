import type { CatalogSection, Drama, Episode, ProviderStatus } from '../types'

const POSTER_FALLBACK = 'https://placehold.co/600x900/111111/ffffff?text=REELEKS'

type AniListMedia = {
  id: number
  title?: { romaji?: string | null; english?: string | null; native?: string | null }
  genres?: string[]
  description?: string | null
  averageScore?: number | null
  popularity?: number | null
  episodes?: number | null
  duration?: number | null
  seasonYear?: number | null
  coverImage?: { large?: string | null; extraLarge?: string | null }
  bannerImage?: string | null
}

type JikanAnime = {
  mal_id: number
  title?: string
  title_english?: string | null
  title_japanese?: string | null
  synopsis?: string | null
  score?: number | null
  members?: number | null
  episodes?: number | null
  duration?: string | null
  year?: number | null
  genres?: Array<{ name?: string }>
  images?: { jpg?: { image_url?: string | null; large_image_url?: string | null } }
}

type TvMazeShow = {
  id: number
  name?: string
  genres?: string[]
  summary?: string | null
  premiered?: string | null
  rating?: { average?: number | null }
  image?: { medium?: string | null; original?: string | null }
  network?: { name?: string | null } | null
  webChannel?: { name?: string | null } | null
}

type TvMazeSearchItem = { show?: TvMazeShow }

function stripHtml(value = '') {
  return value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatPopularity(value?: number | null) {
  if (!value || value <= 0) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`
  return String(Math.round(value))
}

function metadataEpisode(source: string, sourceId: string, number: number, poster: string, duration = '—'): Episode {
  return {
    id: `${source}:${sourceId}-ep-${number}`,
    number,
    title: `Episode ${number}`,
    duration,
    hlsUrl: '',
    poster,
    protected: false,
    playable: false,
    source,
    sourceId: `${sourceId}-ep-${number}`
  }
}

function mapAniList(media: AniListMedia): Drama {
  const sourceId = String(media.id)
  const poster = media.coverImage?.extraLarge || media.coverImage?.large || POSTER_FALLBACK
  const count = Math.max(1, Math.min(media.episodes || 1, 30))
  const duration = media.duration ? `${media.duration} min` : '—'
  return {
    id: `anilist:${sourceId}`,
    title: media.title?.english || media.title?.romaji || media.title?.native || 'Anime',
    genres: media.genres?.length ? media.genres : ['Anime'],
    poster,
    cover: media.bannerImage || poster,
    synopsis: stripHtml(media.description || 'Metadata AniList.'),
    views: formatPopularity(media.popularity),
    rating: media.averageScore ? Math.round(media.averageScore) / 10 : 0,
    episodes: Array.from({ length: count }, (_, index) => metadataEpisode('anilist', sourceId, index + 1, poster, duration)),
    episodeCount: media.episodes || undefined,
    source: 'anilist',
    sourceId,
    providerLabel: 'AniList',
    playable: false,
    year: media.seasonYear ? String(media.seasonYear) : undefined
  }
}

function mapJikan(anime: JikanAnime): Drama {
  const sourceId = String(anime.mal_id)
  const poster = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || POSTER_FALLBACK
  const count = Math.max(1, Math.min(anime.episodes || 1, 30))
  return {
    id: `jikan:${sourceId}`,
    title: anime.title_english || anime.title || anime.title_japanese || 'Anime',
    genres: anime.genres?.map(item => item.name || '').filter(Boolean) || ['Anime'],
    poster,
    cover: poster,
    synopsis: stripHtml(anime.synopsis || 'Metadata Jikan/MyAnimeList.'),
    views: formatPopularity(anime.members),
    rating: anime.score || 0,
    episodes: Array.from({ length: count }, (_, index) => metadataEpisode('jikan', sourceId, index + 1, poster, anime.duration || '—')),
    episodeCount: anime.episodes || undefined,
    source: 'jikan',
    sourceId,
    providerLabel: 'Jikan',
    playable: false,
    year: anime.year ? String(anime.year) : undefined
  }
}

function mapTvMaze(show: TvMazeShow): Drama {
  const sourceId = String(show.id)
  const poster = show.image?.original || show.image?.medium || POSTER_FALLBACK
  return {
    id: `tvmaze:${sourceId}`,
    title: show.name || 'TV Series',
    genres: show.genres?.length ? show.genres : ['TV'],
    poster,
    cover: poster,
    synopsis: stripHtml(show.summary || 'Metadata TVmaze.'),
    views: show.network?.name || show.webChannel?.name || 'TVmaze',
    rating: show.rating?.average || 0,
    episodes: [metadataEpisode('tvmaze', sourceId, 1, poster)],
    source: 'tvmaze',
    sourceId,
    providerLabel: 'TVmaze',
    playable: false,
    year: show.premiered?.slice(0, 4) || undefined
  }
}

async function aniListRequest(search?: string) {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, type: ANIME, isAdult: false, sort: TRENDING_DESC) {
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
    }
  `

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { search: search || null, page: 1, perPage: 12 } })
  })
  if (!response.ok) throw new Error(`AniList ${response.status}`)
  const body = await response.json() as { data?: { Page?: { media?: AniListMedia[] } } }
  return (body.data?.Page?.media || []).map(mapAniList)
}

async function jikanRequest(search?: string) {
  const endpoint = search
    ? `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(search)}&limit=12&sfw=true`
    : 'https://api.jikan.moe/v4/top/anime?limit=12&filter=bypopularity'
  const response = await fetch(endpoint)
  if (!response.ok) throw new Error(`Jikan ${response.status}`)
  const body = await response.json() as { data?: JikanAnime[] }
  return (body.data || []).map(mapJikan)
}

async function tvMazeHome() {
  const response = await fetch('https://api.tvmaze.com/shows?page=0')
  if (!response.ok) throw new Error(`TVmaze ${response.status}`)
  const body = await response.json() as TvMazeShow[]
  return body
    .filter(show => Boolean(show?.id && show?.name))
    .slice(0, 12)
    .map(mapTvMaze)
}

async function tvMazeSearch(query: string) {
  const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error(`TVmaze ${response.status}`)
  const body = await response.json() as TvMazeSearchItem[]
  return body.map(item => item.show).filter((show): show is TvMazeShow => Boolean(show)).slice(0, 12).map(mapTvMaze)
}

function dedupe(items: Drama[]) {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const publicProviderStatuses: ProviderStatus[] = [
  { id: 'tvmaze', label: 'TVmaze', enabled: true, kind: 'metadata', note: 'Pencarian metadata TV.' },
  { id: 'anilist', label: 'AniList', enabled: true, kind: 'metadata', note: 'Metadata anime dan trending.' },
  { id: 'jikan', label: 'Jikan', enabled: true, kind: 'metadata', note: 'Fallback metadata anime.' }
]

export async function getPublicHomeCatalog(): Promise<{ dramas: Drama[]; sections: CatalogSection[]; providers: ProviderStatus[] }> {
  const [tvResult, aniResult, jikanResult] = await Promise.allSettled([
    tvMazeHome(),
    aniListRequest(),
    jikanRequest()
  ])
  const tvmaze = tvResult.status === 'fulfilled' ? tvResult.value : []
  const anilist = aniResult.status === 'fulfilled' ? aniResult.value : []
  const jikan = jikanResult.status === 'fulfilled' ? jikanResult.value : []
  const dramas = dedupe([...tvmaze, ...anilist, ...jikan])
  const sections: CatalogSection[] = [
    { id: 'tvmaze', title: 'Serial TV Pilihan', provider: 'TVmaze', dramas: tvmaze },
    { id: 'anilist', title: 'Anime Trending', provider: 'AniList', dramas: anilist },
    { id: 'jikan', title: 'Anime Populer', provider: 'Jikan', dramas: jikan }
  ].filter(section => section.dramas.length > 0)

  return { dramas, sections, providers: publicProviderStatuses }
}

export async function searchPublicCatalog(query: string): Promise<Drama[]> {
  const [tvResult, aniResult, jikanResult] = await Promise.allSettled([
    tvMazeSearch(query),
    aniListRequest(query),
    jikanRequest(query)
  ])
  return dedupe([
    ...(tvResult.status === 'fulfilled' ? tvResult.value : []),
    ...(aniResult.status === 'fulfilled' ? aniResult.value : []),
    ...(jikanResult.status === 'fulfilled' ? jikanResult.value : [])
  ])
}
