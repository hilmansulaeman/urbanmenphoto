import { useState, useEffect } from 'react';
import { backendRequest, formatDateTime } from '../../utils/backendApi.js';

export default function AdminUsersTab({ adminToken }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', role: 'staff' });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ password: '', role: 'staff' });
  const [deletingUser, setDeletingUser] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadUsers = async () => {
    if (!adminToken) return;
    setLoading(true);
    setError('');
    try {
      const data = await backendRequest('/api/admin/users', adminToken);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [adminToken]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setForm({ email: '', password: '', role: 'staff' });
    setEditingUser(null);
    setDeletingUser(null);
    setModalMode('create');
    setError('');
    setSuccessMessage('');
  };

  const startEditUser = (user) => {
    setEditingUser(user);
    setEditForm({ password: '', role: user.role || 'staff' });
    setDeletingUser(null);
    setModalMode('edit');
    setError('');
    setSuccessMessage('');
  };

  const startDeleteUser = (user) => {
    setDeletingUser(user);
    setEditingUser(null);
    setModalMode('delete');
    setError('');
    setSuccessMessage('');
  };

  const closeUserModal = () => {
    if (saving || updating) return;
    setModalMode(null);
    setEditingUser(null);
    setDeletingUser(null);
    setEditForm({ password: '', role: 'staff' });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      await backendRequest('/api/admin/users', adminToken, {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });
      setForm({ email: '', password: '', role: 'staff' });
      setSuccessMessage('User admin berhasil ditambahkan.');
      setModalMode(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    setError('');
    setSuccessMessage('');
    try {
      const body = { role: editForm.role };
      if (editForm.password.trim()) {
        body.password = editForm.password;
      }
      await backendRequest(`/api/admin/users/${editingUser.id}`, adminToken, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setSuccessMessage(`User ${editingUser.email} berhasil diupdate.`);
      setModalMode(null);
      setEditingUser(null);
      setEditForm({ password: '', role: 'staff' });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setError('');
    setSuccessMessage('');
    try {
      await backendRequest(`/api/admin/users/${deletingUser.id}`, adminToken, { method: 'DELETE' });
      setSuccessMessage(`User ${deletingUser.email} berhasil dihapus.`);
      setModalMode(null);
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111' }}>Admin Users</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Daftar akun admin dari backend.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={openCreateModal} style={{ padding: '0.6rem 1rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              + Tambah User
            </button>
            <button onClick={loadUsers} style={{ padding: '0.6rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Refresh
            </button>
          </div>
        </div>

        {error && !modalMode && <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', fontSize: '0.9rem' }}>{error}</div>}
        {successMessage && <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#d1fae5', color: '#047857', fontWeight: 'bold', fontSize: '0.9rem' }}>{successMessage}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>Memuat user...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9ecef', color: '#6c757d', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 0.75rem' }}>User ID</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Email</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Role</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Created</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Updated</th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                    <td style={{ padding: '1rem 0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{user.id}</td>
                    <td style={{ padding: '1rem 0.75rem', color: '#111', fontWeight: 'bold' }}>{user.email}</td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <span style={{ padding: '0.25rem 0.6rem', borderRadius: '999px', background: user.role === 'owner' ? '#dbeafe' : '#f3f4f6', color: user.role === 'owner' ? '#1d4ed8' : '#374151', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.75rem', color: '#6c757d' }}>{formatDateTime(user.createdAt)}</td>
                    <td style={{ padding: '1rem 0.75rem', color: '#6c757d' }}>{formatDateTime(user.updatedAt)}</td>
                    <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => startEditUser(user)}
                          style={{ padding: '0.45rem 0.75rem', borderRadius: '7px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => startDeleteUser(user)}
                          style={{ padding: '0.45rem 0.75rem', borderRadius: '7px', border: '1px solid #fecaca', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalMode && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(17, 24, 39, 0.55)' }}
        >
          <div style={{ width: 'min(520px, 100%)', background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 24px 70px rgba(0,0,0,0.25)', padding: '1.5rem' }}>
            {modalMode === 'create' && (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0, color: '#111' }}>Tambah Admin User</h2>
                  <p style={{ margin: '0.35rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Buat akun owner atau staff baru.</p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="staff@urbanmenphoto.com"
                      required
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Password</label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Minimal 10 karakter"
                      minLength={10}
                      required
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Role</label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem', background: 'white' }}
                    >
                      <option value="staff">Staff</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </div>

                {error && <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', fontSize: '0.9rem' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={closeUserModal} disabled={saving} style={{ padding: '0.75rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                    Batal
                  </button>
                  <button type="submit" disabled={saving} style={{ padding: '0.75rem 1rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                    {saving ? 'Menyimpan...' : 'Tambah User'}
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'edit' && editingUser && (
              <form onSubmit={handleUpdateUser}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0, color: '#111' }}>Edit User</h2>
                  <p style={{ margin: '0.35rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>{editingUser.email}</p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Password Baru</label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(event) => setEditForm(prev => ({ ...prev, password: event.target.value }))}
                      placeholder="Kosongkan jika tidak diganti"
                      minLength={editForm.password ? 10 : undefined}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', color: '#495057', fontSize: '0.85rem' }}>Role</label>
                    <select
                      value={editForm.role}
                      onChange={(event) => setEditForm(prev => ({ ...prev, role: event.target.value }))}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem', background: 'white' }}
                    >
                      <option value="staff">Staff</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </div>

                {error && <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', fontSize: '0.9rem' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={closeUserModal} disabled={updating} style={{ padding: '0.75rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '8px', cursor: updating ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                    Batal
                  </button>
                  <button type="submit" disabled={updating} style={{ padding: '0.75rem 1rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: updating ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                    {updating ? 'Menyimpan...' : 'Simpan Edit'}
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'delete' && deletingUser && (
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0, color: '#111' }}>Delete User</h2>
                  <p style={{ margin: '0.35rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
                    Hapus admin user <strong>{deletingUser.email}</strong>? Tindakan ini tidak bisa dibatalkan.
                  </p>
                </div>

                {error && <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', fontSize: '0.9rem' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={closeUserModal} style={{ padding: '0.75rem 1rem', background: '#f8f9fa', color: '#111', border: '1px solid #e9ecef', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Batal
                  </button>
                  <button type="button" onClick={handleDeleteUser} style={{ padding: '0.75rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Delete User
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
