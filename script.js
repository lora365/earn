// Configuration
const CONFIG = {
  FEE_AMOUNT: "0.000012", // BNB
  TREASURY_WALLET: "0xa382b392b0ef1f16a70ff6708363b95f87b915f6", // Treasury wallet
  CHAIN_ID: 56, // BSC Mainnet (use 97 for testnet)
  // X OAuth Configuration
  // Note: You need to create a Twitter App at https://developer.twitter.com/
  // and get your Client ID and set up redirect URI
  X_CLIENT_ID: "VTR6QUFxVEJwYzZySGR1aHFUTlE6MTpjaQ", // X (Twitter) OAuth Client ID
  // IMPORTANT: This must EXACTLY match the Callback URI in Twitter Developer Portal
  // For earn.resilora.xyz, use: "https://earn.resilora.xyz/" (with trailing slash)
  // Or: "https://earn.resilora.xyz" (without trailing slash) - choose one and use consistently
  X_REDIRECT_URI: "https://earn.resilora.xyz/", // Set this to match your Twitter Developer Portal Callback URI exactly
  X_SCOPE: "tweet.read users.read offline.access", // OAuth scopes - Twitter OAuth 2.0 scopes
  // API Configuration
  API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001' 
    : window.location.origin, // Vercel'de frontend ve backend aynı domain'de olacak
  LEADERBOARD_REFRESH_INTERVAL: 30000, // Refresh leaderboard every 30 seconds
  TIME_BASED_CLAIM_INTERVAL: 43200000, // Time-based claim interval: 12 hours (43200000 ms)
  TIME_BASED_CLAIM_XP: 200, // XP amount for time-based claim
};

// State
let state = {
  walletConnected: false,
  walletAddress: null,
  xConnected: false,
  totalXP: 0,
  timeBasedTotalXP: 0, // Total XP from time-based claims
  ethereumProvider: null, // Store the ethereum provider to remove listeners
  tasks: [
    {
      id: 1,
      title: "Follow Resilora on X",
      description: "Follow @resilora_xyz on X (Twitter) to stay updated with the latest news and updates.",
      xp: 100,
      status: "pending", // pending, claimable, completed
      action: "follow",
      actionUrl: "https://x.com/resilora_xyz",
    },
    {
      id: 2,
      title: "Retweet Latest Post",
      description: "Retweet the latest post from Resilora's X account to spread the word.",
      xp: 150,
      status: "pending",
      action: "retweet",
      actionUrl: "https://x.com/resilora_xyz",
    },
    {
      id: 3,
      title: "Like 3 Posts",
      description: "Like at least 3 recent posts from Resilora's X account.",
      xp: 75,
      status: "pending",
      action: "like",
      actionUrl: "https://x.com/resilora_xyz",
    },
    {
      id: 4,
      title: "Share Project Update",
      description: "Share a tweet about Resilora with your thoughts.",
      xp: 200,
      status: "pending",
      action: "share",
      actionUrl: "https://twitter.com/intent/tweet?text=@resilora_xyz%20",
    },
    {
      id: 5,
      title: "Join Resilora Telegram",
      description: "Join the official Resilora Telegram channel to stay updated with the latest news and announcements.",
      xp: 200,
      status: "pending",
      action: "telegram",
      actionUrl: "https://t.me/resilora_official",
    },
    {
      id: 7,
      title: "Visit Resilora Website",
      description: "Visit the official Resilora website to learn more about the project and ecosystem.",
      xp: 50,
      status: "pending",
      action: "visit",
      actionUrl: "https://resilora.xyz",
    },
    {
      id: 8,
      title: "Daily XP Claim",
      description: "Claim your XP reward. You can claim again after the cooldown period.",
      xp: CONFIG.TIME_BASED_CLAIM_XP,
      status: "pending",
      action: "timebased",
      actionUrl: "#",
      isTimeBased: true, // Special flag for time-based task
    },
  ],
};

// State persistence functions - wallet address specific
function getStateKey(walletAddress) {
  if (!walletAddress) {
    return 'earn_app_state_default';
  }
  return `earn_app_state_${walletAddress.toLowerCase()}`;
}

function saveStateToLocalStorage() {
  try {
    if (!state.walletAddress) {
      console.log("No wallet address, skipping state save");
      return;
    }
    
    // Recalculate XP before saving to ensure accuracy
    state.totalXP = calculateTotalXP();
    
    const stateToSave = {
      walletAddress: state.walletAddress,
      xConnected: state.xConnected,
      totalXP: state.totalXP, // This is now calculated, not accumulated
      timeBasedTotalXP: state.timeBasedTotalXP || 0, // Save time-based XP
      tasks: state.tasks.map(task => ({
        id: task.id,
        status: task.status,
        opened: task.opened || false,
        openedAt: task.openedAt || null,
        lastClaimTime: task.lastClaimTime || null,
        nextClaimTime: task.nextClaimTime || null,
        serverTimeOffset: task.serverTimeOffset || null,
      })),
    };
    
    const key = getStateKey(state.walletAddress);
    localStorage.setItem(key, JSON.stringify(stateToSave));
    console.log("State saved for wallet:", state.walletAddress, "Total XP:", state.totalXP);
    
    // Also update on server if X is connected
    if (state.xConnected) {
      updateUserOnServer();
    }
  } catch (error) {
    console.error("Error saving state to localStorage:", error);
  }
}

function loadStateFromLocalStorage(walletAddress) {
  try {
    if (!walletAddress) {
      console.log("No wallet address provided, cannot load state");
      return false;
    }
    
    const key = getStateKey(walletAddress);
    const savedState = localStorage.getItem(key);
    
    if (savedState) {
      const parsed = JSON.parse(savedState);
      
      // Only load if wallet address matches
      if (parsed.walletAddress && parsed.walletAddress.toLowerCase() === walletAddress.toLowerCase()) {
        // Restore state
        state.xConnected = parsed.xConnected || false;
        
        // Restore tasks status, opened flag, and openedAt timestamp
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          parsed.tasks.forEach(savedTask => {
            const task = state.tasks.find(t => t.id === savedTask.id);
            if (task) {
              task.status = savedTask.status || "pending";
              task.opened = savedTask.opened || false;
              task.openedAt = savedTask.openedAt || null;
              // Restore time-based claim timestamps
              if (task.isTimeBased) {
                task.lastClaimTime = savedTask.lastClaimTime || null;
                task.nextClaimTime = savedTask.nextClaimTime || null;
                task.serverTimeOffset = savedTask.serverTimeOffset || null;
              }
            }
          });
        }
        
        // Restore time-based total XP
        state.timeBasedTotalXP = parsed.timeBasedTotalXP || 0;
        
        // Recalculate XP from completed tasks instead of loading from localStorage
        state.totalXP = calculateTotalXP();
        
        console.log("State loaded for wallet:", walletAddress);
        return true;
      }
    }
  } catch (error) {
    console.error("Error loading state from localStorage:", error);
  }
  return false;
}

