// POST /api/time-based-claim - Validate and record time-based claim
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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
};

