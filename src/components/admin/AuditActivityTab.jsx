import { useState, useEffect } from 'react';
import { backendRequest, formatDateTime } from '../../utils/backendApi.js';
import { AUDIT_EXPORT_COLUMNS, AdminPagination, AuditMetadataDetails, StatusBadge, auditAreaStyle, describeAuditAction, downloadSpreadsheet, fetchAllAdminRows, reportDateStamp } from './shared.jsx';

export default function AuditActivityTab({ adminToken }) {
  const [logs, setLogs] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    actor: '',
    action: '',
    success: '',
    query: '',
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  const actorMap = adminUsers.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});

  const loadAuditLogs = async () => {
    if (!adminToken) return;
    setLoading(true);
    setError('');
    try {
      const rows = await fetchAllAdminRows('/api/admin/audit-logs', adminToken);
      setLogs(rows);
      try {
        const users = await backendRequest('/api/admin/users', adminToken);
        setAdminUsers(Array.isArray(users) ? users : []);
      } catch {
        setAdminUsers([]);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [adminToken]);

  const actionOptions = Array.from(new Set(logs.map(log => log.action).filter(Boolean))).sort();
  const actorOptions = Array.from(new Set(logs.map(log => log.actorId || 'system').filter(Boolean)));

  const filteredLogs = logs.filter((log) => {
    const createdDate = log.createdAt ? new Date(log.createdAt) : null;
    if (filters.dateFrom && createdDate && createdDate < new Date(`${filters.dateFrom}T00:00:00`)) return false;
    if (filters.dateTo && createdDate && createdDate > new Date(`${filters.dateTo}T23:59:59`)) return false;
    if (filters.actor) {
      const actorValue = log.actorId || 'system';
      if (actorValue !== filters.actor) return false;
    }
    if (filters.action && log.action !== filters.action) return false;
    if (filters.success && String(Boolean(log.success)) !== filters.success) return false;
    if (filters.query.trim()) {
      const haystack = [
        log.id,
        log.actorId,
        actorMap[log.actorId]?.email,
        actorMap[log.actorId]?.role,
        log.action,
        log.resource,
        log.ip,
        log.userAgent,
        log.metadata ? JSON.stringify(log.metadata) : '',
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(filters.query.trim().toLowerCase())) return false;
    }
    return true;
  });

  const totals = filteredLogs.reduce((acc, log) => {
    acc.total += 1;
    if (log.success) acc.success += 1;
    else acc.failed += 1;
    const area = String(log.action || 'system').split('.')[0] || 'system';
    acc.areas[area] = (acc.areas[area] || 0) + 1;
    return acc;
  }, { total: 0, success: 0, failed: 0, areas: {} });
  const auditTotalPages = Math.max(1, Math.ceil(filteredLogs.length / auditPageSize));
  const auditStartIndex = (auditPage - 1) * auditPageSize;
  const paginatedLogs = filteredLogs.slice(auditStartIndex, auditStartIndex + auditPageSize);

  useEffect(() => {
    if (auditPage > auditTotalPages) {
      setAuditPage(auditTotalPages);
    }
  }, [auditPage, auditTotalPages]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setAuditPage(1);
  };

  const resetFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', actor: '', action: '', success: '', query: '' });
    setAuditPage(1);
  };

  const exportFiltered = async () => {
    setExporting(true);
    setError('');
    try {
      if (!filteredLogs.length) {
        setError('Tidak ada audit log untuk diekspor.');
        return;
      }
      downloadSpreadsheet(`urbanmenphoto_audit_filtered_${reportDateStamp()}.xls`, filteredLogs, [
        ...AUDIT_EXPORT_COLUMNS,
        { key: 'actorEmail', label: 'Actor Email', value: row => actorMap[row.actorId]?.email || (row.actorId ? row.actorId : 'system/customer') },
        { key: 'actorRole', label: 'Actor Role', value: row => actorMap[row.actorId]?.role || (row.actorId ? '-' : 'system/customer') },
        { key: 'description', label: 'Readable Detail', value: row => describeAuditAction(row.action) },
      ]);
    } finally {
      setExporting(false);
    }
  };

  const selectedActor = selectedLog ? actorMap[selectedLog.actorId] : null;
  const auditPaginationControls = filteredLogs.length > 0 && (
    <AdminPagination
      page={auditPage}
      totalPages={auditTotalPages}
      pageSize={auditPageSize}
      total={filteredLogs.length}
      onPageChange={setAuditPage}
      onPageSizeChange={(size) => {
        setAuditPageSize(size);
        setAuditPage(1);
      }}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111' }}>Audit Activity</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Filter jejak aktivitas admin/operator, customer, dan backend event.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={loadAuditLogs} disabled={loading} style={{ padding: '0.65rem 1rem', background: '#f8f9fa', color: '#111827', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: loading ? 'wait' : 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={exportFiltered} disabled={exporting || loading} style={{ padding: '0.65rem 1rem', background: '#111827', color: 'white', border: 'none', borderRadius: '8px', cursor: exporting ? 'wait' : 'pointer', fontWeight: 'bold' }}>
              {exporting ? 'Exporting...' : 'Export Filtered XLS'}
            </button>
          </div>
        </div>

        {error && <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', fontWeight: 800 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 900 }}>Total Filtered</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900 }}>{totals.total}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ color: '#166534', fontSize: '0.78rem', fontWeight: 900 }}>Success</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900 }}>{totals.success}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div style={{ color: '#991b1b', fontSize: '0.78rem', fontWeight: 900 }}>Failed</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900 }}>{totals.failed}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', padding: '1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
          <input type="date" value={filters.dateFrom} onChange={event => handleFilterChange('dateFrom', event.target.value)} style={{ padding: '0.7rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
          <input type="date" value={filters.dateTo} onChange={event => handleFilterChange('dateTo', event.target.value)} style={{ padding: '0.7rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
          <select value={filters.actor} onChange={event => handleFilterChange('actor', event.target.value)} style={{ padding: '0.7rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white' }}>
            <option value="">Semua admin/operator</option>
            {actorOptions.map(actorId => {
              const user = actorMap[actorId];
              return <option key={actorId} value={actorId}>{actorId === 'system' ? 'System / customer' : `${user?.email || actorId} (${user?.role || 'admin'})`}</option>;
            })}
          </select>
          <select value={filters.action} onChange={event => handleFilterChange('action', event.target.value)} style={{ padding: '0.7rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white' }}>
            <option value="">Semua event/action</option>
            {actionOptions.map(action => <option key={action} value={action}>{action}</option>)}
          </select>
          <select value={filters.success} onChange={event => handleFilterChange('success', event.target.value)} style={{ padding: '0.7rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white' }}>
            <option value="">Semua status</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
          <input value={filters.query} onChange={event => handleFilterChange('query', event.target.value)} placeholder="Cari resource, IP, email..." style={{ padding: '0.7rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
          <button type="button" onClick={resetFilters} style={{ padding: '0.7rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white', color: '#111827', cursor: 'pointer', fontWeight: 900 }}>
            Reset Filter
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed #ced4da', borderRadius: '8px', color: '#6c757d' }}>Memuat audit logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed #ced4da', borderRadius: '8px', color: '#6c757d' }}>Tidak ada audit log yang cocok dengan filter.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '1rem', alignItems: 'start' }}>
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {paginatedLogs.map(log => {
                  const actor = actorMap[log.actorId];
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <button
                      key={log.id}
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      style={{ width: '100%', textAlign: 'left', display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr) 96px', gap: '1rem', alignItems: 'center', padding: '0.95rem', borderRadius: '12px', border: isSelected ? '2px solid #f97316' : '1px solid #e5e7eb', background: isSelected ? '#fff7ed' : 'white', cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ color: '#111827', fontWeight: 900 }}>{formatDateTime(log.createdAt)}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 800, marginTop: '0.2rem' }}>{log.ip || '-'}</div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 900, ...auditAreaStyle(log.action) }}>{String(log.action || 'system').split('.')[0]}</span>
                          <span style={{ color: '#111827', fontWeight: 900 }}>{log.action}</span>
                        </div>
                        <div style={{ color: '#475569', fontSize: '0.86rem', fontWeight: 700, overflowWrap: 'anywhere' }}>{describeAuditAction(log.action)}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.25rem', overflowWrap: 'anywhere' }}>
                          {actor?.email || log.actorId || 'System / customer'} · {log.resource || '-'}
                        </div>
                      </div>
                      <StatusBadge status={log.success ? 'success' : 'failed'} />
                    </button>
                  );
                })}
              </div>

              <aside style={{ position: 'sticky', top: 0, border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fff', padding: '1rem' }}>
                {!selectedLog ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem 1rem', fontWeight: 800 }}>Pilih audit log untuk melihat detail.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 900, textTransform: 'uppercase' }}>Detail Perubahan</div>
                      <h3 style={{ margin: '0.3rem 0 0', color: '#111827', lineHeight: 1.25 }}>{describeAuditAction(selectedLog.action)}</h3>
                    </div>
                    {[
                      ['Event / Action', selectedLog.action],
                      ['Status', selectedLog.success ? 'Success' : 'Failed'],
                      ['Actor', selectedActor?.email || selectedLog.actorId || 'System / customer'],
                      ['Role', selectedActor?.role || (selectedLog.actorId ? '-' : 'system/customer')],
                      ['Resource', selectedLog.resource || '-'],
                      ['IP Address', selectedLog.ip || '-'],
                      ['Waktu', formatDateTime(selectedLog.createdAt)],
                      ['Audit ID', selectedLog.id],
                    ].map(([label, value]) => (
                      <div key={label} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
                        <div style={{ color: '#111827', fontWeight: 800, overflowWrap: 'anywhere' }}>{value}</div>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.25rem' }}>User Agent</div>
                      <div style={{ color: '#475569', fontSize: '0.78rem', lineHeight: 1.45, overflowWrap: 'anywhere' }}>{selectedLog.userAgent || '-'}</div>
                    </div>
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Metadata / Field Changes</div>
                      <AuditMetadataDetails metadata={selectedLog.metadata} />
                    </div>
                  </div>
                )}
              </aside>
            </div>
            {auditPaginationControls}
          </>
        )}
      </div>
    </div>
  );
}
