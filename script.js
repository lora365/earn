// Configuration
const CONFIG = {
  FEE_AMOUNT: "0.000012", // BNB
  TIME_BASED_FEE_AMOUNT: "0.00006", // BNB for time-based claim
  TREASURY_WALLET: "0xa382b392b0ef1f16a70ff6708363b95f87b915f6", // Resilora treasury wallet
  CHAIN_ID: 56, // BSC Mainnet (use 97 for testnet)
  API_BASE_URL: window.location.origin, // Use same origin for API calls
  TIME_BASED_CLAIM_INTERVAL: 10800000, // 3 hours in milliseconds
  TIME_BASED_CLAIM_XP: 200,
};

// State
let state = {
  walletConnected: false,
  walletAddress: null,
  xConnected: false,
  totalXP: 0,
  timeBasedTotalXP: 0,
  surpriseBoxTotalXP: 0,
  lastClaimTime: null,
  nextClaimTime: null,
  serverTimeOffset: 0,
  lastFreeBoxClaimTime: null,
  surpriseBoxes: [
    {
      id: "free",
      name: "Free LORA Box",
      description: "Open every 24 hours for free XP rewards!",
      price: 0,
      isFree: true,
      cooldown: 86400000, // 24 hours in milliseconds
      xpRange: { min: 10, max: 100 },
      rareXpRange: { min: 200, max: 500 },
      rareChance: 0.1, // 10%
    },
    {
      id: "bronze",
      name: "Bronze LORA Box",
      description: "500-1000 XP guaranteed",
      price: 0.000012,
      isFree: false,
      xpRange: { min: 500, max: 1000 },
    },
    {
      id: "silver",
      name: "Silver LORA Box",
      description: "2000-4000 XP guaranteed",
      price: 0.004,
      isFree: false,
      xpRange: { min: 2000, max: 4000 },
    },
    {
      id: "gold",
      name: "Gold LORA Box",
      description: "5000-10000 XP guaranteed",
      price: 0.01, // Fixed: should be 0.01 BNB (not 0.001 as mentioned, since silver is 0.004)
      isFree: false,
      xpRange: { min: 5000, max: 10000 },
    },
  ],
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
      actionUrl: "https://x.com/intent/tweet?text=" + encodeURIComponent("Check out @resilora_xyz - an amazing AI DeFi ecosystem powered by LORA on BNB Chain! 🚀"),
    },
    {
      id: 5,
      title: "Join Resilora Telegram",
      description: "Join the Resilora Telegram community to stay connected and get updates.",
      xp: 200,
      status: "pending",
      action: "telegram",
      actionUrl: "https://t.me/resilora_official",
    },
    {
      id: 8,
      title: "Daily XP Claim",
      description: "Claim your XP reward. You can claim again after the cooldown period.",
      xp: CONFIG.TIME_BASED_CLAIM_XP,
      status: "pending",
      action: "timebased",
      isTimeBased: true,
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

// Global function to start timer when Open X is clicked
window.startTaskTimer = function(taskId) {
  const taskTimerKey = `taskTimer_${taskId}`;
  localStorage.setItem(taskTimerKey, Date.now().toString());
  
  // Enable button after 5 seconds
  setTimeout(() => {
    const verifyBtn = document.getElementById(`task-btn-${taskId}`);
    if (verifyBtn && verifyBtn.disabled) {
      verifyBtn.disabled = false;
      verifyBtn.style.opacity = "1";
      verifyBtn.style.cursor = "pointer";
      verifyBtn.title = "";
    }
  }, 5000);
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Wait for MetaMask to be ready
  await waitForMetaMask();
  initializeApp();
});

async function initializeApp() {
  // Load state from localStorage
  loadStateFromLocalStorage();
  
  // Initialize nextClaimTime for time-based tasks if not set
  if (!state.nextClaimTime) {
    state.nextClaimTime = 0; // Allow immediate first claim
  }

  // Check if wallet is already connected (await to ensure it completes)
  await checkWalletConnection();

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
  document.getElementById("confirmFeeBtn")?.addEventListener("click", confirmFeePayment);
  document.getElementById("cancelFeeBtn")?.addEventListener("click", cancelFeePayment);

  // Load tasks
  renderTasks();
  
  // Render surprise boxes
  renderSurpriseBoxes();
  
  // Ensure wallet UI is updated after everything is loaded
  updateWalletUI();
}