function clearStateFromLocalStorage(walletAddress) {
  try {
    if (walletAddress) {
      const key = getStateKey(walletAddress);
      localStorage.removeItem(key);
      console.log("State cleared for wallet:", walletAddress);
    } else {
      // Clear all wallet states (fallback)
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('earn_app_state_')) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error("Error clearing state from localStorage:", error);
  }
}

// Wait for MetaMask to inject
function waitForMetaMask(maxWait = 3000) {
  return new Promise((resolve) => {
    // Check immediately
    if (window.ethereum) {
      console.log("MetaMask found immediately");
      resolve(window.ethereum);
      return;
    }
    
    console.log("Waiting for MetaMask to inject...");
    
    // Listen for MetaMask injection event
    const handleInitialized = () => {
      console.log("MetaMask initialized event received");
      if (window.ethereum) {
        resolve(window.ethereum);
      }
    };
    
    window.addEventListener('ethereum#initialized', handleInitialized, { once: true });
    
    // Also check periodically
    let attempts = 0;
    const maxAttempts = maxWait / 100;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.ethereum) {
        console.log(`MetaMask found after ${attempts * 100}ms`);
        clearInterval(checkInterval);
        window.removeEventListener('ethereum#initialized', handleInitialized);
        resolve(window.ethereum);
      } else if (attempts >= maxAttempts) {
        console.log("MetaMask not found after waiting");
        clearInterval(checkInterval);
        window.removeEventListener('ethereum#initialized', handleInitialized);
        resolve(null);
      }
    }, 100);
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Wait for MetaMask to be ready
  await waitForMetaMask();
  initializeApp();
});

async function initializeApp() {
  // Check if wallet is already connected first
  await checkWalletConnection(true);
  
  // Load state from localStorage for the connected wallet
  let stateLoaded = false;
  if (state.walletConnected && state.walletAddress) {
    stateLoaded = loadStateFromLocalStorage(state.walletAddress);
  }
  
  // If state was loaded, restore UI
  if (stateLoaded && state.walletConnected && state.walletAddress) {
    updateWalletUI();
    // Recalculate XP to ensure accuracy
    updateTotalXP();
    // Render tasks with correct status (completed tasks will show as completed)
    renderTasks();
    if (state.xConnected) {
      updateXStatus();
      showStep("stepTasks");
      startLeaderboardRefresh();
    } else {
      showStep("stepX");
    }
  } else if (state.walletConnected && state.walletAddress) {
    // Wallet connected but no saved state - fresh start
    updateWalletUI();
    // Reset tasks to initial state for new wallet
    state.tasks.forEach(task => {
      task.status = "pending";
      task.opened = false;
      task.openedAt = null;
      // Initialize time-based task
      if (task.isTimeBased) {
        task.lastClaimTime = null;
        task.nextClaimTime = 0; // Can claim immediately
      }
    });
    state.totalXP = 0;
    state.timeBasedTotalXP = 0;
    state.xConnected = false;
    showStep("stepX");
  }
  
  // Initialize time-based task if not already set
  state.tasks.forEach(task => {
    if (task.isTimeBased && (task.nextClaimTime === undefined || task.nextClaimTime === null)) {
      task.nextClaimTime = 0; // Can claim immediately
    }
  });

  // Check for OAuth callback - delay slightly to ensure DOM is ready
  setTimeout(() => {
    checkOAuthCallback();
  }, 100);

  // Event listeners
  const connectBtn = document.getElementById("connectWalletBtnMain");
  if (connectBtn) {
    connectBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Button clicked");
      connectWallet();
    });
  }
  document.getElementById("disconnectBtn")?.addEventListener("click", disconnectWallet);
  document.getElementById("connectXBtn")?.addEventListener("click", connectXAccount);
  document.getElementById("confirmFeeBtn")?.addEventListener("click", confirmFeePayment);
  document.getElementById("cancelFeeBtn")?.addEventListener("click", cancelFeePayment);
  document.getElementById("confirmXAccountBtn")?.addEventListener("click", confirmXAccountConnection);
  document.getElementById("cancelXConfirmBtn")?.addEventListener("click", cancelXAccountConnection);

  // Load tasks and ensure XP is correctly calculated
  renderTasks();
  // Recalculate XP to ensure accuracy on page load
  if (state.walletConnected && state.walletAddress) {
    updateTotalXP();
    if (state.xConnected) {
      startLeaderboardRefresh();
    }
  }
}

function checkOAuthCallback() {
  // Check if we're returning from X OAuth
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const stateParam = urlParams.get('state');
  const error = urlParams.get('error');

  console.log("Checking OAuth callback:", { code: code ? "present" : "missing", state: stateParam ? "present" : "missing", error, walletConnected: state.walletConnected });

  if (error) {
    alert("X authorization was cancelled or failed. Please try again.");
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    sessionStorage.removeItem('x_oauth_state');
    return;
  }

  if (code && stateParam) {
    // Verify state token for security
    const storedState = sessionStorage.getItem('x_oauth_state');
    console.log("State verification:", { storedState, stateParam, match: storedState === stateParam });
    
    if (storedState && storedState === stateParam) {
      // State matches, proceed
      sessionStorage.removeItem('x_oauth_state');
      
      // Store OAuth code for later use
      sessionStorage.setItem('x_oauth_code', code);
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Note: In production, you would exchange the code for an access token via backend
      // and fetch user information from X API
      console.log("X OAuth authorization successful. Code:", code);
      
      // Check if wallet is connected, if not show alert
      if (!state.walletConnected) {
        alert("Please connect your wallet first, then try connecting X account again.");
        showStep("stepWallet");
        return;
      }
      
      // Fetch and display X account information
      showXAccountConfirmation(code);
    } else {
      // State mismatch - possible CSRF attack or state expired
      console.error("State mismatch or missing:", { storedState, stateParam });
      alert("Security verification failed. Please try connecting X account again.");
      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem('x_oauth_state');
      // Show X connection step
      if (state.walletConnected) {
        showStep("stepX");
      } else {
        showStep("stepWallet");
      }
    }
  } else if (code || stateParam) {
    // Partial callback - missing parameters
    console.error("Incomplete OAuth callback:", { code: !!code, state: !!stateParam });
    window.history.replaceState({}, document.title, window.location.pathname);
    if (state.walletConnected) {
      showStep("stepX");
    } else {
      showStep("stepWallet");
    }
  }
}

