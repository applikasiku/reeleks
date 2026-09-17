export interface Env {
  PLAYBACK_SECRET: string
  PROVIDER_BASE_URL: string
}

// V1 demo Worker.
// IMPORTANT: PROVIDER_BASE_URL must point to content you are licensed to distribute.

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
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return base64Url(signature)
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/playback/')) {
      const episodeId = url.pathname.split('/').pop()!
      const exp = Math.floor(Date.now() / 1000) + 60 * 5
      const payload = `${episodeId}.${exp}`
      const sig = await sign(env.PLAYBACK_SECRET, payload)

      // In production, resolve episodeId server-side and return a short-lived,
      // provider-authorized HLS URL. Never expose provider API keys to the browser.
      const playbackUrl = `${env.PROVIDER_BASE_URL}/${episodeId}/master.m3u8?exp=${exp}&sig=${sig}`

      return Response.json(
        { playbackUrl, expiresAt: exp },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return new Response('REELEKS Worker V1', { status: 200 })
  }
}
