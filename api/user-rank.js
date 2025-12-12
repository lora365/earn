const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'leaderboard-data.json');

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
}

function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [] };
  }
}

function getLeaderboard() {
  const data = readData();
  return [...data.users].sort((a, b) => b.xp - a.xp);
}

function getUserRank(walletAddress) {
  const leaderboard = getLeaderboard();
  const index = leaderboard.findIndex(user => 
    user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  return index >= 0 ? index + 1 : null;
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
    const { walletAddress } = req.query;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }
    
    const rank = getUserRank(walletAddress);
    const data = readData();
    const user = data.users.find(u => 
      u.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    
    if (user) {
      res.json({
        success: true,
        rank: rank,
        xp: user.xp,
        walletAddress: walletAddress
      });
    } else {
      res.json({
        success: true,
        rank: null,
        xp: 0,
        walletAddress: walletAddress
      });
    }
  } catch (error) {
    console.error('Error getting user rank:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

