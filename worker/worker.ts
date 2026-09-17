import {
  aggregateHome,
  aggregateSearch,
  getDramaDetail,
  isPrimaryPlaybackId,
  primaryFetch,
  primaryPlaybackPath,
  providerStatuses,
  splitUnifiedId,
  type ProviderEnv
} from './providers'

export interface Env extends ProviderEnv {
  PLAYBACK_SECRET?: string
  ALLOWED_ORIGIN?: string
}

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get('Origin') || '*'
  const configured = (env.ALLOWED_ORIGIN || '*')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  const allowAny = configured.includes('*')
  const resolvedOrigin = allowAny || configured.includes(origin) ? origin : configured[0] || '*'

  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin'
  }
}

function json(request: Request, env: Env, body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {})
  Object.entries(corsHeaders(request, env)).forEach(([key, value]) => headers.set(key, value))
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store')

  return Response.json(body, {
    ...init,
    headers
  })
}

function base64Url(data: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

async function sign(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  )

  return base64Url(signature)
}

function buildPrimaryUrl(env: Env, path: string) {
  const base = (env.PROVIDER_BASE_URL || '').replace(/\/$/, '')
  const prefix = (env.PROVIDER_API_PREFIX || '').trim()
  const normalizedPrefix = prefix && !prefix.startsWith('/') ? `/${prefix}` : prefix
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${base}${normalizedPrefix}${normalizedPath}`)

  if ((env.PROVIDER_AUTH_MODE || 'bearer') === 'query' && env.PROVIDER_API_KEY) {
    url.searchParams.set(env.PROVIDER_API_KEY_QUERY || 'api_key', env.PROVIDER_API_KEY)
  }

  return url
}

function extractPlaybackUrl(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const key of ['playbackUrl', 'playback_url', 'hlsUrl', 'hls_url', 'm3u8', 'streamUrl', 'stream_url', 'url']) {
    if (typeof record[key] === 'string' && record[key]) return record[key] as string
  }
  if (record.data && typeof record.data === 'object') return extractPlaybackUrl(record.data)
  return ''
}

async function resolvePrimaryPlayback(env: Env, episodeId: string) {
  const path = primaryPlaybackPath(env, episodeId)

  if (env.PROVIDER_PLAYBACK_MODE === 'json') {
    const data = await primaryFetch(env, path)
    const playbackUrl = extractPlaybackUrl(data)
    if (!playbackUrl) throw new Error('Provider playback response does not contain a stream URL')
    return {
      playbackUrl,
      expiresAt: Math.floor(Date.now() / 1000) + 180
    }
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 5
  const { rawId } = splitUnifiedId(episodeId)
  const url = buildPrimaryUrl(env, path)

  if (env.PLAYBACK_SECRET) {
    const payload = `${rawId}.${exp}`
    url.searchParams.set('exp', String(exp))
    url.searchParams.set('sig', await sign(env.PLAYBACK_SECRET, payload))
  }

  return { playbackUrl: url.toString(), expiresAt: exp }
}

function cache(seconds: number, sharedSeconds = seconds) {
  return {
    'Cache-Control': `public, max-age=${seconds}, s-maxage=${sharedSeconds}`
  }
}

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env)
      })
    }

    const url = new URL(request.url)

    try {
      if (url.pathname === '/api/health') {
        return json(request, env, {
          ok: true,
          app: 'REELEKS',
          version: '2.6',
          multiProvider: true,
          timestamp: new Date().toISOString()
        })
      }

      if (url.pathname === '/api/providers' || url.pathname === '/api/provider/status') {
        const providers = providerStatuses(env)
        return json(request, env, {
          ok: true,
          enabled: providers.filter(provider => provider.enabled).length,
          providers
        }, { headers: cache(30, 60) })
      }

      if (url.pathname === '/api/home') {
        const data = await aggregateHome(env)
        return json(request, env, data, {
          headers: cache(60, 120)
        })
      }

      if (url.pathname === '/api/search') {
        const query = (url.searchParams.get('q') || '').trim()
        if (!query) return json(request, env, { dramas: [], providers: providerStatuses(env) })
        const data = await aggregateSearch(env, query)
        return json(request, env, data, {
          headers: cache(30, 60)
        })
      }

      const episodeMatch = url.pathname.match(/^\/api\/drama\/([^/]+)\/episodes$/)
      if (episodeMatch) {
        const id = decodeURIComponent(episodeMatch[1])
        const drama = await getDramaDetail(env, id)
        return json(request, env, {
          dramaId: drama.id,
          source: drama.source,
          playable: drama.playable,
          episodes: drama.episodes
        }, { headers: cache(60, 180) })
      }

      const dramaMatch = url.pathname.match(/^\/api\/drama\/([^/]+)$/)
      if (dramaMatch) {
        const id = decodeURIComponent(dramaMatch[1])
        const drama = await getDramaDetail(env, id)
        return json(request, env, drama, {
          headers: cache(60, 180)
        })
      }

      const apifyMatch = url.pathname.match(/^\/api\/apify\/pinedrama\/([^/]+)$/)
      if (apifyMatch) {
        const collectionId = decodeURIComponent(apifyMatch[1])
        const drama = await getDramaDetail(env, `apify:${collectionId}`)
        return json(request, env, drama)
      }

      const playbackMatch = url.pathname.match(/^\/api\/playback\/([^/]+)$/)
      if (playbackMatch) {
        const episodeId = decodeURIComponent(playbackMatch[1])

        if (!isPrimaryPlaybackId(episodeId)) {
          return json(request, env, {
            error: 'METADATA_ONLY_PROVIDER',
            message: 'Provider ini hanya menyediakan metadata. Gunakan provider streaming yang Anda miliki hak tayangnya untuk video.'
          }, { status: 409 })
        }

        const playback = await resolvePrimaryPlayback(env, episodeId)
        return json(request, env, playback)
      }

      return json(request, env, {
        ok: true,
        app: 'REELEKS Multi-Provider API Gateway V2.6',
        routes: [
          '/api/health',
          '/api/providers',
          '/api/home',
          '/api/search?q=',
          '/api/drama/:source:id',
          '/api/drama/:source:id/episodes',
          '/api/apify/pinedrama/:collectionId',
          '/api/playback/:episodeId'
        ],
        providers: providerStatuses(env)
      })
    } catch (error) {
      return json(
        request,
        env,
        {
          error: 'REELEKS_GATEWAY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown gateway error'
        },
        { status: 502 }
      )
    }
  }
}