// Wallet Functions
async function checkWalletConnection() {
  // Load general state first to get last connected wallet address
  const savedState = localStorage.getItem('earnState');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      if (parsed.walletAddress) {
        state.walletAddress = parsed.walletAddress;
      }
      if (parsed.walletConnected !== undefined) {
        state.walletConnected = parsed.walletConnected;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // If we have a saved wallet address, try to reconnect silently
  if (state.walletAddress && typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      // Check if saved wallet is still connected in MetaMask
      if (accounts.length > 0 && accounts[0].toLowerCase() === state.walletAddress.toLowerCase()) {
        state.walletConnected = true;
        state.walletAddress = accounts[0];
        
        // Load wallet-specific state
        loadStateFromLocalStorage();
        
        updateWalletUI();
        showStep("stepTasks");
        
        // Update UI again after step is shown
        setTimeout(() => {
          updateWalletUI();
        }, 100);
        
        // Set up event listeners
        if (window.ethereum.on) {
          window.ethereum.on("accountsChanged", handleAccountsChanged);
          window.ethereum.on("chainChanged", handleChainChanged);
        }
      } else {
        // Saved wallet is not connected
        state.walletConnected = false;
        state.walletAddress = null;
        updateWalletUI();
        showStep("stepWallet");
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
      // On error, clear state and show wallet connection screen
      state.walletConnected = false;
      state.walletAddress = null;
      updateWalletUI();
      showStep("stepWallet");
    }
  } else {
    // No saved wallet, show connection screen
    state.walletConnected = false;
    state.walletAddress = null;
    updateWalletUI();
    showStep("stepWallet");
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
      const connectedAddress = accounts[0];
      
      // Update wallet connection first
      state.walletConnected = true;
      state.walletAddress = connectedAddress;
      
      console.log("Wallet connected:", {
        walletConnected: state.walletConnected,
        walletAddress: state.walletAddress
      });
      
      // Load saved state for this specific wallet (don't override wallet connection state)
      loadStateFromLocalStorage(true);
      
      // Save state after loading
      saveStateToLocalStorage();
      
      // Update UI immediately
      updateWalletUI();
      
      showStep("stepTasks");
      
      // Update wallet UI again after step is shown (to ensure it's visible)
      setTimeout(() => {
        console.log("Updating wallet UI after showStep:", {
          walletConnected: state.walletConnected,
          walletAddress: state.walletAddress
        });
        updateWalletUI();
      }, 100);
      
      // Check network
      const chainId = await ethereum.request({ method: "eth_chainId" });
      if (parseInt(chainId, 16) !== CONFIG.CHAIN_ID) {
        await switchNetwork();
      }

      // Listen for account changes
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);
    }

    showLoading(false);
  } catch (error) {
    console.error("Error connecting wallet:", error);
    showLoading(false);
    
    // Check error codes
    if (error.code === 4001) {
      // User rejected the request
      alert("Connection rejected. Please approve the connection request.");
    } else if (error.code === -32002) {
      // Request already pending
      alert("A connection request is already pending. Please check MetaMask.");
    } else if (error.message && error.message.includes("not found")) {
      // Provider not found
      alert("MetaMask is not installed. Please install MetaMask to continue.");
      window.open("https://metamask.io/", "_blank");
    } else {
      // Other errors - don't redirect, just show error
      alert("Failed to connect wallet: " + (error.message || "Unknown error. Please make sure MetaMask is installed and unlocked."));
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
    // User disconnected wallet in MetaMask - reload page to show wallet connection screen
    window.location.reload();
  } else if (accounts[0].toLowerCase() !== state.walletAddress?.toLowerCase()) {
    // Different wallet connected - reload page to prevent manipulation
    window.location.reload();
  } else {
    // Same wallet, just update address
    state.walletAddress = accounts[0];
    updateWalletUI();
  }
}

function handleChainChanged(chainId) {
  window.location.reload();
}

