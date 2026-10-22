import { backendRequest, formatCurrency, formatDateTime } from '../../utils/backendApi.js';

export const ADMIN_TOKEN_KEY = 'urbanmenphoto_admin_token';

export const ADMIN_USER_KEY = 'urbanmenphoto_admin_user';

export const ADMIN_EXPIRES_KEY = 'urbanmenphoto_admin_expires_at';

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

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6" />
  </svg>
);

const SubscriptionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M8 2v4M16 2v4M7 11h10M7 16h5" />
  </svg>
);

export const MENU_ITEMS = [
  { id: 'overview', label: 'Overview', icon: <OverviewIcon /> },
  { id: 'projects', label: 'Proyek', icon: <OverviewIcon /> },
  { id: 'kiosk', label: 'Kiosk', icon: <KioskIcon /> },
  { id: 'booth_health', label: 'Booth Health', icon: <StatisticIcon /> },
  { id: 'filters', label: 'Filters', icon: <StatisticIcon /> },
  { id: 'recovery', label: 'Recovery', icon: <TransactionIcon /> },
  { id: 'storage', label: 'Storage', icon: <GalleryIcon /> },
  { id: 'gallery', label: 'Gallery', icon: <GalleryIcon /> },
  { id: 'reports', label: 'Reports', icon: <StatisticIcon /> },
  { id: 'statistic', label: 'Statistic', icon: <StatisticIcon /> },
  { id: 'transaction', label: 'Transaction', icon: <TransactionIcon /> },
  { id: 'payments', label: 'Payments', icon: <PaymentKeyIcon /> },
  { id: 'messages', label: 'Messages', icon: <GalleryIcon /> },
  { id: 'frame_photo', label: 'Frame Photo', icon: <FramePhotoIcon /> },
  { id: 'frame_gif', label: 'Frame Gif', icon: <FrameGifIcon /> },
  { id: 'voucher', label: 'Voucher', icon: <VoucherIcon /> },
  { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
  { id: 'subscription', label: 'Subscription', icon: <SubscriptionIcon /> },
  { id: 'wallet', label: 'Dompet', icon: <PaymentKeyIcon /> },
  { id: 'admin_users', label: 'Admin Users', icon: <KioskIcon /> },
  { id: 'audit_logs', label: 'Audit Logs', icon: <StatisticIcon /> },
  { id: 'payment_key', label: 'Payment Key', icon: <PaymentKeyIcon /> },
];

export const STAFF_ALLOWED_MENUS = new Set(['profile', 'booth_health', 'filters', 'recovery', 'gallery', 'reports', 'statistic', 'transaction', 'payments', 'messages', 'frame_photo']);

export const getAdminTabFromPath = () => {
  const section = window.location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
  if (section === 'kiosk-settings') return 'kiosk';
  return MENU_ITEMS.some(item => item.id === section) ? section : 'overview';
};

export const getAdminPath = (tab) => (tab === 'overview' ? '/admin' : `/admin/${tab}`);

const spreadsheetEscape = (value) => {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  const normalized = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const getNestedValue = (row, path) => {
  if (!path) return '';
  return String(path).split('.').reduce((value, key) => value?.[key], row);
};

const buildSpreadsheetHTML = (rows = [], columns = []) => {
  const headers = columns.map(column => `<th>${spreadsheetEscape(column.label || column.key)}</th>`).join('');
  const body = rows.map(row => `<tr>${columns.map(column => {
    const value = column.value ? column.value(row) : getNestedValue(row, column.key);
    return `<td>${spreadsheetEscape(value)}</td>`;
  }).join('')}</tr>`).join('');
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <table border="1">
      <thead><tr>${headers}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body>
</html>`;
};

const toSpreadsheetFilename = (filename = 'urbanmenphoto_report.xls') => (
  String(filename).replace(/\.(csv|xlsx?)$/i, '') + '.xls'
);

export const downloadSpreadsheet = (filename, rows = [], columns = []) => {
  const html = buildSpreadsheetHTML(rows, columns);
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = toSpreadsheetFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const reportDateStamp = () => new Date().toISOString().slice(0, 10);

export const fetchAllAdminRows = async (endpoint, adminToken, extraParams = {}) => {
  const rows = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '100',
      ...extraParams,
    });
    const separator = endpoint.includes('?') ? '&' : '?';
    const data = await backendRequest(`${endpoint}${separator}${params.toString()}`, adminToken);
    if (Array.isArray(data)) return data;

    const items = Array.isArray(data?.items) ? data.items : [];
    rows.push(...items);
    totalPages = Number(data?.totalPages || 1);
    page += 1;
  } while (page <= totalPages);

  return rows;
};

export const SESSION_EXPORT_COLUMNS = [
  { key: 'id', label: 'Session ID' },
  { key: 'shortCode', label: 'Short Code' },
  { key: 'status', label: 'Status' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'layoutId', label: 'Layout' },
  { key: 'paperSize', label: 'Paper Size' },
  { key: 'frameId', label: 'Frame' },
  { key: 'downloadUrl', label: 'Download URL' },
  { key: 'finalImage.url', label: 'Final Image' },
  { key: 'printImage.url', label: 'Print Image' },
  { key: 'animatedImage.url', label: 'Animated Image' },
  { key: 'images', label: 'Original Count', value: row => Array.isArray(row.images) ? row.images.length : 0 },
  { key: 'createdAt', label: 'Created At', value: row => formatDateTime(row.createdAt) },
  { key: 'updatedAt', label: 'Updated At', value: row => formatDateTime(row.updatedAt) },
  { key: 'expiresAt', label: 'Expires At', value: row => formatDateTime(row.expiresAt) },
];

export const TRANSACTION_EXPORT_COLUMNS = [
  { key: 'id', label: 'Transaction ID' },
  { key: 'sessionId', label: 'Session ID' },
  { key: 'provider', label: 'Provider' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created At', value: row => formatDateTime(row.createdAt) },
];

export const PAYMENT_LOG_EXPORT_COLUMNS = [
  { key: 'id', label: 'Log ID' },
  { key: 'paymentId', label: 'Payment ID' },
  { key: 'sessionId', label: 'Session ID' },
  { key: 'event', label: 'Event' },
  { key: 'provider', label: 'Provider' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'statusBefore', label: 'Status Before' },
  { key: 'statusAfter', label: 'Status After' },
  { key: 'providerRef', label: 'Provider Ref' },
  { key: 'ip', label: 'IP' },
  { key: 'userAgent', label: 'User Agent' },
  { key: 'createdAt', label: 'Created At', value: row => formatDateTime(row.createdAt) },
];

export const MESSAGE_EXPORT_COLUMNS = [
  { key: 'id', label: 'Message ID' },
  { key: 'sessionId', label: 'Session ID' },
  { key: 'channel', label: 'Channel' },
  { key: 'recipient', label: 'Recipient' },
  { key: 'downloadUrl', label: 'Download URL' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created At', value: row => formatDateTime(row.createdAt) },
];

export const AUDIT_EXPORT_COLUMNS = [
  { key: 'id', label: 'Audit ID' },
  { key: 'actorId', label: 'Actor ID' },
  { key: 'action', label: 'Action' },
  { key: 'resource', label: 'Resource' },
  { key: 'metadata', label: 'Metadata', value: row => row.metadata ? JSON.stringify(row.metadata) : '' },
  { key: 'ip', label: 'IP' },
  { key: 'userAgent', label: 'User Agent' },
  { key: 'success', label: 'Success', value: row => row.success ? 'yes' : 'no' },
  { key: 'createdAt', label: 'Created At', value: row => formatDateTime(row.createdAt) },
];

export function StatusBadge({ status, before }) {
  const normalized = String(status || 'unknown').toLowerCase();
  const isSuccess = ['paid', 'success', 'sent', 'completed', 'finalized', 'active', 'saved', 'local'].includes(normalized);
  const isPending = ['pending', 'created', 'processing', 'queued', 'waiting', 'saving'].includes(normalized);
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
      {normalized === 'paid' ? 'Success Paid' : `${before ? `${before} → ` : ''}${normalized}`}
    </span>
  );
}

const getPaginationItems = (currentPage, totalPages) => {
  const total = Math.max(1, Number(totalPages || 1));
  const current = Math.min(Math.max(1, Number(currentPage || 1)), total);
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, 'ellipsis', total];
  if (current >= total - 2) return [1, 'ellipsis', total - 2, total - 1, total];
  return [1, 'ellipsis-left', current, 'ellipsis-right', total];
};

export function AdminPagination({ page, totalPages, pageSize, total, onPageChange, onPageSizeChange }) {
  const safeTotal = Math.max(0, Number(total || 0));
  const safePageSize = Math.max(1, Number(pageSize || 10));
  const safeTotalPages = Math.max(1, Number(totalPages || Math.ceil(safeTotal / safePageSize) || 1));
  const safePage = Math.min(Math.max(1, Number(page || 1)), safeTotalPages);
  const start = safeTotal ? ((safePage - 1) * safePageSize) + 1 : 0;
  const end = Math.min(safeTotal, safePage * safePageSize);
  const canPrev = safePage > 1;
  const canNext = safePage < safeTotalPages;

  const navButtonStyle = (disabled = false) => ({
    border: 'none',
    background: 'transparent',
    color: disabled ? '#cbd5e1' : '#64748b',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 900,
    fontSize: '0.82rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.35rem 0.25rem',
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem', padding: '0.9rem 0', color: '#64748b', fontSize: '0.82rem', fontWeight: 900 }}>
      <div>
        Menampilkan {start}-{end} dari {safeTotal}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => canPrev && onPageChange(safePage - 1)}
          disabled={!canPrev}
          style={navButtonStyle(!canPrev)}
        >
          <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>&lt;</span> Prev
        </button>
        {getPaginationItems(safePage, safeTotalPages).map((item, index) => {
          const isEllipsis = String(item).startsWith('ellipsis');
          const isActive = item === safePage;
          if (isEllipsis) {
            return (
              <span key={`${item}-${index}`} style={{ width: '24px', height: '24px', borderRadius: '999px', background: '#f1f5f9', color: '#94a3b8', display: 'inline-grid', placeItems: 'center', fontWeight: 900 }}>
                ...
              </span>
            );
          }
          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '999px',
                border: 'none',
                background: isActive ? '#f97316' : '#f1f5f9',
                color: isActive ? 'white' : '#64748b',
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: '0.78rem',
                display: 'inline-grid',
                placeItems: 'center',
              }}
            >
              {item}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => canNext && onPageChange(safePage + 1)}
          disabled={!canNext}
          style={navButtonStyle(!canNext)}
        >
          Next <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>&gt;</span>
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <select
          value={safePageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          style={{ padding: '0.45rem 0.7rem', minWidth: '62px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 900, outline: 'none' }}
        >
          {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
        </select>
      </div>
    </div>
  );
}

export const HealthPill = ({ status }) => {
  const styles = {
    ok: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', label: 'OK' },
    warn: { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', label: 'Warning' },
    fail: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', label: 'Failed' },
    checking: { background: '#e0f2fe', color: '#075985', border: '1px solid #bae6fd', label: 'Checking' },
    idle: { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', label: 'Idle' },
  };
  const style = styles[status] || styles.idle;
  return (
    <span style={{ padding: '0.28rem 0.7rem', borderRadius: '999px', fontWeight: 900, fontSize: '0.78rem', whiteSpace: 'nowrap', ...style }}>
      {style.label}
    </span>
  );
};

export const createHealthItem = (id, label, status, detail, meta = '') => ({ id, label, status, detail, meta });

export const formatBytes = (bytes = 0) => {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

export const describeAuditAction = (action = '') => {
  const parts = String(action || '').split('.');
  const area = parts[0] || 'system';
  const subject = parts.slice(1, -1).join(' ') || parts[1] || 'activity';
  const verb = parts[parts.length - 1] || 'event';
  const verbMap = {
    create: 'membuat',
    update: 'mengubah',
    delete: 'menghapus',
    login: 'login',
    logout: 'logout',
    failed: 'gagal',
    success: 'berhasil',
    finalize: 'menyimpan hasil',
    cleanup: 'cleanup',
  };
  return `${area} ${verbMap[verb] || verb} ${subject}`.replace(/\s+/g, ' ').trim();
};

export const auditAreaStyle = (action = '') => {
  const area = String(action).split('.')[0];
  if (area === 'admin') return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
  if (area === 'customer') return { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
  if (area === 'webhook' || area === 'payment') return { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' };
  return { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
};

const formatAuditMetadataValue = (value) => {
  if (value == null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    if ('url' in value && value.url) return value.url;
    return JSON.stringify(value);
  }
  return String(value);
};

export function AuditMetadataDetails({ metadata }) {
  if (!metadata || typeof metadata !== 'object' || Object.keys(metadata).length === 0) {
    return (
      <div style={{ padding: '0.8rem', borderRadius: '10px', background: '#f8fafc', color: '#64748b', fontSize: '0.78rem', lineHeight: 1.45 }}>
        Belum ada metadata detail untuk audit ini.
      </div>
    );
  }

  const before = metadata.before && typeof metadata.before === 'object' ? metadata.before : null;
  const after = metadata.after && typeof metadata.after === 'object' ? metadata.after : null;
  const beforeAfterKeys = before || after
    ? Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]))
    : [];
  const groupedEntries = Object.entries(metadata).filter(([key]) => key !== 'before' && key !== 'after');

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {beforeAfterKeys.length > 0 && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#f8fafc', color: '#64748b', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase' }}>
            <div style={{ padding: '0.55rem' }}>Field</div>
            <div style={{ padding: '0.55rem' }}>Before</div>
            <div style={{ padding: '0.55rem' }}>After</div>
          </div>
          {beforeAfterKeys.map((key) => {
            const beforeValue = formatAuditMetadataValue(before?.[key]);
            const afterValue = formatAuditMetadataValue(after?.[key]);
            const changed = beforeValue !== afterValue;
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #f1f5f9', background: changed ? '#fff7ed' : 'white', fontSize: '0.75rem' }}>
                <div style={{ padding: '0.55rem', color: '#475569', fontWeight: 900 }}>{key}</div>
                <div style={{ padding: '0.55rem', color: '#64748b', overflowWrap: 'anywhere' }}>{beforeValue}</div>
                <div style={{ padding: '0.55rem', color: changed ? '#c2410c' : '#64748b', fontWeight: changed ? 900 : 700, overflowWrap: 'anywhere' }}>{afterValue}</div>
              </div>
            );
          })}
        </div>
      )}

      {groupedEntries.map(([groupKey, groupValue]) => (
        <div key={groupKey} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.75rem', background: '#fff' }}>
          <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.45rem' }}>{groupKey}</div>
          {groupValue && typeof groupValue === 'object' && !Array.isArray(groupValue) ? (
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              {Object.entries(groupValue).map(([key, value]) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: '0.5rem', fontSize: '0.76rem' }}>
                  <div style={{ color: '#94a3b8', fontWeight: 900 }}>{key}</div>
                  <div style={{ color: '#111827', fontWeight: 750, overflowWrap: 'anywhere' }}>{formatAuditMetadataValue(value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#111827', fontWeight: 800, fontSize: '0.78rem', overflowWrap: 'anywhere' }}>{formatAuditMetadataValue(groupValue)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function DetailList({ title, rows, columns }) {
  return (
    <section style={{ border: '1px solid #e9ecef', borderRadius: '10px', padding: '1rem' }}>
      <h3 style={{ margin: '0 0 0.75rem', color: '#111' }}>{title}</h3>
      {rows.length === 0 ? (
        <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>Belum ada data.</div>
      ) : (
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {rows.map((row, index) => (
            <div key={row.id || `${title}-${index}`} style={{ borderBottom: index === rows.length - 1 ? 'none' : '1px solid #f1f3f5', paddingBottom: '0.6rem' }}>
              {columns.map((column) => (
                <div key={column} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.84rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: '#6c757d', fontWeight: '800' }}>{column}</span>
                  <span style={{ color: '#111827', fontWeight: '700', textAlign: 'right', overflowWrap: 'anywhere' }}>{formatDetailValue(row[column], column)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDetailValue(value, column) {
  if (value == null || value === '') return '-';
  if (column === 'createdAt' || column === 'updatedAt') return formatDateTime(value);
  if (column === 'amount') return formatCurrency(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export const emptyVoucherForm = {
  code: '',
  name: '',
  type: 'fixed',
  value: 0,
  minAmount: 0,
  maxDiscount: 0,
  usageLimit: 0,
  active: true,
  startsAt: '',
  endsAt: ''
};

export const toDateInputValue = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
};

export const dateInputToISOString = (dateString, isEndOfDay = false) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isEndOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
};

export const voucherStatus = (voucher) => {
  if (!voucher.active) return 'inactive';
  const now = new Date();
  if (voucher.startsAt && new Date(voucher.startsAt) > now) return 'scheduled';
  if (voucher.endsAt && new Date(voucher.endsAt) < now) return 'expired';
  if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) return 'depleted';
  return 'active';
};
