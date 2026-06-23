import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getKioskSettings, saveKioskSettings } from '../utils/kioskConfig.js';
import { getTransactions, clearTransactions, exportTransactionsToCSV } from '../utils/transactionLogger.js';
import { getFrameSettings, saveFrameSettings } from '../utils/frameConfig.js';
import { fetchCustomFrames } from '../utils/customFrameConfig.js';

// --- SVG Icons Helper Components ---
const OverviewIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);
const KioskIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <circle cx="12" cy="14" r="4" />
    <line x1="12" y1="6" x2="12.01" y2="6" />
  </svg>
);
const GalleryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const StatisticIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const TransactionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  </svg>
);
const FramePhotoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M8 3v18" />
    <path d="M16 3v18" />
    <path d="M3 8h18" />
    <path d="M3 16h18" />
  </svg>
);
const FrameGifIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);
const VoucherIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);
const PaymentKeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const MENU_ITEMS = [
  { id: 'overview', label: 'Overview', icon: <OverviewIcon /> },
  { id: 'kiosk', label: 'Kiosk', icon: <KioskIcon /> },
  { id: 'gallery', label: 'Gallery', icon: <GalleryIcon /> },
  { id: 'statistic', label: 'Statistic', icon: <StatisticIcon /> },
  { id: 'transaction', label: 'Transaction', icon: <TransactionIcon /> },
  { id: 'frame_photo', label: 'Frame Photo', icon: <FramePhotoIcon /> },
  { id: 'frame_gif', label: 'Frame Gif', icon: <FrameGifIcon /> },
  { id: 'voucher', label: 'Voucher', icon: <VoucherIcon /> },
  { id: 'payment_key', label: 'Payment Key', icon: <PaymentKeyIcon /> },
];

