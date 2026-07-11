import { useEffect, useRef, useState, useCallback } from 'react';
import { captureVideoFrame, getCameraStream, stopStream } from '../utils/camera.js';
import { getKioskSettings } from '../utils/kioskConfig.js';

const RetakeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 32, height: 32, color: '#374151' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
  </svg>
);

const UpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 14, height: 14, color: '#fff' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

export default function CameraView({ filter, poseLimit = 5, onFinishSession }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraSettings] = useState(() => getKioskSettings());
  const [facingMode, setFacingMode] = useState(() => getKioskSettings().defaultCamera || 'user');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');

  const [flash, setFlash] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isRecordingBurst, setIsRecordingBurst] = useState(false);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [playbackFrameIdx, setPlaybackFrameIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      setIsReady(false);
      setError('');
      stopStream(streamRef.current);

      try {
        const stream = await getCameraStream({
          facingMode,
          deviceId: cameraSettings.cameraDeviceId,
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsReady(true);
        }
      } catch (cameraError) {
        if (cameraSettings.cameraDeviceId) {
          try {
            const fallbackStream = await getCameraStream(facingMode);
            if (cancelled) {
              stopStream(fallbackStream);
              return;
            }
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await videoRef.current.play();
              setIsReady(true);
              setError('');
              return;
            }
          } catch (fallbackError) {
            setError(fallbackError.message || 'Kamera tidak bisa diakses.');
            return;
          }
        }
        setError(cameraError.message || 'Kamera tidak bisa diakses.');
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
    };
  }, [facingMode, cameraSettings.cameraDeviceId]);

  const handleCaptureClick = () => {
    if (!videoRef.current || !isReady || isRecordingBurst || countdown !== null) return;
    if (capturedPhotos.length >= poseLimit) return;
    setIsAutoCapturing(true);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !isReady || isRecordingBurst) return;
    if (capturedPhotos.length >= poseLimit) return;

    setIsRecordingBurst(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const burstFrames = [];
    let count = 0;

    // Capture 8 frames at 150ms intervals (~1.2 seconds of animation)
    const interval = setInterval(() => {
      if (videoRef.current) {
        burstFrames.push(captureVideoFrame(videoRef.current, { mirror: cameraSettings.mirrorCamera }));
      }
      count++;

      if (count >= 8) {
        clearInterval(interval);

        setCapturedPhotos(prev => {
          const newPhotos = [...prev, {
            src: burstFrames[0], // Main static photo is the first frame
            frames: burstFrames, // The GIF animation frames
            mediaWidth: videoRef.current?.videoWidth || 0,
            mediaHeight: videoRef.current?.videoHeight || 0,
          }];
          return newPhotos;
        });

        setIsRecordingBurst(false);
      }
    }, 150);
  }, [isReady, cameraSettings.mirrorCamera, poseLimit, capturedPhotos.length, isRecordingBurst]);

  useEffect(() => {
    if (!isAutoCapturing) return;
    if (capturedPhotos.length >= poseLimit) {
      setIsAutoCapturing(false);
      return;
    }
    
    // Do not count down while recording the burst or not ready
    if (isRecordingBurst || !isReady) return;

    if (countdown === null) {
      // Start countdown at 3
      setCountdown(3);
      return;
    }

    if (countdown > 0) {
      // Tick down after 1 second
      const timerId = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else if (countdown === 0) {
      // Reached zero, take photo
      setCountdown(null);
      capturePhoto();
    }
  }, [isAutoCapturing, capturedPhotos.length, poseLimit, countdown, isRecordingBurst, isReady, capturePhoto]);

  const removePhoto = (indexToRemove) => {
    setCapturedPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const thumbnailSlots = Array.from({ length: poseLimit });

  useEffect(() => {
    setIsPlayingVideo(false);
    setPlaybackFrameIdx(0);
  }, [viewingPhotoIndex]);

  useEffect(() => {
    let interval;
    if (isPlayingVideo && viewingPhotoIndex !== null) {
      const frames = capturedPhotos[viewingPhotoIndex]?.frames;
      if (frames && frames.length > 0) {
        interval = setInterval(() => {
          setPlaybackFrameIdx(prev => (prev + 1) % frames.length);
        }, 150);
      }
    }
    return () => clearInterval(interval);
  }, [isPlayingVideo, viewingPhotoIndex, capturedPhotos]);

  return (
    <section className="camera-fullscreen-workspace" style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 280px',
      gap: '1.5rem',
      width: 'calc(100% - 2rem)',
      maxWidth: '1600px',
      margin: '0 auto',
      padding: '0'
    }}>

      {/* Big Camera Feed */}
      <div style={{ position: 'relative', background: 'black', borderRadius: '16px', overflow: 'hidden', aspectRatio: '16/11', maxHeight: 'calc(100svh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          className={cameraSettings.mirrorCamera ? 'is-mirrored' : ''}
          playsInline
          muted
          style={{
            filter: filter?.css || 'none',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {flash && (
          <div style={{
            position: 'absolute', inset: 0, background: 'white', zIndex: 50, opacity: 0.8
          }}></div>
        )}

        {countdown !== null && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '8rem', fontWeight: 'bold', textShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 40
          }}>
            {countdown}
          </div>
        )}

        {!isReady && !error && <div style={{ position: 'absolute', color: 'white' }}>Menyalakan kamera...</div>}
        {error && <div style={{ position: 'absolute', color: '#ef4444' }}>{error}</div>}

        {/* Center Capture Button */}
        {isReady && capturedPhotos.length < poseLimit && !isAutoCapturing && (
          <>
            <button
              onClick={handleCaptureClick}
              disabled={isRecordingBurst || countdown !== null}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: isRecordingBurst ? 'rgba(239, 68, 68, 0.7)' : 'rgba(156, 163, 175, 0.7)', // Red when recording
                backdropFilter: 'blur(4px)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                transition: 'transform 0.1s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
            >
              <CameraIcon />
            </button>

            {/* Small Arrow Button */}
            <button
              style={{
                position: 'absolute',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.6)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              <UpIcon />
            </button>
          </>
        )}

        {capturedPhotos.length >= poseLimit && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', zIndex: 20
          }}>
            <button onClick={() => onFinishSession(capturedPhotos)} style={{
              padding: '1rem 3rem', background: 'white', color: 'black', borderRadius: '999px', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              LANJUTKAN
            </button>
          </div>
        )}
      </div>

      {/* Thumbnails Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', height: '100%' }}>
        {thumbnailSlots.map((_, idx) => {
          const photo = capturedPhotos[idx];
          return (
            <div key={idx} style={{
              position: 'relative',
              flex: 1,
              background: photo ? 'transparent' : '#e5e7eb',
              borderRadius: '16px',
              border: photo ? '4px solid #374151' : '4px dashed #9ca3af',
              overflow: 'hidden',
              minHeight: '80px',
              cursor: photo ? 'pointer' : 'default'
            }} onClick={() => { if (photo) setViewingPhotoIndex(idx); }}>
              {photo && (
                <>
                  <img src={photo.src} alt={`Shot ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {/* Retake Button (stopPropagation to prevent viewing modal) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                    style={{
                      position: 'absolute',
                      top: '0',
                      right: '0',
                      background: 'white',
                      border: 'none',
                      borderBottomLeftRadius: '12px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '-2px 2px 5px rgba(0,0,0,0.1)'
                    }}
                  >
                    <RetakeIcon />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Fullscreen Viewer Modal */}
      {viewingPhotoIndex !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', color: 'white' }}>
          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1.5rem', gap: '1.5rem', alignItems: 'center' }}>
            <button onClick={() => { removePhoto(viewingPhotoIndex); setViewingPhotoIndex(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
              <RetakeIcon /> Retake
            </button>
            <button onClick={() => setIsPlayingVideo(!isPlayingVideo)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
              <PlayIcon /> {isPlayingVideo ? 'Stop Video' : 'Play Video'}
            </button>

            <button onClick={() => setViewingPhotoIndex(null)} style={{ background: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer', fontSize: '1.5rem', marginLeft: '1rem' }}>
              ✕
            </button>
          </div>

          {/* Main Image View */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <button
              onClick={() => setViewingPhotoIndex(prev => Math.max(0, prev - 1))}
              style={{ position: 'absolute', left: '3rem', background: 'transparent', border: 'none', color: 'white', fontSize: '2.5rem', cursor: 'pointer', opacity: viewingPhotoIndex > 0 ? 1 : 0.2 }}
              disabled={viewingPhotoIndex === 0}
            >
              ‹
            </button>

            <img
              src={isPlayingVideo && capturedPhotos[viewingPhotoIndex].frames ? capturedPhotos[viewingPhotoIndex].frames[playbackFrameIdx] : capturedPhotos[viewingPhotoIndex].src}
              style={{ maxWidth: '80%', maxHeight: '90%', objectFit: 'contain', borderRadius: '16px' }}
            />

            <button
              onClick={() => setViewingPhotoIndex(prev => Math.min(capturedPhotos.length - 1, prev + 1))}
              style={{ position: 'absolute', right: '3rem', background: 'transparent', border: 'none', color: 'white', fontSize: '2.5rem', cursor: 'pointer', opacity: viewingPhotoIndex < capturedPhotos.length - 1 ? 1 : 0.2 }}
              disabled={viewingPhotoIndex === capturedPhotos.length - 1}
            >
              ›
            </button>
          </div>

          {/* Pager Dots */}
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', gap: '0.8rem' }}>
            {capturedPhotos.map((_, i) => (
              <div
                key={i}
                onClick={() => setViewingPhotoIndex(i)}
                style={{
                  width: i === viewingPhotoIndex ? '32px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === viewingPhotoIndex ? 'white' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              ></div>
            ))}
          </div>
        </div>
      )}

    </section>
  );
}
