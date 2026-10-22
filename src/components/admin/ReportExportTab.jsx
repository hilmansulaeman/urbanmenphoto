import { useState } from 'react';
import { AUDIT_EXPORT_COLUMNS, MESSAGE_EXPORT_COLUMNS, PAYMENT_LOG_EXPORT_COLUMNS, SESSION_EXPORT_COLUMNS, TRANSACTION_EXPORT_COLUMNS, downloadSpreadsheet, fetchAllAdminRows, reportDateStamp } from './shared.jsx';

export default function ReportExportTab({ adminToken, adminUser }) {
  const [exportingKey, setExportingKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const reports = [
    {
      key: 'sessions',
      title: 'Customer Gallery / Session Logs',
      description: 'Semua sesi customer, link gallery, media final, GIF, dan jumlah original snaps.',
      endpoint: '/api/admin/sessions',
      filename: `urbanmenphoto_sessions_${reportDateStamp()}.xls`,
      columns: SESSION_EXPORT_COLUMNS,
    },
    {
      key: 'transactions',
      title: 'Transactions',
      description: 'Rekap transaksi dari data payment utama.',
      endpoint: '/api/admin/transactions',
      filename: `urbanmenphoto_transactions_${reportDateStamp()}.xls`,
      columns: TRANSACTION_EXPORT_COLUMNS,
    },
    {
      key: 'payment_logs',
      title: 'Payment Logs',
      description: 'Riwayat event payment, perubahan status, IP, dan provider reference.',
      endpoint: '/api/admin/payment-logs',
      filename: `urbanmenphoto_payment_logs_${reportDateStamp()}.xls`,
      columns: PAYMENT_LOG_EXPORT_COLUMNS,
    },
    {
      key: 'messages',
      title: 'Delivery Messages',
      description: 'Log pengiriman link gallery via WhatsApp/email.',
      endpoint: '/api/admin/messages',
      filename: `urbanmenphoto_messages_${reportDateStamp()}.xls`,
      columns: MESSAGE_EXPORT_COLUMNS,
    },
    {
      key: 'audit',
      title: 'Audit Activity',
      description: 'Jejak aksi admin, customer session, dan webhook backend.',
      endpoint: '/api/admin/audit-logs',
      filename: `urbanmenphoto_audit_logs_${reportDateStamp()}.xls`,
      columns: AUDIT_EXPORT_COLUMNS,
      ownerOnly: true,
    },
  ].filter(report => !report.ownerOnly || adminUser?.role === 'owner');

  const exportReport = async (report) => {
    setExportingKey(report.key);
    setMessage('');
    setError('');
    try {
      const rows = await fetchAllAdminRows(report.endpoint, adminToken);
      if (!rows.length) {
        setMessage(`${report.title}: tidak ada data untuk diekspor.`);
        return;
      }
      downloadSpreadsheet(report.filename, rows, report.columns);
      setMessage(`${report.title}: ${rows.length} data berhasil diekspor.`);
    } catch (err) {
      setError(`${report.title}: ${err.message || 'Export gagal.'}`);
    } finally {
      setExportingKey('');
    }
  };

  const exportEventBundle = async () => {
    setExportingKey('bundle');
    setMessage('');
    setError('');
    try {
      const sessionRows = await fetchAllAdminRows('/api/admin/sessions', adminToken);
      const transactionRows = await fetchAllAdminRows('/api/admin/transactions', adminToken);
      const paymentLogRows = await fetchAllAdminRows('/api/admin/payment-logs', adminToken);
      downloadSpreadsheet(`urbanmenphoto_sessions_${reportDateStamp()}.xls`, sessionRows, SESSION_EXPORT_COLUMNS);
      downloadSpreadsheet(`urbanmenphoto_transactions_${reportDateStamp()}.xls`, transactionRows, TRANSACTION_EXPORT_COLUMNS);
      downloadSpreadsheet(`urbanmenphoto_payment_logs_${reportDateStamp()}.xls`, paymentLogRows, PAYMENT_LOG_EXPORT_COLUMNS);
      setMessage(`Bundle rekap event berhasil diekspor: ${sessionRows.length} sessions, ${transactionRows.length} transactions, ${paymentLogRows.length} payment logs.`);
    } catch (err) {
      setError(err.message || 'Export bundle gagal.');
    } finally {
      setExportingKey('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111' }}>Export Report</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Download XLS untuk rekap event, transaksi, gallery, dan audit.</p>
          </div>
          <button
            type="button"
            onClick={exportEventBundle}
            disabled={Boolean(exportingKey)}
            style={{ padding: '0.75rem 1.1rem', background: '#111827', color: 'white', border: 'none', borderRadius: '8px', cursor: exportingKey ? 'wait' : 'pointer', fontWeight: 'bold' }}
          >
            {exportingKey === 'bundle' ? 'Exporting...' : 'Export Bundle Event'}
          </button>
        </div>

        {message && <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontWeight: 800 }}>{message}</div>}
        {error && <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', fontWeight: 800 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {reports.map(report => (
            <div key={report.key} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.1rem', background: '#fff' }}>
              <div style={{ minHeight: '90px' }}>
                <h3 style={{ margin: '0 0 0.45rem', color: '#111827', fontSize: '1rem' }}>{report.title}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.45 }}>{report.description}</p>
              </div>
              <button
                type="button"
                onClick={() => exportReport(report)}
                disabled={Boolean(exportingKey)}
                style={{ width: '100%', marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: '#f97316', color: 'white', cursor: exportingKey ? 'wait' : 'pointer', fontWeight: 900 }}
              >
                {exportingKey === report.key ? 'Exporting...' : 'Download XLS'}
              </button>
            </div>
          ))}
        </div>

        {adminUser?.role !== 'owner' && (
          <div style={{ marginTop: '1.2rem', padding: '0.9rem 1rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e5e7eb', color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Staff bisa export rekap operasional. Audit activity penuh, payment key, storage, dan admin users tetap khusus owner.
          </div>
        )}
      </div>
    </div>
  );
}
