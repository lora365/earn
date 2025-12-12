const { getSupabaseClient, isSupabaseConfigured } = require('./db');

function calculateUserXP(completedTasks) {
  const taskXP = {
    1: 100, // Follow Resilora on X
    2: 150, // Retweet Latest Post
    3: 75,  // Like 3 Posts
    4: 200, // Share Project Update
    5: 200, // Join Resilora Telegram
    6: 10,  // Test Task (QA)
    7: 50   // Visit Resilora Website
  };
  
  let totalXP = 0;
  if (completedTasks && Array.isArray(completedTasks)) {
    completedTasks.forEach(task => {
      if (task.status === 'completed' && taskXP[task.id]) {
        totalXP += taskXP[task.id];
      }
    });
  }
  
  return totalXP;
}


module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { walletAddress, tasks } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }
    
    const xp = calculateUserXP(tasks);
    
    // Use Supabase if configured, otherwise fallback to file system
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      
      // Upsert user data
      const upsertData = {
        wallet_address: walletAddress.toLowerCase(),
        xp: xp,
        tasks: tasks || [],
        updated_at: new Date().toISOString()
      };
      
      console.log('📝 Upserting data to Supabase:');
      console.log('   Table: leaderboard_users');
      console.log('   Data:', JSON.stringify(upsertData, null, 2));
      
      const { data: userData, error: upsertError, status, statusText } = await supabase
        .from('leaderboard_users')
        .upsert(upsertData, {
          onConflict: 'wallet_address'
        })
        .select();
      
      console.log('📊 Upsert response:');
      console.log('   Status:', status);
      console.log('   StatusText:', statusText);
      console.log('   Data:', userData ? JSON.stringify(userData, null, 2) : 'null');
      console.log('   Error:', upsertError ? JSON.stringify(upsertError, null, 2) : 'null');
      
      if (userData) {
        console.log('✅ Upsert successful! Data saved to Supabase.');
      }
      
      if (upsertError) {
        console.error('❌ Supabase upsert error:', upsertError);
        console.error('Error code:', upsertError.code);
        console.error('Error message:', upsertError.message);
        console.error('Error details:', upsertError.details);
        console.error('Error hint:', upsertError.hint);
        return res.status(500).json({ 
          success: false, 
          error: 'Database error: ' + upsertError.message,
          errorCode: upsertError.code,
          errorDetails: upsertError
        });
      }
      
      if (!userData) {
        console.warn('⚠️ Upsert returned no data (but no error either). Check if data was saved.');
      }
      
      // Get rank
      const { data: rankData, error: rankError } = await supabase
        .from('leaderboard_users')
        .select('wallet_address')
        .order('xp', { ascending: false });
      
      let rank = null;
      if (!rankError && rankData) {
        const userIndex = rankData.findIndex(u => 
          u.wallet_address.toLowerCase() === walletAddress.toLowerCase()
        );
        rank = userIndex >= 0 ? userIndex + 1 : null;
      }
      
      console.log(`✅ User updated in Supabase: ${walletAddress}, XP: ${xp}, Rank: ${rank}`);
      
      return res.json({
        success: true,
        user: {
          walletAddress: walletAddress,
          xp: xp,
          rank: rank
        }
      });
    } else {
      // Fallback to file system (for local development)
      return res.status(500).json({ 
        success: false, 
        error: 'Supabase not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.' 
      });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
};

