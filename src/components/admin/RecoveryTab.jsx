import { useState, useEffect } from 'react';
import { getPublicGalleryBaseUrl } from '../../utils/kioskConfig.js';
import { backendRequest, formatDateTime, reportMonitoringError } from '../../utils/backendApi.js';
import { clearRecoveryHistory, getRecoveryHistory, getRecoverySession, removeRecoverySession, saveRecoverySession } from '../../utils/sessionRecovery.js';
import { StatusBadge } from './shared.jsx';

export default function RecoveryTab() {
  const getRecoveryKey = (session = {}) => session?.backendSessionId || session?.localGalleryId || session?.id || '';
  const [history, setHistory] = useState(() => getRecoveryHistory());
  const [recovery, setRecovery] = useState(() => getRecoverySession() || getRecoveryHistory()[0] || null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [isPrintActive, setIsPrintActive] = useState(false);

  useEffect(() => {
    const handleAfterPrint = () => setIsPrintActive(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const refresh = () => {
    const nextHistory = getRecoveryHistory();
    const currentKey = getRecoveryKey(recovery);
    setHistory(nextHistory);
    setRecovery(nextHistory.find(item => getRecoveryKey(item) === currentKey) || getRecoverySession() || nextHistory[0] || null);
    setMessage('');
  };

  const selectRecovery = (session) => {
    setRecovery(session);
    setMessage('');
  };

  const handleRetrySave = async () => {
    if (!recovery?.backendSessionId || !recovery?.customerToken || !recovery?.finalizePayload) {
      setMessage('Payload backend/session token tidak tersedia. Hanya bisa print ulang atau buka gallery lokal.');
      return;
    }
    setSaving(true);
    setMessage('Menyimpan ulang ke backend...');
    try {
      const finalized = await backendRequest(`/api/sessions/${recovery.backendSessionId}/finalize`, null, {
        method: 'POST',
        sessionToken: recovery.customerToken,
        body: JSON.stringify(recovery.finalizePayload),
      });
      const downloadUrl = `${getPublicGalleryBaseUrl()}/gallery/${recovery.backendSessionId}`;
      const next = {
        ...recovery,
        status: 'saved',
        error: '',
        downloadUrl,
        backendDownloadUrl: finalized?.downloadUrl || recovery.backendDownloadUrl || '',
        finalizedAt: new Date().toISOString(),
      };
      saveRecoverySession(next);
      setRecovery(next);
      setHistory(getRecoveryHistory());
      setMessage('Sesi berhasil disimpan ulang ke backend.');
    } catch (err) {
      const next = {
        ...recovery,
        status: 'failed',
        error: err.message || 'Retry save gagal.',
      };
      saveRecoverySession(next);
      setRecovery(next);
      setHistory(getRecoveryHistory());
      setMessage(next.error);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintAgain = () => {
    if (!recovery?.printImage) {
      setMessage('Tidak ada file print tersimpan untuk sesi terakhir.');
      return;
    }
    setIsPrintActive(true);
    window.setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        reportMonitoringError({
          category: 'print',
          sessionId: recovery?.backendSessionId || recovery?.id || '',
          message: err.message || 'Gagal print ulang dari recovery.',
          source: 'admin',
          metadata: {
            trigger: 'recovery_print_again',
          },
        });
      }
    }, 100);
  };

  const handleRemoveSelected = () => {
    const sessionKey = getRecoveryKey(recovery);
    if (!sessionKey) return;
    removeRecoverySession(sessionKey);
    const nextHistory = getRecoveryHistory();
    setHistory(nextHistory);
    setRecovery(nextHistory[0] || null);
    setMessage('Sesi recovery terpilih dibersihkan.');
  };

  const handleClearAll = () => {
    clearRecoveryHistory();
    setHistory([]);
    setRecovery(null);
    setMessage('Semua recovery history dibersihkan.');
  };

  const status = recovery?.status || 'idle';
  const hasBackendRetry = Boolean(recovery?.backendSessionId && recovery?.customerToken && recovery?.finalizePayload);
  const selectedKey = getRecoveryKey(recovery);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {isPrintActive && recovery?.printImage && (
        <div className="print-area">
          {recovery.printMeta && (
            <style>{`
              @page {
                size: ${recovery.printMeta.inchWidth}in ${recovery.printMeta.inchHeight}in;
                margin: 0;
              }
            `}</style>
          )}
          <img
            src={recovery.printImage}
            alt="Recovery print"
            className="print-output-image"
            style={{
              width: recovery.printMeta ? `${recovery.printMeta.inchWidth}in` : '4in',
              height: recovery.printMeta ? `${recovery.printMeta.inchHeight}in` : '6in',
            }}
          />
        </div>
      )}

      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111' }}>Session Recovery History</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Pilih beberapa sesi terakhir untuk retry save/print tanpa customer foto ulang.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={refresh} style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f8f9fa', color: '#111', cursor: 'pointer', fontWeight: 'bold' }}>
              Refresh
            </button>
            <button onClick={handleClearAll} disabled={!history.length} style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #fecaca', background: history.length ? '#fee2e2' : '#f1f5f9', color: history.length ? '#dc2626' : '#94a3b8', cursor: history.length ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
              Clear All
            </button>
          </div>
        </div>

        {message && (
          <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '10px', background: message.includes('berhasil') ? '#dcfce7' : '#fff7ed', color: message.includes('berhasil') ? '#166534' : '#9a3412', fontWeight: 800 }}>
            {message}
          </div>
        )}

        {!history.length && !recovery ? (
          <div style={{ padding: '2rem', borderRadius: '12px', border: '1px dashed #d1d5db', color: '#6b7280', textAlign: 'center' }}>
            Belum ada recovery history yang bisa dipakai di browser booth ini.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
            <div style={{ borderRadius: '14px', border: '1px solid #e5e7eb', background: '#f8fafc', overflow: 'hidden' }}>
              <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                <div style={{ fontWeight: 900, color: '#111827' }}>Sesi Terakhir</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>{history.length} sesi tersimpan di browser booth ini</div>
              </div>
              <div style={{ display: 'grid', gap: '0.65rem', padding: '0.75rem', maxHeight: '620px', overflowY: 'auto' }}>
                {history.map((session, index) => {
                  const sessionKey = getRecoveryKey(session);
                  const isSelected = sessionKey === selectedKey;
                  return (
                    <button
                      key={sessionKey || index}
                      type="button"
                      onClick={() => selectRecovery(session)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '74px minmax(0, 1fr)',
                        gap: '0.75rem',
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #f97316' : '1px solid #e5e7eb',
                        background: isSelected ? '#fff7ed' : 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 74, height: 74, borderRadius: '10px', overflow: 'hidden', background: '#e5e7eb', display: 'grid', placeItems: 'center' }}>
                        {session.printImage || session.finalImage ? (
                          <img src={session.printImage || session.finalImage} alt="Recovery thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: '#94a3b8', fontWeight: 900, fontSize: '0.75rem' }}>NO IMG</span>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 900, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {session.backendSessionId ? `#${session.backendSessionId.slice(0, 8)}` : session.localGalleryId || 'Local session'}
                          </span>
                          <StatusBadge status={session.status || 'idle'} />
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>
                          {formatDateTime(session.updatedAt || session.createdAt)}
                        </div>
                        <div style={{ color: session.error ? '#dc2626' : '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {session.error || (session.downloadUrl ? 'Gallery link tersedia' : 'Menunggu hasil')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
              <div style={{ borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden', background: '#f8fafc' }}>
                {recovery?.printImage ? (
                  <img src={recovery.printImage} alt="Selected print preview" style={{ width: '100%', display: 'block', maxHeight: '420px', objectFit: 'contain', background: 'white' }} />
                ) : (
                  <div style={{ aspectRatio: '2/3', display: 'grid', placeItems: 'center', color: '#9ca3af', fontWeight: 900 }}>No Print Preview</div>
                )}
              </div>

              <div>
                <div style={{ display: 'grid', gap: '0.85rem', marginBottom: '1.2rem' }}>
                  {[
                    ['Status', <StatusBadge status={status} />],
                    ['Session ID', recovery?.backendSessionId || recovery?.localGalleryId || '-'],
                    ['Download URL', recovery?.downloadUrl || '-'],
                    ['Created', formatDateTime(recovery?.createdAt)],
                    ['Updated', formatDateTime(recovery?.updatedAt)],
                    ['Error', recovery?.error || '-'],
                    ['Backend Retry', hasBackendRetry ? 'Available' : 'Not available'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '130px minmax(0, 1fr)', gap: '1rem', paddingBottom: '0.7rem', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ color: '#64748b', fontWeight: 900 }}>{label}</div>
                      <div style={{ color: '#111827', fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleRetrySave}
                    disabled={!hasBackendRetry || saving}
                    style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: hasBackendRetry ? '#f97316' : '#cbd5e1', color: 'white', cursor: hasBackendRetry && !saving ? 'pointer' : 'not-allowed', fontWeight: 900 }}
                  >
                    {saving ? 'Retrying...' : 'Retry Save Backend'}
                  </button>
                  <button
                    onClick={handlePrintAgain}
                    disabled={!recovery?.printImage}
                    style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', color: '#111827', cursor: recovery?.printImage ? 'pointer' : 'not-allowed', fontWeight: 900 }}
                  >
                    Print Ulang
                  </button>
                  {recovery?.downloadUrl && (
                    <button
                      onClick={() => window.open(recovery.downloadUrl, '_blank', 'noopener,noreferrer')}
                      style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontWeight: 900 }}
                    >
                      Buka Gallery
                    </button>
                  )}
                  <button
                    onClick={handleRemoveSelected}
                    disabled={!recovery}
                    style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fecaca', background: recovery ? '#fee2e2' : '#f1f5f9', color: recovery ? '#dc2626' : '#94a3b8', cursor: recovery ? 'pointer' : 'not-allowed', fontWeight: 900 }}
                  >
                    Hapus Sesi Ini
                  </button>
                </div>

                {history.length >= 8 && (
                  <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #fed7aa', background: '#fff7ed', color: '#9a3412', fontWeight: 800, fontSize: '0.85rem' }}>
                    Browser menyimpan maksimal 10 recovery session. Kalau file foto terlalu besar, history otomatis disusutkan agar sesi terbaru tetap aman.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
