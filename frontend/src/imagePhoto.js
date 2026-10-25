// Redimensionne une image (File) en JPEG 256 px max, retourne une data URL.
export function redimensionner(file, T = 256, q = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(T / img.width, T / img.height, 1);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * ratio); c.height = Math.round(img.height * ratio);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', q));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export const CATEGORIES_PERMIS = ['4A', '4B', '4C', '5', '6A', '6B', '6C', '6D', '6E', '8'];
