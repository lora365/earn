// Supabase database helper
const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Create Supabase client
let supabase = null;

function getSupabaseClient() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Check if Supabase is configured
function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseKey);
}

module.exports = {
  getSupabaseClient,
  isSupabaseConfigured
};

