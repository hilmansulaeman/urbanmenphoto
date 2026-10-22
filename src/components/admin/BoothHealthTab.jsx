import { useState, useEffect } from 'react';
import { getKioskSettings, getPublicGalleryBaseUrl } from '../../utils/kioskConfig.js';
import { backendRequest, getBackendApiUrl } from '../../utils/backendApi.js';
import { listDslrCameras } from '../../utils/dslr.js';
import { HealthPill, createHealthItem } from './shared.jsx';

export default function BoothHealthTab({ adminToken }) {
  const [items, setItems] = useState([]);
  const [checking, setChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState('');

  const runChecks = async () => {
    setChecking(true);
    const nextItems = [];
    const settings = getKioskSettings();
    const activeBackendUrl = getBackendApiUrl();
    const activeFrontendUrl = (settings.publicFrontendUrl || window.location.origin).replace(/\/$/, '');
    const activeGalleryUrl = getPublicGalleryBaseUrl(settings);

    try {
      const startedAt = performance.now();
      const health = await backendRequest('/health');
      const durationMs = Math.round(performance.now() - startedAt);
      nextItems.push(createHealthItem(
        'backend',
        'Backend API',
        health?.ok ? 'ok' : 'warn',
        health?.ok ? `Backend online (${durationMs} ms).` : 'Backend merespons, tapi status health tidak OK.',
        activeBackendUrl,
      ));
    } catch (err) {
      nextItems.push(createHealthItem('backend', 'Backend API', 'fail', err.message || 'Backend tidak bisa diakses.', activeBackendUrl));
    }

    try {
      const me = await backendRequest('/api/admin/auth/me', adminToken);
      nextItems.push(createHealthItem('admin', 'Admin Session', 'ok', `Login aktif sebagai ${me?.email || 'admin'}.`, me?.role ? `Role: ${me.role}` : ''));
    } catch (err) {
      nextItems.push(createHealthItem('admin', 'Admin Session', 'fail', err.message || 'Token admin tidak valid.'));
    }

    try {
      const cameras = await listDslrCameras();
      const configured = (settings.cameraProfiles || []).filter(profile => profile.enabled);
      const missing = configured.filter(profile => !profile.tetherPort || !cameras.some(camera => camera.port === profile.tetherPort));
      const status = cameras.length === 0 ? 'fail' : (missing.length > 0 ? 'warn' : 'ok');
      const detail = cameras.length === 0
        ? 'Hardware Agent tidak mendeteksi Canon DSLR.'
        : missing.length > 0
          ? `${cameras.length} Canon DSLR terdeteksi, tetapi ${missing.length} posisi belum dipetakan.`
          : `${cameras.length} Canon DSLR terdeteksi dan semua posisi aktif siap dipotret.`;
      nextItems.push(createHealthItem('camera', 'Canon DSLR (EDSDK)', status, detail, `${configured.length} posisi aktif`));
    } catch (err) {
      nextItems.push(createHealthItem('camera', 'Canon DSLR (EDSDK)', 'fail', err.message || 'Tidak bisa membaca Hardware Agent.'));
    }

    const printStatus = settings.autoPrintEnabled
      ? (settings.printerName ? 'ok' : 'warn')
      : 'warn';
    const printDetail = settings.autoPrintEnabled
      ? settings.printerName
        ? `Auto print aktif melalui Hardware Agent ke ${settings.printerName}.`
        : 'Auto print aktif, tetapi printer belum dipilih.'
      : 'Auto print mati. Operator perlu klik PRINT PHOTO manual.';
    nextItems.push(createHealthItem('printer', 'Hardware Printer', printStatus, printDetail, settings.printerName || 'Belum dipilih'));

    try {
      const key = `booth_health_probe_${Date.now()}`;
      window.localStorage.setItem(key, 'ok');
      window.localStorage.removeItem(key);
      nextItems.push(createHealthItem('localStorage', 'Local Storage', 'ok', 'Setting booth bisa dibaca dan ditulis di browser ini.'));
    } catch (err) {
      nextItems.push(createHealthItem('localStorage', 'Local Storage', 'fail', 'Browser tidak bisa menulis localStorage. Setting booth tidak akan tersimpan.'));
    }

    try {
      const galleryKeys = Object.keys(window.localStorage).filter(key => key.startsWith('potobox_gallery_'));
      nextItems.push(createHealthItem(
        'localGallery',
        'Local Gallery Cache',
        galleryKeys.length > 20 ? 'warn' : 'ok',
        galleryKeys.length ? `${galleryKeys.length} cache gallery lokal tersimpan di browser.` : 'Tidak ada cache gallery lokal menumpuk.',
      ));
    } catch {
      nextItems.push(createHealthItem('localGallery', 'Local Gallery Cache', 'warn', 'Tidak bisa membaca jumlah cache gallery lokal.'));
    }

    const frontendHost = (() => {
      try {
        return new URL(activeFrontendUrl).hostname;
      } catch {
        return window.location.hostname;
      }
    })();
    const backendHost = (() => {
      try {
        return new URL(activeBackendUrl).hostname;
      } catch {
        return '';
      }
    })();
    const galleryHost = (() => {
      try {
        return new URL(activeGalleryUrl).hostname;
      } catch {
        return '';
      }
    })();
    const isFrontendLocal = ['localhost', '127.0.0.1', ''].includes(frontendHost);
    const isBackendLocal = ['localhost', '127.0.0.1', ''].includes(backendHost);
    const isGalleryLocal = ['localhost', '127.0.0.1', ''].includes(galleryHost);
    nextItems.push(createHealthItem(
      'network',
      'Phone / QR Network',
      isFrontendLocal || isBackendLocal || isGalleryLocal ? 'warn' : 'ok',
      isFrontendLocal || isBackendLocal || isGalleryLocal
        ? 'Masih memakai localhost/127.0.0.1. HP customer di WiFi lain tidak bisa membuka QR ini.'
        : 'Frontend/backend memakai alamat jaringan, lebih siap untuk QR dibuka dari HP.',
      `Frontend: ${activeFrontendUrl} | Gallery: ${activeGalleryUrl} | Backend: ${activeBackendUrl}`,
    ));

    setItems(nextItems);
    setLastCheckedAt(new Date().toLocaleString('id-ID'));
    setChecking(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const totals = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111' }}>Booth Health Check</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Cek kesiapan backend, kamera, printer, storage, dan QR network sebelum booth dipakai.</p>
            {lastCheckedAt && <p style={{ margin: '0.45rem 0 0', color: '#9ca3af', fontSize: '0.82rem' }}>Terakhir dicek: {lastCheckedAt}</p>}
          </div>
          <button
            type="button"
            onClick={runChecks}
            disabled={checking}
            style={{ padding: '0.75rem 1.1rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: checking ? 'wait' : 'pointer', fontWeight: 'bold' }}
          >
            {checking ? 'Checking...' : 'Run Check'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.9rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '1rem', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ color: '#166534', fontSize: '0.8rem', fontWeight: 900 }}>OK</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{totals.ok || 0}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
            <div style={{ color: '#92400e', fontSize: '0.8rem', fontWeight: 900 }}>Warning</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{totals.warn || 0}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div style={{ color: '#991b1b', fontSize: '0.8rem', fontWeight: 900 }}>Failed</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{totals.fail || 0}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.85rem' }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '180px 110px minmax(0, 1fr)', gap: '1rem', alignItems: 'center', padding: '1rem', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff' }}>
              <div style={{ fontWeight: 900, color: '#111827' }}>{item.label}</div>
              <HealthPill status={item.status} />
              <div>
                <div style={{ color: '#374151', fontWeight: 700 }}>{item.detail}</div>
                {item.meta && <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.25rem', overflowWrap: 'anywhere' }}>{item.meta}</div>}
              </div>
            </div>
          ))}
          {!items.length && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: '10px' }}>
              Klik Run Check untuk mulai cek booth.
            </div>
          )}
        </div>
      </div>

     
    </div>
  );
}
