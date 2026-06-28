import { useEffect, useState } from 'react';
import { composePhotoCard } from '../utils/photoConfig.js';
import { QRCodeSVG } from 'qrcode.react';
import { backendRequest } from '../utils/backendApi.js';

const DUMMY_COMMENTS = [
  "Wah, seru banget eventnya! 🔥",
  "Keren banget fotonya, guys!",
  "Urbanmenphoto emang the best! 📸",
  "Seru abis, makasih fotonya!",
  "Aesthetic banget! ✨",
];

const getInitialComments = () => DUMMY_COMMENTS.slice(0, 2).map((text, index) => ({
  id: `initial-${index}`,
  text,
}));

const createLocalGalleryId = () => `local-${Date.now()}`;

export default function LiveWallView({ orderDetails, upsellDetails, capturedPhotos = [], backendSession, onNext }) {
  const [finalImages, setFinalImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [comments, setComments] = useState(getInitialComments);
  const [localGalleryId] = useState(createLocalGalleryId);
  const [downloadUrl, setDownloadUrl] = useState(() => {
    const id = backendSession?.id || localGalleryId;
    return `${window.location.origin}/gallery/${id}`;
  });
  const [waInput, setWaInput] = useState('');
  const [gifFrameIndex, setGifFrameIndex] = useState(0);
  const [deliveryMessage, setDeliveryMessage] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setComments(prev => {
        const newComment = {
          id: Date.now(),
          text: DUMMY_COMMENTS[Math.floor(Math.random() * DUMMY_COMMENTS.length)],
        };
        const next = [newComment, ...prev];
        return next.slice(0, 5);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const previewGifFrames = capturedPhotos.flatMap((photo) => (
    photo.frames && photo.frames.length > 0 ? photo.frames : [photo.src]
  )).filter(Boolean);
  const previewGifSrc = previewGifFrames.length > 0
    ? previewGifFrames[gifFrameIndex % previewGifFrames.length]
    : capturedPhotos[0]?.src;

  useEffect(() => {
    if (previewGifFrames.length <= 1) return undefined;
    const interval = setInterval(() => {
      setGifFrameIndex(prev => prev + 1);
    }, 150);
    return () => clearInterval(interval);
  }, [previewGifFrames.length]);

  useEffect(() => {
    let active = true;

    async function processPhotos() {
      try {
        const images = [];
        // Loop over all created variants from studio editor
        for (const variant of upsellDetails.variants) {
          const image = await composePhotoCard({
            photos: variant.photos,
            filterId: orderDetails.filter.id,
            frameId: variant.frame.id,
            frame: variant.frame,
            frameConfig: variant.frameConfig,
            slotState: variant.slotState,
            modeId: variant.template.id,
            paperSizeId: variant.paperSize?.id,
          });
          images.push(image);
          if (active) {
            setFinalImages([...images]);
          }
        }

        if (active) {
          setFinalImages(images);
          try {
            const localImages = [
              ...images,
              ...capturedPhotos.map(photo => photo.src).filter(Boolean),
            ];
            window.localStorage.setItem(`potobox_gallery_${localGalleryId}`, JSON.stringify({
              id: localGalleryId,
              images: localImages,
              createdAt: new Date().toISOString(),
            }));
          } catch (storageErr) {
            console.error('Failed to save local gallery preview', storageErr);
          }
          setIsProcessing(false);
          // Prioritize showing/printing the final composed result. Digital gallery
          // uploads and GIF generation continue below without blocking the user.
          setTimeout(() => {
            window.print();
          }, 1500);

          if (backendSession?.id) {
            try {
              const firstVariant = upsellDetails.variants?.[0];
              const finalized = await backendRequest(`/api/sessions/${backendSession.id}/finalize`, null, {
                method: 'POST',
                body: JSON.stringify({
                  layoutId: firstVariant?.template?.id || orderDetails.layoutId,
                  paperSize: firstVariant?.paperSize?.id || orderDetails.paperSize,
                  frameId: firstVariant?.frame?.id || orderDetails.frameId,
                  finalImage: images[0] || '',
                  images: [
                    ...images,
                    ...capturedPhotos.map(photo => photo.src).filter(Boolean),
                  ].slice(0, 16),
                }),
              });
              setDownloadUrl(finalized.downloadUrl || `${window.location.origin}/gallery/${backendSession.id}`);
            } catch (upErr) {
              console.error("Backend finalize failed", upErr);
            }
          }
        }
      } catch (err) {
        console.error('Failed to process photo', err);
        if (active) setIsProcessing(false);
      }
    }

    processPhotos();

    return () => {
      active = false;
    };
  }, [orderDetails, upsellDetails, backendSession?.id]);

  const handleSendWhatsApp = async (e) => {
    e.preventDefault();
    const normalizedNumber = waInput.replace(/[^\d]/g, '').replace(/^0/, '62');
    if (!normalizedNumber) return;
    setDeliveryMessage('');
    if (backendSession?.id) {
      try {
        await backendRequest(`/api/sessions/${backendSession.id}/send-link`, null, {
          method: 'POST',
          body: JSON.stringify({
            channel: 'whatsapp',
            recipient: normalizedNumber,
          }),
        });
        setDeliveryMessage('Link WhatsApp tercatat di backend.');
      } catch (err) {
        setDeliveryMessage(err.message);
      }
    }
    const message = `Halo! Ini link hasil foto Urbanmenphoto kamu:\n${downloadUrl}\n\nLink aktif selama 7 hari.`;
    window.open(`https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  if (isProcessing) {
    const processingPreview = finalImages[0];

    return (
      <div style={{ background: '#fcfaf6', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '2rem', color: '#1f2937', position: 'fixed', inset: 0, zIndex: 100, overflowY: 'auto' }}>


        {/* Center Content Container */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '4rem', margin: 'auto', width: '100%', maxWidth: '1000px', padding: '2rem 0' }}>

          {/* Left: Polaroid */}
          <div style={{ flex: '0 1 400px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#ef4444', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', paddingLeft: '1rem' }}>
              <span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #ef4444' }}></span>
              LIVE EVENT WALL
            </h3>

            <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', transform: 'rotate(-2deg)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
              {processingPreview ? (
                <img src={processingPreview} style={{ width: '100%', maxHeight: '520px', objectFit: 'contain', display: 'block', borderRadius: '6px' }} alt="Final photobooth preview" />
              ) : (
                <div style={{ width: '100%', aspectRatio: '2/3', display: 'grid', placeItems: 'center', borderRadius: '8px', background: '#fff7ed', color: '#ea580c', fontWeight: 900 }}>
                  Menyiapkan hasil...
                </div>
              )}
            </div>
          </div>

          {/* Right: Comments */}
          <div style={{ flex: '0 1 400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {comments.slice(0, 2).map((c, i) => (
              <div key={c.id} style={{
                background: '#fed7aa', // light orange
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                animation: 'floatIn 0.3s ease-out',
                opacity: 1 - (i * 0.2),
                color: '#9a3412', // dark orange text
                fontSize: '0.95rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                fontWeight: '500'
              }}>
                {c.text}
              </div>
            ))}
          </div>

        </div>

        {/* Bottom Progress */}
        <div style={{ margin: 'auto auto 0 auto', width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ color: '#9ca3af', fontSize: '1.25rem', fontWeight: 700, fontStyle: 'italic', textAlign: 'center' }}>
            Memproses & mencetak karya Anda... ⏳
          </div>
          {/* Progress bar wrapper */}
          <div style={{ width: '100%', height: '28px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
            {/* Progress bar fill (simulated via animation) */}
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              background: '#f97316',
              borderRadius: '999px',
              animation: 'progressFill 4s ease-out forwards'
            }}></div>
          </div>
        </div>

      </div>
    );
  }


  // Hitung jumlah print dari tier * headCount
  const effectiveHeadCount = orderDetails.headCount || 1;
  const totalPrints = orderDetails.tier.printLimit * effectiveHeadCount;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fcfaf6', color: '#1f2937' }}>
      {/* Hidden Print Area */}
      <div className="print-area">
        <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2>Cetak {totalPrints}x (Sesuai Paket {orderDetails.tier?.name} - {effectiveHeadCount} Org)</h2>
        </div>
        {finalImages.map((img, idx) => (
          <img key={idx} src={img} alt={`Print ${idx}`} style={{ width: '100%', maxWidth: '4in', margin: '0 auto', display: 'block', pageBreakAfter: 'always' }} />
        ))}
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

        {/* Tiled background */}
        <div style={{ position: 'absolute', inset: -20, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', opacity: 0.15, filter: 'blur(4px)' }}>
          {Array(15).fill(capturedPhotos[0]?.src).map((src, i) => (
            <img key={i} src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="bg" />
          ))}
        </div>

        {/* Glassmorphism Card */}
        <div style={{
          position: 'relative',
          background: 'rgba(20, 20, 20, 0.65)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '32px',
          padding: '2.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '3rem',
          maxWidth: '1100px',
          width: '100%',
          zIndex: 10,
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}>

          {/* Col 1: Photostrip */}
          <div style={{ width: '220px', flexShrink: 0 }}>
            <img src={finalImages[0] || capturedPhotos[0]?.src} style={{ width: '100%', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} alt="Photostrip" />
          </div>

          {/* Col 2: GIF & Combo */}
          <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0 }}>
            {/* GIF Preview */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <img src={previewGifSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="GIF Preview" />
              <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', color: '#ef4444', fontSize: '0.65rem', padding: '4px 10px', borderRadius: '999px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 6, height: 6, background: '#ef4444', borderRadius: '50%' }}></span> GIF
              </div>
            </div>

            {/* Combo Preview */}
            <div style={{ position: 'relative', width: '100%', background: 'white', padding: '6px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', color: '#10b981', fontSize: '0.65rem', padding: '4px 10px', borderRadius: '999px', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%' }}></span> PHOTO STRIP COMBO
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {capturedPhotos.slice(0, 8).map((p, i) => (
                  <img key={i} src={p.src} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '4px' }} alt={`Combo ${i}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Col 3: Details & Actions */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', paddingLeft: '1rem', minWidth: '280px' }}>
            <p style={{ fontSize: '0.85rem', textAlign: 'center', color: '#9ca3af', marginBottom: '1.5rem', maxWidth: '80%', lineHeight: '1.5' }}>
              Use your phone to scan this QR code and access your photos anytime.
            </p>

            <div style={{ background: 'white', padding: '1.2rem', borderRadius: '24px', marginBottom: '1.5rem' }}>
              <QRCodeSVG value={downloadUrl} size={150} />
            </div>

            <p style={{ fontSize: '0.7rem', color: '#6b7280', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '0.5rem' }}>OR VISIT</p>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '2rem' }}>{downloadUrl}</p>

            <form onSubmit={handleSendWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '280px', marginBottom: '0.8rem' }}>
              <input
                type="tel"
                value={waInput}
                onChange={(event) => setWaInput(event.target.value)}
                placeholder="Nomor WhatsApp"
                style={{
                  width: '100%',
                  background: '#111827',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '1rem',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  outline: 'none'
                }}
              />
              <button type="submit" style={{ background: '#22c55e', color: 'white', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                KIRIM VIA WHATSAPP
              </button>
              {deliveryMessage && <div style={{ color: '#9ca3af', fontSize: '0.75rem', textAlign: 'center' }}>{deliveryMessage}</div>}
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '280px' }}>
              <button onClick={() => window.print()} style={{ background: '#27272a', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                🖨️ PRINT PHOTO
              </button>
              <button onClick={onNext} style={{ background: 'white', color: 'black', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                📸 TAKE PHOTO AGAIN
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.8rem' }}>IG</div>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.8rem' }}>TK</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
