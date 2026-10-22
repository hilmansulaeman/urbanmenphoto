import { useState, useEffect, useRef } from 'react';
import { normalizeCameraProfiles, defaultSettings as defaultKioskSettings } from '../../utils/kioskConfig.js';
import { BACKEND_API_URL, backendRequest, getBackendApiUrl, reportMonitoringError } from '../../utils/backendApi.js';
import { stopStream, listVideoDevices } from '../../utils/camera.js';
import { captureDslrPhoto, listDslrCameras, listHardwarePrinters } from '../../utils/dslr.js';

export default function KioskSettingsTab({ projectId, adminToken, onBack }) {
  const [settings, setSettings] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [dslrCameras, setDslrCameras] = useState([]);
  const [webcams, setWebcams] = useState([]);
  const [cameraMessage, setCameraMessage] = useState('');
  const [refreshingCameraId, setRefreshingCameraId] = useState('');
  const [lastRefreshedCameraId, setLastRefreshedCameraId] = useState('');
  const [hardwarePrinters, setHardwarePrinters] = useState([]);
  const [printerMessage, setPrinterMessage] = useState('');
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [previewCameraId, setPreviewCameraId] = useState('');
  const [isTestPrintActive, setIsTestPrintActive] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectCover, setProjectCover] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const previewVideoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const [previewImage, setPreviewImage] = useState('');

  useEffect(() => () => stopStream(previewStreamRef.current), []);

  useEffect(() => {
    const handleAfterPrint = () => setIsTestPrintActive(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const url = projectId ? `/api/admin/projects/${projectId}` : `/api/settings`;
        const res = await backendRequest(url, adminToken);
        const fetchedSettings = projectId ? (res.settings || {}) : (res || {});
        
        // Merge with defaults and ensure exactly 2 camera profiles exist
        const mergedSettings = { ...defaultKioskSettings, ...fetchedSettings };
        mergedSettings.cameraProfiles = normalizeCameraProfiles(mergedSettings);
        
        setSettings(mergedSettings);
        if (projectId) {
          setProjectName(res.name || '');
          setProjectCover(res.coverImage || res.cover || '');
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    };
    fetchSettings();
  }, [projectId, adminToken]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const loadCameraDevices = async (profile, cameraNumber) => {
    if (profile) {
      setRefreshingCameraId(profile.id);
      setLastRefreshedCameraId(profile.id);
    }
    setCameraMessage('');
    try {
      const dslrs = await listDslrCameras();
      setDslrCameras(dslrs);
      try {
        const cams = await listVideoDevices();
        setWebcams(cams);
      } catch (e) {
        console.warn('Webcams not found or permission denied', e);
      }
      setCameraMessage(profile
        ? `Kamera ${cameraNumber} diperbarui: ${dslrs.length} Canon DSLR terdeteksi dari Hardware Agent.`
        : `${dslrs.length} Canon DSLR terdeteksi dari Hardware Agent.`);
    } catch (err) {
      setDslrCameras([]);
      setCameraMessage(err.message || 'Hardware Agent tidak dapat membaca Canon DSLR.');
    } finally {
      if (profile) setRefreshingCameraId('');
    }
  };

  useEffect(() => {
    loadCameraDevices();
  }, []);

  const loadHardwarePrinters = async () => {
    setIsLoadingPrinters(true);
    try {
      const printers = await listHardwarePrinters();
      setHardwarePrinters(printers);
      setPrinterMessage(`${printers.length} printer Windows terdeteksi dari Hardware Agent.`);
    } catch (error) {
      setHardwarePrinters([]);
      setPrinterMessage(error.message || 'Hardware Agent tidak dapat membaca printer.');
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  useEffect(() => {
    loadHardwarePrinters();
  }, []);

  const updateCameraProfile = (profileId, changes) => {
    setSettings(prev => ({
      ...prev,
      cameraProfiles: (prev.cameraProfiles || []).map(profile => profile.id === profileId ? { ...profile, ...changes } : profile),
    }));
  };

  const getCameraProfileStatus = (profile) => {
    if (!profile.enabled) return { text: 'Nonaktif', color: '#6b7280', background: '#f3f4f6' };
    if ((profile.captureMode || 'dslr') === 'webcam') {
      return profile.deviceId ? { text: 'Webcam siap digunakan', color: '#166534', background: '#dcfce7' } : { text: 'Pilih Webcam Device', color: '#92400e', background: '#fef3c7' };
    }
    if (!profile.tetherPort) return { text: 'Pilih Canon DSLR', color: '#92400e', background: '#fef3c7' };
    return dslrCameras.some(camera => camera.port === profile.tetherPort)
      ? { text: 'Canon DSLR terdeteksi dan siap memotret', color: '#166534', background: '#dcfce7' }
      : { text: 'Canon DSLR tidak terdeteksi', color: '#991b1b', background: '#fee2e2' };
  };

  const handleTestCamera = async (cameraId) => {
    setIsTestingCamera(true);
    setCameraMessage('');
    setPreviewImage('');
    stopStream(previewStreamRef.current);
    try {
      const cameraProfile = settings.cameraProfiles?.find(profile => profile.id === cameraId) || settings.cameraProfiles?.[0];
      setPreviewCameraId(cameraProfile?.id || '');
      
      if ((cameraProfile?.captureMode || 'dslr') === 'webcam') {
        if (!cameraProfile?.deviceId && !cameraProfile?.facingMode) throw new Error('Pilih Webcam Device terlebih dahulu.');
        
        const constraints = {
          video: cameraProfile?.deviceId ? { deviceId: { exact: cameraProfile.deviceId } } : { facingMode: cameraProfile?.facingMode || 'user' }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        previewStreamRef.current = stream;
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
          previewVideoRef.current.play().catch(e => console.warn('Play interrupted', e));
        }
        setCameraMessage(`Preview Webcam aktif.`);
        return;
      }
      
      if (!cameraProfile?.tetherPort) throw new Error('Pilih Canon DSLR terlebih dahulu.');
      const result = await captureDslrPhoto(cameraProfile.tetherPort);
      setPreviewImage(result.url);
      setCameraMessage(`Foto test ${cameraProfile.name || 'DSLR'} berhasil diambil.`);
    } catch (err) {
      setCameraMessage(err.message || 'Kamera tidak bisa ditest.');
    } finally {
      setIsTestingCamera(false);
    }
  };

  const handleStopPreview = () => {
    stopStream(previewStreamRef.current);
    previewStreamRef.current = null;
    setPreviewCameraId('');
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    setPreviewImage('');
    setCameraMessage('Preview kamera dihentikan.');
  };

  const handleTestPrint = () => {
    setIsTestPrintActive(true);
    window.setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        reportMonitoringError({
          category: 'print',
          message: err.message || 'Gagal test print dari admin.',
          source: 'admin',
          metadata: {
            trigger: 'admin_test_print',
            printerName: settings.printerName || '',
          },
        });
      }
    }, 100);
  };

  const handleUseCurrentFrontendUrl = () => {
    const currentUrl = window.location.origin.replace(/\/$/, '');
    setSettings(prev => ({
      ...prev,
      publicFrontendUrl: currentUrl,
      publicGalleryBaseUrl: currentUrl,
    }));
    setSavedMessage('URL frontend saat ini dipakai untuk QR/gallery. Jangan lupa simpan.');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleUseDefaultBackendUrl = () => {
    setSettings(prev => ({ ...prev, backendApiUrl: BACKEND_API_URL }));
    setSavedMessage('Backend API dikembalikan ke default. Jangan lupa simpan.');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleCopyText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setSavedMessage('URL berhasil disalin.');
      setTimeout(() => setSavedMessage(''), 2500);
    } catch {
      setSavedMessage('Browser tidak mengizinkan copy otomatis.');
      setTimeout(() => setSavedMessage(''), 2500);
    }
  };

  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const res = await fetch(`${getBackendApiUrl()}/api/admin/frames/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: formData
      });
      if (!res.ok) throw new Error('Gagal upload cover');
      const resData = await res.json();
      const assetUrl = resData.data?.url || resData.url || resData.imageUrl;
      if (assetUrl) {
        setProjectCover(assetUrl);
      } else {
        throw new Error('URL gambar tidak ditemukan dari response server');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (projectId) {
        await backendRequest(`/api/admin/projects/${projectId}`, adminToken, {
          method: 'PATCH',
          body: JSON.stringify({ settings, name: projectName, coverImage: projectCover })
        });
      } else {
        await fetch(`${BACKEND_API_URL}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
      }
      setSavedMessage('Pengaturan berhasil disimpan!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (!settings) return <div style={{ padding: '2rem' }}>Memuat pengaturan...</div>;

  return (
    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #e9ecef', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111' }}>{projectId ? `Project Settings (${projectId})` : 'Global Kiosk Settings'}</h2>
          <p style={{ margin: 0, color: '#6c757d', marginTop: '0.2rem', fontSize: '0.9rem' }}>Konfigurasi mesin fisik photobooth ini.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onBack && (
            <button type="button" onClick={onBack} style={{ padding: '0.6rem 1.2rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Kembali
            </button>
          )}
          <button onClick={() => { window.location.href = '/'; }} style={{ padding: '0.6rem 1.2rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Buka Photobooth
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ width: '100%' }}>
        {isTestPrintActive && (
          <div className="print-area">
            <div style={{
              width: '4in',
              height: '6in',
              boxSizing: 'border-box',
              border: '10px solid #f97316',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25in',
              fontFamily: 'Arial, sans-serif',
              color: '#111827',
              background: '#fff7ed',
            }}>
              <div style={{ width: '0.65in', height: '0.65in', borderRadius: '999px', background: '#f97316', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '0.22in' }}>up</div>
              <div style={{ fontSize: '0.26in', fontWeight: 900 }}>Urbanmenphoto</div>
              <div style={{ width: '2.7in', height: '2.7in', border: '3px dashed #fdba74', borderRadius: '14px', display: 'grid', placeItems: 'center', textAlign: 'center', color: '#9a3412', fontWeight: 900, fontSize: '0.18in' }}>
                TEST PRINT
              </div>
              <div style={{ fontSize: '0.13in', color: '#64748b', textAlign: 'center', lineHeight: 1.4 }}>
                {settings.kioskName}<br />
                {new Date().toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#fff' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#111827' }}>Booth Profile</h3>
            <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}>Identitas booth untuk log, gallery, dan operasional event.</p>
          </div>

          {projectId && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Nama Proyek / Event</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Cover Image</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {projectCover && (
                    <img src={projectCover.startsWith('/') ? `${getBackendApiUrl()}${projectCover}` : projectCover} alt="Cover Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ced4da' }} />
                  )}
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCover}
                      disabled={isUploadingCover}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: isUploadingCover ? 'wait' : 'pointer',
                        zIndex: 10,
                      }}
                    />
                    <div style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px dashed #ced4da', fontSize: '0.95rem', background: '#f8fafc', color: '#64748b', textAlign: 'center' }}>
                      {isUploadingCover ? 'Mengunggah...' : (projectCover ? 'Ganti Cover Image' : 'Pilih/Upload Image')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Booth ID</label>
              <input
                type="text"
                name="boothId"
                value={settings.boothId || ''}
                readOnly
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem', background: '#f8fafc', color: '#64748b' }}
              />
              <p style={{ fontSize: '0.78rem', color: '#868e96', marginTop: '0.35rem' }}>ID unik browser/mesin ini untuk membedakan booth.</p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Nama Kiosk / Cabang</label>
              <input
                type="text"
                name="kioskName"
                value={settings.kioskName || ''}
                onChange={handleChange}
                placeholder="Urbanmenphoto Booth"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Nama Event</label>
              <input
                type="text"
                name="eventName"
                value={settings.eventName || ''}
                onChange={handleChange}
                placeholder="Contoh: Wedding Andi & Sinta"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Lokasi Booth</label>
              <input
                type="text"
                name="boothLocation"
                value={settings.boothLocation || ''}
                onChange={handleChange}
                placeholder="Contoh: Lobby Utama / Ballroom A"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Operator</label>
              <input
                type="text"
                name="operatorName"
                value={settings.operatorName || ''}
                onChange={handleChange}
                placeholder="Nama operator yang jaga booth"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#111827' }}>Network Settings</h3>
              <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}>Atur alamat yang dipakai QR customer, gallery, dan koneksi backend.</p>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentFrontendUrl}
              style={{ padding: '0.65rem 1rem', background: '#111827', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
            >
              Pakai URL Sekarang
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Public Frontend URL</label>
              <input
                type="url"
                name="publicFrontendUrl"
                value={settings.publicFrontendUrl || ''}
                onChange={handleChange}
                placeholder="http://192.168.1.10:5173"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Public Gallery / QR URL</label>
              <input
                type="url"
                name="publicGalleryBaseUrl"
                value={settings.publicGalleryBaseUrl || ''}
                onChange={handleChange}
                placeholder="http://192.168.1.10:5173"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
              />
              <p style={{ fontSize: '0.78rem', color: '#868e96', marginTop: '0.35rem' }}>QR akan menjadi URL ini + /gallery/id.</p>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Backend API URL</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                <input
                  type="url"
                  name="backendApiUrl"
                  value={settings.backendApiUrl || ''}
                  onChange={handleChange}
                  placeholder={BACKEND_API_URL}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
                />
                <button
                  type="button"
                  onClick={handleUseDefaultBackendUrl}
                  style={{ padding: '0.65rem 1rem', background: 'white', color: '#111827', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                >
                  Default
                </button>
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => handleCopyText(window.location.origin)}
              style={{ padding: '0.75rem', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'left', overflowWrap: 'anywhere' }}
            >
              Browser sekarang: {window.location.origin}
            </button>
            <button
              type="button"
              onClick={() => handleCopyText(getBackendApiUrl())}
              style={{ padding: '0.75rem', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'left', overflowWrap: 'anywhere' }}
            >
              Backend aktif: {getBackendApiUrl()}
            </button>
          </div>

          {/(localhost|127\.0\.0\.1)/.test(`${settings.publicFrontendUrl || window.location.origin} ${settings.publicGalleryBaseUrl || ''}`) && (
            <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #fed7aa', background: '#fff7ed', color: '#9a3412', fontWeight: 800, fontSize: '0.86rem' }}>
              Untuk test dari HP, ganti localhost menjadi IP komputer booth, contoh http://192.168.x.x:5173.
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#fff7ed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold', color: '#495057' }}>Camera Device Booth</label>
              <p style={{ fontSize: '0.82rem', color: '#868e96', margin: 0 }}>Dipilih admin/operator dan otomatis dipakai customer saat sesi foto.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {(settings.cameraProfiles || []).map((profile, index) => (
              <div key={profile.id} style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #fed7aa', background: 'white' }}>
                <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Posisi Kamera {index + 1}</label>
                <input
                  value={profile.name || ''}
                  onChange={(event) => updateCameraProfile(profile.id, { name: event.target.value })}
                  placeholder={`Posisi Kamera ${index + 1}`}
                  style={{ width: '100%', boxSizing: 'border-box', marginBottom: '0.6rem', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ced4da' }}
                />
                <div style={{ marginBottom: '0.4rem', color: '#495057', fontWeight: 700, fontSize: '0.82rem' }}>Mode Kamera</div>
                <select value={profile.captureMode || 'dslr'} onChange={(event) => updateCameraProfile(profile.id, { captureMode: event.target.value })} style={{ width: '100%', marginBottom: '0.6rem', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ced4da', background: 'white' }}>
                    <option value="dslr">DSLR (USB / gphoto2)</option>
                    <option value="webcam">Webcam (Browser / HP)</option>
                </select>

                {(profile.captureMode || 'dslr') === 'dslr' ? (
                  <>
                    <div style={{ marginBottom: '0.4rem', color: '#495057', fontWeight: 700, fontSize: '0.82rem' }}>Canon DSLR melalui Camera Bridge (Zadig / WinUSB)</div>
                    <select value={profile.tetherPort || ''} onChange={(event) => updateCameraProfile(profile.id, { tetherPort: event.target.value })} style={{ width: '100%', marginTop: '0.6rem', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ced4da', background: 'white' }}>
                        <option value="">Pilih DSLR dari Camera Agent</option>
                        {dslrCameras.map(camera => <option key={camera.port} value={camera.port}>{camera.model} — {camera.stable === false ? `${camera.port} (ID sementara)` : camera.port}</option>)}
                    </select>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: '0.4rem', color: '#495057', fontWeight: 700, fontSize: '0.82rem' }}>Pilih Webcam Device (Aktifkan Izin Kamera di Browser)</div>
                    <select value={profile.deviceId || ''} onChange={(event) => updateCameraProfile(profile.id, { deviceId: event.target.value, deviceLabel: event.target.options[event.target.selectedIndex].text })} style={{ width: '100%', marginTop: '0.6rem', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ced4da', background: 'white' }}>
                        <option value="">Default Kamera ({profile.facingMode === 'environment' ? 'Belakang' : 'Depan'})</option>
                        {webcams.map(cam => <option key={cam.deviceId} value={cam.deviceId}>{cam.label}</option>)}
                    </select>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => loadCameraDevices(profile, index + 1)}
                  disabled={Boolean(refreshingCameraId)}
                  style={{ width: '100%', marginTop: '0.6rem', padding: '0.65rem 0.8rem', background: '#111827', color: 'white', border: 'none', borderRadius: '8px', cursor: refreshingCameraId ? 'wait' : 'pointer', fontWeight: 'bold' }}
                >
                  {refreshingCameraId === profile.id ? `Mengecek Kamera ${index + 1}...` : `Refresh Kamera ${index + 1}`}
                </button>
                {lastRefreshedCameraId === profile.id && cameraMessage && (
                  <div style={{ marginTop: '0.55rem', padding: '0.55rem 0.65rem', borderRadius: '7px', background: dslrCameras.length ? '#dcfce7' : '#fef2f2', color: dslrCameras.length ? '#166534' : '#b91c1c', fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.35 }}>
                    {cameraMessage}
                  </div>
                )}
                {(() => {
                  const status = getCameraProfileStatus(profile);
                  return <div style={{ marginTop: '0.6rem', padding: '0.45rem 0.6rem', borderRadius: '7px', color: status.color, background: status.background, fontSize: '0.78rem', fontWeight: 800 }}>{status.text}</div>;
                })()}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.7rem', color: '#495057', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  <input type="checkbox" checked={Boolean(profile.enabled)} onChange={(event) => updateCameraProfile(profile.id, { enabled: event.target.checked })} style={{ width: 17, height: 17, accentColor: '#f97316' }} />
                  Aktifkan pilihan posisi ini
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.45rem', color: '#495057', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  <input type="checkbox" checked={Boolean(profile.mirror)} onChange={(event) => updateCameraProfile(profile.id, { mirror: event.target.checked })} style={{ width: 17, height: 17, accentColor: '#f97316' }} />
                  Mirror preview & hasil
                </label>

                {profile.enabled && (
                  <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #e5e7eb' }}>
                    <button
                      type="button"
                      onClick={() => handleTestCamera(profile.id)}
                      disabled={isTestingCamera}
                      style={{ width: '100%', padding: '0.85rem 1rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: isTestingCamera ? 'wait' : 'pointer', fontWeight: 'bold' }}
                    >
                      {isTestingCamera && previewCameraId === profile.id ? 'Menyalakan...' : `Test Kamera ${index + 1}`}
                    </button>
                    
                    {previewCameraId === profile.id && (
                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ background: '#111827', borderRadius: '12px', minHeight: '180px', overflow: 'hidden', display: 'grid', placeItems: 'center', border: '1px solid #1f2937', marginBottom: '0.75rem' }}>
                          {previewImage ? (
                            <img src={previewImage} alt="Hasil foto" style={{ width: '100%', height: '100%', minHeight: '180px', objectFit: 'contain', display: 'block' }} />
                          ) : (
                            <video
                              ref={previewVideoRef}
                              muted
                              playsInline
                              className={profile.mirror ? 'is-mirrored' : ''}
                              style={{ width: '100%', height: '100%', minHeight: '180px', objectFit: 'cover', display: 'block' }}
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleStopPreview}
                          style={{ width: '100%', padding: '0.85rem 1rem', background: 'white', color: '#111827', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Stop Preview
                        </button>
                        {cameraMessage && (
                          <div style={{ marginTop: '0.75rem', padding: '0.8rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e5e7eb', color: '#4b5563', fontSize: '0.82rem', lineHeight: 1.4 }}>
                            {cameraMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: '#868e96' }}>Pilih ID Canon berbeda untuk setiap posisi. ID berformat canon:serial bersifat permanen; jangan simpan pilihan bertanda ID sementara.</p>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold', color: '#495057' }}>Printer Booth</label>
              <p style={{ fontSize: '0.82rem', color: '#868e96', margin: 0 }}>Foto dikirim langsung oleh Hardware Agent ke driver Windows/HiTi, tanpa dialog print browser.</p>
            </div>
            <button
              type="button"
              onClick={loadHardwarePrinters}
              disabled={isLoadingPrinters}
              style={{ padding: '0.65rem 1rem', background: '#111827', color: 'white', border: 'none', borderRadius: '8px', cursor: isLoadingPrinters ? 'wait' : 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
            >
              {isLoadingPrinters ? 'Membaca...' : 'Refresh Printer'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Mode Print</label>
              <div style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontWeight: 800 }}>Printer Windows melalui Hardware Agent</div>
              <p style={{ fontSize: '0.78rem', color: '#868e96', marginTop: '0.35rem' }}>Menggunakan driver printer yang terpasang di Mini PC.</p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Printer HiTi dari Windows</label>
              <select
                value={settings.printerName || ''}
                onChange={(event) => setSettings(previous => ({ ...previous, printerName: event.target.value, printMode: 'hardware_agent' }))}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem', background: 'white' }}
              >
                <option value="">Pilih printer dari Hardware Agent</option>
                {hardwarePrinters.map(printer => <option key={printer.name} value={printer.name}>{printer.name}{printer.isDefault ? ' (Default Windows)' : ''}</option>)}
              </select>
              <p style={{ fontSize: '0.78rem', color: hardwarePrinters.length ? '#166534' : '#b91c1c', marginTop: '0.35rem' }}>{printerMessage || 'Klik Refresh Printer untuk membaca driver Windows.'}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', color: '#495057', fontWeight: 'bold' }}>
              <input
                type="checkbox"
                name="autoPrintEnabled"
                checked={Boolean(settings.autoPrintEnabled)}
                onChange={handleChange}
                style={{ width: 18, height: 18, accentColor: '#f97316' }}
              />
              Auto print setelah foto selesai
            </label>

            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Delay Auto Print (detik)</label>
              <input
                type="number"
                name="printDelaySeconds"
                value={settings.printDelaySeconds ?? 1.5}
                onChange={handleChange}
                min="0"
                max="10"
                step="0.5"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
              />
            </div>
          </div>

          <textarea
            name="printNote"
            value={settings.printNote || ''}
            onChange={handleChange}
            placeholder="Catatan operator, contoh: set printer default ke 4R borderless sebelum event."
            style={{ width: '100%', minHeight: '76px', marginTop: '1rem', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.95rem', resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057' }}>Idle Timeout (Detik)</label>
          <input 
            type="number" 
            name="idleTimeout" 
            value={settings.idleTimeout ?? 60} 
            onChange={handleChange}
            min="10" max="300"
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
          />
          <p style={{ fontSize: '0.8rem', color: '#868e96', marginTop: '0.3rem' }}>Waktu diam sebelum sistem otomatis kembali ke layar awal.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="submit" style={{ padding: '0.8rem 2rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Simpan Pengaturan
          </button>
          {savedMessage && <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓ {savedMessage}</span>}
        </div>
      </form>
    </div>
  );
}