// Wallet Functions
async function checkWalletConnection(skipStepChange = false) {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        const currentAddress = accounts[0];
        
        // If wallet address changed, load state for new wallet
        if (state.walletAddress && state.walletAddress.toLowerCase() !== currentAddress.toLowerCase()) {
          console.log("Wallet address changed, loading state for new wallet:", currentAddress);
          // Reset state for new wallet
          state.walletConnected = false;
          state.walletAddress = null;
          state.xConnected = false;
          state.totalXP = 0;
          state.tasks.forEach(task => {
            task.status = "pending";
            task.opened = false;
            task.openedAt = null;
          });
        }
        
        state.walletConnected = true;
        state.walletAddress = currentAddress;
        
        // Load state for this wallet address
        const stateLoaded = loadStateFromLocalStorage(currentAddress);
        
        // If no state found, initialize fresh state
        if (!stateLoaded) {
          console.log("No saved state found for wallet, starting fresh");
          state.xConnected = false;
          state.totalXP = 0;
          state.tasks.forEach(task => {
            task.status = "pending";
            task.opened = false;
            task.openedAt = null;
          });
        }
        
        updateWalletUI();
        // Recalculate XP and render tasks after loading state
        updateTotalXP();
        renderTasks();
        // Only change step if not skipping (i.e., when called from initializeApp after state load)
        if (!skipStepChange) {
          if (state.xConnected) {
            showStep("stepTasks");
            startLeaderboardRefresh();
          } else {
            showStep("stepX");
          }
        }
      } else {
        // No accounts connected - don't clear state, just reset UI
        if (state.walletConnected) {
          console.log("No wallet connected");
          state.walletConnected = false;
          state.walletAddress = null;
          // Don't clear xConnected and totalXP - they're wallet-specific and will be loaded when wallet reconnects
        }
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
    }
  }
}

async function connectWallet() {
  console.log("connectWallet called");
  console.log("window.ethereum:", window.ethereum);
  console.log("window.web3:", window.web3);
  
  try {
    showLoading(true);
    
    // Wait for MetaMask to inject if not already available
    let ethereum = await waitForMetaMask();
    
    // Also check for web3 (older MetaMask versions)
    if (!ethereum && window.web3 && window.web3.currentProvider) {
      ethereum = window.web3.currentProvider;
      console.log("Found web3 provider");
    }
    
    // Final check
    if (!ethereum) {
      ethereum = window.ethereum;
    }
    
    // If multiple providers, try to use MetaMask first
    if (ethereum && ethereum.providers && Array.isArray(ethereum.providers)) {
      const metamaskProvider = ethereum.providers.find(p => p.isMetaMask);
      if (metamaskProvider) {
        ethereum = metamaskProvider;
        console.log("Using MetaMask from providers");
      }
    }

    // Check if it's explicitly NOT MetaMask (reject other wallets)
    if (ethereum && ethereum.isMetaMask === false) {
      console.log("Not MetaMask, rejecting");
      showLoading(false);
      alert("Please use MetaMask wallet. Other wallets are not supported.");
      return;
    }

    // If still no ethereum, then it's really not installed or not injected
    if (!ethereum) {
      console.log("No ethereum found after waiting");
      showLoading(false);
      
      // Give user helpful instructions
      const userAgent = navigator.userAgent.toLowerCase();
      const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
      const isFirefox = userAgent.includes('firefox');
      
      let message = "MetaMask extension not detected.\n\n";
      message += "Please try the following:\n";
      message += "1. Make sure MetaMask extension is installed and enabled\n";
      message += "2. Refresh this page (Ctrl+F5 or Cmd+Shift+R)\n";
      message += "3. Check if MetaMask is unlocked\n";
      message += "4. Try disabling and re-enabling the MetaMask extension\n\n";
      message += "If the problem persists, please check the browser console for errors.";
      
      alert(message);
      
      // Only redirect if it's clearly not installed (not just not injected)
      // Don't auto-redirect, let user decide
      return;
    }
    
    console.log("Attempting to connect with ethereum:", ethereum);
    
    // Request account access - this will work even if isMetaMask is undefined
    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });

    if (accounts && accounts.length > 0) {
      const walletAddress = accounts[0];
      state.walletConnected = true;
      state.walletAddress = walletAddress;
      
      // Load state for this wallet address
      const stateLoaded = loadStateFromLocalStorage(walletAddress);
      
      // If no state found, initialize fresh state
      if (!stateLoaded) {
        console.log("No saved state found for wallet, starting fresh");
        state.xConnected = false;
        state.totalXP = 0;
        state.tasks.forEach(task => {
          task.status = "pending";
          task.opened = false;
          task.openedAt = null;
        });
      }
      
      saveStateToLocalStorage();
      updateWalletUI();
      
      // Recalculate XP and render tasks after loading/connecting
      updateTotalXP();
      renderTasks();
      
      if (state.xConnected) {
        showStep("stepTasks");
        startLeaderboardRefresh();
      } else {
        showStep("stepX");
      }
    }

    // Check network
    const chainId = await ethereum.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) !== CONFIG.CHAIN_ID) {
      await switchNetwork();
    }

    // Store the provider to remove listeners later
    state.ethereumProvider = ethereum;

    // Listen for account changes
    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    showLoading(false);
  } catch (error) {
    console.error("Error connecting wallet:", error);
    showLoading(false);
    
    // Silently handle errors - don't show alerts
    // Only log to console for debugging
    if (error.code === 4001) {
      // User rejected - this is fine, no need to alert
      console.log("User rejected connection");
    } else if (error.code === -32002) {
      // Request already pending - this is fine
      console.log("Connection request already pending");
    } else {
      // Other errors - log but don't alert
      console.log("Connection error:", error.message || "Unknown error");
    }
  }
}

