export async function getCameraStream(facingMode = 'user') {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser ini belum mendukung akses kamera.');
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1440 },
      height: { ideal: 1080 },
    },
    audio: false,
  });
}

export function captureVideoFrame(videoElement, options = {}) {
  const { mirror = false } = options;

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');

  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  // Draw base video
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.95);
}
