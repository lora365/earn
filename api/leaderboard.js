const fs = require('fs');
const path = require('path');

// Use /tmp directory for Vercel serverless functions (writable)
const DATA_FILE = path.join('/tmp', 'leaderboard-data.json');

// In-memory cache for serverless functions (persists across invocations in same instance)
let memoryCache = null;
let lastWriteTime = 0;

function readData() {
  try {
    // Try memory first
    if (memoryCache) {
      return memoryCache;
    }
    
    // Try file system
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      memoryCache = JSON.parse(data);
      return memoryCache;
    }
    
    // Return empty
    memoryCache = { users: [] };
    return memoryCache;
  } catch (error) {
    console.error('Error reading data:', error);
    if (!memoryCache) {
      memoryCache = { users: [] };
    }
    return memoryCache;
  }
}

function writeData(data) {
  try {
    // Update memory cache
    memoryCache = data;
    lastWriteTime = Date.now();
    
    // Also write to file (for persistence across cold starts)
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data:', error);
    // Still update memory even if file write fails
    memoryCache = data;
    lastWriteTime = Date.now();
  }
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
    const data = readData();
    const leaderboard = getLeaderboard();
    
    console.log(`Leaderboard request - Total users: ${leaderboard.length}, Requested wallet: ${walletAddress || 'none'}`);
    
    const top50 = leaderboard.slice(0, 50);
    
    let currentUserRank = null;
    let currentUserXP = null;
    
    if (walletAddress) {
      const userIndex = leaderboard.findIndex(user => 
        user.walletAddress && user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      );
      
      if (userIndex >= 0) {
        currentUserRank = userIndex + 1;
        currentUserXP = leaderboard[userIndex].xp;
        console.log(`Found user at rank ${currentUserRank} with ${currentUserXP} XP`);
      } else {
        console.log(`User not found in leaderboard`);
      }
    }
    
    res.json({
      success: true,
      top50: top50.map((user, index) => ({
        walletAddress: user.walletAddress || '',
        xp: user.xp || 0,
        rank: index + 1,
        updatedAt: user.updatedAt || new Date().toISOString()
      })),
      currentUser: walletAddress && currentUserRank ? {
        walletAddress: walletAddress,
        rank: currentUserRank,
        xp: currentUserXP
      } : null
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    // Return empty response instead of crashing
    res.status(200).json({ 
      success: true, 
      top50: [], 
      currentUser: null,
      error: error.message 
    });
  }
};

