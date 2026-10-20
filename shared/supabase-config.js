// This file contains only browser-safe Supabase connection values.
// Never put a Secret key, service_role key, or management access token here.
window.EUME_SUPABASE_CONFIG = Object.freeze({
  url: "https://dbvhylhloyvtbeseflye.supabase.co",
  publishableKey: "sb_publishable_tN4Vj7cTrNdtOnuQfa3LFg_xI7zJAb-"
});

window.getEumeSupabaseClient = (() => {
  let client = null;

  return () => {
    if (client) return client;

    const config = window.EUME_SUPABASE_CONFIG;
    const isConfigured = config
      && /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(config.url)
      && config.publishableKey
      && !config.publishableKey.startsWith("__");

    if (!isConfigured || !window.supabase?.createClient) return null;

    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    return client;
  };
})();
