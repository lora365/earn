// Configuration
const CONFIG = {
  FEE_AMOUNT: "0.01", // BNB
  TREASURY_WALLET: "0x0000000000000000000000000000000000000000", // TODO: Replace with actual treasury wallet
  CHAIN_ID: 56, // BSC Mainnet (use 97 for testnet)
};

// State
let state = {
  walletConnected: false,
  walletAddress: null,
  xConnected: false,
  totalXP: 0,
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

  // Load tasks
  renderTasks();
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

    // Listen for account changes
    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

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
    disconnectWallet();
  } else {
    state.walletAddress = accounts[0];
    updateWalletUI();
  }
}

function handleChainChanged(chainId) {
  window.location.reload();
}

function disconnectWallet() {
  state.walletConnected = false;
  state.walletAddress = null;
  state.xConnected = false;
  updateWalletUI();
  showStep("stepWallet");
  renderTasks();
}

function updateWalletUI() {
  const walletInfo = document.getElementById("walletInfo");
  const walletAddress = document.getElementById("walletAddress");
  const connectBtn = document.getElementById("connectWalletBtn");

  if (state.walletConnected) {
    walletInfo.style.display = "flex";
    walletAddress.textContent = `${state.walletAddress.slice(0, 6)}...${state.walletAddress.slice(-4)}`;
    connectBtn.style.display = "none";
  } else {
    walletInfo.style.display = "none";
    connectBtn.style.display = "block";
  }
}

// X Account Functions
async function connectXAccount() {
  if (!state.walletConnected) {
    alert("Please connect your wallet first.");
    return;
  }

  // Show fee modal
  showFeeModal("x_connection", async () => {
    try {
      showLoading(true);
      
      // In a real implementation, this would use X OAuth
      // For now, we'll simulate it
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      state.xConnected = true;
      updateXStatus();
      showStep("stepTasks");
      showLoading(false);
    } catch (error) {
      console.error("Error connecting X account:", error);
      showLoading(false);
      alert("Failed to connect X account. Please try again.");
    }
  });
}

function updateXStatus() {
  const xStatus = document.getElementById("xStatus");
  if (state.xConnected) {
    xStatus.innerHTML = `
      <div class="status-indicator connected"></div>
      <span>Connected</span>
    `;
    document.getElementById("connectXBtn").style.display = "none";
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
  document.querySelectorAll(".step-section").forEach((section) => {
    section.style.display = "none";
  });
  const step = document.getElementById(stepId);
  if (step) {
    step.style.display = "block";
  }
}

function showLoading(show) {
  document.getElementById("loadingOverlay").style.display = show ? "flex" : "none";
}

