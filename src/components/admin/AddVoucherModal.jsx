

export default function AddVoucherModal({ isOpen, onClose, form, updateForm, saveVoucher, saving, error, isEdit }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '1.25rem' }}>{isEdit ? 'Edit Voucher' : 'Buat Voucher Baru'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
        </div>
        
        {error && <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', marginBottom: '1rem', fontWeight: 600, fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={saveVoucher} style={{ display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem', color: '#374151', fontSize: '0.9rem', fontWeight: 600 }}>
            Kode Voucher
            <input value={form.code} onChange={e => updateForm('code', e.target.value.toUpperCase())} placeholder="PROMO2026" required maxLength={32} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', textTransform: 'uppercase' }} />
          </label>

          <label style={{ display: 'grid', gap: '0.35rem', color: '#374151', fontSize: '0.9rem', fontWeight: 600 }}>
            Nama Voucher (Opsional)
            <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Diskon Spesial" style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem', color: '#374151', fontSize: '0.9rem', fontWeight: 600 }}>
              Tipe Diskon
              <select value={form.type} onChange={e => updateForm('type', e.target.value)} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white' }}>
                <option value="fixed">Tunai (Rp)</option>
                <option value="percent">Diskon (%)</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.35rem', color: '#374151', fontSize: '0.9rem', fontWeight: 600 }}>
              Nilai
              <input type="number" min="1" max={form.type === 'percent' ? "100" : undefined} value={form.value} onChange={e => updateForm('value', e.target.value)} placeholder={form.type === 'percent' ? '10' : '5000'} required style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem', color: '#374151', fontSize: '0.9rem', fontWeight: 600 }}>
              Mulai (Opsional)
              <input type="date" value={form.startsAt} onChange={e => updateForm('startsAt', e.target.value)} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
            </label>
            <label style={{ display: 'grid', gap: '0.35rem', color: '#374151', fontSize: '0.9rem', fontWeight: 600 }}>
              Berakhir (Opsional)
              <input type="date" value={form.endsAt} onChange={e => updateForm('endsAt', e.target.value)} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: '0.35rem', color: '#374151', fontSize: '0.9rem', fontWeight: 600 }}>
              Limit Pemakaian
              <input type="number" min="0" value={form.usageLimit} onChange={e => updateForm('usageLimit', e.target.value)} placeholder="0 = unlimited" style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', color: '#374151', fontWeight: 600 }}>
              <input type="checkbox" checked={form.active} onChange={e => updateForm('active', e.target.checked)} />
              Aktif
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
            <button type="submit" disabled={saving} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Menyimpan...' : 'Simpan Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