async function switchNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${CONFIG.CHAIN_ID.toString(16)}` }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${CONFIG.CHAIN_ID.toString(16)}`,
              chainName: "BNB Smart Chain",
              nativeCurrency: {
                name: "BNB",
                symbol: "BNB",
                decimals: 18,
              },
              rpcUrls: ["https://bsc-dataseed.binance.org/"],
              blockExplorerUrls: ["https://bscscan.com/"],
            },
          ],
        });
      } catch (addError) {
        console.error("Error adding network:", addError);
      }
    }
  }
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    disconnectWallet();
  } else {
    state.walletAddress = accounts[0];
    updateWalletUI();
  }
}

function handleChainChanged(chainId) {
  window.location.reload();
}

async function disconnectWallet() {
  try {
    // Remove event listeners if provider exists
    if (state.ethereumProvider) {
      state.ethereumProvider.removeListener("accountsChanged", handleAccountsChanged);
      state.ethereumProvider.removeListener("chainChanged", handleChainChanged);
    }

    // Revoke permissions from MetaMask
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [
            {
              eth_accounts: {},
            },
          ],
        });
      } catch (error) {
        // Some MetaMask versions might not support this, that's okay
        console.log("Could not revoke permissions:", error);
      }
    }

    // Save current state before disconnecting (state is already saved, but ensure it's saved)
    if (state.walletAddress) {
      saveStateToLocalStorage();
    }
    
    // Clear local state (but keep in localStorage for when user reconnects)
    const previousWalletAddress = state.walletAddress;
    state.walletConnected = false;
    state.walletAddress = null;
    state.xConnected = false;
    state.ethereumProvider = null;
    
    // Don't clear localStorage - keep state for when user reconnects with same wallet
    // State will be loaded automatically when wallet reconnects

    // Update UI
    updateWalletUI();
    showStep("stepWallet");
    // Reset tasks display (but data is saved in localStorage)
    state.tasks.forEach(task => {
      task.status = "pending";
      task.opened = false;
      task.openedAt = null;
    });
    state.totalXP = 0;
    renderTasks();
    stopLeaderboardRefresh();
  } catch (error) {
    console.error("Error disconnecting wallet:", error);
    // Even if there's an error, clear the local state (but keep in localStorage)
    state.walletConnected = false;
    state.walletAddress = null;
    state.xConnected = false;
    state.ethereumProvider = null;
    updateWalletUI();
    showStep("stepWallet");
    renderTasks();
    stopLeaderboardRefresh();
  }
}

function updateWalletUI() {
  try {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => updateWalletUI());
      return;
    }

    const walletInfo = document.getElementById("walletInfo");
    const walletAddress = document.getElementById("walletAddress");

    if (!walletInfo || !walletAddress) {
      // Elements not found, try again after a short delay
      setTimeout(() => updateWalletUI(), 100);
      return;
    }

    // Double-check elements exist before accessing their properties
    if (state.walletConnected && state.walletAddress) {
      if (walletInfo && walletAddress) {
        walletInfo.style.display = "flex";
        walletAddress.textContent = `${state.walletAddress.slice(0, 6)}...${state.walletAddress.slice(-4)}`;
      }
    } else {
      if (walletInfo) {
        walletInfo.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Error in updateWalletUI:", error);
    // Retry after a short delay if there's an error
    setTimeout(() => updateWalletUI(), 200);
  }
}

// X Account Functions
async function connectXAccount() {
  if (!state.walletConnected) {
    alert("Please connect your wallet first.");
    return;
  }

  try {
    // Check if X_CLIENT_ID is configured
    if (CONFIG.X_CLIENT_ID === "YOUR_X_CLIENT_ID") {
      alert(
        "X OAuth is not configured yet.\n\n" +
        "Please:\n" +
        "1. Create a Twitter App at https://developer.twitter.com/\n" +
        "2. Get your OAuth 2.0 Client ID\n" +
        "3. Set up redirect URI: " + CONFIG.X_REDIRECT_URI + "\n" +
        "4. Update X_CLIENT_ID in script.js"
      );
      return;
    }

    // Step 1: Redirect to X OAuth authorization
    // This will show the X authorization page like in the image
    const stateToken = generateStateToken();
    const authUrl = await buildXAuthUrl(stateToken);
    
    // Debug: Log redirect URI to console
    console.log("Redirect URI being used:", CONFIG.X_REDIRECT_URI);
    console.log("Full OAuth URL:", authUrl);
    
    // Store state token in sessionStorage for verification
    sessionStorage.setItem('x_oauth_state', stateToken);
    
    // Redirect to X OAuth page
    // User will see: "Click Social Twitter wants to access your X account"
    // with "Authorize app" button
    window.location.href = authUrl;
  } catch (error) {
    console.error("Error connecting X account:", error);
    alert("Failed to connect X account. Please try again.");
  }
}

