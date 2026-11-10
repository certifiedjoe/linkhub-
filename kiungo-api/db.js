// db.js
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  console.warn('⚠️  Supabase credentials missing. Backend will not work properly.');
}

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = { supabase };