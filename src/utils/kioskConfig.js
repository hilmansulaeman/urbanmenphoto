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
  idleTimeout: 60, // in seconds
  autoPrintEnabled: false,
  printMode: 'dialog',
  printDelaySeconds: 1.5,
  printerName: '',
  printNote: ''
};

const createBoothId = () => `booth-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const trimTrailingSlash = (value = '') => String(value || '').trim().replace(/\/$/, '');

export function getKioskSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const settings = { ...defaultSettings, ...JSON.parse(stored) };
      return { ...settings, boothId: settings.boothId || createBoothId() };
    }
  } catch (e) {
    console.error('Failed to read kiosk settings', e);
  }
  return { ...defaultSettings, boothId: createBoothId() };
}

export function saveKioskSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...settings,
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
