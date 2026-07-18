import { backendRequest } from './backendApi.js';

const localAgentMessage = 'DSLR Tethering harus memakai backend lokal di komputer booth. Jalankan npm run kiosk:start lalu buka http://localhost:8787.';

async function tetherRequest(path, options) {
  try {
    return await backendRequest(path, null, options);
  } catch (error) {
    if (error?.status === 404) throw new Error(localAgentMessage);
    throw error;
  }
}

export async function listDslrCameras() {
  return tetherRequest('/api/dslr/cameras');
}

export async function captureDslrPhoto(port) {
  return tetherRequest('/api/dslr/capture', {
    method: 'POST',
    body: JSON.stringify({ port }),
  });
}
