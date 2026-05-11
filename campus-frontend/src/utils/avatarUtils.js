export const avatarOutputSize = 256;
export const minAvatarZoom = 1;
export const maxAvatarZoom = 3;

export const clampAvatarZoom = (zoom) => {
  const numericZoom = Number(zoom);
  if (!Number.isFinite(numericZoom)) {
    return minAvatarZoom;
  }
  return Math.min(maxAvatarZoom, Math.max(minAvatarZoom, numericZoom));
};

export const getCenteredAvatarCrop = (width, height, zoom = minAvatarZoom) => {
  const safeWidth = Number(width);
  const safeHeight = Number(height);
  if (!Number.isFinite(safeWidth) || !Number.isFinite(safeHeight) || safeWidth <= 0 || safeHeight <= 0) {
    return { sx: 0, sy: 0, size: 0 };
  }

  const cropSize = Math.min(safeWidth, safeHeight) / clampAvatarZoom(zoom);
  return {
    sx: Math.max(0, (safeWidth - cropSize) / 2),
    sy: Math.max(0, (safeHeight - cropSize) / 2),
    size: cropSize,
  };
};

export const isSupportedAvatarDataUrl = (dataUrl) =>
  typeof dataUrl === 'string' &&
  /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(dataUrl.trim()) &&
  dataUrl.length <= 500000;

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('无法读取头像图片'));
    reader.readAsDataURL(file);
  });

export const createCroppedAvatarDataUrl = (sourceDataUrl, zoom = minAvatarZoom) =>
  new Promise((resolve, reject) => {
    if (!isSupportedAvatarDataUrl(sourceDataUrl)) {
      reject(new Error('不支持的头像图片格式'));
      return;
    }

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = avatarOutputSize;
      canvas.height = avatarOutputSize;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('当前浏览器无法处理头像图片'));
        return;
      }

      const crop = getCenteredAvatarCrop(image.naturalWidth, image.naturalHeight, zoom);
      context.drawImage(
        image,
        crop.sx,
        crop.sy,
        crop.size,
        crop.size,
        0,
        0,
        avatarOutputSize,
        avatarOutputSize,
      );
      resolve(canvas.toDataURL('image/png', 0.92));
    };
    image.onerror = () => reject(new Error('无法加载头像图片'));
    image.src = sourceDataUrl;
  });
