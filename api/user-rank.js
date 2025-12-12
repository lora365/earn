const { getSupabaseClient, isSupabaseConfigured } = require('./db');

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
    const { walletAddress } = req.query;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }
    
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      
      // Get all users ordered by XP
      const { data: allUsers, error: fetchError } = await supabase
        .from('leaderboard_users')
        .select('wallet_address, xp')
        .order('xp', { ascending: false });
      
      if (fetchError) {
        return res.status(500).json({ success: false, error: 'Database error' });
      }
      
      const leaderboard = allUsers || [];
      const userIndex = leaderboard.findIndex(u => 
        u.wallet_address.toLowerCase() === walletAddress.toLowerCase()
      );
      
      if (userIndex >= 0) {
        return res.json({
          success: true,
          rank: userIndex + 1,
          xp: leaderboard[userIndex].xp,
          walletAddress: walletAddress
        });
      } else {
        return res.json({
          success: true,
          rank: null,
          xp: 0,
          walletAddress: walletAddress
        });
      }
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Supabase not configured' 
      });
    }
  } catch (error) {
    console.error('Error getting user rank:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

