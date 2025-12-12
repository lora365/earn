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

  try {
    const walletAddress = req.query.walletAddress;
    
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      
      // Get all users ordered by XP (descending)
      const { data: allUsers, error: fetchError } = await supabase
        .from('leaderboard_users')
        .select('wallet_address, xp, updated_at')
        .order('xp', { ascending: false });
      
      if (fetchError) {
        console.error('❌ Supabase fetch error:', fetchError);
        console.error('Error details:', JSON.stringify(fetchError, null, 2));
        return res.status(500).json({ 
          success: false, 
          error: 'Database error: ' + fetchError.message,
          errorDetails: fetchError
        });
      }
      
      const leaderboard = allUsers || [];
      console.log(`✅ Leaderboard from Supabase - Total users: ${leaderboard.length}`);
      
      // Get top 50
      const top50 = leaderboard.slice(0, 50);
      
      // Find current user rank
      let currentUserRank = null;
      let currentUserXP = null;
      
      if (walletAddress) {
        const userIndex = leaderboard.findIndex(user => 
          user.wallet_address && user.wallet_address.toLowerCase() === walletAddress.toLowerCase()
        );
        
        if (userIndex >= 0) {
          currentUserRank = userIndex + 1;
          currentUserXP = leaderboard[userIndex].xp;
          console.log(`✅ Found user at rank ${currentUserRank} with ${currentUserXP} XP`);
        }
      }
      
      return res.json({
        success: true,
        top50: top50.map((user, index) => ({
          walletAddress: user.wallet_address || '',
          xp: user.xp || 0,
          rank: index + 1,
          updatedAt: user.updated_at || new Date().toISOString()
        })),
        currentUser: walletAddress && currentUserRank ? {
          walletAddress: walletAddress,
          rank: currentUserRank,
          xp: currentUserXP
        } : null
      });
    } else {
      // Fallback if Supabase not configured
      return res.status(500).json({ 
        success: false, 
        error: 'Supabase not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.',
        top50: [],
        currentUser: null
      });
    }
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(200).json({ 
      success: false, 
      top50: [], 
      currentUser: null,
      error: error.message 
    });
  }
};

