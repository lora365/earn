const { getSupabaseClient, isSupabaseConfigured } = require('./db');

function calculateUserXP(completedTasks) {
  const taskXP = {
    1: 100,
    2: 150,
    3: 75,
    4: 200,
    5: 200
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
      const { data: userData, error: upsertError } = await supabase
        .from('leaderboard_users')
        .upsert({
          wallet_address: walletAddress.toLowerCase(),
          xp: xp,
          tasks: tasks || [],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        });
      
      if (upsertError) {
        console.error('Supabase upsert error:', upsertError);
        return res.status(500).json({ success: false, error: 'Database error' });
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

