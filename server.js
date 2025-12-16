const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'leaderboard-data.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
}

// Helper functions
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
  // Task XP values
  const taskXP = {
    1: 100, // Follow Resilora on X
    2: 150, // Retweet Latest Post
    3: 75,  // Like 3 Posts
    4: 200, // Share Project Update
    5: 200  // Join Resilora Telegram
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
  // Sort by XP (descending)
  const sortedUsers = [...data.users].sort((a, b) => b.xp - a.xp);
  return sortedUsers;
}

function getUserRank(walletAddress) {
  const leaderboard = getLeaderboard();
  const index = leaderboard.findIndex(user => 
    user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  return index >= 0 ? index + 1 : null;
}

// API Routes

// GET /api/leaderboard - Get top 50 users + current user info if provided
app.get('/api/leaderboard', (req, res) => {
  try {
    const walletAddress = req.query.walletAddress;
    const leaderboard = getLeaderboard();
    
    // Get top 50
    const top50 = leaderboard.slice(0, 50);
    
    let currentUserRank = null;
    let currentUserXP = null;
    
    // If wallet address provided, get user's rank and XP
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
});

// POST /api/user/update - Update user XP
app.post('/api/user/update', (req, res) => {
  try {
    const { walletAddress, tasks } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }
    
    const data = readData();
    const xp = calculateUserXP(tasks);
    
    // Find or create user
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
    
    // Get updated rank
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
});

// GET /api/user/rank/:walletAddress - Get specific user's rank
app.get('/api/user/rank/:walletAddress', (req, res) => {
  try {
    const { walletAddress } = req.params;
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
});

// GET /api/timestamp - Get server timestamp (for time-based claim validation)
app.get('/api/timestamp', (req, res) => {
  try {
    const serverTime = Date.now();
    res.json({
      success: true,
      timestamp: serverTime,
      iso: new Date(serverTime).toISOString()
    });
  } catch (error) {
    console.error('Error getting timestamp:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/time-based-claim - Validate and record time-based claim
app.post('/api/time-based-claim', (req, res) => {
  try {
    const { walletAddress, lastClaimTime, nextClaimTime } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }
    
    const serverTime = Date.now();
    
    // Validate that enough time has passed since last claim
    if (lastClaimTime && nextClaimTime) {
      // Check if client's nextClaimTime is in the past (allowing for small clock differences)
      const timeDifference = serverTime - nextClaimTime;
      const allowedDifference = 5 * 60 * 1000; // Allow 5 minutes difference for clock drift
      
      if (timeDifference < -allowedDifference) {
        // Client's time is too far ahead - possible manipulation
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid claim time. Please check your system clock.',
          serverTime: serverTime,
          clientNextClaimTime: nextClaimTime,
          timeDifference: timeDifference
        });
      }
      
      // Check if enough time has passed
      if (serverTime < nextClaimTime) {
        const remainingTime = nextClaimTime - serverTime;
        return res.status(400).json({ 
          success: false, 
          error: 'Claim cooldown not expired yet',
          remainingTime: remainingTime,
          serverTime: serverTime,
          nextClaimTime: nextClaimTime
        });
      }
    }
    
    // Claim is valid - return server timestamp for next claim
    const newNextClaimTime = serverTime + (12 * 60 * 60 * 1000); // 12 hours from now
    
    res.json({
      success: true,
      serverTime: serverTime,
      lastClaimTime: serverTime,
      nextClaimTime: newNextClaimTime,
      message: 'Claim validated successfully'
    });
  } catch (error) {
    console.error('Error validating time-based claim:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Resilora Earn API server running on port ${PORT}`);
  console.log(`Leaderboard data file: ${DATA_FILE}`);
});