async function disconnectWallet() {
  // Revoke MetaMask permissions to fully disconnect
  if (window.ethereum) {
    try {
      // Remove event listeners
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
      
      // Try to revoke permissions (if supported)
      try {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (revokeError) {
        // If revoke is not supported, that's okay
        console.log('Permission revoke not supported or already revoked');
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }
  
  // Save current state before disconnecting (to preserve tasks and XP)
  const currentWalletAddress = state.walletAddress;
  
  state.walletConnected = false;
  state.walletAddress = null;
  
  // Don't clear localStorage - keep tasks and XP data
  // Just update wallet connection status
  saveStateToLocalStorage();
  
  updateWalletUI();
  showStep("stepWallet");
  renderTasks();
  updateTotalXP();
}

function updateWalletUI() {
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    const walletInfo = document.getElementById("walletInfo");
    const walletAddress = document.getElementById("walletAddress");
    const connectBtn = document.getElementById("connectWalletBtn");

  console.log("updateWalletUI called", {
    walletConnected: state.walletConnected,
    walletAddress: state.walletAddress,
    walletInfo: !!walletInfo,
    walletAddressEl: !!walletAddress,
    walletInfoDisplay: walletInfo ? walletInfo.style.display : "N/A",
    walletInfoVisibility: walletInfo ? walletInfo.style.visibility : "N/A"
  });

  if (state.walletConnected && state.walletAddress) {
    console.log("Condition met: walletConnected && walletAddress exist");
      if (walletInfo) {
        walletInfo.style.display = "flex";
        walletInfo.style.visibility = "visible";
        walletInfo.style.opacity = "1";
        walletInfo.removeAttribute("style");
        walletInfo.setAttribute("style", "display: flex !important; visibility: visible !important; opacity: 1 !important;");
        console.log("Showing wallet info:", state.walletAddress);
      }
      if (walletAddress) {
        const addressText = `${state.walletAddress.slice(0, 6)}...${state.walletAddress.slice(-4)}`;
        walletAddress.textContent = addressText;
        walletAddress.style.display = "inline-block";
        walletAddress.style.visibility = "visible";
        walletAddress.removeAttribute("style");
        walletAddress.setAttribute("style", "display: inline-block !important; visibility: visible !important;");
        console.log("Setting wallet address text:", addressText);
      }
      if (connectBtn) connectBtn.style.display = "none";
    } else {
      if (walletInfo) {
        walletInfo.style.display = "none";
        walletInfo.style.visibility = "hidden";
      }
      if (connectBtn) connectBtn.style.display = "block";
    }
    
    // Also try again after a short delay to ensure it's visible
    setTimeout(() => {
      if (state.walletConnected && state.walletAddress) {
        const walletInfoRetry = document.getElementById("walletInfo");
        const walletAddressRetry = document.getElementById("walletAddress");
        if (walletInfoRetry) {
          walletInfoRetry.style.display = "flex";
          walletInfoRetry.style.visibility = "visible";
          walletInfoRetry.style.opacity = "1";
        }
        if (walletAddressRetry) {
          walletAddressRetry.textContent = `${state.walletAddress.slice(0, 6)}...${state.walletAddress.slice(-4)}`;
          walletAddressRetry.style.display = "inline-block";
          walletAddressRetry.style.visibility = "visible";
        }
      }
    }, 100);
  });
}

// X Account Functions
async function connectXAccount() {
  if (!state.walletConnected) {
    alert("Please connect your wallet first.");
    return;
  }

  // Redirect to X OAuth or X profile
  // For now, open X profile in new tab
  window.open("https://x.com/resilora_xyz", "_blank");
  
  // After user returns, they can verify connection
  // In a real implementation, this would use X OAuth callback
  try {
    showLoading(true);
    
    // Simulate X connection process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    state.xConnected = true;
    updateXStatus();
    saveStateToLocalStorage();
    showStep("stepTasks");
    showLoading(false);
  } catch (error) {
    console.error("Error connecting X account:", error);
    showLoading(false);
    alert("Failed to connect X account. Please try again.");
  }
}

function updateXStatus() {
  const xStatus = document.getElementById("xStatus");
  if (state.xConnected && xStatus) {
    xStatus.innerHTML = `
      <div class="status-indicator connected"></div>
      <span>Connected</span>
    `;
    const connectXBtn = document.getElementById("connectXBtn");
    if (connectXBtn) connectXBtn.style.display = "none";
  }
  // Update nav links visibility when X status changes
  updateWalletUI();
}

// Task Functions
function renderTasks() {
  const tasksGrid = document.getElementById("tasksGrid");
  const timeBasedTaskContainer = document.getElementById("timeBasedTaskContainer");
  if (!tasksGrid) return;

  // Separate time-based tasks from regular tasks
  const regularTasks = state.tasks.filter(task => !task.isTimeBased);
  const timeBasedTasks = state.tasks.filter(task => task.isTimeBased);

    // Render time-based task in featured container
  if (timeBasedTaskContainer && timeBasedTasks.length > 0) {
    const timeBasedTask = timeBasedTasks[0];
    // Allow claim if nextClaimTime is null, 0, or has passed
    const canClaim = !state.nextClaimTime || state.nextClaimTime === 0 || Date.now() >= (state.nextClaimTime + state.serverTimeOffset);
    const statusClass = canClaim ? "available" : "claimed";
    
    // Calculate time remaining
    let timeRemaining = 0;
    let countdownText = "";
    if (state.nextClaimTime && !canClaim) {
      const adjustedNextClaimTime = state.nextClaimTime + state.serverTimeOffset;
      timeRemaining = Math.max(0, adjustedNextClaimTime - Date.now());
      const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      countdownText = `${hours}h ${minutes}m ${seconds}s`;
    }
    
    timeBasedTaskContainer.innerHTML = `
      <div class="task-card-featured ${statusClass}">
        <div class="task-header">
          <div class="task-title">${timeBasedTask.title}</div>
          <div class="task-xp">+${timeBasedTask.xp} XP</div>
        </div>
        <div class="task-description">${timeBasedTask.description}</div>
        <div class="task-actions">
          ${getTaskButton(timeBasedTask, countdownText)}
        </div>
      </div>
    `;
    
    // Add event listener for time-based task
    const timeBasedBtn = document.getElementById(`task-btn-${timeBasedTask.id}`);
    if (timeBasedBtn) {
      timeBasedBtn.addEventListener("click", () => handleTaskAction(timeBasedTask));
    }
    
    // Update countdown timer
    if (!canClaim && timeRemaining > 0) {
      const countdownInterval = setInterval(() => {
        const adjustedNextClaimTime = state.nextClaimTime + state.serverTimeOffset;
        const remaining = Math.max(0, adjustedNextClaimTime - Date.now());
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          renderTasks(); // Re-render to update UI
        } else {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          const countdownText = `${hours}h ${minutes}m ${seconds}s`;
          const btn = document.getElementById(`task-btn-${timeBasedTask.id}`);
          if (btn) {
            btn.textContent = `Claim in ${countdownText}`;
          }
        }
      }, 1000);
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

  // Add event listeners to task buttons
  state.tasks.forEach((task) => {
    const btn = document.getElementById(`task-btn-${task.id}`);
    if (btn) {
      btn.addEventListener("click", () => handleTaskAction(task));
    }
  });
  
  // Check and restore timers for pending tasks
  state.tasks.forEach((task) => {
    if (task.status === "pending") {
      const taskTimerKey = `taskTimer_${task.id}`;
      const timerData = localStorage.getItem(taskTimerKey);
      
      if (timerData) {
        const elapsed = Date.now() - parseInt(timerData);
        const remaining = 5000 - elapsed;
        
        if (remaining > 0) {
          // Timer is still counting, enable button after remaining time
          setTimeout(() => {
            const verifyBtn = document.getElementById(`task-btn-${task.id}`);
            if (verifyBtn && verifyBtn.disabled) {
              verifyBtn.disabled = false;
              verifyBtn.style.opacity = "1";
              verifyBtn.style.cursor = "pointer";
              verifyBtn.title = "";
            }
          }, remaining);
        } else {
          // Timer already finished, enable button immediately
          const verifyBtn = document.getElementById(`task-btn-${task.id}`);
          if (verifyBtn && verifyBtn.disabled) {
            verifyBtn.disabled = false;
            verifyBtn.style.opacity = "1";
            verifyBtn.style.cursor = "pointer";
            verifyBtn.title = "";
          }
        }
      }
    }
  });
}

function getTaskButton(task, countdownText = "") {
  // Handle time-based tasks
  if (task.isTimeBased) {
    // Allow claim if nextClaimTime is null, 0, or has passed
    const canClaim = !state.nextClaimTime || state.nextClaimTime === 0 || Date.now() >= (state.nextClaimTime + state.serverTimeOffset);
    if (canClaim) {
      return `<button class="btn-primary" id="task-btn-${task.id}">Claim ${task.xp} XP</button>`;
    } else {
      return `<button class="btn-primary" id="task-btn-${task.id}" disabled style="opacity: 0.5; cursor: not-allowed;">Claim in ${countdownText || "..."}</button>`;
    }
  }
  
  if (task.status === "completed") {
    return `<div class="task-status completed">Completed</div>`;
  } else if (task.status === "claimable") {
    return `<button class="btn-primary" id="task-btn-${task.id}">Claim ${task.xp} XP</button>`;
  } else {
    // Check if verify button should be enabled (5 seconds after clicking Open X)
    const taskTimerKey = `taskTimer_${task.id}`;
    const timerData = localStorage.getItem(taskTimerKey);
    const isEnabled = timerData && (Date.now() - parseInt(timerData)) >= 5000;
    
    // Determine button text based on task action
    const buttonText = task.action === "telegram" ? "Join Telegram" : "Open X";
    
    return `
      <a href="${task.actionUrl}" target="_blank" class="btn-secondary" style="text-decoration: none; display: inline-block;" onclick="startTaskTimer(${task.id})">
        ${buttonText}
      </a>
      <button class="btn-primary" id="task-btn-${task.id}" ${isEnabled ? '' : 'disabled style="opacity: 0.5; cursor: not-allowed;"'} title="${isEnabled ? '' : `Please complete the task first by clicking '${buttonText}'`}">
        Verify & Claim
      </button>
    `;
  }
}

// Global function to start timer when Open X is clicked
window.startTaskTimer = function(taskId) {
  const taskTimerKey = `taskTimer_${taskId}`;
  localStorage.setItem(taskTimerKey, Date.now().toString());
  
  // Enable button after 5 seconds
  setTimeout(() => {
    const verifyBtn = document.getElementById(`task-btn-${taskId}`);
    if (verifyBtn && verifyBtn.disabled) {
      verifyBtn.disabled = false;
      verifyBtn.style.opacity = "1";
      verifyBtn.style.cursor = "pointer";
      verifyBtn.title = "";
    }
  }, 5000);
};

async function handleTaskAction(task) {
  if (!state.walletConnected) {
    alert("Please connect your wallet first.");
    return;
  }

  try {
    showLoading(true);
    
    // Handle time-based tasks with server-side validation
    if (task.isTimeBased) {
      // Use time-based fee amount
      const feeWei = (parseFloat(CONFIG.TIME_BASED_FEE_AMOUNT) * 1e18).toString(16);
      
      // Send transaction first
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
      
      // After fee is paid, validate claim with server and set cooldown
      const serverTimestamp = await getServerTimestamp();
      const clientTimestamp = Date.now();
      state.serverTimeOffset = serverTimestamp - clientTimestamp;
      
      // Validate claim with server (this will set the next claim time)
      const validationResult = await validateTimeBasedClaim(
        state.walletAddress,
        task.id,
        clientTimestamp
      );
      
      if (!validationResult.success) {
        // Even if validation fails, we already paid the fee, so update the cooldown
        // This prevents users from claiming multiple times
        const serverTime = await getServerTimestamp();
        state.lastClaimTime = serverTime;
        state.nextClaimTime = serverTime + CONFIG.TIME_BASED_CLAIM_INTERVAL;
        state.serverTimeOffset = serverTime - Date.now();
        
        showLoading(false);
        alert(validationResult.error || "Claim processed, but validation had issues. Cooldown has been set.");
        saveStateToLocalStorage();
        renderTasks();
        return;
      }
      
      // Update claim times from server response
      state.lastClaimTime = validationResult.lastClaimTime;
      state.nextClaimTime = validationResult.nextClaimTime;
      state.serverTimeOffset = validationResult.serverTime - clientTimestamp;
      
      // Update time-based XP
      state.timeBasedTotalXP += task.xp;
      
      // Update UI
      updateTotalXP();
      renderTasks();
      
      // Save state to localStorage immediately
      saveStateToLocalStorage();
      
      // Update server
      await updateUserOnServer();
      
      showLoading(false);
      return;
    }
    
    // Regular tasks
    // Send transaction directly to MetaMask (no fee modal)
    const feeWei = (parseFloat(CONFIG.FEE_AMOUNT) * 1e18).toString(16);
    
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Find and update task in state.tasks array by ID
    const taskIndex = state.tasks.findIndex(t => t.id === task.id);
    if (taskIndex !== -1) {
      state.tasks[taskIndex].status = "completed";
    } else {
      // Fallback: update the task object directly
      task.status = "completed";
    }
    
    // Update UI
    updateTotalXP();
    renderTasks();
    
    // Save state to localStorage immediately
    saveStateToLocalStorage();
    
    // Update server
    await updateUserOnServer();
    
    showLoading(false);
  } catch (error) {
    console.error("Error completing task:", error);
    showLoading(false);
    
    if (error.code === 4001) {
      alert("Transaction rejected. Please approve the transaction to complete the task.");
    } else {
      alert("Failed to verify task. Please try again.");
    }
  }
}

// Server timestamp and validation functions
async function getServerTimestamp() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/timestamp`);
    const data = await response.json();
    return data.timestamp;
  } catch (error) {
    console.error("Error fetching server timestamp:", error);
    return Date.now(); // Fallback to client time
  }
}

async function validateTimeBasedClaim(walletAddress, taskId, clientTimestamp) {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/time-based-claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        taskId,
        clientTimestamp,
        lastClaimTime: state.lastClaimTime,
        nextClaimTime: state.nextClaimTime,
        serverTimeOffset: state.serverTimeOffset,
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error validating time-based claim:", error);
    return { success: false, error: "Failed to validate claim" };
  }
}

function calculateTotalXP() {
  let totalXP = 0;
  state.tasks.forEach(task => {
    if (task.status === "completed") {
      totalXP += task.xp;
    }
  });
  if (state.timeBasedTotalXP) {
    totalXP += state.timeBasedTotalXP;
  }
  if (state.surpriseBoxTotalXP) {
    totalXP += state.surpriseBoxTotalXP;
  }
  return totalXP;
}

function updateTotalXP() {
  state.totalXP = calculateTotalXP();
  const totalXPEl = document.getElementById("totalXP");
  if (totalXPEl) {
    totalXPEl.textContent = state.totalXP;
  }
}

// Surprise Box Functions
function getBoxIcon(boxId) {
  // Return emoji icons for each box type
  const icons = {
    bronze: '📦',
    silver: '🎁',
    gold: '💎',
    free: '❤️'
  };
  return icons[boxId] || icons.free;
}

function renderSurpriseBoxes() {
  const surpriseBoxesGrid = document.getElementById("surpriseBoxesGrid");
  const freeBoxContainer = document.getElementById("freeBoxContainer");
  if (!surpriseBoxesGrid) return;

  // Separate paid boxes from free box
  const paidBoxes = state.surpriseBoxes.filter(box => !box.isFree);
  const freeBox = state.surpriseBoxes.find(box => box.isFree);

  // Render paid boxes
  surpriseBoxesGrid.innerHTML = paidBoxes
    .map((box, index) => {
      return `
        <div class="surprise-box-card box-${box.id}" style="animation-delay: ${index * 0.1}s;">
          <div class="surprise-box-icon">${getBoxIcon(box.id)}</div>
          <div class="surprise-box-header">
            <div class="surprise-box-name">${box.name}</div>
            <div class="surprise-box-price">${box.price} BNB</div>
          </div>
          <div class="surprise-box-description">${box.description}</div>
          <div class="surprise-box-actions">
            ${getSurpriseBoxButton(box, true, "")}
          </div>
        </div>
      `;
    })
    .join("");

  // Render free box separately (centered)
  if (freeBoxContainer && freeBox) {
    let canOpen = false;
    let countdownText = "";
    
    const canClaim = !state.lastFreeBoxClaimTime || Date.now() >= (state.lastFreeBoxClaimTime + freeBox.cooldown);
    canOpen = canClaim;
    
    if (!canClaim && state.lastFreeBoxClaimTime) {
      const nextClaimTime = state.lastFreeBoxClaimTime + freeBox.cooldown;
      const timeRemaining = Math.max(0, nextClaimTime - Date.now());
      const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      countdownText = `${hours}h ${minutes}m ${seconds}s`;
    }
    
    freeBoxContainer.innerHTML = `
      <div class="surprise-box-card box-free free-box-featured" style="max-width: 400px; width: 100%;">
        <div class="surprise-box-icon">${getBoxIcon(freeBox.id)}</div>
        <div class="surprise-box-header">
          <div class="surprise-box-name">${freeBox.name}</div>
        </div>
        <div class="surprise-box-description">${freeBox.description}</div>
        <div class="surprise-box-actions">
          ${getSurpriseBoxButton(freeBox, canOpen, countdownText)}
        </div>
      </div>
    `;
  }

  // Add event listeners for all boxes
  state.surpriseBoxes.forEach((box) => {
    const btn = document.getElementById(`box-btn-${box.id}`);
    if (btn) {
      btn.addEventListener("click", () => handleSurpriseBoxOpen(box));
    }
  });
  
  // Update countdown for free box
  if (freeBox && state.lastFreeBoxClaimTime) {
    const nextClaimTime = state.lastFreeBoxClaimTime + freeBox.cooldown;
    const timeRemaining = Math.max(0, nextClaimTime - Date.now());
    if (timeRemaining > 0) {
      const countdownInterval = setInterval(() => {
        const remaining = Math.max(0, nextClaimTime - Date.now());
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          renderSurpriseBoxes();
        } else {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          const countdownText = `${hours}h ${minutes}m ${seconds}s`;
          const btn = document.getElementById(`box-btn-${freeBox.id}`);
          if (btn) {
            btn.textContent = `Open in ${countdownText}`;
            btn.disabled = true;
          }
        }
      }, 1000);
    }
  }
}

function getSurpriseBoxButton(box, canOpen, countdownText = "") {
  if (box.isFree) {
    if (canOpen) {
      return `<button class="btn-primary" id="box-btn-${box.id}">Open Free Box</button>`;
    } else {
      return `<button class="btn-primary" id="box-btn-${box.id}" disabled style="opacity: 0.5; cursor: not-allowed;">Open in ${countdownText || "..."}</button>`;
    }
  } else {
    return `<button class="btn-primary" id="box-btn-${box.id}">Open for ${box.price} BNB</button>`;
  }
}

function calculateBoxXP(box) {
  // Check if it's a rare reward (for free box)
  if (box.isFree && Math.random() < box.rareChance) {
    // Rare reward
    const min = box.rareXpRange.min;
    const max = box.rareXpRange.max;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  } else {
    // Normal reward
    const min = box.xpRange.min;
    const max = box.xpRange.max;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

async function handleSurpriseBoxOpen(box) {
  if (!state.walletConnected) {
    alert("Please connect your wallet first.");
    return;
  }

  try {
    showLoading(true);
    
    // Handle free box
    if (box.isFree) {
      const canClaim = !state.lastFreeBoxClaimTime || Date.now() >= (state.lastFreeBoxClaimTime + box.cooldown);
      if (!canClaim) {
        showLoading(false);
        alert("Free box is on cooldown. Please wait.");
        return;
      }
      
      // Calculate XP reward
      const xpReward = calculateBoxXP(box);
      const isRare = xpReward >= box.rareXpRange.min && xpReward <= box.rareXpRange.max;
      
      // Update state
      state.lastFreeBoxClaimTime = Date.now();
      state.surpriseBoxTotalXP += xpReward;
      
      // Update UI
      updateTotalXP();
      renderSurpriseBoxes();
      saveStateToLocalStorage();
      await updateUserOnServer();
      
      showLoading(false);
      showRewardModal(xpReward, box.name, isRare);
      return;
    }
    
    // Handle paid boxes
    const feeWei = (parseFloat(box.price) * 1e18).toString(16);
    
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
    
    // Calculate XP reward
    const xpReward = calculateBoxXP(box);
    
    // Update state
    state.surpriseBoxTotalXP += xpReward;
    
    // Update UI
    updateTotalXP();
    renderSurpriseBoxes();
    saveStateToLocalStorage();
    await updateUserOnServer();
    
    showLoading(false);
    showRewardModal(xpReward, box.name, false);
  } catch (error) {
    console.error("Error opening surprise box:", error);
    showLoading(false);
    
    if (error.code === 4001) {
      alert("Transaction rejected. Please approve the transaction to open the box.");
    } else {
      alert("Failed to open box. Please try again.");
    }
  }
}

// LocalStorage Functions
function saveStateToLocalStorage() {
  try {
    // Save wallet-agnostic state (for general app state)
    const generalState = {
      walletConnected: state.walletConnected,
      walletAddress: state.walletAddress, // Save last connected wallet address
      xConnected: state.xConnected
    };
    localStorage.setItem('earnState', JSON.stringify(generalState));
    
    // Save wallet-specific state (tasks, XP, etc.) keyed by wallet address
    if (state.walletAddress) {
      const walletKey = `earnState_${state.walletAddress.toLowerCase()}`;
      const walletState = {
        tasks: state.tasks,
        totalXP: state.totalXP,
        timeBasedTotalXP: state.timeBasedTotalXP || 0,
        surpriseBoxTotalXP: state.surpriseBoxTotalXP || 0,
        lastClaimTime: state.lastClaimTime,
        nextClaimTime: state.nextClaimTime,
        serverTimeOffset: state.serverTimeOffset,
        lastFreeBoxClaimTime: state.lastFreeBoxClaimTime
      };
      localStorage.setItem(walletKey, JSON.stringify(walletState));
    }
  } catch (error) {
    console.error("Error saving state to localStorage:", error);
  }
}

function loadStateFromLocalStorage(overrideWalletState = false) {
  try {
    // Load general state
    const savedState = localStorage.getItem('earnState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // Only load wallet state if not overriding (i.e., on page load)
      if (!overrideWalletState) {
        if (parsed.walletConnected !== undefined) {
          state.walletConnected = parsed.walletConnected;
        }
        if (parsed.walletAddress) {
          state.walletAddress = parsed.walletAddress;
        }
      }
    }
    
    // Load wallet-specific state only if wallet is connected
    if (state.walletAddress) {
      const walletKey = `earnState_${state.walletAddress.toLowerCase()}`;
      const walletState = localStorage.getItem(walletKey);
      
      if (walletState) {
        const parsed = JSON.parse(walletState);
        
        // Load tasks - merge saved task statuses with current task list
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          // Create a map of saved tasks by ID
          const savedTasksMap = new Map(parsed.tasks.map(task => [task.id, task]));
          
          // Update state.tasks with saved statuses, but keep all current tasks
          state.tasks = state.tasks.map(currentTask => {
            const savedTask = savedTasksMap.get(currentTask.id);
            if (savedTask) {
              // Merge: keep current task structure, but update status
              return {
                ...currentTask,
                status: savedTask.status
              };
            }
            return currentTask;
          });
        }
        
        // Load XP data
        if (parsed.timeBasedTotalXP !== undefined) {
          state.timeBasedTotalXP = parsed.timeBasedTotalXP;
        }
        if (parsed.totalXP !== undefined) {
          state.totalXP = parsed.totalXP;
        }
        if (parsed.surpriseBoxTotalXP !== undefined) {
          state.surpriseBoxTotalXP = parsed.surpriseBoxTotalXP;
        }
        
        // Load time-based claim data
        if (parsed.lastClaimTime) {
          state.lastClaimTime = parsed.lastClaimTime;
        }
        if (parsed.nextClaimTime) {
          state.nextClaimTime = parsed.nextClaimTime;
        }
        if (parsed.serverTimeOffset !== undefined) {
          state.serverTimeOffset = parsed.serverTimeOffset;
        }
        if (parsed.lastFreeBoxClaimTime) {
          state.lastFreeBoxClaimTime = parsed.lastFreeBoxClaimTime;
        }
      } else {
        // No saved state for this wallet - reset to initial state
        state.tasks = state.tasks.map(task => ({
          ...task,
          status: "pending"
        }));
        state.totalXP = 0;
        state.timeBasedTotalXP = 0;
        state.surpriseBoxTotalXP = 0;
        state.lastClaimTime = null;
        state.nextClaimTime = null;
        state.serverTimeOffset = 0;
        state.lastFreeBoxClaimTime = null;
      }
      
      // Update UI
      updateTotalXP();
    }
  } catch (error) {
    console.error("Error loading state from localStorage:", error);
  }
}

// Server Update Functions
async function updateUserOnServer() {
  if (!state.walletConnected || !state.walletAddress) {
    return;
  }

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/user-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: state.walletAddress,
        tasks: state.tasks,
        timeBasedTotalXP: state.timeBasedTotalXP || 0
      })
    });

    if (!response.ok) {
      console.error('Failed to update user on server:', response.statusText);
      return;
    }

    const data = await response.json();
    if (data.success) {
      console.log('✅ User updated on server:', data.user);
    }
  } catch (error) {
    console.error('Error updating user on server:', error);
  }
}


// Fee Payment Functions
let pendingFeeCallback = null;
let pendingFeeType = null;

function showFeeModal(type, callback) {
  pendingFeeType = type;
  pendingFeeCallback = callback;
  const feeModal = document.getElementById("feeModal");
  if (feeModal) feeModal.style.display = "flex";
}

function cancelFeePayment() {
  const feeModal = document.getElementById("feeModal");
  if (feeModal) feeModal.style.display = "none";
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
    const feeModal = document.getElementById("feeModal");
    if (feeModal) feeModal.style.display = "none";

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
  document.querySelectorAll(".step-section").forEach((section) => {
    if (section) section.style.display = "none";
  });
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

function showRewardModal(xpReward, boxName, isRare) {
  // Create reward modal if it doesn't exist
  let rewardModal = document.getElementById("rewardModal");
  if (!rewardModal) {
    rewardModal = document.createElement("div");
    rewardModal.id = "rewardModal";
    rewardModal.className = "reward-modal";
    rewardModal.innerHTML = `
      <div class="reward-modal-content">
        <div class="confetti-container" id="confettiContainer"></div>
        <div class="reward-icon">🎁</div>
        <h2 class="reward-title" id="rewardTitle"></h2>
        <div class="reward-xp" id="rewardXP"></div>
        <div class="reward-box-name" id="rewardBoxName"></div>
        <button class="btn-primary" id="closeRewardModal">Awesome!</button>
      </div>
    `;
    document.body.appendChild(rewardModal);
    
    // Close button event
    document.getElementById("closeRewardModal").addEventListener("click", () => {
      rewardModal.style.display = "none";
      const confettiContainer = document.getElementById("confettiContainer");
      if (confettiContainer) {
        confettiContainer.innerHTML = "";
      }
    });
  }
  
  // Update content
  const title = document.getElementById("rewardTitle");
  const xpEl = document.getElementById("rewardXP");
  const boxNameEl = document.getElementById("rewardBoxName");
  
  if (title) title.textContent = isRare ? "🎉 Rare Reward!" : "Congratulations!";
  if (xpEl) xpEl.textContent = `+${xpReward} XP`;
  if (boxNameEl) boxNameEl.textContent = boxName;
  
  // Show modal
  rewardModal.style.display = "flex";
  
  // Create confetti animation
  createConfetti();
}

function createConfetti() {
  const confettiContainer = document.getElementById("confettiContainer");
  if (!confettiContainer) return;
  
  confettiContainer.innerHTML = "";
  
  const colors = ['#f6c90e', '#ffd029', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = Math.random() * 100 + "%";
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 0.5 + "s";
    confetti.style.animationDuration = (Math.random() * 2 + 2) + "s";
    confettiContainer.appendChild(confetti);
  }
}

