import { useEffect, useState } from 'react';
import { composePhotoCard } from '../utils/photoConfig.js';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../utils/supabaseClient.js';
import gifshot from 'gifshot';

// Helper to convert base64 to Blob
const base64ToBlob = (base64, mimeType) => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

const DUMMY_COMMENTS = [
  "Wah, seru banget eventnya! 🔥",
  "Keren banget fotonya, guys!",
  "Urbanmenphoto emang the best! 📸",
  "Seru abis, makasih fotonya!",
  "Aesthetic banget! ✨",
];

export default function LiveWallView({ orderDetails, upsellDetails, capturedPhotos = [], onNext }) {
  const [finalImages, setFinalImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [comments, setComments] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState(`https://urbanmenphoto.com/download/${Date.now()}`);
  const [emailInput, setEmailInput] = useState('');
  const [waInput, setWaInput] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  // Convert Base64 to Blob
  const base64ToBlob = (base64, mime) => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  };

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
            modeId: variant.template.id,
          });
          images.push(image);
        }

        if (active) {
          setFinalImages(images);

          if (supabase) {
            try {
              const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });
              const sessionId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : generateUUID();

              const uploadedImageUrls = [];

              // Upload variants
              for (let i = 0; i < images.length; i++) {
                const blob = base64ToBlob(images[i], 'image/png');
                const fileName = `${sessionId}/variant-${i + 1}.png`;
                const { error } = await supabase.storage.from('potobox-galleries').upload(fileName, blob, { contentType: 'image/png' });
                if (!error) {
                  const { data: publicUrlData } = supabase.storage.from('potobox-galleries').getPublicUrl(fileName);
                  uploadedImageUrls.push(publicUrlData.publicUrl);
                } else {
                  console.error('Variant upload error:', error);
                }
              }

              // Upload original captured photos
              for (let i = 0; i < capturedPhotos.length; i++) {
                const photoDataUri = capturedPhotos[i].src;
                if (!photoDataUri) continue;

                // 1. Upload static photo
                const mime = photoDataUri.split(';')[0].split(':')[1];
                const blob = base64ToBlob(photoDataUri, mime);
                const fileName = `${sessionId}/original-${i + 1}.${mime.split('/')[1]}`;
                const { error } = await supabase.storage.from('potobox-galleries').upload(fileName, blob, { contentType: mime });
                if (!error) {
                  const { data: publicUrlData } = supabase.storage.from('potobox-galleries').getPublicUrl(fileName);
                  uploadedImageUrls.push(publicUrlData.publicUrl);
                } else {
                  console.error('Original photo upload error:', error);
                }

                // 2. Upload GIF version if frames are available
                if (capturedPhotos[i].frames && capturedPhotos[i].frames.length > 1) {
                  try {
                    const gifDataUri = await new Promise((resolve, reject) => {
                      gifshot.createGIF({
                        images: capturedPhotos[i].frames,
                        gifWidth: capturedPhotos[i].mediaWidth || 640,
                        gifHeight: capturedPhotos[i].mediaHeight || 480,
                        interval: 0.15,
                        numFrames: capturedPhotos[i].frames.length,
                        sampleInterval: 10
                      }, function (obj) {
                        if (!obj.error) {
                          resolve(obj.image);
                        } else {
                          reject(obj.error);
                        }
                      });
                    });

                    const gifBlob = base64ToBlob(gifDataUri, 'image/gif');
                    const gifFileName = `${sessionId}/original-${i + 1}-animated.gif`;
                    const { error: gifError } = await supabase.storage.from('potobox-galleries').upload(gifFileName, gifBlob, { contentType: 'image/gif' });
                    if (!gifError) {
                      const { data: publicGifData } = supabase.storage.from('potobox-galleries').getPublicUrl(gifFileName);
                      uploadedImageUrls.push(publicGifData.publicUrl);
                    } else {
                      console.error('GIF upload error:', gifError);
                    }
                  } catch (err) {
                    console.error('Failed to create GIF for photo', i + 1, err);
                  }
                }
              }

              // 3. Upload ONE combined GIF (Featured Video)
              const allCombinedFrames = capturedPhotos.reduce((acc, photo) => {
                if (photo.frames) return acc.concat(photo.frames);
                return acc;
              }, []);

              if (allCombinedFrames.length > 0) {
                try {
                  const combinedGifDataUri = await new Promise((resolve, reject) => {
                    gifshot.createGIF({
                      images: allCombinedFrames,
                      gifWidth: capturedPhotos[0].mediaWidth || 640,
                      gifHeight: capturedPhotos[0].mediaHeight || 480,
                      interval: 0.15,
                      numFrames: allCombinedFrames.length,
                      sampleInterval: 10
                    }, function (obj) {
                      if (!obj.error) resolve(obj.image);
                      else reject(obj.error);
                    });
                  });

                  const combinedGifBlob = base64ToBlob(combinedGifDataUri, 'image/gif');
                  const combinedFileName = `${sessionId}/featured-video.gif`;
                  const { error: combinedError } = await supabase.storage.from('potobox-galleries').upload(combinedFileName, combinedGifBlob, { contentType: 'image/gif' });

                  if (!combinedError) {
                    const { data: publicCombinedData } = supabase.storage.from('potobox-galleries').getPublicUrl(combinedFileName);
                    uploadedImageUrls.push(publicCombinedData.publicUrl);
                  } else {
                    console.error('Combined GIF upload error:', combinedError);
                  }
                } catch (err) {
                  console.error('Failed to create combined GIF', err);
                }
              }

              if (uploadedImageUrls.length > 0) {
                // Insert into database
                await supabase.from('sessions').insert([{ id: sessionId, images: uploadedImageUrls }]);
                setDownloadUrl(`${window.location.origin}/gallery/${sessionId}`);
              }
            } catch (upErr) {
              console.error("Upload failed", upErr);
            }
          }

          setIsProcessing(false);
          // Trigger Print automatically after short delay
          setTimeout(() => {
            window.print();
          }, 1500);
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
  }, [orderDetails, upsellDetails]);

  const handleSendDigital = (e) => {
    e.preventDefault();
    if (!emailInput && !waInput) return;

    // Simulate sending
    setTimeout(() => {
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    }, 1000);
  };

  if (isProcessing) {
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

            <div style={{ background: 'white', padding: '0.8rem', paddingBottom: '1.5rem', borderRadius: '12px', transform: 'rotate(-2deg)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {capturedPhotos.slice(0, 5).map((p, i) => (
                  <img key={i} src={p.src} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '4px' }} alt="snapshot" />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'black', fontWeight: 'bold', fontSize: '0.75rem', padding: '1rem 0.5rem 0', textAlign: 'center' }}>
                <div style={{ flex: 1 }}>Urbanmen<br />Photo Booth</div>
                <div style={{ flex: 1 }}>Urbanmen<br />Photo Booth</div>
              </div>
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
        <div style={{ margin: 'auto auto 0 auto', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ color: '#9ca3af', fontSize: '0.85rem', fontStyle: 'italic' }}>
            Memproses & mencetak karya Anda... ⏳
          </div>
          {/* Progress bar wrapper */}
          <div style={{ width: '100%', height: '16px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
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
              <img src={capturedPhotos[0]?.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="GIF Preview" />
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
