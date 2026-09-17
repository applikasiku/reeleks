export type Episode = {
  id: string
  number: number
  title: string
  duration: string
  hlsUrl: string
  poster: string
  protected: boolean
  playable?: boolean
  source?: string
  sourceId?: string
}

export type Drama = {
  id: string
  title: string
  genres: string[]
  poster: string
  cover: string
  synopsis: string
  views: string
  rating: number
  episodes: Episode[]
  episodeCount?: number
  source?: string
  sourceId?: string
  providerLabel?: string
  playable?: boolean
  year?: string
}

export type ProviderStatus = {
  id: string
  label: string
  enabled: boolean
  kind: 'streaming' | 'metadata' | 'scraper'
  note?: string
}

export type CatalogSection = {
  id: string
  title: string
  provider: string
  dramas: Drama[]
}
