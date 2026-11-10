// Helpers de interfaz compartidos.

export function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let toastTimer = null;
export function toast(message, kind = 'ok') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.dataset.kind = kind;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2800);
}

let modalRoot = null;
let lastFocused = null;

export function openModal(html, { label = 'Ventana' } = {}) {
  modalRoot = modalRoot || document.getElementById('modal-root');
  lastFocused = document.activeElement;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(label)}" data-stop="1">
        ${html}
      </div>
    </div>`;
  document.body.classList.add('modal-open');
  const focusable = modalRoot.querySelector('input, textarea, select, button');
  if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 60);
}

export function closeModal() {
  if (!modalRoot) modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;
  modalRoot.innerHTML = '';
  document.body.classList.remove('modal-open');
  const closed = document.createEvent('CustomEvent');
  closed.initCustomEvent('modal:closed', false, false, null);
  document.dispatchEvent(closed);
  if (lastFocused && typeof lastFocused.focus === 'function') {
    try { lastFocused.focus({ preventScroll: true }); } catch { /* ignore */ }
  }
}

export function isModalOpen() {
  const root = document.getElementById('modal-root');
  return Boolean(root && root.firstElementChild);
}

export function hexToRgba(hex, alpha = 1) {
  const clean = String(hex || '#ec4899').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '🙂';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

/** Anillo de progreso en SVG (0..1). */
export function progressRing(value, color = '#ec4899', size = 64, stroke = 7) {
  const pct = Math.max(0, Math.min(1, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return `
    <svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${hexToRgba(color, 0.16)}" stroke-width="${stroke}"></circle>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${dash} ${c - dash}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle>
    </svg>`;
}

export function downloadFile(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function prettyDateForFile(iso = new Date().toISOString().slice(0, 10)) {
  return iso;
}

