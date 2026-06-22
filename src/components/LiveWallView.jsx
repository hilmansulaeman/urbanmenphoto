import { useEffect, useState } from 'react';
import { composePhotoCard } from '../utils/photoConfig.js';
import { QRCodeSVG } from 'qrcode.react';

const DUMMY_COMMENTS = [
  "Wah, seru banget eventnya! 🔥",
  "Keren banget fotonya, guys!",
  "Urbanmenphoto emang the best! 📸",
  "Seru abis, makasih fotonya!",
  "Aesthetic banget! ✨",
];

export default function LiveWallView({ orderDetails, upsellDetails, selectedPhotos, onNext }) {
  const [finalImages, setFinalImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [comments, setComments] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [waInput, setWaInput] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

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
            modeCount: variant.template.count,
          });
          images.push(image);
        }

        if (active) {
          setFinalImages(images);
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
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ fontSize: '2rem' }}>Memproses {upsellDetails.variants.length} Frame...</h2>
        <div style={{ marginTop: '2rem', animation: 'slowSpin 2s linear infinite', fontSize: '3rem' }}>⏳</div>
      </div>
    );
  }

  const downloadUrl = `https://urbanmenphoto.com/download/${Date.now()}`;
  
  // Hitung jumlah print dari tier * headCount
  const totalPrints = orderDetails.tier.printLimit * orderDetails.headCount;

  return (
    <>
      {/* Hidden Print Area */}
      <div className="print-area" style={{ display: 'none' }}>
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h2>Cetak {totalPrints}x (Sesuai Paket {orderDetails.tier.name} - {orderDetails.headCount} Org)</h2>
        </div>
        {finalImages.map((img, idx) => (
          <img key={idx} src={img} alt={`Print ${idx}`} style={{ width: '100%', maxWidth: '4in', display: 'block', pageBreakAfter: 'always' }} />
        ))}
      </div>

      <section className="wizard-step live-wall-workspace" style={{ maxWidth: '1200px' }}>
        <header className="wizard-header" style={{ marginBottom: '1rem' }}>
          <h2>Print Queue & Live Wall</h2>
          <p className="subtitle">
            Mencetak {totalPrints} lembar foto. Silakan unduh semua varian frame secara digital.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          <div style={{ background: '#111827', borderRadius: '24px', padding: '1.5rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--accent)' }}>🔴 LIVE EVENT WALL</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
              {finalImages.map((img, idx) => (
                <img 
                  key={idx}
                  src={img} 
                  alt={`Live Wall Post ${idx}`} 
                  style={{ 
                    maxHeight: finalImages.length > 1 ? '200px' : '400px', 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', 
                    transform: `rotate(${idx % 2 === 0 ? -2 : 3}deg)` 
                  }} 
                />
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {comments.map((c, i) => (
                <div key={c.id} style={{ 
                  background: 'rgba(255,255,255,0.1)', padding: '0.8rem 1rem', 
                  borderRadius: '12px', animation: 'floatIn 0.3s ease-out',
                  opacity: 1 - (i * 0.2)
                }}>
                  {c.text}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: '24px', padding: '2rem', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 1rem' }}>Scan untuk Download</h3>
              <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Soft file berisi {finalImages.length} varian frame</p>
              <div style={{ background: 'white', padding: '1rem', display: 'inline-block', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <QRCodeSVG value={downloadUrl} size={180} />
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
                Atau kunjungi:<br/> <a href="#" style={{ color: 'var(--accent)' }}>{downloadUrl}</a>
              </p>
            </div>

            <form onSubmit={handleSendDigital} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: '24px', padding: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem' }}>Kirim via Email/WA (Opsional)</h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <input 
                  type="email" 
                  placeholder="Alamat Email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '0.5rem' }}
                />
                <input 
                  type="text" 
                  placeholder="Nomor WhatsApp (Contoh: 0812...)" 
                  value={waInput}
                  onChange={(e) => setWaInput(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--line)' }}
                />
              </div>

              <button type="submit" className="primary-action" style={{ width: '100%' }}>
                Kirim Digital
              </button>
              
              {sendSuccess && (
                <p style={{ color: '#10b981', textAlign: 'center', margin: '1rem 0 0', fontWeight: 'bold' }}>
                  ✓ Berhasil dikirim!
                </p>
              )}
            </form>
          </div>
        </div>

        <footer className="wizard-footer">
          <button className="primary-action" onClick={onNext}>Selesai & Reset System</button>
        </footer>
      </section>
    </>
  );
}
