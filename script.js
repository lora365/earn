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

// State persistence functions
function saveStateToLocalStorage() {
  try {
    const stateToSave = {
      walletConnected: state.walletConnected,
      walletAddress: state.walletAddress,
      xConnected: state.xConnected,
      totalXP: state.totalXP,
      tasks: state.tasks,
    };
    localStorage.setItem('earn_app_state', JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Error saving state to localStorage:", error);
  }
}

function loadStateFromLocalStorage() {
  try {
    const savedState = localStorage.getItem('earn_app_state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // Restore state
      state.walletConnected = parsed.walletConnected || false;
      state.walletAddress = parsed.walletAddress || null;
      state.xConnected = parsed.xConnected || false;
      state.totalXP = parsed.totalXP || 0;
      
      // Restore tasks status and opened flag
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        parsed.tasks.forEach(savedTask => {
          const task = state.tasks.find(t => t.id === savedTask.id);
          if (task) {
            task.status = savedTask.status || "pending";
            task.opened = savedTask.opened || false;
          }
        });
      }
      
      return true;
    }
  } catch (error) {
    console.error("Error loading state from localStorage:", error);
  }
  return false;
}

function clearStateFromLocalStorage() {
  try {
    localStorage.removeItem('earn_app_state');
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

function initializeApp() {
  // Load state from localStorage first
  const stateLoaded = loadStateFromLocalStorage();
  
  // Check if wallet is already connected (skip step change to preserve loaded state)
  checkWalletConnection(true);
  
  // If state was loaded, restore UI
  if (stateLoaded) {
    if (state.walletConnected && state.walletAddress) {
      updateWalletUI();
      if (state.xConnected) {
        updateXStatus();
        showStep("stepTasks");
        updateTotalXP();
      } else {
        showStep("stepX");
      }
    } else if (state.walletConnected) {
      showStep("stepWallet");
    }
  } else {
    // If state not loaded, check wallet and show appropriate step
    if (state.walletConnected && state.walletAddress) {
      updateWalletUI();
      if (state.xConnected) {
        updateXStatus();
        showStep("stepTasks");
        updateTotalXP();
      } else {
        showStep("stepX");
      }
    }
  }

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

  // Load tasks
  renderTasks();
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
        
        // If wallet address changed, clear state (different wallet connected)
        if (state.walletAddress && state.walletAddress !== currentAddress) {
          console.log("Wallet address changed, clearing state");
          clearStateFromLocalStorage();
          state.walletConnected = false;
          state.walletAddress = null;
          state.xConnected = false;
          state.totalXP = 0;
          state.tasks.forEach(task => task.status = "pending");
        }
        
        state.walletConnected = true;
        state.walletAddress = currentAddress;
        saveStateToLocalStorage();
        updateWalletUI();
        // Only change step if not skipping (i.e., when called from initializeApp after state load)
        if (!skipStepChange) {
          showStep("stepX");
        }
      } else {
        // No accounts connected, clear state if it exists
        if (state.walletConnected) {
          console.log("No wallet connected, clearing state");
          clearStateFromLocalStorage();
          state.walletConnected = false;
          state.walletAddress = null;
          state.xConnected = false;
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
      state.walletConnected = true;
      state.walletAddress = accounts[0];
      saveStateToLocalStorage();
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
    
    // Clear localStorage
    clearStateFromLocalStorage();

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
    // Verify & Claim button
    const btn = document.getElementById(`task-btn-${task.id}`);
    if (btn) {
      btn.addEventListener("click", () => handleTaskAction(task));
    }
    
    // Open X button - mark task as opened when clicked
    const openXBtn = document.querySelector(`.open-x-btn[data-task-id="${task.id}"]`);
    if (openXBtn) {
      openXBtn.addEventListener("click", () => {
        // Mark task as opened
        task.opened = true;
        saveStateToLocalStorage();
        // Re-render tasks to enable Verify & Claim button
        renderTasks();
      });
    }
  });
}

function getTaskButton(task) {
  if (task.status === "completed") {
    return `<div class="task-status completed">Completed</div>`;
  } else if (task.status === "claimable") {
    return `<button class="btn-primary" id="task-btn-${task.id}">Claim ${task.xp} XP</button>`;
  } else {
    // Check if task has been opened (user clicked "Open X")
    const isOpened = task.opened || false;
    const verifyButtonDisabled = !isOpened ? 'disabled' : '';
    const verifyButtonClass = !isOpened ? 'btn-primary disabled' : 'btn-primary';
    const verifyButtonStyle = !isOpened ? 'opacity: 0.5; cursor: not-allowed;' : '';
    
    return `
      <a href="${task.actionUrl}" target="_blank" class="btn-secondary open-x-btn" data-task-id="${task.id}" style="text-decoration: none; display: inline-block;">
        Open X
      </a>
      <button class="${verifyButtonClass}" id="task-btn-${task.id}" ${verifyButtonDisabled} style="${verifyButtonStyle}">Verify & Claim</button>
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
      
      // Save state to localStorage
      saveStateToLocalStorage();
      
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

