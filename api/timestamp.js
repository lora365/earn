// GET /api/timestamp - Get server timestamp (for time-based claim validation)
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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
};

