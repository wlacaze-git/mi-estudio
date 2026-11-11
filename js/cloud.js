// Nube: Supabase para cuentas, datos y fotos.
// La app sigue funcionando local-first: si esto falla, se estudia igual.
import { CLOUD_ENABLED, SUPABASE_KEY, SUPABASE_URL } from './config.js';
import { activeProfileId, getState, replaceState } from './store.js';
import { getImageBlob, putImage } from './images.js';

const BOUND_KEY = 'miEstudio.cloud.profile';
const BUCKET = 'fotos';

const listeners = new Set();
let client = null;
let initializing = null;
let pushTimer = null;
let suppressPushUntil = 0;

const cloud = {
  enabled: CLOUD_ENABLED,
  user: null,
  status: CLOUD_ENABLED ? 'signed-out' : 'off',
  lastSync: null,
  error: '',
  boundProfileId: null,
};

export function authUrlError() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const description = search.get('error_description') || hash.get('error_description')
    || search.get('error') || hash.get('error');
  if (!description) return '';
  window.history.replaceState(null, '', window.location.pathname);
  return description.replace(/\+/g, ' ');
}

export function cloudSnapshot() {
  return { ...cloud };
}

export function onCloudChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn(cloudSnapshot());
    } catch (err) {
      console.warn(err);
    }
  });
}

function friendly(error) {
  const message = String((error && (error.message || error.error_description)) || error || '');
  if (/paus|540|503|failed to fetch|network|load failed/i.test(message)) {
    return 'La nube no está disponible ahora. Si el proyecto está pausado, reactivalo en supabase.com y volvé a intentar.';
  }
  if (/row-level security|permission denied|401|403|JWT/i.test(message)) {
    return 'No hay permiso para eso en la nube. Revisá las reglas RLS del SQL.';
  }
  return message || 'No se pudo conectar con la nube.';
}

function isLocalEmpty() {
  const s = getState();
  return !(s.attempts || []).length && !(s.daysStudied || []).length && !(s.xp || 0);
}

export async function initCloud() {
  if (!CLOUD_ENABLED) {
    cloud.status = 'off';
    emit();
    return null;
  }
  if (initializing) return initializing;
  initializing = (async () => {
    try {
      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        cloud.status = 'off';
        cloud.error = 'La librería de la nube no está cargada.';
        emit();
        return null;
      }
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
      });
      client.auth.onAuthStateChange((event, session) => {
        cloud.user = session ? session.user : null;
        if (cloud.user) {
          cloud.boundProfileId = localStorage.getItem(BOUND_KEY) || activeProfileId();
          localStorage.setItem(BOUND_KEY, cloud.boundProfileId);
          if (cloud.status !== 'syncing') cloud.status = 'idle';
        } else {
          cloud.status = 'signed-out';
        }
        emit();
      });
      const { data } = await client.auth.getSession();
      cloud.user = data.session ? data.session.user : null;
      if (cloud.user) {
        cloud.boundProfileId = localStorage.getItem(BOUND_KEY) || activeProfileId();
        localStorage.setItem(BOUND_KEY, cloud.boundProfileId);
        cloud.status = 'idle';
        setTimeout(() => { syncOnLogin().catch(() => {}); }, 0);
      } else {
        cloud.status = 'signed-out';
      }
    } catch (error) {
      cloud.status = 'error';
      cloud.error = friendly(error);
    } finally {
      emit();
    }
    return client;
  })();
  return initializing;
}

export async function signIn(provider = 'google') {
  await initCloud();
  if (!client) throw new Error('La nube no está disponible en este momento.');
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
  if (error) throw new Error(friendly(error));
}

export async function signOut() {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw new Error(friendly(error));
  cloud.user = null;
  cloud.status = 'signed-out';
  cloud.boundProfileId = null;
  localStorage.removeItem(BOUND_KEY);
  emit();
}

export function bindToCurrentProfile() {
  const id = activeProfileId();
  localStorage.setItem(BOUND_KEY, id);
  cloud.boundProfileId = id;
  cloud.status = cloud.user ? 'idle' : 'signed-out';
  emit();
}

