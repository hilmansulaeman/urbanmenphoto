const STORAGE_KEY = 'potobox_kiosk_settings';

const defaultSettings = {
  kioskName: 'Urbanmenphoto Booth',
  defaultCamera: 'user', // 'user' (front) or 'environment' (rear)
  idleTimeout: 60, // in seconds
  autoPrintEnabled: false
};

export function getKioskSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to read kiosk settings', e);
  }
  return defaultSettings;
}

export function saveKioskSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('Failed to save kiosk settings', e);
    return false;
  }
}
