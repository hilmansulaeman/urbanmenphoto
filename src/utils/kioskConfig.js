const STORAGE_KEY = 'potobox_kiosk_settings';

const defaultSettings = {
  boothId: '',
  kioskName: 'Urbanmenphoto Booth',
  eventName: '',
  boothLocation: '',
  operatorName: '',
  publicFrontendUrl: '',
  publicGalleryBaseUrl: '',
  backendApiUrl: '',
  defaultCamera: 'user', // 'user' (front) or 'environment' (rear)
  cameraDeviceId: '',
  cameraDeviceLabel: '',
  mirrorCamera: true,
  // Each position is a physical camera. deviceId is supplied by the browser.
  // Camera 1 is kept compatible with the previous single-camera setup.
  cameraProfiles: [],
  idleTimeout: 60, // in seconds
  autoPrintEnabled: false,
  printMode: 'dialog',
  printDelaySeconds: 1.5,
  printerName: '',
  printNote: ''
};

const createLegacyCameraProfiles = (settings = {}) => ([
  {
    id: 'camera-1',
    name: 'Cam 1 (Normal Angle)',
    deviceId: settings.cameraDeviceId || '',
    deviceLabel: settings.cameraDeviceLabel || '',
    captureMode: 'webcam',
    tetherPort: '',
    facingMode: settings.defaultCamera || 'user',
    mirror: settings.mirrorCamera !== false,
    enabled: true,
  },
  {
    id: 'camera-2',
    name: 'Cam 2 (Wide Angle)',
    deviceId: '',
    deviceLabel: '',
    captureMode: 'webcam',
    tetherPort: '',
    facingMode: 'environment',
    mirror: false,
    enabled: false,
  },
]);

const normalizeCameraProfiles = (settings = {}) => {
  const source = Array.isArray(settings.cameraProfiles) && settings.cameraProfiles.length
    ? settings.cameraProfiles
    : createLegacyCameraProfiles(settings);

  return ['camera-1', 'camera-2'].map((id, index) => {
    const profile = source.find(item => item?.id === id) || source[index] || {};
    return {
      id,
      name: profile.name || (index === 0 ? 'Cam 1 (Normal Angle)' : 'Cam 2 (Wide Angle)'),
      deviceId: profile.deviceId || '',
      deviceLabel: profile.deviceLabel || '',
      captureMode: profile.captureMode === 'dslr' ? 'dslr' : 'webcam',
      tetherPort: profile.tetherPort || '',
      facingMode: profile.facingMode || (index === 0 ? settings.defaultCamera || 'user' : 'environment'),
      mirror: typeof profile.mirror === 'boolean' ? profile.mirror : index === 0 ? settings.mirrorCamera !== false : false,
      enabled: typeof profile.enabled === 'boolean' ? profile.enabled : index === 0,
    };
  });
};

const createBoothId = () => `booth-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const trimTrailingSlash = (value = '') => String(value || '').trim().replace(/\/$/, '');

export function getKioskSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const settings = { ...defaultSettings, ...JSON.parse(stored) };
      return { ...settings, boothId: settings.boothId || createBoothId(), cameraProfiles: normalizeCameraProfiles(settings) };
    }
  } catch (e) {
    console.error('Failed to read kiosk settings', e);
  }
  return { ...defaultSettings, boothId: createBoothId(), cameraProfiles: normalizeCameraProfiles(defaultSettings) };
}

export function getCameraProfiles(settings = getKioskSettings()) {
  return normalizeCameraProfiles(settings).filter(profile => profile.enabled);
}

export function saveKioskSettings(settings) {
  try {
    const cameraProfiles = normalizeCameraProfiles(settings);
    const firstCamera = cameraProfiles[0];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...settings,
      cameraProfiles,
      // Preserve these legacy fields for existing kiosk configurations.
      cameraDeviceId: firstCamera.deviceId,
      cameraDeviceLabel: firstCamera.deviceLabel,
      defaultCamera: firstCamera.facingMode,
      mirrorCamera: firstCamera.mirror,
      boothId: settings.boothId || createBoothId(),
      publicFrontendUrl: trimTrailingSlash(settings.publicFrontendUrl),
      publicGalleryBaseUrl: trimTrailingSlash(settings.publicGalleryBaseUrl),
      backendApiUrl: trimTrailingSlash(settings.backendApiUrl),
    }));
    return true;
  } catch (e) {
    console.error('Failed to save kiosk settings', e);
    return false;
  }
}

export function getPublicGalleryBaseUrl(settings = getKioskSettings()) {
  const configured = trimTrailingSlash(settings.publicGalleryBaseUrl || settings.publicFrontendUrl);
  if (configured) return configured;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function getConfiguredBackendApiUrl(fallback = '') {
  const configured = trimTrailingSlash(getKioskSettings().backendApiUrl);
  return configured || trimTrailingSlash(fallback);
}
