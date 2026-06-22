import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function MobileGalleryView({ sessionId }) {
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchGallery() {
      if (!supabase) {
        setError('Koneksi Supabase belum dikonfigurasi.');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Sesi foto tidak ditemukan.');

        setSessionData(data);
      } catch (err) {
        console.error('Error fetching gallery:', err);
        setError(err.message || 'Gagal memuat galeri foto.');
      } finally {
        setLoading(false);
      }
    }

    fetchGallery();
  }, [sessionId]);

  const handleDownloadAll = () => {
    if (!sessionData?.images) return;
    
    // Iterasi untuk mendownload secara lokal
    sessionData.images.forEach((imgUrl, idx) => {
      // Buka di tab baru atau paksa download menggunakan tag a
      const a = document.createElement('a');
      a.href = imgUrl;
      a.target = '_blank';
      a.download = `potobox-${sessionId}-${idx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--paper)', color: 'var(--ink)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ animation: 'slowSpin 1s linear infinite', fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
          <h2>Memuat Galeri Anda...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--paper)', padding: '2rem', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🥺</div>
          <h2 style={{ color: 'var(--accent-dark)' }}>Oops!</h2>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
        <div style={{ display: 'inline-flex', background: 'var(--ink)', color: 'white', padding: '0.5rem 1rem', borderRadius: '12px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '1rem' }}>
          POTOBOX
        </div>
        <h1 style={{ margin: '0 0 0.5rem', color: 'var(--ink)', fontSize: '1.5rem' }}>Your Digital Gallery</h1>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Berlaku hingga 7 hari ke depan.
        </p>
      </header>

      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={handleDownloadAll}
          style={{ 
            width: '100%', 
            padding: '1rem', 
            background: 'var(--accent)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '16px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            boxShadow: '0 10px 20px rgba(238, 93, 61, 0.2)',
            cursor: 'pointer'
          }}
        >
          📥 Download Semua Foto
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {sessionData.images.map((imgUrl, idx) => (
          <div key={idx} style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', background: '#eee', aspectRatio: '3/4' }}>
            <img src={imgUrl} alt={`Snap ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          </div>
        ))}
      </div>

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', paddingBottom: '2rem' }}>
        &copy; {new Date().getFullYear()} Groove & Photobooth
      </footer>
    </div>
  );
}
