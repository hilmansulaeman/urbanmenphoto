import { useState, useEffect } from 'react';
import { backendRequest } from '../../utils/backendApi.js';
import { formatBytes } from './shared.jsx';

export default function StorageManagementTab({ adminToken }) {
  const [stats, setStats] = useState(null);
  const [localCacheCount, setLocalCacheCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const countLocalCache = () => {
    try {
      const count = Object.keys(window.localStorage).filter(key => key.startsWith('potobox_gallery_')).length;
      setLocalCacheCount(count);
    } catch {
      setLocalCacheCount(0);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await backendRequest('/api/admin/storage', adminToken);
      setStats(data);
      countLocalCache();
    } catch (err) {
      setError(err.message || 'Gagal memuat storage stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [adminToken]);

  const handleCleanupExpired = async () => {
    setCleanupLoading(true);
    setMessage('');
    setError('');
    try {
      const result = await backendRequest('/api/admin/cleanup', adminToken, { method: 'POST' });
      setMessage(`Cleanup selesai: ${result.deletedSessions || 0} sesi dan ${result.deletedFiles || 0} file dihapus.`);
      await loadStats();
    } catch (err) {
      setError(err.message || 'Cleanup gagal.');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleClearLocalCache = () => {
    try {
      Object.keys(window.localStorage)
        .filter(key => key.startsWith('potobox_gallery_'))
        .forEach(key => window.localStorage.removeItem(key));
      countLocalCache();
      setMessage('Cache gallery lokal browser berhasil dibersihkan.');
    } catch {
      setError('Gagal membersihkan cache lokal browser.');
    }
  };

  const cards = [
    { label: 'Storage Used', value: formatBytes(stats?.storageBytes), tone: '#f97316' },
    { label: 'Storage Files', value: stats?.storageFiles ?? '-', tone: '#3b82f6' },
    { label: 'Total Sessions', value: stats?.totalSessions ?? '-', tone: '#111827' },
    { label: 'Expired Sessions', value: stats?.expiredSessions ?? '-', tone: (stats?.expiredSessions || 0) > 0 ? '#dc2626' : '#16a34a' },
    { label: 'Finalized', value: stats?.finalizedSessions ?? '-', tone: '#16a34a' },
    { label: 'Paid Not Finalized', value: stats?.paidSessions ?? '-', tone: '#ca8a04' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111' }}>Storage Management</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Pantau file hasil foto/video dan bersihkan sesi expired.</p>
          </div>
          <button
            type="button"
            onClick={loadStats}
            disabled={loading}
            style={{ padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f8f9fa', color: '#111', cursor: loading ? 'wait' : 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {message && <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontWeight: 800 }}>{message}</div>}
        {error && <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontWeight: 800 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {cards.map(card => (
            <div key={card.label} style={{ padding: '1.2rem', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#fff' }}>
              <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase' }}>{card.label}</div>
              <div style={{ color: card.tone, fontSize: '2rem', fontWeight: 900, marginTop: '0.35rem' }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '1.2rem', borderRadius: '12px', border: '1px solid #fed7aa', background: '#fff7ed' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#111827' }}>Backend Expired Cleanup</h3>
            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>Menghapus sesi yang sudah expired beserta file di backend storage. Sesi aktif tidak ikut dihapus.</p>
            <button
              type="button"
              onClick={handleCleanupExpired}
              disabled={cleanupLoading}
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: 'none', background: '#f97316', color: 'white', cursor: cleanupLoading ? 'wait' : 'pointer', fontWeight: 900 }}
            >
              {cleanupLoading ? 'Cleaning...' : `Cleanup Expired (${stats?.expiredSessions || 0})`}
            </button>
          </div>

          <div style={{ padding: '1.2rem', borderRadius: '12px', border: '1px solid #dbeafe', background: '#eff6ff' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#111827' }}>Browser Local Gallery Cache</h3>
            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>{localCacheCount} cache gallery lokal tersimpan di browser booth ini. Ini hanya fallback lokal, bukan backend gallery.</p>
            <button
              type="button"
              onClick={handleClearLocalCache}
              disabled={localCacheCount === 0}
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe', background: localCacheCount ? 'white' : '#dbeafe', color: '#1d4ed8', cursor: localCacheCount ? 'pointer' : 'not-allowed', fontWeight: 900 }}
            >
              Clear Local Cache
            </button>
          </div>
        </div>

        {stats?.storageDir && (
          <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: '10px', background: '#f8fafc', color: '#64748b', fontSize: '0.82rem', overflowWrap: 'anywhere' }}>
            Storage path: {stats.storageDir}
          </div>
        )}
      </div>
    </div>
  );
}
