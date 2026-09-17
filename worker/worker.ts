export interface Env {
  PLAYBACK_SECRET: string
  PROVIDER_BASE_URL: string
  PROVIDER_API_KEY?: string
  ALLOWED_ORIGIN?: string
}

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get('Origin') || '*'
  const allowed = env.ALLOWED_ORIGIN || '*'
  const resolvedOrigin = allowed === '*' ? origin : allowed

  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

async function providerFetch(env: Env, path: string) {
  const base = env.PROVIDER_BASE_URL.replace(/\/$/, '')
  const headers = new Headers({ Accept: 'application/json' })

  if (env.PROVIDER_API_KEY) {
    headers.set('Authorization', `Bearer ${env.PROVIDER_API_KEY}`)
  }

  const response = await fetch(`${base}${path}`, { headers })
  if (!response.ok) {
    throw new Error(`Provider error ${response.status}`)
  }

  return response.json()
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
          version: 2,
          timestamp: new Date().toISOString()
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

        // Adapter convention for V2:
        // your licensed provider should expose /playback/:episodeId/master.m3u8.
        // If its schema differs, change only this adapter without touching the frontend.
        const base = env.PROVIDER_BASE_URL.replace(/\/$/, '')
        const playbackUrl = `${base}/playback/${encodeURIComponent(episodeId)}/master.m3u8?exp=${exp}&sig=${sig}`

        return json(request, env, {
          playbackUrl,
          expiresAt: exp
        })
      }

      return json(request, env, {
        ok: true,
        app: 'REELEKS API Gateway V2',
        routes: [
          '/api/health',
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
