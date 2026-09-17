export interface Env {
  PLAYBACK_SECRET: string
  PROVIDER_BASE_URL: string
  PROVIDER_API_KEY?: string
  PROVIDER_API_PREFIX?: string
  PROVIDER_AUTH_MODE?: 'bearer' | 'x-api-key' | 'header' | 'query' | 'none'
  PROVIDER_API_KEY_HEADER?: string
  PROVIDER_API_KEY_QUERY?: string
  PROVIDER_PLAYBACK_PATH?: string
  ALLOWED_ORIGIN?: string
}

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get('Origin') || '*'
  const allowed = env.ALLOWED_ORIGIN || '*'
  const resolvedOrigin = allowed === '*' ? origin : allowed

  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin'
  }
}

function json(request: Request, env: Env, body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders(request, env),
      'Cache-Control': 'no-store',
      ...(init.headers || {})
    }
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

function providerUrl(env: Env, path: string) {
  const base = env.PROVIDER_BASE_URL.replace(/\/$/, '')
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

function providerHeaders(env: Env) {
  const headers = new Headers({ Accept: 'application/json' })
  const key = env.PROVIDER_API_KEY
  const mode = env.PROVIDER_AUTH_MODE || 'bearer'

  if (!key || mode === 'none' || mode === 'query') return headers

  if (mode === 'bearer') {
    headers.set('Authorization', `Bearer ${key}`)
  } else if (mode === 'x-api-key') {
    headers.set('X-API-Key', key)
  } else if (mode === 'header') {
    headers.set(env.PROVIDER_API_KEY_HEADER || 'X-API-Key', key)
  }

  return headers
}

async function providerFetch(env: Env, path: string) {
  const response = await fetch(providerUrl(env, path), {
    headers: providerHeaders(env)
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Provider error ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`)
  }

  return response.json()
}

function playbackPath(env: Env, episodeId: string) {
  const template = env.PROVIDER_PLAYBACK_PATH || '/playback/{episodeId}/master.m3u8'
  return template.replace('{episodeId}', encodeURIComponent(episodeId))
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
          version: '2.5',
          timestamp: new Date().toISOString()
        })
      }

      if (url.pathname === '/api/provider/status') {
        const providerHost = (() => {
          try { return new URL(env.PROVIDER_BASE_URL).host } catch { return null }
        })()

        return json(request, env, {
          ok: Boolean(providerHost),
          providerHost,
          apiPrefix: env.PROVIDER_API_PREFIX || '',
          authMode: env.PROVIDER_AUTH_MODE || 'bearer',
          apiKeyConfigured: Boolean(env.PROVIDER_API_KEY),
          playbackTemplateConfigured: Boolean(env.PROVIDER_PLAYBACK_PATH)
        })
      }

      if (url.pathname === '/api/home') {
        const data = await providerFetch(env, '/home')
        return json(request, env, data, {
          headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120' }
        })
      }

      if (url.pathname === '/api/search') {
        const query = url.searchParams.get('q') || ''
        const data = await providerFetch(env, `/search?q=${encodeURIComponent(query)}`)
        return json(request, env, data, {
          headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' }
        })
      }

      const dramaMatch = url.pathname.match(/^\/api\/drama\/([^/]+)$/)
      if (dramaMatch) {
        const id = encodeURIComponent(decodeURIComponent(dramaMatch[1]))
        const data = await providerFetch(env, `/drama/${id}`)
        return json(request, env, data, {
          headers: { 'Cache-Control': 'public, max-age=60, s-maxage=180' }
        })
      }

      const episodeMatch = url.pathname.match(/^\/api\/drama\/([^/]+)\/episodes$/)
      if (episodeMatch) {
        const id = encodeURIComponent(decodeURIComponent(episodeMatch[1]))
        const data = await providerFetch(env, `/drama/${id}/episodes`)
        return json(request, env, data, {
          headers: { 'Cache-Control': 'public, max-age=60, s-maxage=180' }
        })
      }

      const playbackMatch = url.pathname.match(/^\/api\/playback\/([^/]+)$/)
      if (playbackMatch) {
        const episodeId = decodeURIComponent(playbackMatch[1])
        const exp = Math.floor(Date.now() / 1000) + 60 * 5
        const payload = `${episodeId}.${exp}`
        const sig = await sign(env.PLAYBACK_SECRET, payload)

        const upstream = providerUrl(env, playbackPath(env, episodeId))
        upstream.searchParams.set('exp', String(exp))
        upstream.searchParams.set('sig', sig)

        return json(request, env, {
          playbackUrl: upstream.toString(),
          expiresAt: exp
        })
      }

      return json(request, env, {
        ok: true,
        app: 'REELEKS API Gateway V2.5',
        routes: [
          '/api/health',
          '/api/provider/status',
          '/api/home',
          '/api/search?q=',
          '/api/drama/:id',
          '/api/drama/:id/episodes',
          '/api/playback/:episodeId'
        ]
      })
    } catch (error) {
      return json(
        request,
        env,
        {
          error: 'UPSTREAM_PROVIDER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown provider error'
        },
        { status: 502 }
      )
    }
  }
}
