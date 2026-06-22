import { useEffect, useRef, useState, useCallback } from 'react';
import { captureVideoFrame, getCameraStream } from '../utils/camera.js';

export default function CameraView({ filter, poseLimit, onFinishSession }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');
  
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [flash, setFlash] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      setIsReady(false);
      setError('');
      stopStream(streamRef.current);

      try {
        const stream = await getCameraStream(facingMode);
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
        setError(cameraError.message || 'Kamera tidak bisa diakses.');
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
    };
  }, [facingMode]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !isReady) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const photo = captureVideoFrame(videoRef.current, { mirror: facingMode === 'user' });
    setCapturedPhotos(prev => {
      const newPhotos = [...prev, {
        src: photo,
        mediaWidth: videoRef.current.videoWidth || 0,
        mediaHeight: videoRef.current.videoHeight || 0,
      }];
      
      if (newPhotos.length >= poseLimit) {
        setIsAutoCapturing(false);
        setTimeout(() => onFinishSession(newPhotos), 1500);
      }
      return newPhotos;
    });
  }, [isReady, facingMode, poseLimit, onFinishSession]);

  useEffect(() => {
    if (!isAutoCapturing) return;
    if (capturedPhotos.length >= poseLimit) return;

    if (countdown === null) {
      setCountdown(3);
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0) {
      // Temporarily set countdown to -1 so it doesn't trigger repeatedly
      setCountdown(-1);
      capturePhoto();
      
      if (capturedPhotos.length + 1 < poseLimit) {
        const timer = setTimeout(() => {
          setCountdown(3);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAutoCapturing, countdown, poseLimit, capturePhoto, capturedPhotos.length]);

  const toggleAutoCapture = () => {
    if (isAutoCapturing) {
      setIsAutoCapturing(false);
      setCountdown(null);
    } else {
      setIsAutoCapturing(true);
      setCountdown(3);
    }
  };

  return (
    <section className="studio-stage">
      <div className="media-frame" style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          className={facingMode === 'user' ? 'camera-feed is-mirrored' : 'camera-feed'}
          playsInline
          muted
          style={{ filter: filter.css }}
        />

        {flash && (
          <div style={{
            position: 'absolute', inset: 0, background: 'white', zIndex: 50, opacity: 0.8
          }}></div>
        )}

        {!isReady && !error ? <div className="stage-status">Menyalakan kamera...</div> : null}
        {error ? <div className="stage-status stage-error">{error}</div> : null}
        
        {isReady && (
          <div className="camera-timer" style={{
            position: 'absolute', top: '20px', left: '20px', right: '20px', 
            display: 'flex', justifyContent: 'space-between', zIndex: 10,
            background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '12px',
            color: 'white', fontWeight: 'bold', fontSize: '1.2rem'
          }}>
            <span>Max Pose: {poseLimit}</span>
            <span>Difoto: {capturedPhotos.length} / {poseLimit}</span>
          </div>
        )}

        {isAutoCapturing && countdown > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: '8rem', fontWeight: '900', color: 'white', textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            zIndex: 40
          }}>
            {countdown}
          </div>
        )}
        
        {!isAutoCapturing && capturedPhotos.length >= poseLimit && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: '3rem', fontWeight: '900', color: 'white', textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            zIndex: 40, background: 'var(--accent)', padding: '1rem 2rem', borderRadius: '24px'
          }}>
            Selesai!
          </div>
        )}
      </div>

      <div className="camera-actions">
        <button className="secondary-action" type="button" onClick={() => setFacingMode((mode) => (mode === 'user' ? 'environment' : 'user'))}>
          Switch
        </button>
        <button 
          className="capture-button" 
          type="button" 
          onClick={toggleAutoCapture} 
          disabled={!isReady || capturedPhotos.length >= poseLimit}
          style={{ background: isAutoCapturing ? '#ef4444' : 'var(--ink)' }}
        >
          <span />
          {isAutoCapturing ? 'Pause Capture' : 'Mulai Auto Capture'}
        </button>
      </div>
    </section>
  );
}

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}
