// Configuración de la nube (Supabase).
// La "publishable key" es pública a propósito: lo que protege los datos son las
// reglas RLS del SQL. NUNCA poner acá la secret key / service_role.
export const SUPABASE_URL = 'https://ownqsuajfdckytssajiq.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_rMWlFgo6GMlFBLL29qAkNg_nlo3e6Ce';
export const CLOUD_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);
