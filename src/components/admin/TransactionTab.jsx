import { useState, useEffect } from 'react';
import { clearTransactions } from '../../utils/transactionLogger.js';
import { backendRequest, formatCurrency, formatDateTime } from '../../utils/backendApi.js';
import { AdminPagination, StatusBadge, downloadSpreadsheet } from './shared.jsx';

export default function TransactionTab({ adminToken }) {
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  const filteredLogs = paymentLogs.filter(log => statusFilter === 'ALL' || (log.statusAfter || '').toLowerCase() === statusFilter.toLowerCase());

  const paidPaymentIds = new Set();
  const totalRevenue = filteredLogs.reduce((acc, log) => {
    if ((log.statusAfter === 'paid' || log.statusAfter === 'success') && !paidPaymentIds.has(log.paymentId)) {
      paidPaymentIds.add(log.paymentId);
      return acc + Number(log.amount || 0);
    }
    return acc;
  }, 0);
  const transactionTotalPages = Math.max(1, Math.ceil(filteredLogs.length / transactionPageSize));
  const transactionStartIndex = (transactionPage - 1) * transactionPageSize;
  const paginatedPaymentLogs = filteredLogs.slice(transactionStartIndex, transactionStartIndex + transactionPageSize);

  useEffect(() => {
    if (transactionPage > transactionTotalPages) {
      setTransactionPage(transactionTotalPages);
    }
  }, [transactionPage, transactionTotalPages]);

  const handleClear = () => {
    if (window.confirm('Yakin ingin menghapus semua riwayat transaksi? Laporan ini tidak bisa dikembalikan.')) {
      if (clearTransactions()) {
        setPaymentLogs([]);
      }
    }
  };

  const exportPaymentLogsToXLS = () => {
    if (paymentLogs.length === 0) {
      alert('Tidak ada payment log untuk diekspor.');
      return;
    }
    downloadSpreadsheet(`urbanmenphoto_payment_logs_${new Date().toISOString().split('T')[0]}.xls`, paymentLogs, [
      { key: 'paymentId', label: 'Payment ID' },
      { key: 'sessionId', label: 'Session ID' },
      { key: 'event', label: 'Event' },
      { key: 'provider', label: 'Provider' },
      { key: 'amount', label: 'Amount' },
      { key: 'currency', label: 'Currency' },
      { key: 'statusBefore', label: 'Status Before', value: row => row.statusBefore || '' },
      { key: 'statusAfter', label: 'Status After' },
      { key: 'ip', label: 'IP' },
      { key: 'createdAt', label: 'Created At', value: row => formatDateTime(row.createdAt) },
    ]);
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setTransactionPage(1); }}
            style={{ height: '42px', padding: '0 1rem', borderRadius: '6px', border: '1px solid #e9ecef', background: '#f8f9fa', fontSize: '0.9rem', color: '#111', fontWeight: 'bold', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="ALL">Semua Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <button onClick={loadPaymentLogs} style={{ height: '42px', padding: '0 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxSizing: 'border-box' }}>
            Refresh
          </button>
          <button onClick={exportPaymentLogsToXLS} style={{ height: '42px', padding: '0 1rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxSizing: 'border-box' }}>
            ↓ Export XLS
          </button>
          <button onClick={handleClear} style={{ display: 'none', height: '42px', padding: '0 1rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxSizing: 'border-box' }}>
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
      ) : filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed #ced4da', borderRadius: '8px', color: '#6c757d' }}>
          Belum ada payment log yang sesuai filter.
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
              {paginatedPaymentLogs.map((log) => (
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
          <AdminPagination
            page={transactionPage}
            totalPages={transactionTotalPages}
            pageSize={transactionPageSize}
            total={filteredLogs.length}
            onPageChange={setTransactionPage}
            onPageSizeChange={(size) => {
              setTransactionPageSize(size);
              setTransactionPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
