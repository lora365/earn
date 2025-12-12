const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'leaderboard-data.json');

// Initialize data file if it doesn't exist
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

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

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
    const walletAddress = req.query.walletAddress;
    const leaderboard = getLeaderboard();
    
    const top50 = leaderboard.slice(0, 50);
    
    let currentUserRank = null;
    let currentUserXP = null;
    
    if (walletAddress) {
      const userIndex = leaderboard.findIndex(user => 
        user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      );
      
      if (userIndex >= 0) {
        currentUserRank = userIndex + 1;
        currentUserXP = leaderboard[userIndex].xp;
      }
    }
    
    res.json({
      success: true,
      top50: top50.map((user, index) => ({
        walletAddress: user.walletAddress,
        xp: user.xp,
        rank: index + 1,
        updatedAt: user.updatedAt
      })),
      currentUser: walletAddress && currentUserRank ? {
        walletAddress: walletAddress,
        rank: currentUserRank,
        xp: currentUserXP
      } : null
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

