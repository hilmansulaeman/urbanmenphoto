import { useState, useEffect } from 'react';
import { backendRequest, formatCurrency } from '../../utils/backendApi.js';
import AddVoucherModal from './AddVoucherModal.jsx';
import { StatusBadge, dateInputToISOString, emptyVoucherForm, toDateInputValue, voucherStatus } from './shared.jsx';

export default function VoucherSettingsTab({ adminToken }) {
  const [vouchers, setVouchers] = useState([]);
  const [activeTab, setActiveTab] = useState('tunai'); // 'tunai' | 'diskon'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [form, setForm] = useState(emptyVoucherForm);
  const [editingId, setEditingId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadVouchers = async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const data = await backendRequest('/api/admin/vouchers', adminToken);
      setVouchers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVouchers(); }, [adminToken]);

  const filteredVouchers = vouchers.filter(v => activeTab === 'tunai' ? v.type === 'fixed' : v.type === 'percent');
  const isAllSelected = filteredVouchers.length > 0 && filteredVouchers.every(v => selectedIds.has(v.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVouchers.map(v => v.id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const resetForm = () => {
    setForm(emptyVoucherForm);
    setEditingId('');
  };

  const openModalNew = () => {
    resetForm();
    updateForm('type', activeTab === 'tunai' ? 'fixed' : 'percent');
    setIsModalOpen(true);
    setError('');
  };

  const openModalEdit = (voucher) => {
    setEditingId(voucher.id);
    setForm({
      id: voucher.id,
      code: voucher.code || '',
      name: voucher.name || '',
      type: voucher.type || 'fixed',
      value: String(voucher.value || ''),
      minAmount: String(voucher.minAmount || ''),
      maxDiscount: String(voucher.maxDiscount || ''),
      usageLimit: String(voucher.usageLimit || ''),
      active: Boolean(voucher.active),
      startsAt: toDateInputValue(voucher.startsAt),
      endsAt: toDateInputValue(voucher.endsAt),
    });
    setIsModalOpen(true);
    setError('');
  };

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const saveVoucher = async (event) => {
    event.preventDefault();
    if (!adminToken) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        id: form.id || undefined,
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        value: Number(form.value || 0),
        minAmount: Number(form.minAmount || 0),
        maxDiscount: Number(form.maxDiscount || 0),
        usageLimit: Number(form.usageLimit || 0),
        active: Boolean(form.active),
        startsAt: dateInputToISOString(form.startsAt),
        endsAt: dateInputToISOString(form.endsAt, true),
      };

      if (payload.type === 'percent' && payload.value > 100) {
        throw new Error('Persentase diskon tidak boleh lebih dari 100%.');
      }

      const endpoint = editingId ? `/api/admin/vouchers/${editingId}` : '/api/admin/vouchers';
      const saved = await backendRequest(endpoint, adminToken, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setVouchers(prev => {
        const exists = prev.some(item => item.id === saved.id);
        return exists ? prev.map(item => item.id === saved.id ? saved : item) : [saved, ...prev];
      });
      setMessage(`Voucher ${saved.code} berhasil disimpan.`);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan voucher.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedIds.size} voucher terpilih?`)) return;
    setDeleting(true);
    try {
      await backendRequest('/api/admin/vouchers/bulk-delete', adminToken, {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setVouchers(prev => prev.filter(item => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      setMessage('Voucher terpilih berhasil dihapus.');
    } catch (err) {
      alert('Gagal menghapus voucher: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const deleteSingle = async (voucher) => {
    if (!window.confirm(`Hapus voucher ${voucher.code}?`)) return;
    try {
      await backendRequest(`/api/admin/vouchers/${voucher.id}`, adminToken, { method: 'DELETE' });
      setVouchers(prev => prev.filter(item => item.id !== voucher.id));
    } catch (err) {
      alert('Gagal menghapus voucher: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <AddVoucherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        form={form}
        updateForm={updateForm}
        saveVoucher={saveVoucher}
        saving={saving}
        error={error}
        isEdit={!!editingId}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '1.5rem', fontWeight: 700 }}>Manajemen Voucher</h2>
        <p style={{ margin: 0, color: '#6b7280' }}>Kelola voucher tunai dan diskon untuk proyek Anda.</p>
      </div>

      {message && <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', color: '#166534', borderRadius: '8px', fontWeight: 600 }}>{message}</div>}

      <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '2rem' }}>
        <button
          onClick={() => { setActiveTab('tunai'); setSelectedIds(new Set()); }}
          style={{ padding: '0.75rem 0', background: 'none', border: 'none', borderBottom: activeTab === 'tunai' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'tunai' ? '#2563eb' : '#6b7280', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Voucher Tunai
          <span style={{ padding: '2px 8px', borderRadius: '999px', background: activeTab === 'tunai' ? '#eff6ff' : '#f3f4f6', color: activeTab === 'tunai' ? '#1d4ed8' : '#6b7280', fontSize: '0.75rem' }}>{vouchers.filter(v => v.type === 'fixed').length}</span>
        </button>
        <button
          onClick={() => { setActiveTab('diskon'); setSelectedIds(new Set()); }}
          style={{ padding: '0.75rem 0', background: 'none', border: 'none', borderBottom: activeTab === 'diskon' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'diskon' ? '#2563eb' : '#6b7280', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Voucher Diskon
          <span style={{ padding: '2px 8px', borderRadius: '999px', background: activeTab === 'diskon' ? '#eff6ff' : '#f3f4f6', color: activeTab === 'diskon' ? '#1d4ed8' : '#6b7280', fontSize: '0.75rem' }}>{vouchers.filter(v => v.type === 'percent').length}</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0, color: '#111827', fontSize: '1.25rem' }}>
          {activeTab === 'tunai' ? 'Voucher Tunai' : 'Voucher Diskon'}
        </h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
          {activeTab === 'tunai' ? 'Kode untuk pembayaran dengan potongan harga nominal tetap.' : 'Kode untuk pembayaran dengan potongan harga persentase.'}
        </p>
        
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button onClick={openModalNew} style={{ padding: '0.65rem 1.25rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
            Buat Voucher {activeTab === 'tunai' ? 'Tunai' : 'Diskon'}
          </button>
          <button style={{ padding: '0.65rem 1.25rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
            Upload Tabel Voucher
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', width: 'fit-content', marginTop: '0.5rem' }}>
          <button disabled style={{ padding: '0.4rem 0.75rem', background: 'none', border: 'none', color: '#9ca3af', fontWeight: 600, cursor: 'not-allowed' }}>
            Unduh Terpilih ({selectedIds.size})
          </button>
          <div style={{ width: '1px', background: '#e5e7eb', margin: '0.25rem 0' }}></div>
          <button onClick={deleteSelected} disabled={selectedIds.size === 0 || deleting} style={{ padding: '0.4rem 0.75rem', background: 'none', border: 'none', color: selectedIds.size > 0 ? '#dc2626' : '#9ca3af', fontWeight: 600, cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed' }}>
            {deleting ? 'Menghapus...' : `Hapus Terpilih (${selectedIds.size})`}
          </button>
          <div style={{ width: '1px', background: '#e5e7eb', margin: '0.25rem 0' }}></div>
          <button disabled style={{ padding: '0.4rem 0.75rem', background: 'none', border: 'none', color: '#9ca3af', fontWeight: 600, cursor: 'not-allowed' }}>
            Unduh Tabel
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', background: 'white', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '1rem', width: '40px' }}>
                  <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '1rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kode</th>
                <th style={{ padding: '1rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nilai</th>
                <th style={{ padding: '1rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ketersediaan</th>
                <th style={{ padding: '1rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Masa Berlaku</th>
                <th style={{ padding: '1rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '1rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pembuat</th>
                <th style={{ padding: '1rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Memuat data...</td></tr>
              ) : filteredVouchers.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Tidak ada data voucher.</td></tr>
              ) : (
                filteredVouchers.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6', background: selectedIds.has(v.id) ? '#f0fdf4' : 'transparent' }}>
                    <td style={{ padding: '1rem' }}>
                      <input type="checkbox" checked={selectedIds.has(v.id)} onChange={() => toggleSelect(v.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#111827' }}>{v.code}</td>
                    <td style={{ padding: '1rem', color: '#4b5563', fontWeight: 500 }}>{v.type === 'percent' ? `${v.value}%` : formatCurrency(v.value)}</td>
                    <td style={{ padding: '1rem', color: '#4b5563' }}>{v.usageLimit ? `${v.usedCount || 0} / ${v.usageLimit}` : 'Tidak terbatas'}</td>
                    <td style={{ padding: '1rem', color: '#4b5563', fontSize: '0.85rem' }}>
                      {v.startsAt ? new Date(v.startsAt).toLocaleDateString() : '-'} s/d {v.endsAt ? new Date(v.endsAt).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <StatusBadge status={voucherStatus(v)} />
                    </td>
                    <td style={{ padding: '1rem', color: '#4b5563', fontSize: '0.85rem' }}>
                      {v.createdBy || '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button onClick={() => openModalEdit(v)} style={{ padding: '0.4rem 0.75rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#374151', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginRight: '0.5rem' }}>Edit</button>
                      <button onClick={() => deleteSingle(v)} style={{ padding: '0.4rem 0.75rem', background: 'none', border: '1px solid #fee2e2', borderRadius: '6px', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Hapus</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '1rem', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            Menampilkan 1 - {filteredVouchers.length} dari {filteredVouchers.length} data
          </div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            Tampilkan per halaman: 
            <select style={{ marginLeft: '0.5rem', padding: '0.25rem 1rem 0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}>
              <option>25</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