function checkProfile() {
  if (!cloud.user) throw new Error('Primero entrá con tu cuenta.');
  if (cloud.boundProfileId && activeProfileId() !== cloud.boundProfileId) {
    cloud.status = 'paused';
    emit();
    throw new Error('Este perfil no es el que sincroniza. Tocá “Usar este perfil” para conectarlo.');
  }
}

async function remoteExists() {
  if (!client || !cloud.user) return false;
  const { data, error } = await client
    .from('estados')
    .select('user_id')
    .eq('user_id', cloud.user.id)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function syncOnLogin() {
  await initCloud();
  if (!client || !cloud.user) return;
  if (isLocalEmpty()) {
    const pulled = await downloadNow({ silent: true }).catch(() => false);
    if (!pulled) await pushNow().catch(() => {});
    return;
  }
  if (!(await remoteExists())) await pushNow().catch(() => {});
}

export async function pushNow() {
  await initCloud();
  if (!client) throw new Error('La nube no está disponible en este momento.');
  checkProfile();
  cloud.status = 'syncing';
  cloud.error = '';
  emit();
  try {
    const state = getState();
    const { error } = await client.from('estados').upsert({
      user_id: cloud.user.id,
      datos: state,
      actualizado: new Date().toISOString(),
    });
    if (error) throw error;
    await uploadPhotos(state, cloud.user.id);
    cloud.lastSync = new Date().toISOString();
    cloud.status = 'synced';
    emit();
  } catch (error) {
    cloud.status = 'error';
    cloud.error = friendly(error);
    emit();
    throw new Error(cloud.error);
  }
}

export async function downloadNow({ silent = false } = {}) {
  await initCloud();
  if (!client) throw new Error('La nube no está disponible en este momento.');
  checkProfile();
  cloud.status = 'syncing';
  emit();
  try {
    const { data, error } = await client
      .from('estados')
      .select('datos, actualizado')
      .eq('user_id', cloud.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.datos) {
      cloud.status = 'idle';
      emit();
      if (!silent) throw new Error('Todavía no hay datos guardados en la nube.');
      return false;
    }
    await downloadPhotos(cloud.user.id);
    suppressPushUntil = Date.now() + 5000;
    replaceState(data.datos);
    cloud.lastSync = data.actualizado || new Date().toISOString();
    cloud.status = 'synced';
    emit();
    return true;
  } catch (error) {
    cloud.status = 'error';
    cloud.error = friendly(error);
    emit();
    throw new Error(cloud.error);
  }
}

export function schedulePush() {
  if (!cloud.user || !client) return;
  if (Date.now() < suppressPushUntil) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushNow().catch(() => {});
  }, 3000);
}

function imageIds(state) {
  const ids = new Set();
  (state.notes || []).forEach((note) => (note.images || []).forEach((img) => img && img.id && ids.add(img.id)));
  (state.exams || []).forEach((plan) => (plan.photos || []).forEach((img) => img && img.id && ids.add(img.id)));
  if (state.schedulePhotoId) ids.add(state.schedulePhotoId);
  if (state.avatarPhotoId) ids.add(state.avatarPhotoId);
  return [...ids];
}

async function uploadPhotos(state, userId) {
  for (const id of imageIds(state)) {
    try {
      const blob = await getImageBlob(id);
      if (!blob) continue;
      await client.storage.from(BUCKET).upload(`${userId}/${id}.jpg`, blob, {
        upsert: true,
        contentType: blob.type || 'image/jpeg',
      });
    } catch (error) {
      console.warn('No se pudo subir la foto', id, error);
    }
  }
}

async function downloadPhotos(userId) {
  try {
    const { data: files, error } = await client.storage.from(BUCKET).list(userId, { limit: 1000 });
    if (error) throw error;
    for (const file of files || []) {
      if (!file.name || file.name.startsWith('.')) continue;
      const id = file.name.replace(/\.[^.]+$/, '');
      if (await getImageBlob(id)) continue;
      const { data } = await client.storage.from(BUCKET).download(`${userId}/${file.name}`);
      if (data) await putImage(id, data);
    }
  } catch (error) {
    console.warn('No se pudieron bajar las fotos', error);
  }
}
