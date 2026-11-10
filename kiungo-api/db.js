// db.js
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  throw new Error(
    'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in kiungo-api/.env.'
  );
}

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { 'X-Client-Info': 'kiungo-api' },
    },
  }
);

module.exports = { supabase };
