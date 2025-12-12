// Test Supabase connection
let supabaseClient, dbModule;
let moduleLoadError = null;

try {
  dbModule = require('./db');
  supabaseClient = dbModule.getSupabaseClient();
} catch (err) {
  moduleLoadError = err.message;
  console.error('Failed to load db module:', err);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const checkResult = {
    nodeVersion: process.version,
    moduleLoadError: moduleLoadError,
    supabaseConfigured: dbModule ? dbModule.isSupabaseConfigured() : false,
    hasUrl: !!process.env.SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    urlValue: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'MISSING',
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
    anonKeyLength: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 0,
    packageJsonExists: false,
    dependencies: null,
  };

  // Check if @supabase/supabase-js is available
  try {
    const fs = require('fs');
    const path = require('path');
    const packagePath = path.join(process.cwd(), 'package.json');
    checkResult.packageJsonExists = fs.existsSync(packagePath);
    
    if (checkResult.packageJsonExists) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      checkResult.dependencies = packageJson.dependencies || {};
      checkResult.hasSupabasePackage = !!packageJson.dependencies['@supabase/supabase-js'];
    }
  } catch (err) {
    checkResult.packageJsonError = err.message;
  }

  // Test Supabase connection
  try {
    if (dbModule && dbModule.isSupabaseConfigured()) {
      const supabase = dbModule.getSupabaseClient();
      
      if (!supabase) {
        checkResult.testQueryError = 'Supabase client is null';
      } else {
        // Test query - use select() instead of count
        const { data, error } = await supabase
          .from('leaderboard_users')
          .select('wallet_address')
          .limit(1);
        
        checkResult.testQuerySuccess = !error;
        checkResult.testQueryError = error ? error.message : null;
        checkResult.testQueryErrorCode = error ? error.code : null;
        checkResult.testQueryErrorDetails = error ? error.details : null;
        checkResult.testQueryData = data ? `Found ${data.length} records` : null;
      }
    } else {
      checkResult.testQueryError = 'Supabase not configured';
    }
  } catch (err) {
    checkResult.testError = err.message;
    checkResult.testErrorStack = err.stack;
  }

  res.json(checkResult);
};

