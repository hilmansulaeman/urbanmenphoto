import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getKioskSettings, saveKioskSettings } from '../utils/kioskConfig.js';
import { clearTransactions } from '../utils/transactionLogger.js';
import { getFrameSettings, saveFrameSettings } from '../utils/frameConfig.js';
import { fetchCustomFrames } from '../utils/customFrameConfig.js';
import { FRAMES } from '../utils/photoConfig.js';
import { backendRequest, formatCurrency, formatDateTime } from '../utils/backendApi.js';

const ADMIN_TOKEN_KEY = 'urbanmenphoto_admin_token';
const ADMIN_USER_KEY = 'urbanmenphoto_admin_user';

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
  { id: 'payments', label: 'Payments', icon: <PaymentKeyIcon /> },
  { id: 'messages', label: 'Messages', icon: <GalleryIcon /> },
  { id: 'frame_photo', label: 'Frame Photo', icon: <FramePhotoIcon /> },
  { id: 'frame_gif', label: 'Frame Gif', icon: <FrameGifIcon /> },
  { id: 'voucher', label: 'Voucher', icon: <VoucherIcon /> },
  { id: 'admin_users', label: 'Admin Users', icon: <KioskIcon /> },
  { id: 'audit_logs', label: 'Audit Logs', icon: <StatisticIcon /> },
  { id: 'payment_key', label: 'Payment Key', icon: <PaymentKeyIcon /> },
];

const STAFF_ALLOWED_MENUS = new Set(['gallery', 'statistic', 'transaction', 'frame_photo', 'voucher']);

