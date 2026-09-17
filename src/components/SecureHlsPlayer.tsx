import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { saveHistory } from '../lib/storage'

type Props = {
  src: string
  poster?: string
  dramaId: string
  episodeId: string
  protectedContent?: boolean
  watermark?: string
  autoPlay?: boolean
  muted?: boolean
  showControls?: boolean
}

export default function SecureHlsPlayer({
  src,
  poster,
  dramaId,
  episodeId,
  protectedContent = true,
  watermark = 'REELEKS',
  autoPlay = true,
  muted = false,
  showControls = true
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
    } else if (Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 18,
        backBufferLength: 6,
        capLevelToPlayerSize: true,
        startLevel: -1,
        enableWorker: true
      })
      hls.loadSource(src)
      hls.attachMedia(video)
    }

    const onTime = () => {
      if (!video.duration || Number.isNaN(video.duration)) return
      saveHistory({
        dramaId,
        episodeId,
        progress: Math.min(1, video.currentTime / video.duration),
        updatedAt: Date.now()
      })
    }

    video.addEventListener('timeupdate', onTime)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [src, dramaId, episodeId])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (autoPlay) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [autoPlay, muted])

  const blockContext = (event: React.MouseEvent) => {
    if (protectedContent) event.preventDefault()
  }

  return (
    <div className="secure-player" onContextMenu={blockContext}>
      <video
        ref={videoRef}
        className="video"
        poster={poster}
        controls={showControls}
        playsInline
        preload={autoPlay ? 'auto' : 'metadata'}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture={protectedContent}
      />
      {protectedContent && (
        <>
          <div className="security-badge">🔒 Dilindungi</div>
          <div className="dynamic-watermark">
            {watermark} • {new Date().toLocaleDateString('id-ID')}
          </div>
        </>
      )}
    </div>
  )
}