async function buildXAuthUrl(stateToken) {
  // Use redirect URI as configured
  // IMPORTANT: This must EXACTLY match the Callback URI in Twitter Developer Portal
  
  // Generate PKCE code verifier and challenge (required for Twitter OAuth 2.0)
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store code verifier for later use (when exchanging code for token)
  sessionStorage.setItem('x_oauth_code_verifier', codeVerifier);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CONFIG.X_CLIENT_ID,
    redirect_uri: CONFIG.X_REDIRECT_URI,
    scope: CONFIG.X_SCOPE,
    state: stateToken,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

function generateStateToken() {
  // Generate a random state token for security
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateCodeVerifier() {
  // Generate a random code verifier for PKCE (43-128 characters)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier) {
  // Generate code challenge by hashing the verifier with SHA256
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(array) {
  // Convert Uint8Array to base64url string
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}


async function showXAccountConfirmation(oauthCode) {
  // Show X account confirmation modal
  console.log("Showing X account confirmation modal, code:", oauthCode);
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  
  // Clear account info element (no user info displayed)
  const accountInfoEl = document.getElementById("xAccountInfo");
  if (accountInfoEl) {
    accountInfoEl.innerHTML = '';
  }
  
  // Show modal
  const modal = document.getElementById("xAccountConfirmModal");
  if (modal) {
    modal.style.display = "flex";
    console.log("X account confirmation modal shown");
  } else {
    console.error("xAccountConfirmModal element not found!");
  }
}

async function confirmXAccountConnection() {
  // User confirmed X account connection, proceed directly with MetaMask fee payment
  const modal = document.getElementById("xAccountConfirmModal");
  if (modal) {
    modal.style.display = "none";
  }
  
  // Proceed directly with fee payment (no fee modal)
  await proceedWithFeePayment();
}

function cancelXAccountConnection() {
  // User cancelled X account connection
  const modal = document.getElementById("xAccountConfirmModal");
  if (modal) {
    modal.style.display = "none";
  }
  
  // Clean up
  sessionStorage.removeItem('x_oauth_code');
  
  // Stay on X connection step
  showStep("stepX");
}

async function proceedWithFeePayment() {
  // Step 2: After X connection is confirmed, proceed directly with MetaMask fee payment
  try {
    if (!state.walletConnected) {
      alert("Please connect your wallet first.");
      return;
    }

    showLoading(true);

    // Convert fee to Wei
    const feeWei = (parseFloat(CONFIG.FEE_AMOUNT) * 1e18).toString(16);

    // Send transaction directly to MetaMask
    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: state.walletAddress,
          to: CONFIG.TREASURY_WALLET,
          value: `0x${feeWei}`,
        },
      ],
    });

    // Wait for transaction confirmation
    await waitForTransaction(txHash);

    showLoading(false);

    // Complete X connection
    state.xConnected = true;
    saveStateToLocalStorage();
    updateXStatus();
    showStep("stepTasks");
    startLeaderboardRefresh();
    
    // Clean up OAuth code
    sessionStorage.removeItem('x_oauth_code');
  } catch (error) {
    console.error("Error processing fee:", error);
    showLoading(false);
    
    if (error.code === 4001) {
      // User rejected transaction
      console.log("User rejected transaction");
      alert("Transaction was cancelled. Please try again.");
    } else {
      alert("Transaction failed. Please try again.");
    }
  }
}

function updateXStatus() {
  // X status element removed, just hide the button if connected
  if (state.xConnected) {
    const connectXBtn = document.getElementById("connectXBtn");
    if (connectXBtn) connectXBtn.style.display = "none";
  }
}

// Task Functions
function renderTasks() {
  const tasksGrid = document.getElementById("tasksGrid");
  const timeBasedContainer = document.getElementById("timeBasedTaskContainer");
  if (!tasksGrid) return;

  // Separate time-based task from regular tasks
  const timeBasedTask = state.tasks.find(task => task.isTimeBased);
  const regularTasks = state.tasks.filter(task => !task.isTimeBased);

  // Render time-based task separately (featured, larger)
  if (timeBasedTask && timeBasedContainer) {
    // Determine border color based on claim status
    const now = Date.now();
    const nextClaimTime = timeBasedTask.nextClaimTime || 0;
    const isOnCooldown = now < nextClaimTime;
    const borderClass = isOnCooldown ? 'claimed' : 'available'; // claimed = green, available = yellow
    
    timeBasedContainer.innerHTML = `
      <div class="task-card-featured ${borderClass}">
        <div class="task-header">
          <div class="task-title">${timeBasedTask.title}</div>
          <div class="task-xp">+${timeBasedTask.xp} XP</div>
        </div>
        <div class="task-description">${timeBasedTask.description}</div>
        <div class="task-actions">
          ${getTaskButton(timeBasedTask)}
        </div>
      </div>
    `;
    
    // Add event listener for time-based task
    const btn = document.getElementById(`task-btn-${timeBasedTask.id}`);
    const cardElement = timeBasedContainer.querySelector('.task-card-featured');
    
    if (btn) {
      btn.addEventListener("click", () => handleTaskAction(timeBasedTask));
      
      // Handle time-based task countdown and border color
      const updateTimeBasedButton = () => {
        const currentTime = Date.now();
        const nextClaim = timeBasedTask.nextClaimTime || 0;
        const canClaim = currentTime >= nextClaim;
        
        // Update border color
        if (cardElement) {
          if (canClaim) {
            cardElement.classList.remove('claimed');
            cardElement.classList.add('available');
          } else {
            cardElement.classList.remove('available');
            cardElement.classList.add('claimed');
          }
        }
        
        if (canClaim) {
          btn.textContent = `Claim ${timeBasedTask.xp} XP`;
          btn.disabled = false;
          btn.classList.remove('disabled');
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        } else {
          const remainingTime = Math.ceil((nextClaim - currentTime) / 1000);
          const hours = Math.floor(remainingTime / 3600);
          const minutes = Math.floor((remainingTime % 3600) / 60);
          const seconds = remainingTime % 60;
          let timeText = '';
          if (hours > 0) {
            timeText = `${hours}h ${minutes}m ${seconds}s`;
          } else if (minutes > 0) {
            timeText = `${minutes}m ${seconds}s`;
          } else {
            timeText = `${seconds}s`;
          }
          btn.textContent = `Claim in ${timeText}`;
          btn.disabled = true;
          btn.classList.add('disabled');
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
        }
      };
      
      // Update immediately
      updateTimeBasedButton();
      
      // Update every second
      const countdownInterval = setInterval(() => {
        const currentTime = Date.now();
        const nextClaim = timeBasedTask.nextClaimTime || 0;
        if (currentTime >= nextClaim) {
          updateTimeBasedButton();
          // Keep interval running to update border color when cooldown ends
        } else {
          updateTimeBasedButton();
        }
      }, 1000);
      
      // Store interval ID on task for cleanup if needed
      timeBasedTask.countdownInterval = countdownInterval;
    }
  }

  // Render regular tasks
  tasksGrid.innerHTML = regularTasks
    .map((task, index) => {
      const statusClass = task.status === "completed" ? "completed" : "";
      return `
        <div class="task-card ${statusClass}" style="animation-delay: ${index * 0.1}s;">
          <div class="task-header">
            <div class="task-title">${task.title}</div>
            <div class="task-xp">+${task.xp} XP</div>
          </div>
          <div class="task-description">${task.description}</div>
          <div class="task-actions">
            ${getTaskButton(task)}
          </div>
        </div>
      `;
    })
    .join("");

  // Add event listeners to regular task buttons
  regularTasks.forEach((task) => {
    // Verify & Claim button
    const btn = document.getElementById(`task-btn-${task.id}`);
    if (btn) {
      btn.addEventListener("click", () => handleTaskAction(task));
      
      // If task was opened but 6 seconds haven't passed, start countdown
      if (task.opened && task.openedAt) {
        const timeSinceOpened = Date.now() - task.openedAt;
        const requiredWaitTime = 6000; // 6 seconds
        
        if (timeSinceOpened < requiredWaitTime) {
          const remainingSeconds = Math.ceil((requiredWaitTime - timeSinceOpened) / 1000);
          let countdown = remainingSeconds;
          btn.textContent = `Wait ${countdown}s...`;
          btn.disabled = true;
          btn.classList.add('disabled');
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
          
          const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
              btn.textContent = `Wait ${countdown}s...`;
            } else {
              clearInterval(countdownInterval);
              btn.textContent = 'Verify & Claim';
              btn.disabled = false;
              btn.classList.remove('disabled');
              btn.style.opacity = '1';
              btn.style.cursor = 'pointer';
            }
          }, 1000);
        }
      }
    }
    
    // Open X button - mark task as opened when clicked, wait 6 seconds before enabling Verify & Claim
    const openXBtn = document.querySelector(`.open-x-btn[data-task-id="${task.id}"]`);
    if (openXBtn) {
      openXBtn.addEventListener("click", () => {
        // Mark task as opened
        task.opened = true;
        task.openedAt = Date.now(); // Store timestamp when opened
        saveStateToLocalStorage();
        
        // Show countdown or wait message
        const verifyBtn = document.getElementById(`task-btn-${task.id}`);
        if (verifyBtn) {
          const originalText = 'Verify & Claim';
          let countdown = 6;
          verifyBtn.textContent = `Wait ${countdown}s...`;
          verifyBtn.disabled = true;
          verifyBtn.classList.add('disabled');
          verifyBtn.style.opacity = '0.5';
          verifyBtn.style.cursor = 'not-allowed';
          
          const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
              verifyBtn.textContent = `Wait ${countdown}s...`;
            } else {
              clearInterval(countdownInterval);
              verifyBtn.textContent = originalText;
              verifyBtn.disabled = false;
              verifyBtn.classList.remove('disabled');
              verifyBtn.style.opacity = '1';
              verifyBtn.style.cursor = 'pointer';
            }
          }, 1000);
        }
      });
    }
  });
}