function KioskSettingsTab() {
  const [settings, setSettings] = useState(getKioskSettings());
  const [savedMessage, setSavedMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (saveKioskSettings(settings)) {
      setSavedMessage('Pengaturan berhasil disimpan!');
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #e9ecef', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111' }}>Kiosk Machine Settings</h2>
          <p style={{ margin: 0, color: '#6c757d', marginTop: '0.2rem', fontSize: '0.9rem' }}>Konfigurasi mesin fisik photobooth ini.</p>
        </div>
        <button onClick={toggleFullscreen} style={{ padding: '0.6rem 1.2rem', background: '#111', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <OverviewIcon /> Masuk Fullscreen
        </button>
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057' }}>Nama Kiosk / Cabang</label>
          <input 
            type="text" 
            name="kioskName" 
            value={settings.kioskName} 
            onChange={handleChange}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
          />
          <p style={{ fontSize: '0.8rem', color: '#868e96', marginTop: '0.3rem' }}>Nama ini bisa muncul di struk atau log transaksi.</p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057' }}>Kamera Utama (Default)</label>
          <select 
            name="defaultCamera" 
            value={settings.defaultCamera} 
            onChange={handleChange}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem', backgroundColor: 'white' }}
          >
            <option value="user">Kamera Depan (Webcam Standard)</option>
            <option value="environment">Kamera Belakang (DSLR / Capture Card)</option>
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057' }}>Idle Timeout (Detik)</label>
          <input 
            type="number" 
            name="idleTimeout" 
            value={settings.idleTimeout} 
            onChange={handleChange}
            min="10" max="300"
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
          />
          <p style={{ fontSize: '0.8rem', color: '#868e96', marginTop: '0.3rem' }}>Waktu diam sebelum sistem otomatis kembali ke layar awal.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="submit" style={{ padding: '0.8rem 2rem', background: '#00e58c', color: '#111', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Simpan Pengaturan
          </button>
          {savedMessage && <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓ {savedMessage}</span>}
        </div>
      </form>
    </div>
  );
}

function StatisticTab({ sessions }) {
  const totalSessions = sessions.length;
  const totalPhotos = sessions.reduce((acc, s) => acc + (s.images ? s.images.length : 0), 0);
  const avgPhotos = totalSessions > 0 ? (totalPhotos / totalSessions).toFixed(1) : 0;
  
  const today = new Date().toDateString();
  const sessionsToday = sessions.filter(s => new Date(s.created_at).toDateString() === today).length;

  // Simple calculation for a CSS bar chart (Sessions per day for the last 7 days)
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toDateString();
  }).reverse();

  const sessionsPerDay = last7Days.map(dateStr => {
    return {
      date: dateStr.substring(0, 3), // Mon, Tue...
      count: sessions.filter(s => new Date(s.created_at).toDateString() === dateStr).length
    };
  });

  const maxCount = Math.max(...sessionsPerDay.map(d => d.count), 1);

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', color: '#111' }}>Kiosk Statistics</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e9ecef', borderLeft: '4px solid #10B981' }}>
          <div style={{ color: '#6c757d', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>Sesi Hari Ini</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111' }}>{sessionsToday}</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e9ecef', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ color: '#6c757d', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Sesi (All Time)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111' }}>{totalSessions}</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e9ecef', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ color: '#6c757d', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Foto Diambil</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111' }}>{totalPhotos}</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e9ecef', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: '#6c757d', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>Rata-rata Foto / Sesi</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111' }}>{avgPhotos}</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef' }}>
        <h3 style={{ marginTop: 0, marginBottom: '2rem', color: '#111' }}>Aktivitas 7 Hari Terakhir</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #e9ecef' }}>
          {sessionsPerDay.map((day, idx) => {
            const heightPercent = (day.count / maxCount) * 100;
            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ fontSize: '0.8rem', color: '#111', fontWeight: 'bold', marginBottom: '0.5rem' }}>{day.count > 0 ? day.count : ''}</div>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '40px', 
                  height: `${heightPercent}%`, 
                  background: day.count > 0 ? '#00e58c' : '#f1f3f5',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.5s ease-out'
                }}></div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '2rem', paddingTop: '1rem' }}>
          {sessionsPerDay.map((day, idx) => (
            <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem', color: '#6c757d', fontWeight: 'bold' }}>
              {day.date}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FrameSettingsTab() {
  const [settings, setSettings] = useState(getFrameSettings());
  const [customFrames, setCustomFrames] = useState([]);
  const [savedMessage, setSavedMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const loadFrames = async () => {
    const frames = await fetchCustomFrames();
    setCustomFrames(frames);
  };

  useEffect(() => {
    loadFrames();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (saveFrameSettings(settings)) {
      setSavedMessage('Desain Bingkai berhasil disimpan!');
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const handleUploadFrame = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!supabase) {
      alert("Supabase belum terhubung!");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `frame_${Date.now()}.${fileExt}`;
      const filePath = `frames/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('potobox-galleries')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/png'
        });
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('potobox-galleries')
        .getPublicUrl(filePath);
        
      await loadFrames();
    } catch(err) {
      alert("Gagal mengunggah bingkai: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = null; // Reset input
    }
  };

  const handleDeleteFrame = async (frame) => {
    if (window.confirm(`Hapus bingkai ${frame.name}?`)) {
      try {
        // Extract filename from URL
        const fileName = frame.url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('potobox-galleries').remove([`frames/${fileName}`]);
        }
      } catch (err) {
        console.error("Gagal menghapus dari storage", err);
      }
      
      await loadFrames();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* SECTION 1: CUSTOM TEXT SETTINGS */}
      <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '3rem' }}>
        <div>
          <div style={{ marginBottom: '2rem', borderBottom: '1px solid #e9ecef', paddingBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: '#111' }}>Custom Frame Text</h2>
            <p style={{ margin: 0, color: '#6c757d', marginTop: '0.2rem', fontSize: '0.9rem' }}>Atur teks merek yang akan tercetak di bawah setiap foto (khusus frame bawaan).</p>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057' }}>Baris 1 (Besar)</label>
              <input 
                type="text" 
                name="brandLine1" 
                value={settings.brandLine1} 
                onChange={handleChange}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057' }}>Baris 2 (Kecil)</label>
              <input 
                type="text" 
                name="brandLine2" 
                value={settings.brandLine2} 
                onChange={handleChange}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', color: '#495057' }}>
                <input 
                  type="checkbox" 
                  name="showDate" 
                  checked={settings.showDate} 
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px' }}
                />
                Tampilkan Tanggal Foto
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button type="submit" style={{ padding: '0.8rem 2rem', background: '#00e58c', color: '#111', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                Simpan Teks
              </button>
              {savedMessage && <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓ {savedMessage}</span>}
            </div>
          </form>
        </div>
        
        {/* Visual Preview Container */}
        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '2px dashed #ced4da' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '0.9rem', color: '#6c757d', textTransform: 'uppercase' }}>Preview Cetak</h3>
          
          <div style={{ background: 'white', width: '200px', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ background: '#e9ecef', height: '100px', borderRadius: '4px', marginBottom: '10px' }}></div>
            <div style={{ background: '#e9ecef', height: '100px', borderRadius: '4px', marginBottom: '10px' }}></div>
            <div style={{ background: '#e9ecef', height: '100px', borderRadius: '4px', marginBottom: '20px' }}></div>
            
            <div style={{ textAlign: 'center', color: '#111', fontFamily: "'Inter', sans-serif" }}>
              <div style={{ fontWeight: '800', fontSize: '16px', lineHeight: '1.1' }}>{settings.brandLine1 || ' '}</div>
              <div style={{ fontWeight: '800', fontSize: '16px', lineHeight: '1.1' }}>{settings.brandLine2 || ' '}</div>
              {settings.showDate && (
                <div style={{ fontWeight: '400', fontSize: '10px', marginTop: '10px', color: '#495057' }}>
                  {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CUSTOM PNG FRAMES */}
      <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid #e9ecef', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111' }}>Upload Bingkai PNG Overlay</h2>
            <p style={{ margin: 0, color: '#6c757d', marginTop: '0.2rem', fontSize: '0.9rem' }}>Unggah file PNG transparan beresolusi 1200x1800 px (Strip) atau 1800x1200 px (Landscape).</p>
          </div>
          <div>
            <input 
              type="file" 
              accept="image/png" 
              onChange={handleUploadFrame} 
              style={{ display: 'none' }} 
              id="frameUpload"
            />
            <label htmlFor="frameUpload" style={{ padding: '0.8rem 1.5rem', background: '#111', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', display: 'inline-block' }}>
              {isUploading ? 'Mengunggah...' : '+ Unggah PNG'}
            </label>
          </div>
        </div>

        {customFrames.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ced4da', color: '#6c757d' }}>
            Belum ada bingkai custom yang diunggah.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {customFrames.map(frame => (
              <div key={frame.id} style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '1rem', position: 'relative', background: '#f8f9fa', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button 
                  onClick={() => handleDeleteFrame(frame)}
                  style={{ position: 'absolute', top: '-10px', right: '-10px', width: '30px', height: '30px', borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                >
                  ✕
                </button>
                <div style={{ width: '100%', height: '180px', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h10v10H0zm10 10h10v10H10z\' fill=\'%23e9ecef\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', borderRadius: '6px', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img src={frame.url} alt={frame.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#111', textAlign: 'center', wordBreak: 'break-all' }}>
                  {frame.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionTab() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Load on mount
    setTransactions(getTransactions());
  }, []);

  const totalRevenue = transactions.reduce((acc, t) => acc + (t.status === 'Success' ? t.amount : 0), 0);

  const handleClear = () => {
    if (window.confirm('Yakin ingin menghapus semua riwayat transaksi? Laporan ini tidak bisa dikembalikan.')) {
      if (clearTransactions()) {
        setTransactions([]);
      }
    }
  };

  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111' }}>Laporan Transaksi Keuangan</h2>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem', marginTop: '0.2rem' }}>Total Pendapatan: <span style={{ color: '#10B981', fontWeight: 'bold' }}>Rp {totalRevenue.toLocaleString('id-ID')}</span></p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportTransactionsToCSV} style={{ padding: '0.6rem 1rem', background: '#00e58c', color: '#111', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            ↓ Export CSV
          </button>
          <button onClick={handleClear} style={{ padding: '0.6rem 1rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Clear Logs
          </button>
        </div>
      </div>
      
      {transactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed #ced4da', borderRadius: '8px', color: '#6c757d' }}>
          Belum ada transaksi yang tercatat.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e9ecef', color: '#6c757d', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem 0' }}>Order ID</th>
                <th style={{ padding: '1rem 0' }}>Waktu</th>
                <th style={{ padding: '1rem 0' }}>Paket</th>
                <th style={{ padding: '1rem 0' }}>Harga</th>
                <th style={{ padding: '1rem 0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f3f5' }}>
                  <td style={{ padding: '1rem 0', fontFamily: 'monospace', color: '#111', fontSize: '0.9rem' }}>{t.id}</td>
                  <td style={{ padding: '1rem 0', color: '#495057', fontSize: '0.95rem' }}>
                    {new Date(t.timestamp).toLocaleDateString('id-ID')} {new Date(t.timestamp).toLocaleTimeString('id-ID')}
                  </td>
                  <td style={{ padding: '1rem 0', color: '#111', fontWeight: '500' }}>{t.packageName}</td>
                  <td style={{ padding: '1rem 0', color: '#111', fontWeight: 'bold' }}>Rp {t.amount.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '1rem 0' }}>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold',
                      background: t.status === 'Success' ? '#d1fae5' : '#fee2e2',
                      color: t.status === 'Success' ? '#059669' : '#ef4444'
                    }}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('overview');
  
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Hardcoded fallback PIN if not set in .env
  const CORRECT_PIN = import.meta.env.VITE_ADMIN_PIN || '123456';

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === CORRECT_PIN) {
      setIsAuthenticated(true);
      setError('');
      fetchSessions();
    } else {
      setError('PIN salah. Silakan coba lagi.');
      setPinInput('');
    }
  };

  const fetchSessions = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8f9fa' }}>
        <form onSubmit={handleLogin} style={{ background: 'white', padding: '3rem', borderRadius: '16px', border: '1px solid #e9ecef', textAlign: 'center', maxWidth: '400px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ marginBottom: '0.5rem', color: '#111' }}>Admin Access</h2>
          <p style={{ color: '#6c757d', marginBottom: '2rem', fontSize: '0.9rem' }}>Masukkan PIN rahasia untuk mengakses dasbor.</p>
          
          <input 
            type="password" 
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="• • • • • •"
            style={{ 
              width: '100%', padding: '1rem', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', 
              borderRadius: '8px', border: '2px solid #e9ecef', marginBottom: '1rem' 
            }}
            autoFocus
          />
          
          {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
          
          <button type="submit" style={{ width: '100%', padding: '1rem', background: '#111', color: 'white', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', border: 'none' }}>
            Masuk
          </button>
        </form>
      </div>
    );
  }

  // Render Content based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <h2 style={{ marginBottom: '1.5rem', color: '#111' }}>Dashboard Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ color: '#6c757d', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase' }}>Total Sessions</div>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10B981' }}>{sessions.length}</div>
              </div>
              <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ color: '#6c757d', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase' }}>Photos Taken (Est.)</div>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#3b82f6' }}>{sessions.reduce((acc, s) => acc + (s.images ? s.images.length : 0), 0)}</div>
              </div>
            </div>
          </div>
        );
      
      case 'kiosk':
        return <KioskSettingsTab />;
        
      case 'statistic':
        return <StatisticTab sessions={sessions} />;
        
      case 'transaction':
        return <TransactionTab />;
        
      case 'frame_photo':
        return <FrameSettingsTab />;
      
      case 'gallery':
        return (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#111' }}>Customer Gallery Logs</h2>
              <button onClick={fetchSessions} style={{ padding: '0.5rem 1rem', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', cursor: 'pointer' }}>Refresh</button>
            </div>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>Memuat data...</div>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>Belum ada sesi foto yang tersimpan.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e9ecef', color: '#6c757d', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '1rem 0' }}>Session ID</th>
                      <th style={{ padding: '1rem 0' }}>Time</th>
                      <th style={{ padding: '1rem 0' }}>Preview</th>
                      <th style={{ padding: '1rem 0', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => {
                      const imageList = s.images || [];
                      const previews = imageList.slice(0, 3);
                      
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                          <td style={{ padding: '1rem 0', fontFamily: 'monospace', color: '#111', fontSize: '0.9rem' }}>{s.id.substring(0,15)}...</td>
                          <td style={{ padding: '1rem 0', color: '#495057', fontSize: '0.95rem' }}>{new Date(s.created_at).toLocaleString('id-ID')}</td>
                          <td style={{ padding: '1rem 0' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              {previews.map((imgUrl, idx) => (
                                <div key={idx} style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                                  <img src={imgUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              ))}
                              {imageList.length > 3 && (
                                <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 'bold' }}>+{imageList.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <a 
                                href={`/gallery/${s.id}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', background: '#e9ecef', color: '#111', textDecoration: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}
                              >
                                View
                              </a>
                              <button 
                                onClick={async () => {
                                  if (window.confirm(`Hapus permanen galeri dan file untuk sesi ${s.id}?`)) {
                                    try {
                                      // 1. List files in folder
                                      const { data: files } = await supabase.storage.from('potobox-galleries').list(s.id);
                                      // 2. Delete files
                                      if (files && files.length > 0) {
                                        const filePaths = files.map(f => `${s.id}/${f.name}`);
                                        await supabase.storage.from('potobox-galleries').remove(filePaths);
                                      }
                                      // 3. Delete DB row
                                      const { error: dbError } = await supabase.from('sessions').delete().eq('id', s.id);
                                      if (dbError) throw dbError;
                                      
                                      // 4. Update UI
                                      setSessions(prev => prev.filter(session => session.id !== s.id));
                                    } catch (err) {
                                      alert('Gagal menghapus sesi: ' + err.message);
                                    }
                                  }
                                }}
                                style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      
      default:
        // Placeholder for unimplemented menus
        return (
          <div style={{ background: 'white', padding: '4rem 2rem', borderRadius: '12px', border: '1px dashed #ced4da', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#adb5bd' }}>🚧</div>
            <h2 style={{ color: '#495057', marginBottom: '0.5rem' }}>{MENU_ITEMS.find(m => m.id === activeTab)?.label} Settings</h2>
            <p style={{ color: '#868e96' }}>Modul ini sedang dalam pengembangan dan akan segera hadir.</p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8f9fa', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar Navigation */}
      <aside style={{ width: '260px', backgroundColor: '#f4f5f7', borderRight: '1px solid #e9ecef', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #e9ecef', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px', color: '#111' }}>POTOBOX<span style={{color: '#10B981'}}>.</span></h1>
          <div style={{ fontSize: '0.75rem', color: '#868e96', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Panel v1.0</div>
        </div>
        
        <nav style={{ padding: '0 1rem', flex: 1, overflowY: 'auto' }}>
          {MENU_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', 
                  padding: '0.8rem 1rem', border: 'none', 
                  background: isActive ? '#00e58c' : 'transparent', // The bright green from the mockup
                  color: isActive ? '#111' : '#495057', 
                  fontWeight: isActive ? '600' : '500',
                  textAlign: 'left', cursor: 'pointer',
                  borderRadius: '8px',
                  marginBottom: '0.2rem',
                  transition: 'background 0.2s, color 0.2s'
                }}
              >
                <div style={{ opacity: isActive ? 1 : 0.7, display: 'flex' }}>
                  {item.icon}
                </div>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid #e9ecef' }}>
          <button 
            onClick={() => { setIsAuthenticated(false); setPinInput(''); }}
            style={{ width: '100%', padding: '0.8rem', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
        {renderContent()}
      </main>
    </div>
  );
}
