import { useState, useEffect } from 'react';
import { FILTER_CATEGORIES, getEditorFilterStyle, fetchCustomFilters } from '../../utils/photoConfig.js';

export default function FilterManagementTab({ adminToken }) {
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFilter, setNewFilter] = useState({ name: '', category: 'CUSTOM', css: '', active: true });

  const loadFilters = async () => {
    setLoading(true);
    await fetchCustomFilters();
    setLoading(false);
  };

  useEffect(() => {
    loadFilters();
  }, []);

  const handleSaveFilter = async () => {
    if (!newFilter.name || !newFilter.css) {
      alert('Nama dan Aturan CSS wajib diisi!');
      return;
    }
    
    try {
      const res = await fetch('/api/admin/filters', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}` 
        },
        body: JSON.stringify(newFilter)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewFilter({ name: '', category: 'CUSTOM', css: '', active: true });
        loadFilters();
      } else {
        const err = await res.json();
        alert('Gagal menyimpan filter: ' + (err.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'white', width: '100%', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#6b7280' }}>
        Memuat daftar filter...
      </div>
    );
  }

  return (
    <div style={{ background: 'white', width: '100%', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111827' }}>Manajemen Filter</h2>
          <p style={{ margin: '0.4rem 0 0', color: '#6b7280' }}>Daftar efek warna filter yang tersedia untuk digunakan oleh pelanggan pada saat sesi foto (Studio Editor).</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          style={{ background: '#f97316', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 2px 4px rgba(249, 115, 22, 0.2)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Tambah Filter
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginTop: '2rem' }}>
        {Object.entries(FILTER_CATEGORIES).filter(([category]) => category !== 'ALL').map(([category, filters]) => (
          <div key={category}>
            <h3 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: '#374151', fontSize: '1.1rem' }}>
              Kategori: {category}
            </h3>
            
            {filters.length === 0 ? (
              <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>Belum ada filter di kategori ini.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
                {filters.map(filterName => {
                  const cssFilter = getEditorFilterStyle(filterName);
                  return (
                    <div key={filterName} style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                        <div style={{ width: '100%', height: '100%', background: 'url(https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop) center/cover', filter: cssFilter }}></div>
                        <div style={{ position: 'absolute', top: '0', left: '0', background: '#2563eb', color: 'white', padding: '0.2rem 0.6rem', borderBottomRightRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          LUT
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.25rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>{filterName}</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>Terakhir Diperbarui: Jul 29 2026 at 20:22</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>Owned by me</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 1.5rem', color: '#111827' }}>Tambah Filter Kustom</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151', fontWeight: 'bold' }}>Nama Filter</label>
                <input 
                  type="text" 
                  value={newFilter.name} 
                  onChange={(e) => setNewFilter({...newFilter, name: e.target.value})}
                  placeholder="Misal: RETRO BREEZE"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151', fontWeight: 'bold' }}>Kategori</label>
                <select 
                  value={newFilter.category} 
                  onChange={(e) => setNewFilter({...newFilter, category: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem', background: 'white' }}
                >
                  <option value="CUSTOM">CUSTOM</option>
                  <option value="ESSENTIAL">ESSENTIAL</option>
                  <option value="RETRO">RETRO</option>
                  <option value="FUN">FUN</option>
                  <option value="COOL">COOL</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151', fontWeight: 'bold' }}>Aturan CSS (filter)</label>
                <input 
                  type="text" 
                  value={newFilter.css} 
                  onChange={(e) => setNewFilter({...newFilter, css: e.target.value})}
                  placeholder="Misal: sepia(0.5) contrast(1.2) brightness(0.9)"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem', fontFamily: 'monospace' }}
                />
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Masukkan value CSS filter (tanpa kata 'filter:').</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ padding: '0.6rem 1.2rem', border: '1px solid #d1d5db', background: 'white', color: '#374151', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Batal
              </button>
              <button 
                onClick={handleSaveFilter}
                style={{ padding: '0.6rem 1.2rem', border: 'none', background: '#2563eb', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Simpan Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