function StatusBadge({ status, before }) {
  const normalized = String(status || 'unknown').toLowerCase();
  const isSuccess = ['paid', 'success', 'sent', 'completed', 'finalized', 'active'].includes(normalized);
  const isPending = ['pending', 'created', 'processing', 'queued'].includes(normalized);
  const isFailed = ['failed', 'expired', 'cancelled', 'canceled', 'error', 'inactive'].includes(normalized);
  const style = isSuccess
    ? { background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0' }
    : isPending
      ? { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
      : isFailed
        ? { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }
        : { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0.25rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.78rem',
      fontWeight: '800',
      lineHeight: 1.2,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {before ? `${before} → ` : ''}{normalized}
    </span>
  );
}

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
  const sessionsToday = sessions.filter(s => new Date(s.createdAt || s.created_at).toDateString() === today).length;

  // Simple calculation for a CSS bar chart (Sessions per day for the last 7 days)
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toDateString();
  }).reverse();

  const sessionsPerDay = last7Days.map(dateStr => {
    return {
      date: dateStr.substring(0, 3), // Mon, Tue...
      count: sessions.filter(s => new Date(s.createdAt || s.created_at).toDateString() === dateStr).length
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
  
  // UI States
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [editingFrame, setEditingFrame] = useState(null);

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

  const handleSaveText = (e) => {
    e.preventDefault();
    if (saveFrameSettings(settings)) {
      setSavedMessage('Desain Bingkai berhasil disimpan!');
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };
  const [jsonText, setJsonText] = useState('');

  useEffect(() => {
    if (viewMode === 'form' && editingFrame?.slots) {
      setJsonText(JSON.stringify(editingFrame.slots, null, 2));
    } else {
      setJsonText('[\n  {\n    "id": "photo1",\n    "x": 0,\n    "y": 0,\n    "width": 300,\n    "height": 400,\n    "borderRadius": 0,\n    "rotate": 0\n  }\n]');
    }
  }, [viewMode, editingFrame]);

  const handleSaveJson = async () => {
    if (!editingFrame || !editingFrame.url) return;
    try {
      // Validate JSON
      const parsed = JSON.parse(jsonText);
      const fileName = editingFrame.url.split('/').pop();
      const baseName = fileName.split('.')[0];
      const jsonPath = `frames/${baseName}.json`;
      
      setIsUploading(true);
      const jsonBlob = new Blob([jsonText], { type: 'application/json' });
      
      const { error } = await supabase.storage
        .from('potobox-galleries')
        .upload(jsonPath, jsonBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/json'
        });
        
      if (error) throw error;
      alert("Konfigurasi JSON berhasil disimpan!");
      await loadFrames();
    } catch (e) {
      alert("Format JSON tidak valid atau gagal menyimpan: " + e.message);
    } finally {
      setIsUploading(false);
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
        const fileName = frame.url.split('/').pop();
        const baseName = fileName.split('.')[0];
        if (fileName) {
          await supabase.storage.from('potobox-galleries').remove([
            `frames/${fileName}`,
            `frames/${baseName}.json`
          ]);
        }
      } catch (err) {
        console.error("Gagal menghapus dari storage", err);
      }
      
      await loadFrames();
      setViewMode('list');
    }
  };

  // Combine default frames and custom frames for the list
  const allFrames = [
    ...FRAMES,
    ...customFrames.map(cf => ({ ...cf, type: 'custom', tone: '#f8f9fa', accent: '#adb5bd' }))
  ];

  const filteredFrames = activeFilter === 'Semua' 
    ? allFrames 
    : allFrames.filter(f => f.type === activeFilter.toLowerCase());

  if (viewMode === 'form') {
    return (
      <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button 
            onClick={() => setViewMode('list')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: '#f97316', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer', padding: 0, marginBottom: '0.5rem' }}
          >
            <span style={{ fontSize: '1.5rem' }}>←</span> Bingkai Bawaan (Default)
          </button>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem', marginLeft: '2rem' }}>Detail bingkai photobooth ukuran panjang ke samping</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Nama</label>
            <input 
              type="text" 
              defaultValue={editingFrame?.name || ''}
              placeholder="Masukkan Nama Bingkai"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem', background: '#f8f9fa' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Kategori</label>
            <select 
              defaultValue={editingFrame?.type || 'basic'}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem', background: '#f8f9fa' }}
            >
              <option value="basic">Reguler</option>
              <option value="premium">Premium</option>
              <option value="special">Spesial</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* --- CUSTOM JSON EDITOR --- */}
        {editingFrame?.id?.startsWith('custom_') && (
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>
              <span>Figma Template JSON Config (Advanced)</span>
              <a href="#" style={{ color: '#3b82f6', textDecoration: 'none' }}>Panduan Mapping</a>
            </label>
            <div style={{ background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: '8px', padding: '1rem', position: 'relative' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#6c757d' }}>
                Jika PNG Anda dirancang di Figma dengan posisi foto spesifik, tempelkan susunan JSON <code>slots</code> di bawah ini agar sistem dapat menyinkronkan posisinya secara otomatis!
              </p>
              <textarea 
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                style={{ width: '100%', height: '200px', padding: '1rem', borderRadius: '6px', border: '1px solid #ced4da', fontFamily: 'monospace', fontSize: '0.85rem', background: '#1e1e1e', color: '#d4d4d4', resize: 'vertical' }}
              />
              <button 
                onClick={handleSaveJson}
                disabled={isUploading}
                style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
              >
                {isUploading ? 'Menyimpan...' : 'Simpan JSON Koordinat'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ background: '#fff7ed', border: '2px dashed #fed7aa', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', position: 'relative' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🖼️</div>
            <h4 style={{ margin: 0, color: '#ea580c', marginBottom: '0.5rem' }}>Thumbnail frame photobooth</h4>
            <p style={{ margin: 0, color: '#fdba74', fontSize: '0.85rem' }}>ukuran panjang ke samping</p>
            {editingFrame?.id?.startsWith('custom_') && (
               <img src={editingFrame.url} alt="thumbnail" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.2 }} />
            )}
          </div>
          <div style={{ background: '#fff7ed', border: '2px dashed #fed7aa', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', position: 'relative' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📥</div>
            <h4 style={{ margin: 0, color: '#ea580c', marginBottom: '0.5rem' }}>File mentahan frame</h4>
            <p style={{ margin: 0, color: '#fdba74', fontSize: '0.85rem' }}>ukuran panjang ke samping</p>
            {editingFrame?.id?.startsWith('custom_') && (
               <img src={editingFrame.url} alt="overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.9 }} />
            )}
            <input 
              type="file" 
              accept="image/png" 
              onChange={handleUploadFrame} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Tone Dasar</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
              <input type="color" defaultValue={editingFrame?.tone || '#ffffff'} style={{ border: 'none', width: '30px', height: '30px', padding: 0, background: 'transparent', cursor: 'pointer' }} />
              <input type="text" defaultValue={editingFrame?.tone || '#ffffff'} style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '1rem', textTransform: 'uppercase' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Aksen / Garis</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
              <input type="color" defaultValue={editingFrame?.accent || '#111827'} style={{ border: 'none', width: '30px', height: '30px', padding: 0, background: 'transparent', cursor: 'pointer' }} />
              <input type="text" defaultValue={editingFrame?.accent || '#111827'} style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '1rem', textTransform: 'uppercase' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e9ecef', paddingTop: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Status</label>
            <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span> Aktif
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {editingFrame?.id?.startsWith('custom_') && (
              <button 
                onClick={() => handleDeleteFrame(editingFrame)}
                style={{ padding: '0.8rem 2rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
              >
                Hapus
              </button>
            )}
            <button 
              onClick={() => setViewMode('list')}
              style={{ padding: '0.8rem 3rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)' }}
            >
              Simpan Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* SECTION: BINGKAI BAWAAN (DEFAULT) & KUSTOM */}
      <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111' }}>Bingkai Bawaan (Default)</h2>
            <p style={{ margin: 0, color: '#6c757d', marginTop: '0.2rem', fontSize: '0.9rem' }}>Atur dan kelola frame bawaan sistem (Default) dan kustom.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#6c757d', fontWeight: 'bold', fontSize: '0.9rem' }}>
              {['Semua', 'Premium', 'Reguler', 'Spesial', 'Custom'].map(cat => (
                <span 
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  style={{ 
                    cursor: 'pointer', 
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    background: activeFilter === cat ? '#f8f9fa' : 'transparent',
                    color: activeFilter === cat ? '#f97316' : '#6c757d'
                  }}
                >
                  {cat}
                </span>
              ))}
              <span style={{ cursor: 'pointer', padding: '0.4rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              </span>
            </div>
            <button 
              onClick={() => { setEditingFrame(null); setViewMode('form'); }}
              style={{ padding: '0.6rem 1.2rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)' }}
            >
              + Custom Frame
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem', paddingTop: '0.5rem' }}>
          {filteredFrames.map((frame, idx) => (
            <div 
              key={frame.id || idx}
              onClick={() => { setEditingFrame(frame); setViewMode('form'); }}
              className={`frame-${frame.id}`}
              style={{
                flex: '0 0 160px',
                aspectRatio: '1/2',
                background: frame.tone || '#fff',
                border: `4px solid ${frame.accent || '#ccc'}`,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {frame.id?.startsWith('custom_') ? (
                 <div style={{ width: '100%', height: '100%', backgroundImage: `url(${frame.url})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', zIndex: 5 }} />
              ) : (
                <>
                  <div style={{ width: '80%', height: '60%', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: 'rgba(0,0,0,0.3)', zIndex: 5 }}>
                    1
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center', marginTop: '0.5rem', color: frame.accent, zIndex: 5 }}>
                    {frame.name}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FramePhotoComposerTab() {
  const [frames, setFrames] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState(null);
  const [isSavingJson, setIsSavingJson] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Canvas drawing state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [frameImgObj, setFrameImgObj] = useState(null);
  const [canvasScale, setCanvasScale] = useState(1);

  // Frame base dimensions (what Figma exports at)
  const FRAME_BASE_W = 1080;
  const FRAME_BASE_H = 1920;

  useEffect(() => {
    loadFrames();
  }, []);

  const loadFrames = async () => {
    const fetched = await fetchCustomFrames();
    setFrames(fetched);
  };

  // Load frame image and draw canvas
  useEffect(() => {
    if (!selectedFrame) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setFrameImgObj(img);
    };
    img.src = selectedFrame.url;
    // Load existing slots
    if (selectedFrame.slots && Array.isArray(selectedFrame.slots)) {
      setSlots(selectedFrame.slots);
    } else {
      setSlots([]);
    }
    setSelectedSlotIdx(null);
    setPreviewDataUrl(null);
  }, [selectedFrame]);

  // Redraw canvas whenever slots or image changes
  useEffect(() => {
    drawCanvas();
  }, [slots, frameImgObj, selectedSlotIdx]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = FRAME_BASE_W / rect.width;
    const scaleY = FRAME_BASE_H / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = FRAME_BASE_W;
    canvas.height = FRAME_BASE_H;

    // Draw background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, FRAME_BASE_W, FRAME_BASE_H);

    // Draw checkerboard (to indicate transparency)
    const size = 40;
    for (let x = 0; x < FRAME_BASE_W; x += size) {
      for (let y = 0; y < FRAME_BASE_H; y += size) {
        ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#e8e8e8' : '#d0d0d0';
        ctx.fillRect(x, y, size, size);
      }
    }

    // Draw frame overlay
    if (frameImgObj) {
      ctx.drawImage(frameImgObj, 0, 0, FRAME_BASE_W, FRAME_BASE_H);
    }

    // Draw slots
    slots.forEach((slot, i) => {
      const isSelected = i === selectedSlotIdx;
      ctx.save();
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#ef4444';
      ctx.lineWidth = isSelected ? 5 : 3;
      ctx.setLineDash(isSelected ? [] : [15, 8]);
      ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);
      ctx.restore();

      // Fill with semi-transparent gray placeholder
      ctx.save();
      ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.18)' : 'rgba(200,200,200,0.35)';
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
      ctx.restore();

      // Label
      ctx.save();
      ctx.fillStyle = isSelected ? '#1d4ed8' : '#dc2626';
      ctx.font = `bold ${Math.min(slot.height * 0.25, 60)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`📷 ${i + 1}`, slot.x + slot.width / 2, slot.y + slot.height / 2);
      ctx.restore();

      // Corner handles
      if (isSelected) {
        [
          [slot.x, slot.y],
          [slot.x + slot.width, slot.y],
          [slot.x, slot.y + slot.height],
          [slot.x + slot.width, slot.y + slot.height],
        ].forEach(([hx, hy]) => {
          ctx.save();
          ctx.fillStyle = '#3b82f6';
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(hx, hy, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }
    });
  };

  const handleCanvasMouseDown = (e) => {
    const { x, y } = getCanvasCoords(e);

    // Check if clicking on an existing slot
    const clickedIdx = slots.findIndex(s =>
      x >= s.x && x <= s.x + s.width &&
      y >= s.y && y <= s.y + s.height
    );

    if (clickedIdx !== -1) {
      setSelectedSlotIdx(clickedIdx);
      setIsDrawing(false);
    } else {
      setSelectedSlotIdx(null);
      setIsDrawing(true);
      setDrawStart({ x, y });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || !drawStart) return;
    const { x, y } = getCanvasCoords(e);
    drawCanvas();
    // Draw live rectangle
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 6]);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    const rx = Math.min(x, drawStart.x);
    const ry = Math.min(y, drawStart.y);
    const rw = Math.abs(x - drawStart.x);
    const rh = Math.abs(y - drawStart.y);
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  };

  const handleCanvasMouseUp = (e) => {
    if (!isDrawing || !drawStart) return;
    const { x, y } = getCanvasCoords(e);
    const newSlot = {
      id: `photo${slots.length + 1}`,
      x: Math.round(Math.min(x, drawStart.x)),
      y: Math.round(Math.min(y, drawStart.y)),
      width: Math.round(Math.abs(x - drawStart.x)),
      height: Math.round(Math.abs(y - drawStart.y)),
      borderRadius: 0,
      rotate: 0,
    };
    if (newSlot.width > 20 && newSlot.height > 20) {
      const newSlots = [...slots, newSlot];
      setSlots(newSlots);
      setSelectedSlotIdx(newSlots.length - 1);
    }
    setIsDrawing(false);
    setDrawStart(null);
  };

  const updateSelectedSlot = (field, value) => {
    if (selectedSlotIdx === null) return;
    setSlots(prev => prev.map((s, i) =>
      i === selectedSlotIdx ? { ...s, [field]: parseInt(value) || 0 } : s
    ));
  };

  const deleteSelectedSlot = () => {
    setSlots(prev => prev.filter((_, i) => i !== selectedSlotIdx));
    setSelectedSlotIdx(null);
  };

  const handleGeneratePreview = async () => {
    if (!selectedFrame || slots.length === 0) return;
    setIsGeneratingPreview(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = FRAME_BASE_W;
      canvas.height = FRAME_BASE_H;
      const ctx = canvas.getContext('2d');

      // White background
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw dummy gradient photos in each slot
      const colors = [
        ['#667eea', '#764ba2'],
        ['#f093fb', '#f5576c'],
        ['#4facfe', '#00f2fe'],
        ['#43e97b', '#38f9d7'],
      ];
      slots.forEach((slot, i) => {
        const [c1, c2] = colors[i % colors.length];
        const gradient = ctx.createLinearGradient(slot.x, slot.y, slot.x + slot.width, slot.y + slot.height);
        gradient.addColorStop(0, c1);
        gradient.addColorStop(1, c2);
        ctx.save();
        ctx.beginPath();
        const r = slot.borderRadius || 0;
        ctx.roundRect ? ctx.roundRect(slot.x, slot.y, slot.width, slot.height, r) : ctx.rect(slot.x, slot.y, slot.width, slot.height);
        ctx.clip();
        ctx.fillStyle = gradient;
        ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${Math.min(slot.height * 0.2, 72)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`FOTO ${i + 1}`, slot.x + slot.width / 2, slot.y + slot.height / 2);
        ctx.restore();
      });

      // Draw frame overlay on top
      const overlayImg = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = selectedFrame.url;
      });
      ctx.drawImage(overlayImg, 0, 0, FRAME_BASE_W, FRAME_BASE_H);

      setPreviewDataUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      alert('Gagal membuat preview: ' + err.message);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedFrame || slots.length === 0) {
      alert('Pilih frame dan tambahkan minimal 1 slot foto terlebih dahulu.');
      return;
    }
    setIsSavingJson(true);
    try {
      const jsonData = {
        frameImage: selectedFrame.url,
        width: FRAME_BASE_W,
        height: FRAME_BASE_H,
        slots: slots.map((s, i) => ({
          id: s.id || `photo${i + 1}`,
          x: s.x, y: s.y,
          width: s.width, height: s.height,
          borderRadius: s.borderRadius || 0,
          rotate: s.rotate || 0,
        })),
      };

      const fileName = selectedFrame.url.split('/').pop();
      const baseName = fileName.split('?')[0].split('.')[0];
      const jsonPath = `frames/${baseName}.json`;
      const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });

      const { error } = await supabase.storage
        .from('potobox-galleries')
        .upload(jsonPath, jsonBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/json',
        });

      if (error) throw error;
      alert(`✅ Konfigurasi ${slots.length} slot foto berhasil disimpan untuk frame "${selectedFrame.name}"!`);
      await loadFrames();
      const updated = frames.find(f => f.id === selectedFrame.id);
      if (updated) setSelectedFrame({ ...selectedFrame, ...jsonData });
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSavingJson(false);
    }
  };

  const handleUploadNewFrame = async (e) => {
    const file = e.target.files[0];
    if (!file || !supabase) return;
    setIsUploading(true);
    try {
      const fileName = `frame_${Date.now()}.png`;
      const { error } = await supabase.storage
        .from('potobox-galleries')
        .upload(`frames/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/png',
        });
      if (error) throw error;
      await loadFrames();
      alert('✅ Frame PNG berhasil di-upload! Silakan pilih dari daftar.');
    } catch (err) {
      alert('Gagal upload: ' + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handleDeleteFrame = async (frame) => {
    if (!window.confirm(`Hapus frame "${frame.name}" beserta konfigurasinya?`)) return;
    try {
      const fileName = frame.url.split('/').pop().split('?')[0];
      const baseName = fileName.split('.')[0];
      await supabase.storage.from('potobox-galleries').remove([
        `frames/${fileName}`,
        `frames/${baseName}.json`,
      ]);
      if (selectedFrame?.id === frame.id) {
        setSelectedFrame(null);
        setSlots([]);
      }
      await loadFrames();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const selectedSlot = selectedSlotIdx !== null ? slots[selectedSlotIdx] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e9ecef', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111', fontSize: '1.4rem' }}>🖼️ Frame Photo Composition</h2>
          <p style={{ margin: '0.3rem 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Upload frame PNG, gambar area slot foto, lalu simpan konfigurasinya.</p>
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem', background: '#f97316', color: 'white', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
          {isUploading ? '⏳ Uploading...' : '+ Upload Frame PNG'}
          <input type="file" accept="image/png" style={{ display: 'none' }} onChange={handleUploadNewFrame} disabled={isUploading} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: '1.5rem', alignItems: 'start' }}>
        {/* LEFT: Frame list */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e9ecef', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#374151' }}>Daftar Frame</h3>
          {frames.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9ca3af', fontSize: '0.85rem', border: '2px dashed #e5e7eb', borderRadius: '8px' }}>
              Belum ada frame.<br />Upload PNG pertamamu!
            </div>
          ) : frames.map((frame) => (
            <div
              key={frame.id}
              onClick={() => setSelectedFrame(frame)}
              style={{
                padding: '0.75rem',
                borderRadius: '10px',
                border: selectedFrame?.id === frame.id ? '2px solid #f97316' : '1px solid #e9ecef',
                background: selectedFrame?.id === frame.id ? '#fff7ed' : '#f9fafb',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s',
              }}
            >
              <img src={frame.url} alt={frame.name} style={{ width: '48px', height: '72px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e9ecef', flexShrink: 0, background: '#e5e7eb' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', color: '#111', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{frame.name}</div>
                <div style={{ fontSize: '0.75rem', color: frame.slots ? '#10b981' : '#9ca3af', marginTop: '0.2rem' }}>
                  {frame.slots ? `✅ ${frame.slots.length} slot` : '⚠️ Belum ada slot'}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteFrame(frame); }}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem', flexShrink: 0 }}
              >🗑️</button>
            </div>
          ))}
        </div>

        {/* CENTER: Canvas mapper */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e9ecef', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!selectedFrame ? (
            <div style={{ display: 'grid', placeItems: 'center', minHeight: '400px', color: '#9ca3af', textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👈</div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Pilih frame dari daftar</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>atau upload frame PNG baru</p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#111' }}>{selectedFrame.name}</h3>
                  <p style={{ margin: '0.2rem 0 0 0', color: '#6c757d', fontSize: '0.8rem' }}>Klik dan drag di atas kanvas untuk menandai area foto</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleGeneratePreview}
                    disabled={slots.length === 0 || isGeneratingPreview}
                    style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', opacity: slots.length === 0 ? 0.5 : 1 }}
                  >
                    {isGeneratingPreview ? '⏳' : '👁 Preview'}
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    disabled={slots.length === 0 || isSavingJson}
                    style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', opacity: slots.length === 0 ? 0.5 : 1 }}
                  >
                    {isSavingJson ? '⏳ Menyimpan...' : '💾 Simpan Config'}
                  </button>
                </div>
              </div>

              <div style={{ position: 'relative', lineHeight: 0, borderRadius: '8px', overflow: 'hidden', border: '2px solid #e9ecef', cursor: isDrawing ? 'crosshair' : 'default', userSelect: 'none' }}>
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={() => { if (isDrawing) { setIsDrawing(false); setDrawStart(null); drawCanvas(); } }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f9fafb', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#6c757d' }}>
                <span>✏️ Klik & drag = Tambah slot baru</span>
                <span>•</span>
                <span>🖱️ Klik kotak = Pilih untuk edit</span>
                <span>•</span>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{slots.length} slot ditambahkan</span>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Slot editor + preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Slot editor panel */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e9ecef', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#374151' }}>
              {selectedSlot ? `Slot ${selectedSlotIdx + 1} Properties` : 'Slot Properties'}
            </h3>
            {!selectedSlot ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', padding: '1rem 0' }}>
                Pilih slot di kanvas untuk mengedit propertinya
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  { label: 'X (pixel)', field: 'x' },
                  { label: 'Y (pixel)', field: 'y' },
                  { label: 'Width (pixel)', field: 'width' },
                  { label: 'Height (pixel)', field: 'height' },
                  { label: 'Border Radius', field: 'borderRadius' },
                  { label: 'Rotate (derajat)', field: 'rotate' },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', marginBottom: '0.25rem' }}>{label}</label>
                    <input
                      type="number"
                      value={selectedSlot[field] || 0}
                      onChange={(e) => updateSelectedSlot(field, e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', background: '#f9fafb' }}
                    />
                  </div>
                ))}
                <button
                  onClick={deleteSelectedSlot}
                  style={{ marginTop: '0.5rem', padding: '0.6rem', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                >
                  🗑️ Hapus Slot Ini
                </button>
              </div>
            )}

            {slots.length > 0 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid #e9ecef', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', marginBottom: '0.5rem' }}>SEMUA SLOT</div>
                {slots.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedSlotIdx(i)}
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      background: i === selectedSlotIdx ? '#eff6ff' : 'transparent',
                      border: i === selectedSlotIdx ? '1px solid #bfdbfe' : '1px solid transparent',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: '#374151',
                      marginBottom: '0.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>📷 Slot {i + 1}</span>
                    <span style={{ color: '#9ca3af' }}>{s.width}×{s.height}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview panel */}
          {previewDataUrl && (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e9ecef', padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#374151' }}>🎉 Hasil Komposisi</h3>
              <img src={previewDataUrl} alt="preview" style={{ width: '100%', borderRadius: '8px', border: '1px solid #e9ecef' }} />
              <a
                href={previewDataUrl}
                download="frame_preview.png"
                style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', padding: '0.5rem', background: '#f0fdf4', color: '#10b981', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem', border: '1px solid #bbf7d0' }}
              >
                ⬇️ Download Preview
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionTab({ adminToken }) {
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');

  const loadPaymentLogs = async () => {
    if (!adminToken) return;
    setLogsLoading(true);
    setLogsError('');
    try {
      const logs = await backendRequest('/api/admin/payment-logs', adminToken);
      setPaymentLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      setLogsError(err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentLogs();
  }, [adminToken]);

  const paidPaymentIds = new Set();
  const totalRevenue = paymentLogs.reduce((acc, log) => {
    if ((log.statusAfter === 'paid' || log.statusAfter === 'success') && !paidPaymentIds.has(log.paymentId)) {
      paidPaymentIds.add(log.paymentId);
      return acc + Number(log.amount || 0);
    }
    return acc;
  }, 0);

  const handleClear = () => {
    if (window.confirm('Yakin ingin menghapus semua riwayat transaksi? Laporan ini tidak bisa dikembalikan.')) {
      if (clearTransactions()) {
        setPaymentLogs([]);
      }
    }
  };

  const exportPaymentLogsToCSV = () => {
    if (paymentLogs.length === 0) {
      alert('Tidak ada payment log untuk diekspor.');
      return;
    }
    const headers = ['Payment ID', 'Session ID', 'Event', 'Provider', 'Amount', 'Currency', 'Status Before', 'Status After', 'IP', 'Created At'];
    const rows = paymentLogs.map(log => [
      log.paymentId,
      log.sessionId,
      log.event,
      log.provider,
      log.amount,
      log.currency,
      log.statusBefore || '',
      log.statusAfter,
      log.ip,
      formatDateTime(log.createdAt),
    ].map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `urbanmenphoto_payment_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111' }}>Payment Logs</h2>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Estimasi pendapatan berhasil: <span style={{ color: '#10B981', fontWeight: 'bold' }}>{formatCurrency(totalRevenue)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={loadPaymentLogs} style={{ padding: '0.6rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Refresh
          </button>
          <button onClick={exportPaymentLogsToCSV} style={{ padding: '0.6rem 1rem', background: '#00e58c', color: '#111', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            ↓ Export CSV
          </button>
          <button onClick={handleClear} style={{ display: 'none', padding: '0.6rem 1rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Clear Logs
          </button>
        </div>
      </div>
      
      {logsError && (
        <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold' }}>
          {logsError}
        </div>
      )}

      {logsLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed #ced4da', borderRadius: '8px', color: '#6c757d' }}>
          Memuat payment log...
        </div>
      ) : paymentLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed #ced4da', borderRadius: '8px', color: '#6c757d' }}>
          Belum ada payment log dari backend.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e9ecef', color: '#6c757d', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem 0' }}>Payment ID</th>
                <th style={{ padding: '1rem 0' }}>Waktu</th>
                <th style={{ padding: '1rem 0' }}>Event</th>
                <th style={{ padding: '1rem 0' }}>Provider</th>
                <th style={{ padding: '1rem 0' }}>Amount</th>
                <th style={{ padding: '1rem 0' }}>Status</th>
                <th style={{ padding: '1rem 0' }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {paymentLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                  <td style={{ padding: '1rem 0', fontFamily: 'monospace', color: '#111', fontSize: '0.85rem' }}>
                    <div>{String(log.paymentId || '').slice(0, 18)}...</div>
                    <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.2rem' }}>{String(log.sessionId || '').slice(0, 18)}...</div>
                  </td>
                  <td style={{ padding: '1rem 0', color: '#495057', fontSize: '0.95rem' }}>
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td style={{ padding: '1rem 0', color: '#111', fontWeight: '700' }}>{log.event}</td>
                  <td style={{ padding: '1rem 0', color: '#495057', fontSize: '0.95rem' }}>{log.provider}</td>
                  <td style={{ padding: '1rem 0', color: '#111', fontWeight: 'bold' }}>{formatCurrency(log.amount)}</td>
                  <td style={{ padding: '1rem 0' }}>
                    <StatusBadge status={log.statusAfter} before={log.statusBefore} />
                  </td>
                  <td style={{ padding: '1rem 0', color: '#6c757d', fontSize: '0.85rem' }}>{log.ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BackendListTab({ title, description, endpoint, adminToken, columns }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRows = async () => {
    if (!adminToken) return;
    setLoading(true);
    setError('');
    try {
      const data = await backendRequest(endpoint, adminToken);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [endpoint, adminToken]);

  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111' }}>{title}</h2>
          {description && <p style={{ margin: '0.25rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>{description}</p>}
        </div>
        <button onClick={loadRows} style={{ padding: '0.6rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Refresh
        </button>
      </div>

      {error && <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed #ced4da', borderRadius: '8px', color: '#6c757d' }}>Memuat data...</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed #ced4da', borderRadius: '8px', color: '#6c757d' }}>Belum ada data.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e9ecef', color: '#6c757d', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                {columns.map(col => <th key={col.key} style={{ padding: '1rem 0.75rem' }}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id || row.tokenHash || idx} style={{ borderBottom: '1px solid #f1f3f5' }}>
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: '1rem 0.75rem', color: '#374151', fontSize: '0.9rem', verticalAlign: 'top' }}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminUsersTab({ adminToken }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', role: 'staff' });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ password: '', role: 'staff' });
  const [deletingUser, setDeletingUser] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadUsers = async () => {
    if (!adminToken) return;
    setLoading(true);
    setError('');
    try {
      const data = await backendRequest('/api/admin/users', adminToken);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [adminToken]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setForm({ email: '', password: '', role: 'staff' });
    setEditingUser(null);
    setDeletingUser(null);
    setModalMode('create');
    setError('');
    setSuccessMessage('');
  };

  const startEditUser = (user) => {
    setEditingUser(user);
    setEditForm({ password: '', role: user.role || 'staff' });
    setDeletingUser(null);
    setModalMode('edit');
    setError('');
    setSuccessMessage('');
  };

  const startDeleteUser = (user) => {
    setDeletingUser(user);
    setEditingUser(null);
    setModalMode('delete');
    setError('');
    setSuccessMessage('');
  };

  const closeUserModal = () => {
    if (saving || updating) return;
    setModalMode(null);
    setEditingUser(null);
    setDeletingUser(null);
    setEditForm({ password: '', role: 'staff' });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      await backendRequest('/api/admin/users', adminToken, {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });
      setForm({ email: '', password: '', role: 'staff' });
      setSuccessMessage('User admin berhasil ditambahkan.');
      setModalMode(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    setError('');
    setSuccessMessage('');
    try {
      const body = { role: editForm.role };
      if (editForm.password.trim()) {
        body.password = editForm.password;
      }
      await backendRequest(`/api/admin/users/${editingUser.id}`, adminToken, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setSuccessMessage(`User ${editingUser.email} berhasil diupdate.`);
      setModalMode(null);
      setEditingUser(null);
      setEditForm({ password: '', role: 'staff' });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setError('');
    setSuccessMessage('');
    try {
      await backendRequest(`/api/admin/users/${deletingUser.id}`, adminToken, { method: 'DELETE' });
      setSuccessMessage(`User ${deletingUser.email} berhasil dihapus.`);
      setModalMode(null);
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111' }}>Admin Users</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Daftar akun admin dari backend.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={openCreateModal} style={{ padding: '0.6rem 1rem', background: '#00e58c', color: '#111', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              + Tambah User
            </button>
            <button onClick={loadUsers} style={{ padding: '0.6rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Refresh
            </button>
          </div>
        </div>

        {error && !modalMode && <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', fontSize: '0.9rem' }}>{error}</div>}
        {successMessage && <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#d1fae5', color: '#047857', fontWeight: 'bold', fontSize: '0.9rem' }}>{successMessage}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>Memuat user...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9ecef', color: '#6c757d', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 0.75rem' }}>User ID</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Email</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Role</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Created</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Updated</th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                    <td style={{ padding: '1rem 0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{user.id}</td>
                    <td style={{ padding: '1rem 0.75rem', color: '#111', fontWeight: 'bold' }}>{user.email}</td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <span style={{ padding: '0.25rem 0.6rem', borderRadius: '999px', background: user.role === 'owner' ? '#dbeafe' : '#f3f4f6', color: user.role === 'owner' ? '#1d4ed8' : '#374151', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.75rem', color: '#6c757d' }}>{formatDateTime(user.createdAt)}</td>
                    <td style={{ padding: '1rem 0.75rem', color: '#6c757d' }}>{formatDateTime(user.updatedAt)}</td>
                    <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => startEditUser(user)}
                          style={{ padding: '0.45rem 0.75rem', borderRadius: '7px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => startDeleteUser(user)}
                          style={{ padding: '0.45rem 0.75rem', borderRadius: '7px', border: '1px solid #fecaca', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalMode && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(17, 24, 39, 0.55)' }}
        >
          <div style={{ width: 'min(520px, 100%)', background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 24px 70px rgba(0,0,0,0.25)', padding: '1.5rem' }}>
            {modalMode === 'create' && (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0, color: '#111' }}>Tambah Admin User</h2>
                  <p style={{ margin: '0.35rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Buat akun owner atau staff baru.</p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="staff@urbanmenphoto.com"
                      required
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Password</label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Minimal 10 karakter"
                      minLength={10}
                      required
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Role</label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem', background: 'white' }}
                    >
                      <option value="staff">Staff</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </div>

                {error && <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', fontSize: '0.9rem' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={closeUserModal} disabled={saving} style={{ padding: '0.75rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                    Batal
                  </button>
                  <button type="submit" disabled={saving} style={{ padding: '0.75rem 1rem', background: '#00e58c', color: '#111', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                    {saving ? 'Menyimpan...' : 'Tambah User'}
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'edit' && editingUser && (
              <form onSubmit={handleUpdateUser}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0, color: '#111' }}>Edit User</h2>
                  <p style={{ margin: '0.35rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>{editingUser.email}</p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Password Baru</label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(event) => setEditForm(prev => ({ ...prev, password: event.target.value }))}
                      placeholder="Kosongkan jika tidak diganti"
                      minLength={editForm.password ? 10 : undefined}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Role</label>
                    <select
                      value={editForm.role}
                      onChange={(event) => setEditForm(prev => ({ ...prev, role: event.target.value }))}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem', background: 'white' }}
                    >
                      <option value="staff">Staff</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </div>

                {error && <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', fontSize: '0.9rem' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={closeUserModal} disabled={updating} style={{ padding: '0.75rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '8px', cursor: updating ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                    Batal
                  </button>
                  <button type="submit" disabled={updating} style={{ padding: '0.75rem 1rem', background: '#111827', color: 'white', border: 'none', borderRadius: '8px', cursor: updating ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                    {updating ? 'Menyimpan...' : 'Simpan Edit'}
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'delete' && deletingUser && (
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0, color: '#111' }}>Delete User</h2>
                  <p style={{ margin: '0.35rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
                    Hapus admin user <strong>{deletingUser.email}</strong>? Tindakan ini tidak bisa dibatalkan.
                  </p>
                </div>

                {error && <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', fontSize: '0.9rem' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={closeUserModal} style={{ padding: '0.75rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Batal
                  </button>
                  <button type="button" onClick={handleDeleteUser} style={{ padding: '0.75rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Delete User
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('overview');
  
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const visibleMenuItems = adminUser?.role === 'staff'
    ? MENU_ITEMS.filter(item => STAFF_ALLOWED_MENUS.has(item.id))
    : MENU_ITEMS;

  useEffect(() => {
    if (!isAuthenticated || visibleMenuItems.some(item => item.id === activeTab)) return;
    setActiveTab(visibleMenuItems[0]?.id || 'overview');
  }, [isAuthenticated, adminUser?.role, activeTab]);

  useEffect(() => {
    const savedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    const savedUser = localStorage.getItem(ADMIN_USER_KEY);
    if (!savedToken) return;

    setAdminToken(savedToken);
    if (savedUser) {
      try {
        setAdminUser(JSON.parse(savedUser));
      } catch {
        setAdminUser(null);
      }
    }

    backendRequest('/api/admin/auth/me', savedToken)
      .then((user) => {
        setIsAuthenticated(true);
        setAdminUser(user);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
        fetchSessions(savedToken);
      })
      .catch(() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_USER_KEY);
        setAdminToken('');
        setAdminUser(null);
        setIsAuthenticated(false);
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await backendRequest('/api/admin/auth/login', null, {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });
      const token = result.token;
      const user = { email: loginEmail, role: result.role };
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
      setAdminToken(token);
      setAdminUser(user);
      setIsAuthenticated(true);
      setLoginPassword('');
      fetchSessions(token);
    } catch (err) {
      setError(err.message);
      setLoginPassword('');
    }
  };

  const handleLogout = async () => {
    const token = adminToken || localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      try {
        await backendRequest('/api/admin/auth/logout', token, { method: 'POST' });
      } catch (err) {
        console.warn('Logout request failed:', err);
      }
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    setIsAuthenticated(false);
    setAdminToken('');
    setAdminUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setSessions([]);
  };

  const fetchSessions = async (token = adminToken) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await backendRequest('/api/admin/sessions', token);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId) => {
    if (!adminToken || !window.confirm(`Hapus permanen galeri dan file untuk sesi ${sessionId}?`)) {
      return;
    }
    try {
      await backendRequest(`/api/admin/sessions/${sessionId}`, adminToken, { method: 'DELETE' });
      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (err) {
      alert('Gagal menghapus sesi: ' + err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8f9fa' }}>
        <form onSubmit={handleLogin} style={{ background: 'white', padding: '3rem', borderRadius: '16px', border: '1px solid #e9ecef', textAlign: 'center', maxWidth: '400px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ marginBottom: '0.5rem', color: '#111' }}>Admin Access</h2>
          <p style={{ color: '#6c757d', marginBottom: '2rem', fontSize: '0.9rem' }}>Login dengan akun admin backend.</p>
          
          <input 
            type="email" 
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="admin@urbanmenphoto.com"
            style={{ 
              width: '100%', padding: '0.9rem 1rem', fontSize: '1rem',
              borderRadius: '8px', border: '2px solid #e9ecef', marginBottom: '1rem' 
            }}
            autoFocus
          />
          <input 
            type="password" 
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Password"
            style={{ 
              width: '100%', padding: '0.9rem 1rem', fontSize: '1rem',
              borderRadius: '8px', border: '2px solid #e9ecef', marginBottom: '1rem' 
            }}
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
        return <TransactionTab adminToken={adminToken} />;

      case 'payments':
        return (
          <BackendListTab
            title="Payments"
            description="Status payment utama dari backend."
            endpoint="/api/admin/payments"
            adminToken={adminToken}
            columns={[
              { key: 'id', label: 'Payment ID', render: row => <span style={{ fontFamily: 'monospace' }}>{String(row.id).slice(0, 18)}...</span> },
              { key: 'sessionId', label: 'Session ID', render: row => <span style={{ fontFamily: 'monospace' }}>{String(row.sessionId).slice(0, 18)}...</span> },
              { key: 'provider', label: 'Provider' },
              { key: 'amount', label: 'Amount', render: row => formatCurrency(row.amount) },
              { key: 'status', label: 'Status', render: row => <StatusBadge status={row.status} /> },
              { key: 'createdAt', label: 'Created', render: row => formatDateTime(row.createdAt) },
            ]}
          />
        );

      case 'messages':
        return (
          <BackendListTab
            title="Delivery Messages"
            description="Log kirim link email/WhatsApp."
            endpoint="/api/admin/messages"
            adminToken={adminToken}
            columns={[
              { key: 'id', label: 'Message ID', render: row => <span style={{ fontFamily: 'monospace' }}>{String(row.id).slice(0, 18)}...</span> },
              { key: 'sessionId', label: 'Session ID', render: row => <span style={{ fontFamily: 'monospace' }}>{String(row.sessionId).slice(0, 18)}...</span> },
              { key: 'channel', label: 'Channel' },
              { key: 'recipient', label: 'Recipient' },
              { key: 'status', label: 'Status', render: row => <StatusBadge status={row.status} /> },
              { key: 'createdAt', label: 'Created', render: row => formatDateTime(row.createdAt) },
            ]}
          />
        );
        
      case 'frame_photo':
        return <FramePhotoComposerTab />;

      case 'admin_users':
        return <AdminUsersTab adminToken={adminToken} />;

      case 'audit_logs':
        return (
          <BackendListTab
            title="Audit Logs"
            description="Jejak aksi admin dan webhook."
            endpoint="/api/admin/audit-logs"
            adminToken={adminToken}
            columns={[
              { key: 'action', label: 'Action' },
              { key: 'resource', label: 'Resource' },
              { key: 'actorId', label: 'Actor', render: row => row.actorId || '-' },
              { key: 'success', label: 'Success', render: row => row.success ? 'Yes' : 'No' },
              { key: 'ip', label: 'IP' },
              { key: 'createdAt', label: 'Created', render: row => formatDateTime(row.createdAt) },
            ]}
          />
        );
      
      case 'gallery':
        return (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#111' }}>Customer Gallery Logs</h2>
              <button onClick={() => fetchSessions()} style={{ padding: '0.5rem 1rem', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', cursor: 'pointer' }}>Refresh</button>
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
                          <td style={{ padding: '1rem 0', color: '#495057', fontSize: '0.95rem' }}>{formatDateTime(s.createdAt || s.created_at)}</td>
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
                                onClick={() => deleteSession(s.id)}
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
          {adminUser && (
            <div style={{ fontSize: '0.75rem', color: '#495057', marginTop: '0.75rem', lineHeight: 1.4 }}>
              <div style={{ fontWeight: 'bold' }}>{adminUser.email}</div>
              <div style={{ color: '#868e96', textTransform: 'uppercase' }}>{adminUser.role}</div>
            </div>
          )}
        </div>
        
        <nav style={{ padding: '0 1rem', flex: 1, overflowY: 'auto' }}>
          {visibleMenuItems.map(item => {
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
            onClick={handleLogout}
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
