import { backendRequest } from './backendApi.js';

export async function listDslrCameras() {
  return backendRequest('/api/dslr/cameras');
}

export async function captureDslrPhoto(port) {
  return backendRequest('/api/dslr/capture', null, {
    method: 'POST',
    body: JSON.stringify({ port }),
  });
}
