import { useState, useEffect } from 'react';
import { backendRequest, formatDateTime } from '../../utils/backendApi.js';
import { AdminPagination, downloadSpreadsheet, fetchAllAdminRows, reportDateStamp } from './shared.jsx';

export default function BackendListTab({ title, description, endpoint, adminToken, columns }) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 25, totalPages: 0 });
  const [query, setQuery] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const filterKey = endpoint.includes('payments')
    ? 'status'
    : endpoint.includes('messages')
      ? 'channel'
      : endpoint.includes('audit-logs')
        ? 'action'
        : 'status';

  const loadRows = async (nextPage = pagination.page) => {
    if (!adminToken) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pagination.pageSize),
      });
      if (query.trim()) params.set('q', query.trim());
      if (filterValue.trim()) params.set(filterKey, filterValue.trim());
      const data = await backendRequest(`${endpoint}?${params.toString()}`, adminToken);
      if (Array.isArray(data)) {
        setRows(data);
        setPagination(prev => ({ ...prev, total: data.length, page: 1, totalPages: 1 }));
      } else {
        setRows(Array.isArray(data?.items) ? data.items : []);
        setPagination({
          total: Number(data?.total || 0),
          page: Number(data?.page || nextPage),
          pageSize: Number(data?.pageSize || pagination.pageSize),
          totalPages: Number(data?.totalPages || 0),
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows(1);
  }, [endpoint, adminToken, pagination.pageSize]);

  const exportCurrentList = async () => {
    if (!adminToken) return;
    setExporting(true);
    setError('');
    try {
      const params = {};
      if (query.trim()) params.q = query.trim();
      if (filterValue.trim()) params[filterKey] = filterValue.trim();
      const exportRows = await fetchAllAdminRows(endpoint, adminToken, params);
      if (!exportRows.length) {
        setError('Tidak ada data untuk diekspor.');
        return;
      }
      const exportColumns = columns.map(column => ({
        key: column.key,
        label: column.label,
        value: (row) => {
          const value = row[column.key];
          if (column.key === 'amount') return value;
          if (String(column.key).toLowerCase().includes('at')) return formatDateTime(value);
          if (typeof value === 'boolean') return value ? 'yes' : 'no';
          return value;
        },
      }));
      const name = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      downloadSpreadsheet(`urbanmenphoto_${name || 'report'}_${reportDateStamp()}.xls`, exportRows, exportColumns);
    } catch (err) {
      setError(err.message || 'Export gagal.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111' }}>{title}</h2>
          {description && <p style={{ margin: '0.25rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>{description}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') loadRows(1); }}
            placeholder="Search..."
            style={{ padding: '0.6rem 0.8rem', border: '1px solid #e9ecef', borderRadius: '6px', minWidth: '180px' }}
          />
          <input
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') loadRows(1); }}
            placeholder={`Filter ${filterKey}`}
            style={{ padding: '0.6rem 0.8rem', border: '1px solid #e9ecef', borderRadius: '6px', width: '130px' }}
          />
          <button onClick={() => loadRows(1)} style={{ padding: '0.6rem 1rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Apply
          </button>
          <button onClick={() => loadRows(pagination.page)} style={{ padding: '0.6rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Refresh
          </button>
          <button onClick={exportCurrentList} disabled={exporting} style={{ padding: '0.6rem 1rem', background: '#111827', color: 'white', border: 'none', borderRadius: '6px', cursor: exporting ? 'wait' : 'pointer', fontWeight: 'bold' }}>
            {exporting ? 'Exporting...' : 'Export XLS'}
          </button>
        </div>
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
          <AdminPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={loadRows}
            onPageSizeChange={(size) => setPagination(prev => ({ ...prev, pageSize: size, page: 1 }))}
          />
        </div>
      )}
    </div>
  );
}
