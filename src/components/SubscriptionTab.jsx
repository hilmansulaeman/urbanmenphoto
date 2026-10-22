import { useState, useEffect } from 'react';
import { backendRequest } from '../utils/backendApi.js';
import { Plus, Edit, Trash2, Check } from 'lucide-react';

export default function SubscriptionTab({ adminToken }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    durationDays: 30,
    features: ['']
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await backendRequest('/api/admin/subscriptions', adminToken);
      if (res && res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = editingPlan ? 'PUT' : 'POST';
      const endpoint = editingPlan 
        ? `/api/admin/subscriptions/${editingPlan.id}` 
        : '/api/admin/subscriptions';
      
      const payload = {
        ...formData,
        features: formData.features.filter(f => f.trim() !== '')
      };

      await backendRequest(endpoint, adminToken, {
        method,
        body: JSON.stringify(payload)
      });
      
      setShowModal(false);
      fetchPlans();
    } catch (err) {
      alert(err.message || 'Gagal menyimpan paket langganan');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus paket langganan ini?')) return;
    try {
      await backendRequest(`/api/admin/subscriptions/${id}`, adminToken, {
        method: 'DELETE'
      });
      fetchPlans();
    } catch (err) {
      alert(err.message || 'Gagal menghapus paket langganan');
    }
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      features: plan.features && plan.features.length ? plan.features : ['']
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: 0,
      durationDays: 30,
      features: ['']
    });
    setShowModal(true);
  };

  const updateFeature = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeature = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111' }}>Paket Langganan</h2>
          <p style={{ margin: '0.5rem 0 0', color: '#666' }}>Kelola paket langganan untuk kiosk/tenant Anda.</p>
        </div>
        <button 
          onClick={openCreateModal}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', 
            fontWeight: 600, cursor: 'pointer' 
          }}
        >
          <Plus size={18} /> Buat Paket
        </button>
      </div>

      {loading ? <p>Memuat data...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {plans.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
              <p style={{ color: '#666' }}>Belum ada paket langganan. Silakan buat paket baru.</p>
            </div>
          ) : (
            plans.map(plan => (
              <div key={plan.id} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e0e0e0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#111' }}>{plan.name}</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb' }}>
                    {formatRupiah(plan.price)}
                    <span style={{ fontSize: '1rem', color: '#666', fontWeight: 500 }}>/{plan.durationDays} hr</span>
                  </div>
                </div>
                <div style={{ padding: '1.5rem', flex: 1 }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(plan.features || []).map((feat, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', color: '#444' }}>
                        <Check size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid #e0e0e0' }}>
                  <button 
                    onClick={() => openEditModal(plan)}
                    style={{ flex: 1, padding: '15px', background: '#f8f9fa', border: 'none', borderRight: '1px solid #e0e0e0', color: '#444', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Edit size={16} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(plan.id)}
                    style={{ flex: 1, padding: '15px', background: '#fef2f2', border: 'none', color: '#ef4444', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Trash2 size={16} /> Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingPlan ? 'Edit Paket' : 'Buat Paket Baru'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <form id="plan-form" onSubmit={handleSave}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Nama Paket</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Harga (Rp)</label>
                    <input 
                      type="number" 
                      required 
                      min="0"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Durasi (Hari)</label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      value={formData.durationDays}
                      onChange={e => setFormData({...formData, durationDays: parseInt(e.target.value) || 1})}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                    Fitur Paket
                    <button type="button" onClick={addFeature} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>+ Tambah Fitur</button>
                  </label>
                  {formData.features.map((feat, index) => (
                    <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <input 
                        type="text" 
                        value={feat}
                        onChange={e => updateFeature(index, e.target.value)}
                        placeholder="Deskripsi fitur..."
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                      />
                      {formData.features.length > 1 && (
                        <button type="button" onClick={() => removeFeature(index)} style={{ padding: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </form>
            </div>
            <div style={{ padding: '1.5rem', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Batal</button>
              <button type="submit" form="plan-form" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
