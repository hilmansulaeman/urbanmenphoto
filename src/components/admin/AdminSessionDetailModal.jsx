import { formatDateTime } from '../../utils/backendApi.js';
import { DetailList } from './shared.jsx';

export default function AdminSessionDetailModal({ detail, loading, error, onClose }) {
  const session = detail?.session || {};
  const images = [
    session.animatedImage?.url,
    session.finalImage?.url,
    session.printImage?.url,
    ...(session.images || []),
  ].filter(Boolean);
  const payments = detail?.payments || [];
  const messages = detail?.messages || [];
  const auditLogs = detail?.auditLogs || [];

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(17, 24, 39, 0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: 'min(1100px, 100%)', maxHeight: '88vh', overflowY: 'auto', background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 24px 70px rgba(0,0,0,0.25)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111' }}>Session Detail</h2>
            <p style={{ margin: '0.35rem 0 0', color: '#6c757d', fontFamily: 'monospace', fontSize: '0.9rem' }}>{session.id || '-'}</p>
          </div>
          <button onClick={onClose} style={{ padding: '0.55rem 0.85rem', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6c757d' }}>Memuat detail...</div>
        ) : error ? (
          <div style={{ padding: '1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold' }}>{error}</div>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.9rem' }}>
              {[
                ['Status', session.status],
                ['Created', formatDateTime(session.createdAt)],
                ['Expires', formatDateTime(session.expiresAt)],
                ['Download', session.downloadUrl],
              ].map(([label, value]) => (
                <div key={label} style={{ border: '1px solid #e9ecef', borderRadius: '10px', padding: '0.9rem', background: '#f8f9fa' }}>
                  <div style={{ color: '#6c757d', fontSize: '0.76rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{label}</div>
                  <div style={{ color: '#111827', fontWeight: '800', overflowWrap: 'anywhere' }}>{value || '-'}</div>
                </div>
              ))}
            </div>

            <section>
              <h3 style={{ margin: '0 0 0.75rem', color: '#111' }}>Media</h3>
              {images.length === 0 ? (
                <div style={{ padding: '1rem', borderRadius: '8px', border: '1px dashed #ced4da', color: '#6c757d' }}>Belum ada media.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                  {images.map((url, index) => (
                    <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" style={{ display: 'block', border: '1px solid #e9ecef', borderRadius: '10px', overflow: 'hidden', background: '#f8f9fa', textDecoration: 'none' }}>
                      <img src={url} alt={`Session media ${index + 1}`} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '0.5rem', color: '#374151', fontSize: '0.78rem', fontWeight: '800' }}>{url.includes('.gif') ? 'GIF' : `Image ${index + 1}`}</div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <DetailList title="Payments" rows={payments} columns={['provider', 'amount', 'status', 'createdAt']} />
              <DetailList title="Messages" rows={messages} columns={['channel', 'recipient', 'status', 'createdAt']} />
              <DetailList title="Activity" rows={auditLogs} columns={['action', 'success', 'createdAt']} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
