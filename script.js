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
};

// State
let state = {
  walletConnected: false,
  walletAddress: null,
  xConnected: false,
  totalXP: 0,
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
      description: "Share a post about Resilora on your X timeline with your thoughts.",
      xp: 200,
      status: "pending",
      action: "share",
      actionUrl: "https://x.com/resilora_xyz",
    },
  ],
};

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

function initializeApp() {
  // Check if wallet is already connected
  checkWalletConnection();

  // Check for OAuth callback
  checkOAuthCallback();

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

  // Load tasks
  renderTasks();
}

function checkOAuthCallback() {
  // Check if we're returning from X OAuth
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const stateParam = urlParams.get('state');
  const error = urlParams.get('error');

  if (error) {
    alert("X authorization was cancelled or failed. Please try again.");
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    sessionStorage.removeItem('x_oauth_state');
    return;
  }

  if (code && stateParam && state.walletConnected) {
    // Verify state token for security
    const storedState = sessionStorage.getItem('x_oauth_state');
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
      
      // Fetch and display X account information
      showXAccountConfirmation(code);
    } else {
      // State mismatch - possible CSRF attack
      alert("Security verification failed. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem('x_oauth_state');
    }
  }
}

// Wallet Functions
async function checkWalletConnection() {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        state.walletConnected = true;
        state.walletAddress = accounts[0];
        updateWalletUI();
        showStep("stepX");
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
      state.walletConnected = true;
      state.walletAddress = accounts[0];
      updateWalletUI();
      showStep("stepX");
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

    // Clear state
    state.walletConnected = false;
    state.walletAddress = null;
    state.xConnected = false;
    state.ethereumProvider = null;

    // Update UI
    updateWalletUI();
    showStep("stepWallet");
    renderTasks();
  } catch (error) {
    console.error("Error disconnecting wallet:", error);
    // Even if there's an error, clear the local state
    state.walletConnected = false;
    state.walletAddress = null;
    state.xConnected = false;
    state.ethereumProvider = null;
    updateWalletUI();
    showStep("stepWallet");
    renderTasks();
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
  // Show X account confirmation modal with user information
  // Note: In production, you would exchange the code for an access token via backend
  // and fetch user information from X API (GET /2/users/me)
  
  try {
    // For now, we'll simulate fetching user info
    // In production, make an API call to your backend to exchange code for token and get user info
    const userInfo = await fetchXUserInfo(oauthCode);
    
    // Display user information in modal
    const accountInfoEl = document.getElementById("xAccountInfo");
    if (accountInfoEl) {
      accountInfoEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: #f5f5f5; border-radius: 10px;">
          <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
            ${userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'X'}
          </div>
          <div>
            <div style="font-weight: 600; font-size: 18px; margin-bottom: 5px;">${userInfo.name || 'X User'}</div>
            <div style="color: #666; font-size: 14px;">@${userInfo.username || 'username'}</div>
            ${userInfo.description ? `<div style="color: #888; font-size: 12px; margin-top: 5px;">${userInfo.description}</div>` : ''}
          </div>
        </div>
      `;
    }
    
    // Show modal
    const modal = document.getElementById("xAccountConfirmModal");
    if (modal) {
      modal.style.display = "flex";
    }
  } catch (error) {
    console.error("Error fetching X user info:", error);
    // Show modal with generic info if API call fails
    const accountInfoEl = document.getElementById("xAccountInfo");
    if (accountInfoEl) {
      accountInfoEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: #f5f5f5; border-radius: 10px;">
          <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
            X
          </div>
          <div>
            <div style="font-weight: 600; font-size: 18px; margin-bottom: 5px;">X Account</div>
            <div style="color: #666; font-size: 14px;">Your X account has been connected</div>
          </div>
        </div>
      `;
    }
    const modal = document.getElementById("xAccountConfirmModal");
    if (modal) {
      modal.style.display = "flex";
    }
  }
}

async function fetchXUserInfo(oauthCode) {
  // In production, this would call your backend API to:
  // 1. Exchange OAuth code for access token
  // 2. Use access token to fetch user info from X API: GET /2/users/me
  
  // For now, simulate user info (you can replace this with actual API call)
  // Example backend call:
  // const response = await fetch('/api/x/user-info', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ code: oauthCode })
  // });
  // return await response.json();
  
  // Simulated user info (replace with actual API call)
  return {
    name: "X User",
    username: "xuser",
    description: "Connected X account"
  };
}

function confirmXAccountConnection() {
  // User confirmed X account connection, proceed with fee payment
  const modal = document.getElementById("xAccountConfirmModal");
  if (modal) {
    modal.style.display = "none";
  }
  
  // Proceed with fee payment
  proceedWithFeePayment();
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
  // Step 2: After X connection is confirmed, proceed with MetaMask fee payment
  try {
    // Show fee confirmation modal
    // The fee payment will be handled by confirmFeePayment function
    // After fee is paid, the callback will be executed
    showFeeModal("x_connection", async () => {
      try {
        // This callback will be executed after fee is paid successfully
        state.xConnected = true;
        updateXStatus();
        showStep("stepTasks");
        
        // Clean up OAuth code
        sessionStorage.removeItem('x_oauth_code');
      } catch (error) {
        console.error("Error completing X connection:", error);
        alert("Failed to complete X connection. Please try again.");
      }
    });
  } catch (error) {
    console.error("Error in proceedWithFeePayment:", error);
    alert("Failed to process X connection. Please try again.");
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
  if (!tasksGrid) return;

  tasksGrid.innerHTML = state.tasks
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

  // Add event listeners to task buttons
  state.tasks.forEach((task) => {
    const btn = document.getElementById(`task-btn-${task.id}`);
    if (btn) {
      btn.addEventListener("click", () => handleTaskAction(task));
    }
  });
}

function getTaskButton(task) {
  if (task.status === "completed") {
    return `<div class="task-status completed">Completed</div>`;
  } else if (task.status === "claimable") {
    return `<button class="btn-primary" id="task-btn-${task.id}">Claim ${task.xp} XP</button>`;
  } else {
    return `
      <a href="${task.actionUrl}" target="_blank" class="btn-secondary" style="text-decoration: none; display: inline-block;">
        Open X
      </a>
      <button class="btn-primary" id="task-btn-${task.id}">Verify & Claim</button>
    `;
  }
}

async function handleTaskAction(task) {
  if (!state.xConnected) {
    alert("Please connect your X account first.");
    return;
  }

  // Show fee modal
  showFeeModal(`task_${task.id}`, async () => {
    try {
      showLoading(true);
      
      // In a real implementation, this would verify the task completion via X API
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Update task status
      task.status = "completed";
      state.totalXP += task.xp;
      
      // Update UI
      updateTotalXP();
      renderTasks();
      showLoading(false);
      
      alert(`Task completed! You earned ${task.xp} XP.`);
    } catch (error) {
      console.error("Error completing task:", error);
      showLoading(false);
      alert("Failed to verify task. Please try again.");
    }
  });
}

function updateTotalXP() {
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

