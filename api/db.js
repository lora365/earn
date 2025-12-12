// Supabase database helper
const { createClient } = require('@supabase/supabase-js');

// Get environment variables
// Prefer service role key if provided (server-side safe), otherwise anon key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Create Supabase client
let supabase = null;

function getSupabaseClient() {
  if (!supabase && supabaseUrl && supabaseKey) {
    console.log('✅ Creating Supabase client');
    console.log('   URL:', supabaseUrl);
    console.log('   Key type:', supabaseKey.startsWith('eyJ') ? 'JWT Token' : 'Other');
    console.log('   Key length:', supabaseKey.length);
    supabase = createClient(supabaseUrl, supabaseKey);
  } else if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase not configured!');
    console.error('   SUPABASE_URL:', supabaseUrl ? `✅ ${supabaseUrl.substring(0, 30)}...` : '❌ MISSING');
    console.error('   SUPABASE_KEY:', supabaseKey ? `✅ Present (${supabaseKey.length} chars)` : '❌ MISSING');
  }
  return supabase;
}

// Check if Supabase is configured
function isSupabaseConfigured() {
  const configured = !!(supabaseUrl && supabaseKey);
  if (!configured) {
    console.error('❌ Supabase not configured - SUPABASE_URL:', !!supabaseUrl, 'SUPABASE_ANON_KEY:', !!supabaseKey);
  }
  return configured;
}

module.exports = {
  getSupabaseClient,
  isSupabaseConfigured
};