function getTaskButton(task) {
  // Handle time-based task separately
  if (task.isTimeBased) {
    const now = Date.now();
    const nextClaimTime = task.nextClaimTime || 0;
    const canClaim = now >= nextClaimTime;
    
    if (canClaim) {
      return `<button class="btn-primary" id="task-btn-${task.id}">Claim ${task.xp} XP</button>`;
    } else {
      const remainingTime = Math.ceil((nextClaimTime - now) / 1000);
      const hours = Math.floor(remainingTime / 3600);
      const minutes = Math.floor((remainingTime % 3600) / 60);
      const seconds = remainingTime % 60;
      let timeText = '';
      if (hours > 0) {
        timeText = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        timeText = `${minutes}m ${seconds}s`;
      } else {
        timeText = `${seconds}s`;
      }
      return `<button class="btn-primary disabled" id="task-btn-${task.id}" disabled style="opacity: 0.5; cursor: not-allowed;">Claim in ${timeText}</button>`;
    }
  }
  
  if (task.status === "completed") {
    return `<div class="task-status completed">Completed</div>`;
  } else if (task.status === "claimable") {
    return `<button class="btn-primary" id="task-btn-${task.id}">Claim ${task.xp} XP</button>`;
  } else {
    // Check if task has been opened and 6 seconds have passed
    const isOpened = task.opened || false;
    let isReady = false;
    let waitTime = 0;
    
    if (isOpened && task.openedAt) {
      const timeSinceOpened = Date.now() - task.openedAt;
      const requiredWaitTime = 6000; // 6 seconds
      isReady = timeSinceOpened >= requiredWaitTime;
      if (!isReady) {
        waitTime = Math.ceil((requiredWaitTime - timeSinceOpened) / 1000);
      }
    }
    
    const verifyButtonDisabled = !isReady ? 'disabled' : '';
    const verifyButtonClass = !isReady ? 'btn-primary disabled' : 'btn-primary';
    const verifyButtonStyle = !isReady ? 'opacity: 0.5; cursor: not-allowed;' : '';
    const verifyButtonText = !isOpened ? 'Verify & Claim' : (isReady ? 'Verify & Claim' : `Wait ${waitTime}s...`);
    
    // Determine button text based on task action type
    const openButtonText = task.action === "telegram" ? "Open" : "Open X";
    
    return `
      <a href="${task.actionUrl}" target="_blank" class="btn-secondary open-x-btn" data-task-id="${task.id}" style="text-decoration: none; display: inline-block;">
        ${openButtonText}
      </a>
      <button class="${verifyButtonClass}" id="task-btn-${task.id}" ${verifyButtonDisabled} style="${verifyButtonStyle}">${verifyButtonText}</button>
    `;
  }
}

