import { useEffect, useRef, useState } from 'react'
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
  showProgress?: boolean
  showSecurityOverlay?: boolean
  loop?: boolean
  shouldLoad?: boolean
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
  showControls = true,
  showProgress = false,
  showSecurityOverlay = true,
  loop = false,
  shouldLoad = true
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !shouldLoad) return

    let hls: Hls | null = null

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
    } else if (Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: true,
        enableWorker: true,
        startLevel: -1,
        capLevelToPlayerSize: true,
        maxBufferLength: 8,
        maxMaxBufferLength: 14,
        backBufferLength: 5,
        fragLoadingMaxRetry: 4,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad()
          return
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError()
          return
        }
        hls?.destroy()
      })

      hls.loadSource(src)
      hls.attachMedia(video)
    }

    const onTime = () => {
      if (!video.duration || Number.isNaN(video.duration)) return
      const nextProgress = Math.min(1, video.currentTime / video.duration)
      setProgress(nextProgress)
      saveHistory({
        dramaId,
        episodeId,
        progress: nextProgress,
        updatedAt: Date.now()
      })
    }

    const onPlay = () => {
      setIsPlaying(true)
      setBuffering(false)
    }
    const onPause = () => setIsPlaying(false)
    const onWaiting = () => setBuffering(true)
    const onPlaying = () => setBuffering(false)

    video.addEventListener('timeupdate', onTime)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)

    return () => {
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      hls?.destroy()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [src, dramaId, episodeId, shouldLoad])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !shouldLoad) return

    video.muted = muted
    video.loop = loop

    if (autoPlay) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [autoPlay, muted, loop, shouldLoad])

  const blockContext = (event: React.MouseEvent) => {
    if (protectedContent) event.preventDefault()
  }

  return (
    <div
      className="secure-player"
      onContextMenu={blockContext}
      data-player-state={isPlaying ? 'playing' : 'paused'}
    >
      <video
        ref={videoRef}
        className="video"
        poster={poster}
        controls={showControls}
        playsInline
        preload={shouldLoad ? (autoPlay ? 'auto' : 'metadata') : 'none'}
        controlsList="nodownload noremoteplayback nofullscreen"
        disablePictureInPicture={protectedContent}
        draggable={false}
      />

      {buffering && <div className="player-buffering" aria-label="Memuat video"><span /></div>}

      {showProgress && (
        <div className="video-progress" aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      {protectedContent && showSecurityOverlay && (
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
