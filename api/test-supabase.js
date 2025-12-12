// Test Supabase connection
const { getSupabaseClient, isSupabaseConfigured } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const checkResult = {
    supabaseConfigured: isSupabaseConfigured(),
    hasUrl: !!process.env.SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    urlValue: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'MISSING',
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
    anonKeyLength: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 0,
  };

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      
      // Test query
      const { data, error } = await supabase
        .from('leaderboard_users')
        .select('count')
        .limit(1);
      
      checkResult.testQuerySuccess = !error;
      checkResult.testQueryError = error ? error.message : null;
    }
  } catch (err) {
    checkResult.testError = err.message;
  }

  res.json(checkResult);
};