async function handleTaskAction(task) {
  if (!state.xConnected) {
    alert("Please connect your X account first.");
    return;
  }

  if (!state.walletConnected) {
    alert("Please connect your wallet first.");
    return;
  }

  // Handle time-based task separately
  if (task.isTimeBased) {
    // First check local time (for UI feedback)
    const localNow = Date.now();
    const nextClaimTime = task.nextClaimTime || 0;
    
    if (localNow < nextClaimTime) {
      const remainingTime = Math.ceil((nextClaimTime - localNow) / 1000);
      const hours = Math.floor(remainingTime / 3600);
      const minutes = Math.floor((remainingTime % 3600) / 60);
      const seconds = remainingTime % 60;
      let timeText = '';
      if (hours > 0) {
        timeText = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        timeText = `${minutes}m ${seconds}s`;
      } else {
        timeText = `${seconds}s`;
      }
      alert(`Please wait ${timeText} before claiming again.`);
      return;
    }

    try {
      showLoading(true);

      // Validate with server first (prevents time manipulation)
      const validation = await validateTimeBasedClaim(
        state.walletAddress,
        task.lastClaimTime || null,
        task.nextClaimTime || 0
      );

      if (!validation.success) {
        showLoading(false);
        alert(validation.error || "Claim validation failed. Please try again.");
        return;
      }

      // Directly proceed with fee payment (no fee modal)
      const feeWei = (parseFloat(CONFIG.FEE_AMOUNT) * 1e18).toString(16);

      // Send transaction directly to MetaMask
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: state.walletAddress,
            to: CONFIG.TREASURY_WALLET,
            value: `0x${feeWei}`,
          },
        ],
      });

      // Wait for transaction confirmation
      await waitForTransaction(txHash);

      // Update time-based claim timestamps using server time
      task.lastClaimTime = validation.lastClaimTime;
      task.nextClaimTime = validation.nextClaimTime;
      task.serverTimeOffset = validation.serverTime - localNow; // Store offset for future checks
      
      // Add XP to time-based total
      state.timeBasedTotalXP = (state.timeBasedTotalXP || 0) + task.xp;
      
      // Update UI
      updateTotalXP();
      renderTasks();
      
      // Save state to localStorage and update server
      saveStateToLocalStorage();
      
      // Immediately refresh leaderboard after claim
      setTimeout(() => {
        fetchLeaderboard();
      }, 1000);
      
      showLoading(false);
    } catch (error) {
      console.error("Error claiming time-based XP:", error);
      showLoading(false);
      
      if (error.code === 4001) {
        // User rejected transaction
        console.log("User rejected transaction");
        alert("Transaction was cancelled. Please try again.");
      } else {
        alert("Transaction failed. Please try again.");
      }
    }
    return;
  }

  // Check if task was opened and 6 seconds have passed
  if (!task.opened) {
    alert("Please click 'Open X' first and wait 6 seconds.");
    return;
  }

  const openedAt = task.openedAt || 0;
  const timeSinceOpened = Date.now() - openedAt;
  const requiredWaitTime = 6000; // 6 seconds in milliseconds

  if (timeSinceOpened < requiredWaitTime) {
    const remainingSeconds = Math.ceil((requiredWaitTime - timeSinceOpened) / 1000);
    alert(`Please wait ${remainingSeconds} more second(s) before verifying.`);
    return;
  }

  try {
    showLoading(true);

    // Directly proceed with fee payment (no fee modal)
    const feeWei = (parseFloat(CONFIG.FEE_AMOUNT) * 1e18).toString(16);

    // Send transaction directly to MetaMask
    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: state.walletAddress,
          to: CONFIG.TREASURY_WALLET,
          value: `0x${feeWei}`,
        },
      ],
    });

    // Wait for transaction confirmation
    await waitForTransaction(txHash);

    // In a real implementation, this would verify the task completion via X API
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Update task status
    task.status = "completed";
    
    // Update UI (this will recalculate XP from completed tasks)
    updateTotalXP();
    renderTasks();
    
    // Save state to localStorage and update server
    saveStateToLocalStorage();
    
    // Immediately refresh leaderboard after task completion
    setTimeout(() => {
      fetchLeaderboard();
    }, 1000);
    
    showLoading(false);
  } catch (error) {
    console.error("Error completing task:", error);
    showLoading(false);
    
    if (error.code === 4001) {
      // User rejected transaction
      console.log("User rejected transaction");
      alert("Transaction was cancelled. Please try again.");
    } else {
      alert("Transaction failed. Please try again.");
    }
  }
}

// Calculate total XP from completed tasks
function calculateTotalXP() {
  const completedTasksXP = state.tasks
    .filter(task => task.status === "completed")
    .reduce((total, task) => total + task.xp, 0);
  
  // Add time-based XP
  return completedTasksXP + (state.timeBasedTotalXP || 0);
}

// Leaderboard Functions
let leaderboardRefreshInterval = null;

function formatWalletAddress(address) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Get server timestamp
async function getServerTimestamp() {
  try {
    const response = await fetch(`${CONFIG.API_URL}/api/timestamp`);
    if (response.ok) {
      const data = await response.json();
      return data.timestamp;
    }
  } catch (error) {
    console.error('Error fetching server timestamp:', error);
  }
  // Fallback to local time if server fails
  return Date.now();
}

// Validate time-based claim with server
async function validateTimeBasedClaim(walletAddress, lastClaimTime, nextClaimTime) {
  try {
    const response = await fetch(`${CONFIG.API_URL}/api/time-based-claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: walletAddress,
        lastClaimTime: lastClaimTime,
        nextClaimTime: nextClaimTime
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, ...data };
    } else {
      const error = await response.json();
      return { success: false, error: error.error || 'Validation failed' };
    }
  } catch (error) {
    console.error('Error validating time-based claim:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// Update user XP on server
async function updateUserOnServer() {
  if (!state.walletAddress || !state.xConnected) {
    console.log('Skipping server update - wallet or X not connected');
    return;
  }
  
  try {
    const tasksData = state.tasks.map(task => ({
      id: task.id,
      status: task.status
    }));
    
    const requestBody = {
      walletAddress: state.walletAddress,
      tasks: tasksData,
      timeBasedTotalXP: state.timeBasedTotalXP || 0
    };
    
    console.log('Updating user on server:', requestBody);
    
    const response = await fetch(`${CONFIG.API_URL}/api/user/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ User successfully updated on server:', data);
    } else {
      const errorText = await response.text();
      console.error('❌ Server update failed:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Error updating user on server:', error);
    // Silently fail - user can still use the app
  }
}

// Fetch leaderboard from API
async function fetchLeaderboard() {
  try {
    const walletAddress = state.walletAddress || '';
    const url = `${CONFIG.API_URL}/api/leaderboard${walletAddress ? `?walletAddress=${walletAddress}` : ''}`;
    
    console.log('Fetching leaderboard from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch leaderboard:', response.status, errorText);
      throw new Error('Failed to fetch leaderboard');
    }
    
    const data = await response.json();
    console.log('✅ Leaderboard data received:', data);
    
    if (data.success) {
      renderLeaderboard(data.top50, data.currentUser);
    } else {
      console.warn('⚠️ Leaderboard response indicates failure:', data);
      renderLeaderboardFromLocalStorage();
    }
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    // Fallback to localStorage if API fails
    renderLeaderboardFromLocalStorage();
  }
}

