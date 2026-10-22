import { useState, useEffect, useRef } from 'react';
import WalletTab from './WalletTab';
import FrameManager from './FrameManager';
import SubscriptionTab from './SubscriptionTab';
import PaymentKeyTab from './PaymentKeyTab';
import { backendRequest, formatCurrency, formatDateTime } from '../utils/backendApi.js';
import AdminOverview from './AdminOverview.jsx';
import ProfileTab from './ProfileTab';
import ProjectManager from './ProjectManager.jsx';
import AdminSessionDetailModal from './admin/AdminSessionDetailModal.jsx';
import AdminUsersTab from './admin/AdminUsersTab.jsx';
import AuditActivityTab from './admin/AuditActivityTab.jsx';
import BackendListTab from './admin/BackendListTab.jsx';
import BoothHealthTab from './admin/BoothHealthTab.jsx';
import FilterManagementTab from './admin/FilterManagementTab.jsx';
import KioskSettingsTab from './admin/KioskSettingsTab.jsx';
import RecoveryTab from './admin/RecoveryTab.jsx';
import ReportExportTab from './admin/ReportExportTab.jsx';
import StatisticTab from './admin/StatisticTab.jsx';
import StorageManagementTab from './admin/StorageManagementTab.jsx';
import TransactionTab from './admin/TransactionTab.jsx';
import VoucherSettingsTab from './admin/VoucherSettingsTab.jsx';
import { ADMIN_EXPIRES_KEY, ADMIN_TOKEN_KEY, ADMIN_USER_KEY, AdminPagination, MENU_ITEMS, SESSION_EXPORT_COLUMNS, STAFF_ALLOWED_MENUS, StatusBadge, downloadSpreadsheet, fetchAllAdminRows, getAdminPath, getAdminTabFromPath, reportDateStamp } from './admin/shared.jsx';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [error, setError] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');
  
  useEffect(() => {
    if (isAuthenticated) return;

    const handleCredentialResponse = async (response) => {
      try {
        const res = await backendRequest('/api/auth/google/verify', null, {
          method: 'POST',
          body: JSON.stringify({ credential: response.credential })
        });
        
        if (res?.token && res?.user) {
          localStorage.setItem("urbanmenphoto_admin_token", res.token);
          localStorage.setItem("urbanmenphoto_admin_user", JSON.stringify(res.user));
          setAdminToken(res.token);
          setAdminUser(res.user);
          setIsAuthenticated(true);
        }
      } catch (err) {
        setError('Login Google gagal: ' + err.message);
      }
    };

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '657226319551-2269ospiircnegcjj570kkr75q580m0c.apps.googleusercontent.com',
        callback: handleCredentialResponse
      });
      const btnContainer = document.getElementById('googleSignInBtn');
      if (btnContainer) {
        window.google.accounts.id.renderButton(
          btnContainer,
          { theme: 'outline', size: 'large', width: 300 }
        );
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    }
  }, [isAuthenticated]);
  
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [activeTab, setActiveTab] = useState(getAdminTabFromPath);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const adminMenuRef = useRef(null);
  
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  const [sessionDetailError, setSessionDetailError] = useState('');
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryPageSize, setGalleryPageSize] = useState(10);
  const visibleMenuItems = adminUser?.role === 'staff'
    ? MENU_ITEMS.filter(item => STAFF_ALLOWED_MENUS.has(item.id))
    : MENU_ITEMS;
  const sidebarGroups = [
    { label: 'OPERASI', ids: ['overview', 'projects', 'transaction', 'gallery', 'booth_health'] },
    { label: 'APLIKASI', ids: ['filters', 'frame_photo', 'frame_gif', 'voucher'] },
    { label: 'AKUN', ids: ['profile', 'subscription', 'wallet', 'payment_key', 'admin_users'] },
  ].map((group) => ({
    ...group,
    items: group.ids.map((id) => visibleMenuItems.find((item) => item.id === id)).filter(Boolean),
  })).filter((group) => group.items.length > 0);
  const sidebarLabels = {
    overview: 'Analitik',
    booth_health: 'Perangkat',
    filters: 'Filter',
    frame_photo: 'Bingkai',
    frame_gif: 'Bingkai GIF',
    profile: 'Profil',
    subscription: 'Langganan',
    admin_users: 'Tim',
    payments: 'Pembayaran',
    payment_key: 'API Payment',
  };

  const clearAdminSession = (message = '') => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_KEY);
    setIsAuthenticated(false);
    setAdminToken('');
    setAdminUser(null);
    setSessions([]);
    setSessionNotice(message);
  };

  useEffect(() => {
    if (!isAuthenticated || visibleMenuItems.some(item => item.id === activeTab)) return;
    const fallbackTab = visibleMenuItems[0]?.id || 'overview';
    setActiveTab(fallbackTab);
    window.history.replaceState({}, '', getAdminPath(fallbackTab));
  }, [isAuthenticated, adminUser?.role, activeTab]);

  useEffect(() => {
    const handlePopState = () => setActiveTab(getAdminTabFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToTab = (tab) => {
    setActiveTab(tab);
    window.history.pushState({}, '', getAdminPath(tab));
  };

  useEffect(() => {
    const handleUnauthorized = (event) => {
      const path = event?.detail?.path || '';
      if (localStorage.getItem(ADMIN_TOKEN_KEY) && String(path).includes('/api/admin/')) {
        clearAdminSession('Sesi admin habis. Silakan login ulang.');
      }
    };
    window.addEventListener('backend:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('backend:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const expiresAt = localStorage.getItem(ADMIN_EXPIRES_KEY);
    if (!expiresAt) return undefined;

    const expiresMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) return undefined;
    const remainingMs = expiresMs - Date.now();
    if (remainingMs <= 0) {
      clearAdminSession('Sesi admin habis. Silakan login ulang.');
      return undefined;
    }

    const timer = window.setTimeout(() => {
      clearAdminSession('Sesi admin habis. Silakan login ulang.');
    }, remainingMs);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    const savedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    const savedUser = localStorage.getItem(ADMIN_USER_KEY);
    const savedExpiresAt = localStorage.getItem(ADMIN_EXPIRES_KEY);
    if (!savedToken) return;
    if (savedExpiresAt && new Date(savedExpiresAt).getTime() <= Date.now()) {
      clearAdminSession('Sesi admin habis. Silakan login ulang.');
      return;
    }

    setAdminToken(savedToken);
    setIsAuthenticated(true);
    if (savedUser) {
      try {
        setAdminUser(JSON.parse(savedUser));
      } catch {
        setAdminUser({ email: 'admin', role: 'owner' });
      }
    } else {
      setAdminUser({ email: 'admin', role: 'owner' });
    }

    backendRequest('/api/admin/auth/me', savedToken)
      .then((user) => {
        setIsAuthenticated(true);
        setAdminUser(user);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
        fetchSessions(savedToken);
      })
      .catch((err) => {
        if (err.status === 401) {
          clearAdminSession('Sesi admin tidak valid. Silakan login ulang.');
          return;
        }
        setSessionNotice('Admin tetap login dari sesi tersimpan. Backend belum bisa divalidasi, coba refresh data jika koneksi sudah normal.');
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Email dan Password harus diisi.');
      return;
    }
    try {
      const result = await backendRequest('/api/admin/auth/login', null, {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        })
      });

      if (result.requires2FA) {
        setRequires2FA(true);
        setError('');
        return;
      }

      const user = { email: loginEmail, role: result.role };
      
      localStorage.setItem('urbanmenphoto_admin_token', result.token);
      localStorage.setItem('urbanmenphoto_admin_user', JSON.stringify(user));
      setAdminToken(result.token);
      setAdminUser(user);
      setIsAuthenticated(true);
      setError('');
      setLoginPassword('');
    } catch (err) {
      setError(err.message || 'Login gagal.');
      setLoginPassword('');
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      setError('Kode OTP harus diisi.');
      return;
    }
    try {
      const result = await backendRequest('/api/admin/auth/login/verify-otp', null, {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, otp: otpCode })
      });
      
      const user = { email: loginEmail, role: result.role };
      localStorage.setItem('urbanmenphoto_admin_token', result.token);
      localStorage.setItem('urbanmenphoto_admin_user', JSON.stringify(user));
      setAdminToken(result.token);
      setAdminUser(user);
      setIsAuthenticated(true);
      setError('');
      setLoginPassword('');
      setOtpCode('');
      setRequires2FA(false);
    } catch (err) {
      setError(err.message || 'OTP tidak valid atau sudah kadaluarsa.');
      setOtpCode('');
    }
  };

  const handleLogout = async () => {
    const token = adminToken || localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      try {
        await backendRequest('/api/admin/auth/logout', token, { method: 'POST' });
      } catch (err) {
        console.warn('Logout request failed:', err);
      }
    }
    clearAdminSession('');
    setLoginEmail('');
    setLoginPassword('');
  };

  const fetchSessions = async (token = adminToken) => {
    if (!token) return;
    setLoading(true);
    try {
      const [sessionData, paymentData] = await Promise.all([
        fetchAllAdminRows('/api/admin/sessions', token),
        fetchAllAdminRows('/api/admin/payments', token).catch(() => [])
      ]);
      
      let parsedSessions = Array.isArray(sessionData) ? sessionData : [];
      
      if (Array.isArray(paymentData) && paymentData.length > 0) {
        const paymentMap = {};
        paymentData.forEach(p => {
          if (!paymentMap[p.sessionId] || p.status === 'paid' || p.status === 'settlement' || p.status === 'success') {
            paymentMap[p.sessionId] = p;
          }
        });
        parsedSessions = parsedSessions.map(session => ({
          ...session,
          payment: paymentMap[session.id] || session.payment
        }));
      }

      setSessions(parsedSessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId) => {
    if (!adminToken || !window.confirm(`Hapus permanen galeri dan file untuk sesi ${sessionId}?`)) {
      return;
    }
    try {
      await backendRequest(`/api/admin/sessions/${sessionId}`, adminToken, { method: 'DELETE' });
      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (err) {
      alert('Gagal menghapus sesi: ' + err.message);
    }
  };

  const openSessionDetail = async (sessionId) => {
    if (!adminToken) return;
    setSessionDetail({ session: { id: sessionId } });
    setSessionDetailLoading(true);
    setSessionDetailError('');
    try {
      const detail = await backendRequest(`/api/admin/sessions/${sessionId}`, adminToken);
      setSessionDetail(detail);
    } catch (err) {
      setSessionDetailError(err.message);
    } finally {
      setSessionDetailLoading(false);
    }
  };

  const galleryTotalPages = Math.max(1, Math.ceil(sessions.length / galleryPageSize));
  const galleryStartIndex = (galleryPage - 1) * galleryPageSize;
  const paginatedGallerySessions = sessions.slice(galleryStartIndex, galleryStartIndex + galleryPageSize);

  useEffect(() => {
    if (galleryPage > galleryTotalPages) {
      setGalleryPage(galleryTotalPages);
    }
  }, [galleryPage, galleryTotalPages]);

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8f9fa' }}>
        <form onSubmit={requires2FA ? handleVerifyOTP : handleLogin} style={{ background: 'white', padding: '3rem', borderRadius: '16px', border: '1px solid #e9ecef', textAlign: 'center', maxWidth: '400px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ marginBottom: '0.5rem', color: '#111' }}>{requires2FA ? 'Verifikasi 2FA' : 'Admin Access'}</h2>
          <p style={{ color: '#6c757d', marginBottom: '2rem', fontSize: '0.9rem' }}>
            {requires2FA ? 'Cek email Anda untuk kode verifikasi 6 digit.' : 'Login dengan akun admin backend.'}
          </p>
          
          {sessionNotice && <div style={{ marginBottom: '1rem', padding: '0.75rem 0.9rem', borderRadius: '8px', background: '#fff7ed', color: '#c2410c', fontWeight: '800', fontSize: '0.85rem', textAlign: 'left' }}>{sessionNotice}</div>}
          
          {!requires2FA ? (
            <>
              <input 
                type="email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@urbanmenphoto.com"
                style={{ 
                  width: '100%', padding: '0.9rem 1rem', fontSize: '1rem',
                  borderRadius: '8px', border: '2px solid #e9ecef', marginBottom: '1rem' 
                }}
                autoFocus
              />
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                style={{ 
                  width: '100%', padding: '0.9rem 1rem', fontSize: '1rem',
                  borderRadius: '8px', border: '2px solid #e9ecef', marginBottom: '1rem' 
                }}
              />
            </>
          ) : (
            <>
              <input 
                type="text" 
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Kode 6 Digit"
                maxLength={6}
                style={{ 
                  width: '100%', padding: '0.9rem 1rem', fontSize: '1.25rem', letterSpacing: '0.2rem', textAlign: 'center',
                  borderRadius: '8px', border: '2px solid #e9ecef', marginBottom: '1rem' 
                }}
                autoFocus
              />
            </>
          )}
          
          {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
          
          <button type="submit" style={{ width: '100%', padding: '1rem', background: '#f97316', color: 'white', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', border: 'none' }}>
            {requires2FA ? 'Verifikasi OTP' : 'Masuk'}
          </button>

          {!requires2FA && (
            <>
              <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', color: '#adb5bd', fontSize: '0.9rem' }}>
                 <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e9ecef' }} /> 
                 <span style={{ padding: '0 1rem' }}>Atau masuk dengan</span> 
                 <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e9ecef' }} />
              </div>
              
              <div id="googleSignInBtn" style={{ display: 'flex', justifyContent: 'center' }}></div>
            </>
          )}

          {requires2FA && (
            <button type="button" onClick={() => { setRequires2FA(false); setOtpCode(''); }} style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: '#6b7280', fontSize: '0.9rem', cursor: 'pointer' }}>
              Batal
            </button>
          )}
        </form>
      </div>
    );
  }

  // Render Content based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview sessions={sessions} />;

      case 'wallet':
        return <WalletTab />;

      case 'profile':
        return <ProfileTab adminUser={adminUser} />;

      case 'subscription':
        return <SubscriptionTab adminToken={adminToken} />;

      case 'frame_gif':
        return <FrameManager key="gif" adminToken={adminToken} kind="gif" />;

      case 'payment_key':
        return <PaymentKeyTab adminToken={adminToken} />;

      case 'projects':
        return <ProjectManager 
          adminToken={adminToken} 
          onEditProject={(id) => { setSelectedProjectId(id); setActiveTab('kiosk'); }} 
          onStartKiosk={(id) => {
            setSelectedProjectId(id);
            setActiveTab('kiosk');
          }}
        />;
      
      case 'kiosk':
        return <KioskSettingsTab projectId={selectedProjectId} adminToken={adminToken} onBack={() => { setSelectedProjectId(null); setActiveTab('projects'); }} />;

      case 'booth_health':
        return <BoothHealthTab adminToken={adminToken} />;

      case 'filters':
        return <FilterManagementTab adminToken={adminToken} />;

      case 'recovery':
        return <RecoveryTab />;

      case 'storage':
        return <StorageManagementTab adminToken={adminToken} />;

      case 'reports':
        return <ReportExportTab adminToken={adminToken} adminUser={adminUser} />;
        
      case 'statistic':
        return <StatisticTab sessions={sessions} />;
        
      case 'transaction':
        return <TransactionTab adminToken={adminToken} />;

      case 'payments':
        return (
          <BackendListTab
            title="Payments"
            description="Status payment utama dari backend."
            endpoint="/api/admin/payments"
            adminToken={adminToken}
            columns={[
              { key: 'id', label: 'Payment ID', render: row => <span style={{ fontFamily: 'monospace' }}>{String(row.id).slice(0, 18)}...</span> },
              { key: 'sessionId', label: 'Session ID', render: row => <span style={{ fontFamily: 'monospace' }}>{String(row.sessionId).slice(0, 18)}...</span> },
              { key: 'provider', label: 'Provider' },
              { key: 'originalAmount', label: 'Original', render: row => formatCurrency(row.originalAmount || row.amount) },
              { key: 'discountAmount', label: 'Discount', render: row => <span style={{ color: '#059669', fontWeight: 600 }}>{row.discountAmount ? `- ${formatCurrency(row.discountAmount)}` : '-'}</span> },
              { key: 'amount', label: 'Final', render: row => <span style={{ fontWeight: 700 }}>{formatCurrency(row.amount)}</span> },
              { key: 'status', label: 'Status', render: row => <StatusBadge status={row.status} /> },
              { key: 'createdAt', label: 'Created', render: row => formatDateTime(row.createdAt) },
            ]}
          />
        );

      case 'messages':
        return (
          <BackendListTab
            title="Delivery Messages"
            description="Log kirim link email/WhatsApp."
            endpoint="/api/admin/messages"
            adminToken={adminToken}
            columns={[
              { key: 'id', label: 'Message ID', render: row => <span style={{ fontFamily: 'monospace' }}>{String(row.id).slice(0, 18)}...</span> },
              { key: 'sessionId', label: 'Session ID', render: row => <span style={{ fontFamily: 'monospace' }}>{String(row.sessionId).slice(0, 18)}...</span> },
              { key: 'channel', label: 'Channel' },
              { key: 'recipient', label: 'Recipient' },
              { key: 'status', label: 'Status', render: row => <StatusBadge status={row.status} /> },
              { key: 'createdAt', label: 'Created', render: row => formatDateTime(row.createdAt) },
            ]}
          />
        );
        
      case 'frame_photo':
        return <FrameManager key="photo" adminToken={adminToken} kind="photo" />;

      case 'voucher':
        return <VoucherSettingsTab adminToken={adminToken} />;

      case 'admin_users':
        return <AdminUsersTab adminToken={adminToken} />;

      case 'audit_logs':
        return <AuditActivityTab adminToken={adminToken} />;
      
      case 'gallery':
        const exportGallerySessions = () => {
          if (!sessions.length) {
            alert('Belum ada session/gallery untuk diekspor.');
            return;
          }
          downloadSpreadsheet(`urbanmenphoto_gallery_sessions_${reportDateStamp()}.xls`, sessions, SESSION_EXPORT_COLUMNS);
        };
        return (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, color: '#111' }}>Customer Gallery Logs</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6c757d', fontSize: '0.9rem' }}>{sessions.length} session termuat di halaman admin.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => fetchSessions()} style={{ padding: '0.5rem 1rem', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Refresh</button>
                <button onClick={exportGallerySessions} style={{ padding: '0.5rem 1rem', background: '#111827', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Export XLS</button>
              </div>
            </div>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>Memuat data...</div>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>Belum ada sesi foto yang tersimpan.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e9ecef', color: '#6c757d', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '1rem 0' }}>Session ID</th>
                      <th style={{ padding: '1rem 0' }}>Time</th>
                      <th style={{ padding: '1rem 0' }}>Preview</th>
                      <th style={{ padding: '1rem 0', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedGallerySessions.map(s => {
                      const imageList = Array.from(new Set([
                        s.animatedImage?.url,
                        s.finalImage?.url,
                        s.printImage?.url,
                        ...(s.images || []),
                      ].filter(Boolean)));
                      const previews = imageList.slice(0, 3);
                      
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                          <td style={{ padding: '1rem 0', fontFamily: 'monospace', color: '#111', fontSize: '0.9rem' }}>{s.id.substring(0,15)}...</td>
                          <td style={{ padding: '1rem 0', color: '#495057', fontSize: '0.95rem' }}>{formatDateTime(s.createdAt || s.created_at)}</td>
                          <td style={{ padding: '1rem 0' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              {previews.map((imgUrl, idx) => (
                                <div key={idx} style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                                  <img src={imgUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              ))}
                              {imageList.length > 3 && (
                                <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 'bold' }}>+{imageList.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <a 
                                href={`/gallery/${s.id}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', background: '#e9ecef', color: '#111', textDecoration: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}
                              >
                                View
                              </a>
                              <button 
                                onClick={() => openSessionDetail(s.id)}
                                style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Detail
                              </button>
                              <button 
                                onClick={() => deleteSession(s.id)}
                                style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <AdminPagination
                  page={galleryPage}
                  totalPages={galleryTotalPages}
                  pageSize={galleryPageSize}
                  total={sessions.length}
                  onPageChange={setGalleryPage}
                  onPageSizeChange={(size) => {
                    setGalleryPageSize(size);
                    setGalleryPage(1);
                  }}
                />
              </div>
            )}
          </div>
        );
      
      default:
        // Placeholder for unimplemented menus
        return (
          <div style={{ background: 'white', padding: '4rem 2rem', borderRadius: '12px', border: '1px dashed #ced4da', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#adb5bd' }}>🚧</div>
            <h2 style={{ color: '#495057', marginBottom: '0.5rem' }}>{MENU_ITEMS.find(m => m.id === activeTab)?.label} Settings</h2>
            <p style={{ color: '#868e96' }}>Modul ini sedang dalam pengembangan dan akan segera hadir.</p>
          </div>
        );
    }
  };

  return (
    <div className="admin-layout flex min-h-screen bg-[#f1f1f1] font-sans text-[#25232a]">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar flex w-48 shrink-0 flex-col border-r border-[#e7e7e9] bg-[rgba(250,250,250,0.86)] shadow-[2px_0_8px_rgba(25,20,35,0.05)]">
        <div className="px-4 pb-2 pt-5">
          <h1 className="m-0 text-[21px] font-black tracking-[-0.055em] text-[#31313a]">POTOBOX<span className="text-[#f97316]">.</span></h1>
          <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#686975]">Photo Booth</div>
        </div>
        <div className="flex items-center justify-between px-4 pb-3 pt-2 text-[10px] font-medium text-[#9b9ba5]">
          <button type="button" className="inline-flex items-center gap-1 rounded px-0.5 py-1 transition hover:text-[#f97316]" aria-label="Pilih bahasa">ID <span className="text-xs">⌄</span></button>
          <button type="button" className="grid size-6 place-items-center rounded text-base leading-none transition hover:bg-[#fff0e7] hover:text-[#f97316]" aria-label="Sembunyikan sidebar">⇥</button>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-7">
          {sidebarGroups.map((group) => (
            <section className="mb-5" key={group.label}>
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-normal text-[#686975]">{group.label}</h2>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button key={item.id} onClick={() => navigateToTab(item.id)} className={`flex min-h-8 w-full items-center gap-3 rounded px-0 py-1 text-left text-[15px] transition-colors ${isActive ? 'font-medium text-[#f97316]' : 'font-normal text-[#3f4655] hover:text-[#f97316]'}`}>
                      <span className="admin-sidebar-icon grid size-[16px] shrink-0 place-items-center">{item.icon}</span>
                      <span className="leading-5">{sidebarLabels[item.id] || item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="border-t border-[#ededee] px-3 py-4">
          {adminUser && (
            <div className="mb-3 flex items-center gap-2.5 px-1">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#fff0e7] text-xs font-bold text-[#f97316]">{adminUser.email.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-xs font-medium text-[#363744]">{adminUser.email}</div>
                <div className="mt-0.5 text-[10px] text-[#81818a]">{adminUser.role}</div>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="flex min-h-8 w-full items-center gap-2 rounded px-1 py-1 text-left text-sm text-[#3f4655] transition-colors hover:text-[#f97316]"
          >
            <span className="text-base">↪</span> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-7">
        {renderContent()}
      </main>
      {sessionDetail && (
        <AdminSessionDetailModal
          detail={sessionDetail}
          loading={sessionDetailLoading}
          error={sessionDetailError}
          onClose={() => setSessionDetail(null)}
        />
      )}
    </div>
  );
}
