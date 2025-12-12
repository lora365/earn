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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { walletAddress, tasks } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }
    
    const data = readData();
    const xp = calculateUserXP(tasks);
    
    const userIndex = data.users.findIndex(user => 
      user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    
    const userData = {
      walletAddress: walletAddress.toLowerCase(),
      xp: xp,
      tasks: tasks || [],
      updatedAt: new Date().toISOString()
    };
    
    if (userIndex >= 0) {
      data.users[userIndex] = userData;
    } else {
      data.users.push(userData);
    }
    
    writeData(data);
    
    const rank = getUserRank(walletAddress);
    
    res.json({
      success: true,
      user: {
        walletAddress: walletAddress,
        xp: xp,
        rank: rank
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