// Fallback: Render from localStorage
function renderLeaderboardFromLocalStorage() {
  const wallets = [];
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('earn_app_state_')) {
        try {
          const savedState = JSON.parse(localStorage.getItem(key));
          if (savedState && savedState.walletAddress) {
            const walletTasks = savedState.tasks || [];
            let walletXP = 0;
            walletTasks.forEach(savedTask => {
              if (savedTask.status === "completed") {
                const task = state.tasks.find(t => t.id === savedTask.id);
                if (task) {
                  walletXP += task.xp;
                }
              }
            });
            wallets.push({
              address: savedState.walletAddress,
              xp: walletXP
            });
          }
        } catch (error) {
          console.error("Error parsing wallet state:", error);
        }
      }
    });
  } catch (error) {
    console.error("Error reading localStorage:", error);
  }
  
  wallets.sort((a, b) => b.xp - a.xp);
  const top50 = wallets.slice(0, 50);
  const currentUser = state.walletAddress ? wallets.find(w => 
    w.address && w.address.toLowerCase() === state.walletAddress.toLowerCase()
  ) : null;
  
  renderLeaderboard(top50.map((w, i) => ({ 
    walletAddress: w.address,
    xp: w.xp || 0,
    rank: i + 1 
  })), 
    currentUser ? { 
      walletAddress: currentUser.address, 
      rank: wallets.indexOf(currentUser) + 1,
      xp: currentUser.xp || 0
    } : null);
}

// Render leaderboard with API data
function renderLeaderboard(top50 = [], currentUser = null) {
  const leaderboardList = document.getElementById("leaderboardList");
  if (!leaderboardList) return;
  
  if (top50.length === 0) {
    leaderboardList.innerHTML = `
      <div style="padding: 32px; text-align: center; color: var(--muted);">
        No users found. Complete tasks to appear on the leaderboard!
      </div>
    `;
    return;
  }
  
  const currentAddress = state.walletAddress?.toLowerCase();
  let html = '';
  
  // Render top 50
  html += top50
    .filter((user) => user && (user.walletAddress || user.address)) // Filter out invalid entries
    .map((user) => {
      const walletAddr = user.walletAddress || user.address || '';
      const rank = user.rank || 0;
      const isCurrentUser = currentAddress && walletAddr.toLowerCase() === currentAddress;
      const rankClass = rank <= 3 ? `top-${rank}` : '';
      const entryClass = isCurrentUser ? 'current-user' : '';
      
      return `
        <div class="leaderboard-entry ${entryClass}">
          <span class="leaderboard-rank ${rankClass}">${rank}</span>
          <span class="leaderboard-wallet">${formatWalletAddress(walletAddr)}</span>
          <span class="leaderboard-xp">${user.xp || 0}</span>
        </div>
      `;
    })
    .join("");
  
  // Show current user rank if not in top 50
  if (currentUser && currentUser.rank > 50) {
    html += `
      <div class="leaderboard-separator" style="padding: 16px; text-align: center; color: var(--muted); border-top: 2px solid var(--border); border-bottom: 2px solid var(--border);">
        ...
      </div>
      <div class="leaderboard-entry current-user">
        <span class="leaderboard-rank">${currentUser.rank}</span>
        <span class="leaderboard-wallet">${formatWalletAddress(currentUser.walletAddress)} (You)</span>
        <span class="leaderboard-xp">${currentUser.xp}</span>
      </div>
    `;
  }
  
  leaderboardList.innerHTML = html;
}

// Start leaderboard auto-refresh
function startLeaderboardRefresh() {
  // Clear existing interval
  if (leaderboardRefreshInterval) {
    clearInterval(leaderboardRefreshInterval);
  }
  
  // Initial fetch
  fetchLeaderboard();
  
  // Set up auto-refresh
  leaderboardRefreshInterval = setInterval(() => {
    fetchLeaderboard();
  }, CONFIG.LEADERBOARD_REFRESH_INTERVAL);
}

// Stop leaderboard auto-refresh
function stopLeaderboardRefresh() {
  if (leaderboardRefreshInterval) {
    clearInterval(leaderboardRefreshInterval);
    leaderboardRefreshInterval = null;
  }
}

function updateTotalXP() {
  // Always recalculate from completed tasks to ensure accuracy
  state.totalXP = calculateTotalXP();
  
  const totalXPEl = document.getElementById("totalXP");
  if (totalXPEl) {
    totalXPEl.textContent = state.totalXP;
  }
}

// Fee Payment Functions
let pendingFeeCallback = null;
let pendingFeeType = null;

function showFeeModal(type, callback) {
  pendingFeeType = type;
  pendingFeeCallback = callback;
  document.getElementById("feeModal").style.display = "flex";
}

function cancelFeePayment() {
  document.getElementById("feeModal").style.display = "none";
  pendingFeeCallback = null;
  pendingFeeType = null;
}

async function confirmFeePayment() {
  if (!state.walletConnected) {
    alert("Please connect your wallet first.");
    return;
  }

  try {
    showLoading(true);
    document.getElementById("feeModal").style.display = "none";

    // Convert fee to Wei
    const feeWei = (parseFloat(CONFIG.FEE_AMOUNT) * 1e18).toString(16);

    // Send transaction
    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: state.walletAddress,
          to: CONFIG.TREASURY_WALLET,
          value: `0x${feeWei}`,
        },
      ],
    });

    // Wait for transaction confirmation (simplified)
    await waitForTransaction(txHash);

    showLoading(false);

    // Execute callback
    if (pendingFeeCallback) {
      await pendingFeeCallback();
      pendingFeeCallback = null;
      pendingFeeType = null;
    }
  } catch (error) {
    console.error("Error processing fee:", error);
    showLoading(false);
    alert("Transaction failed. Please try again.");
  }
}

async function waitForTransaction(txHash) {
  // In a real implementation, you would poll for transaction receipt
  // For now, we'll simulate a delay
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

// UI Helper Functions
function showStep(stepId) {
  const sections = document.querySelectorAll(".step-section");
  if (sections) {
    sections.forEach((section) => {
      if (section) section.style.display = "none";
    });
  }
  const step = document.getElementById(stepId);
  if (step) {
    step.style.display = "block";
  }
}

function showLoading(show) {
  const loadingOverlay = document.getElementById("loadingOverlay");
  if (loadingOverlay) {
    loadingOverlay.style.display = show ? "flex" : "none";
  }
}

