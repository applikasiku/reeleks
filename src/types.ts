export type Episode = {
  id: string
  number: number
  title: string
  duration: string
  hlsUrl: string
  poster: string
  protected: boolean
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
}
