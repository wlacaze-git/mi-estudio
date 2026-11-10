// Fotos de los apuntes: compresión + guardado en IndexedDB.
// Las imágenes no van a localStorage (que es chico): se guardan como blobs.

const DB_NAME = 'miEstudio';
const STORE = 'images';
const MAX_SIDE = 1400;
const QUALITY = 0.72;

let dbPromise = null;
const urlCache = new Map();

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function putImage(id, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getImageBlob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteImage(id) {
  urlCache.delete(id);
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* si no hay IndexedDB no hay nada que borrar */ }
}

export async function deleteImages(ids = []) {
  for (const id of ids) await deleteImage(id);
}

/** URL usable en <img> para una foto guardada. */
export async function imageUrl(id) {
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = await getImageBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No pude leer la imagen'));
    };
    img.src = url;
  });
}

async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* probamos con <img> */ }
  }
  return loadImageFromFile(file);
}

/**
 * Achica la foto (máx. 1400 px de lado) y la convierte a JPEG.
 * Devuelve { blob, width, height }.
 */
export async function compressImage(file, { maxSide = MAX_SIDE, quality = QUALITY } = {}) {
  const bitmap = await decode(file);
  const width = bitmap.width;
  const height = bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (typeof bitmap.close === 'function') bitmap.close();

  const toBlob = (q) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', q));
  let blob = await toBlob(quality);
  if (blob && blob.size > 900 * 1024) blob = await toBlob(0.55);
  if (!blob) throw new Error('No pude comprimir la imagen');
  return { blob, width: w, height: h };
}

export async function saveFile(file) {
  const { blob, width, height } = await compressImage(file);
  const id = `img${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await putImage(id, blob);
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return { id, width, height, url, bytes: blob.size };
}

export function localUrl(id) {
  return urlCache.get(id) || null;
}

/** Pone el src de todas las imágenes marcadas con data-image-id. */
export async function hydrate(root = document) {
  const images = [...root.querySelectorAll('img[data-image-id]')];
  for (const img of images) {
    if (img.dataset.loaded === '1') continue;
    const id = img.dataset.imageId;
    if (!id) continue;
    try {
      const url = await imageUrl(id);
      if (url) {
        img.src = url;
        img.dataset.loaded = '1';
        img.classList.add('is-loaded');
      }
    } catch { /* dejamos el placeholder */ }
  }
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataURLToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}
