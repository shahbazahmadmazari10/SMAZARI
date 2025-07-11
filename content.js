let automationInterval = null;
let stopFlag = false;

// Google Sheets configuration
const GOOGLE_SHEET_ID = '1DnrWuCdIIcpHlKW78ehn9rzUHK_Marx3eD6g74Bx5DQ';
const SHEET_TAB_NAME = 'Sheet21';
let lastDisplayedMessage = '';
let lastMessageHash = '';
const SHEET_URL = `https://opensheet.elk.sh/${GOOGLE_SHEET_ID}/${SHEET_TAB_NAME}`;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const POLLING_INTERVAL = 5000; // 5 seconds

let userCredentials = [];
let isDataLoaded = false;
let isInitialLoad = true;
let pollingIntervalId = null;
let lastDataHash = '';
let currentBannerText = '🚀 Developed by softzen Founder & Lead Developer | Softzen Computer Scientists Hub | Chrome Extension & Automation Specialist 📞 +92 330 6320436 📧 shahbaz.ahmad.mazari10@gmail.com Thank you for using this extension — proudly crafted by Softzen.';
let uidMismatchAlertShown = false;

// Speed control variables
let speedModes = [
  { name: 'slow', value: 1200, label: '🐢 Slow (1200ms)', multiplier: '1x' },
  { name: 'medium', value: 850, label: '🐇 Medium (850ms)', multiplier: '1.5x' },
  { name: 'fast', value: 680, label: '⚡ Fast (680ms)', multiplier: '2x' }
];
let currentSpeedMode = 1; // Default to medium

// Enhanced UID Verification Function
async function verifyUID(showAlerts = true) {
  try {
    let uidElement = document.querySelector("body > uni-app > uni-page > uni-page-wrapper > uni-page-body > uni-view > uni-view:nth-child(2) > uni-view.nick-name > uni-view.id") || 
                    document.querySelector(".id") || 
                    document.querySelector("[class*='id']");

    if (!uidElement) {
      console.warn("UID element not found on page");
      if (showAlerts) {
        return { valid: false, message: "UID element not found on page" };
      }
      return { valid: false, message: "UID check failed - element not found" };
    }

    const webpageUID = (uidElement.textContent || uidElement.innerText || "").replace(/[^0-9]/g, "").trim();
    console.log("Webpage UID:", webpageUID);

    const savedUsername = localStorage.getItem('automationUsername');
    if (!savedUsername) {
      console.warn("No user logged in");
      return { valid: false, message: "No user logged in" };
    }

    const user = userCredentials.find(u => u.username === savedUsername.toLowerCase());
    if (!user) {
      console.warn("User not found in credentials");
      return { valid: false, message: "User not found" };
    }

    const sheetUID = String(user.UID || "").replace(/[^0-9]/g, "").trim();
    console.log("Sheet UID:", sheetUID);

    if (!sheetUID || !webpageUID) {
      return { valid: false, message: "UID verification failed (empty UID)" };
    }

    if (sheetUID !== webpageUID) {
      console.warn(`⚠️ Invalid UID Detected: User UID (${sheetUID}) vs Account UID (${webpageUID})`);
      if (showAlerts && !uidMismatchAlertShown) {
        uidMismatchAlertShown = true;
        return { valid: false, message: `⚠️ Invalid UID Detected User: ${sheetUID} vs Account: ${webpageUID}` };
      }
      return { valid: false, message: "⚠️Invalid UID Detected" };
    }

    uidMismatchAlertShown = false;
    return { valid: true, message: "You are a verified User !" };
  } catch (error) {
    console.error("UID verification error:", error);
    return { valid: false, message: "UID verification error: " + error.message };
  }
}

// Automation core logic with dynamic speed
window.startOrderAutomation = async function() {
  const verification = await verifyUID(true);
  if (!verification.valid) {
    console.warn(`UID verification failed: ${verification.message}`);
    return;
  }

  stopFlag = false;

  if (automationInterval) {
    clearInterval(automationInterval);
    automationInterval = null;
  }

  const savedUsername = localStorage.getItem('automationUsername');
  const user = userCredentials.find(u => u.username === (savedUsername || '').toLowerCase());
  
  // Determine speed - use sheet value if it's a number, otherwise use toggle speed
  let speed;
  if (user?.speed !== '*' && !isNaN(user?.speed)) {
    speed = user.speed;
    console.log(`Using sheet-defined speed: ${speed}ms`);
  } else {
    speed = speedModes[currentSpeedMode].value;
    console.log(`Using toggle speed: ${speed}ms`);
  }

  automationInterval = setInterval(() => {
    if (stopFlag) {
      clearInterval(automationInterval);
      automationInterval = null;
      console.log("⛔ Automation stopped.");
      return;
    }

    const button1 = document.querySelector(
      "body > uni-app > uni-page > uni-page-wrapper > uni-page-body > uni-view > uni-view.menu-box > uni-view:nth-child(1)"
    );
    const button2 = document.querySelector(
      "body > uni-app > uni-page > uni-page-wrapper > uni-page-body > uni-view > uni-view.menu-box > uni-view:nth-child(2)"
    );

    const statusElement = document.querySelector(
      "body > uni-app > uni-page > uni-page-wrapper > uni-page-body > uni-view > uni-view:nth-child(2) > uni-view.tab-bar.flex-center > uni-view:nth-child(1) > uni-view.flex-center > span"
    );

    if (statusElement) {
      const text = statusElement.innerText.trim();
      console.log("Checking:", text);

      if (text.match(/\(\d+\)/)) {
        clearInterval(automationInterval);
        automationInterval = null;
        console.log("✅ Order detected, starting process...");
        setTimeout(startBuyingProcess, 19);
        return;
      }
    }

    if (button1) button1.click();
    setTimeout(() => {
      if (!stopFlag && button2) button2.click();
    }, Math.max(50, speed / 10));
  }, speed);
};

// Function to stop the automation
window.stopOrderAutomation = function() {
  stopFlag = true;
  if (automationInterval) {
    clearInterval(automationInterval);
    automationInterval = null;
  }
};

// Main process for buying items
function startBuyingProcess() {
  if (stopFlag) return;

  try {
    if (window.uni?.hideLoading) uni.hideLoading();

    const priceElements = document.querySelectorAll(".amount");
    const buttonElements = document.querySelectorAll(".item-btn-box uni-button");

    if (!priceElements.length || !buttonElements.length) {
      console.warn("⚠️ Price or button elements not found, retrying...");
      return setTimeout(startBuyingProcess, 500);
    }

    let prices = Array.from(priceElements)
      .map((el, i) => ({
        index: i,
        price: parseFloat(el.innerText.replace(/[^0-9.]/g, "")),
      }))
      .filter(item => !isNaN(item.price) && item.price >= (window.dynamicMinPrice || 500));
    let skipCount = 0;
    const skipElement = document.querySelector(
      "body > uni-app > uni-page > uni-page-wrapper > uni-page-body > uni-view > uni-view:nth-child(2) > uni-view.tab-bar.flex-center > uni-view:nth-child(2) > uni-view.flex-center > span"
    );
    if (skipElement) {
      const match = skipElement.innerText.match(/\((\d+)\)/);
      if (match) skipCount = parseInt(match[1], 10) || 0;
    }

    if (skipCount > 0) {
      prices = prices.slice(0, Math.max(0, prices.length - skipCount));
    }

    const top10 = prices.sort((a, b) => b.price - a.price).slice(0, 10);
    const buttons = Array.from(buttonElements);

    processNextItem(0, top10, buttons);
  } catch (e) {
    console.error("❌ startBuyingProcess Error:", e);
    setTimeout(startBuyingProcess, 500);
  }
}

// Process each item in the list
function processNextItem(index, items, buttons) {
  if (stopFlag || index >= items.length) {
    return setTimeout(restartProcess, 950);
  }

  const item = items[index];
  const btn = buttons[item.index];

  if (btn) {
    btn.click();
    console.log(`🛒 Clicked Buy Button at index ${item.index}, Price: ${item.price}`);
    setTimeout(() => {
      if (!stopFlag) confirmBuying(() => processNextItem(index + 1, items, buttons));
    }, 25);
  } else {
    console.warn(`⚠️ Button at index ${item.index} not found, skipping...`);
    setTimeout(() => processNextItem(index + 1, items, buttons), 50);
  }
}

// Confirm the purchase
function confirmBuying(callback) {
  if (stopFlag) return;

  try {
    const confirmBtn = document.querySelector(".bottom-btn uni-button");
    if (confirmBtn) {
      confirmBtn.click();
      console.log("✅ Clicked Confirm Button.");
      setTimeout(() => {
        if (!stopFlag) enterPassword(callback);
      }, 38);
    } else {
      const backBtn = document.querySelector(
        "body > uni-app > uni-page > uni-page-wrapper > uni-page-body > uni-view > uni-view.top-bar.flex-center > uni-view:nth-child(1) > uni-text"
      );
      if (backBtn) {
        backBtn.click();
        console.log("↩️ Clicked Fallback Button.");
      }

      setTimeout(() => {
        if (!stopFlag) confirmBuying(callback);
      }, 112);
    }
  } catch (e) {
    console.error("❌ confirmBuying Error:", e);
    setTimeout(() => {
      if (!stopFlag) confirmBuying(callback);
    }, 100);
  }
}

// Enters the dynamic PIN code
function enterPassword(callback) {
  if (stopFlag) return;

  const password = window.dynamicPinCode || "123456";
  const inputBox = document.querySelector("input");

  if (!inputBox) {
    console.warn("⚠️ Password input not found, retrying...");
    return setTimeout(() => {
      if (!stopFlag) enterPassword(callback);
    }, 19);
  }

  inputBox.focus();
  inputBox.value = "";
  const event = new Event("input", { bubbles: true });

  password.split("").forEach((char, i) => {
    setTimeout(() => {
      inputBox.value += char;
      inputBox.dispatchEvent(event);
    }, i * 50);
  });

  setTimeout(() => {
    if (!stopFlag) finalizePurchase(callback);
  }, 300);
}

// Finalize the purchase
function finalizePurchase(callback) {
  if (stopFlag) return;

  try {
    const finalBtn = document.querySelector(".final-confirm-button");
    if (finalBtn) {
      finalBtn.click();
      console.log("✅ Final Confirm Clicked.");
    }

    setTimeout(() => {
      const popupBtn = document.querySelector(
        "body > uni-app > uni-page > uni-page-wrapper > uni-page-body > uni-view > uni-view:nth-child(2) > uni-view:nth-child(4) > uni-view.msg-true-box > uni-view.bottom-box > uni-button"
      );
      if (popupBtn) {
        popupBtn.click();
        console.log("🆗 Popup Confirm Clicked.");
      }
    }, 38);

    setTimeout(() => {
      if (!stopFlag) callback();
    }, 150);
  } catch (e) {
    console.error("❌ finalizePurchase Error:", e);
    setTimeout(() => {
      if (!stopFlag) callback();
    }, 100);
  }
}

// Restart the whole process
function restartProcess() {
  if (stopFlag) return;

  console.log("🔄 Restarting process...");
  if (window.uni?.hideLoading) uni.hideLoading();

  const button1 = document.querySelector(
    "body > uni-app > uni-page > uni-page-wrapper > uni-page-body > uni-view > uni-view.menu-box > uni-view:nth-child(1)"
  );
  if (button1) button1.click();

  setTimeout(window.startOrderAutomation, 950);
}

// Function to handle reset status
function checkForResetStatus(user) {
  if (user && user.status.toLowerCase() === 'reset') {
    localStorage.removeItem('automationUsername');
    localStorage.removeItem('userDataCache');
    localStorage.removeItem('userDataCacheTime');
    localStorage.removeItem('dynamicMinPrice');
    localStorage.removeItem('dynamicPinCode');
    
    userCredentials = [];
    isDataLoaded = false;
    lastDataHash = '';
    stopFlag = true;
    
    if (automationInterval) {
      clearInterval(automationInterval);
      automationInterval = null;
    }
    
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
    
    const authStatus = document.getElementById('auth-status');
    if (authStatus) {
      authStatus.textContent = "Account reset by admin";
      authStatus.style.color = "#dc3545";
    }
    
    const startBtn = document.querySelector('.floating-controls button:first-child');
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.title = "Account reset - please login again";
    }
    
    const loginFields = document.getElementById('login-fields');
    const toggleLoginBtn = document.getElementById('toggle-login-btn');
    if (loginFields) loginFields.style.display = 'block';
    if (toggleLoginBtn) toggleLoginBtn.textContent = 'Hide Login';
    
    loadUserData(true);
    
    alert("⚠️ Your account has been reset by admin. Please login again.");
    
    return true;
  }
  return false;
}

// Speed control functions
function toggleSpeedMode() {
  const savedUsername = localStorage.getItem('automationUsername');
  const user = userCredentials.find(u => u.username === savedUsername?.toLowerCase());

  // Check if speed is locked by sheet
  if (user?.speed !== '*' && !isNaN(user?.speed)) {
    alert("⚠️ Speed is locked by admin. You cannot change it.");
    return;
  }

  currentSpeedMode = (currentSpeedMode + 1) % speedModes.length;
  const mode = speedModes[currentSpeedMode];

  // Update UI
  const speedBtn = document.getElementById('speed-toggle-btn');
  if (speedBtn) {
    speedBtn.title = `Current speed: ${mode.label}`;
    speedBtn.textContent = getSpeedIcon(mode.name);
  }
  
  // Update speed indicator
  speedIndicator.textContent = mode.multiplier;
  
  // Briefly highlight the change
  speedIndicator.style.color = '#4CAF50';
  setTimeout(() => {
    speedIndicator.style.color = '#fff';
  }, 500);

  // Restart automation if running
  if (automationInterval) {
    window.stopOrderAutomation();
    setTimeout(window.startOrderAutomation, 300);
  }
}

function getSpeedIcon(mode) {
  switch(mode) {
    case 'slow': return '🐢';
    case 'medium': return '🐇';
    case 'fast': return '⚡';
    default: return '⏱️';
  }
}

// Enhanced loadUserData with Speed column integration
async function loadUserData(forceRefresh = false) {
  try {
    const savedUsername = localStorage.getItem('automationUsername');
    if (!savedUsername && !forceRefresh) return false;

    updateDataLoadingStatus('Communicating...');
    
    const response = await fetch(`${SHEET_URL}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const data = await response.json();
    
    const newUserCredentials = data.map(row => ({
      username: (row['Username '] || row['Username'] || '').toString().trim().toLowerCase(),
      password: (row['Password '] || row['Password'] || '').toString().trim(),
      status: (row['Status '] || row['Status'] || 'Off').toString().trim(),
      UID: String(row['UID'] || '').replace(/[^0-9]/g, "").trim(),
      timestamp: (row['Timestamp'] || '').toString(),
      email: (row['Email Address'] || '').toString(),
      name: (row['Name '] || row['Name'] || '').toString(),
      whatsapp: (row['Whatsapp No.'] || '').toString(),
      package: (row['Packages '] || row['Packages'] || '').toString(),
      paymentProof: (row['Payment Proof (Screenshot)'] || '').toString(),
      qa: (row['Q/A?'] || '').toString(),
      banner: (row['banner'] || currentBannerText).toString(),
      speed: (row['Speed'] === '*') ? '*' : parseInt(row['Speed'] || speedModes[currentSpeedMode].value, 10),
message: (row['Message'] || '').toString().trim()
    })).filter(user => user.username && user.password);

    // Check if current user is marked for reset
    if (savedUsername) {
      const currentUser = newUserCredentials.find(u => u.username === savedUsername.toLowerCase());
      if (currentUser && checkForResetStatus(currentUser)) {
        return false;
      }
    }

    const currentHash = JSON.stringify(newUserCredentials);
    
    if (forceRefresh || currentHash !== lastDataHash) {
      userCredentials = newUserCredentials;
      lastDataHash = currentHash;
      
      localStorage.setItem('userDataCache', JSON.stringify(userCredentials));
      localStorage.setItem('userDataCacheTime', Date.now().toString());
      
      console.log(`Successfully loaded ${userCredentials.length} user credentials`);
      
      if (savedUsername) {
        const user = userCredentials.find(u => u.username === savedUsername.toLowerCase());
        if (user) {
          await updateUserStatus(user);
          if (user.banner && user.banner.trim() !== '') {
            currentBannerText = user.banner;
            updateBannerText(currentBannerText);
          }
        }
      }
    }
    
    isDataLoaded = true;
    updateDataLoadingStatus('User data loaded successfully');
    return true;
    
  } catch (error) {
    console.error('Error Communicating Database:', error);
    
    const cachedData = localStorage.getItem('userDataCache');
    if (cachedData) {
      userCredentials = JSON.parse(cachedData);
      isDataLoaded = true;
      updateDataLoadingStatus('Using cached data (network failed)', true);
      return true;
    }
    
    updateDataLoadingStatus('Failed to load user data', true);
    return false;
  } finally {
    isInitialLoad = false;
  }
}

// Function to update banner text
function updateBannerText(text) {
  const marquee = document.querySelector('.developer-banner .marquee');
  if (marquee) {
    marquee.textContent = text;
  }
}

// Function to validate user credentials
function validateUser(username, password) {
  if (!isDataLoaded) {
    return { 
      authenticated: false, 
      error: isInitialLoad ? "Loading user data, please wait..." : "User database not available"
    };
  }
    
  if (!userCredentials || !userCredentials.length) {
    return {
      authenticated: false,
      error: "No user data available"
    };
  }
    
  const user = userCredentials.find(u => 
    u.username === username.toLowerCase().trim() && 
    u.password === password.trim()
  );
    
  if (!user) {
    return { 
      authenticated: false, 
      error: "Invalid username or password" 
    };
  }
    
  return {
    authenticated: true,
    status: user.status || 'Off',
    name: user.username,
    UID: user.UID,
    speed: user.speed || speedModes[currentSpeedMode].value
  };
}

// Update loading status in UI
function updateDataLoadingStatus(message, isError = false) {
  const statusEl = document.getElementById('data-loading-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#dc3545' : '#28a745';
    statusEl.style.background = isError ? '#f8d7da' : '#e8f5e9';
  }
}

// Modified updateUserStatus to show speed setting
async function updateUserStatus(user) {
    // Check for new admin messages
  if (user.message && user.message.trim() !== '') {
    const messageHash = hashCode(user.message);
    if (messageHash !== lastMessageHash) {
      lastMessageHash = messageHash;
      
      // Check if message contains a URL
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const containsUrl = urlRegex.test(user.message);
      
      if (containsUrl) {
        // Create a temporary div to parse the message with clickable links
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = user.message.replace(urlRegex, url => 
          `<a href="${url}" target="_blank" style="color: #0066cc; text-decoration: underline;">${url}</a>`
        );
        
        // Show alert with clickable links
        const result = confirm(`🔔 Admin Message:\n\n${tempDiv.textContent}\n\nClick OK to open link.`);
        if (result) {
          const urls = user.message.match(urlRegex);
          if (urls) {
            urls.forEach(url => window.open(url, '_blank'));
          }
        }
      } else {
        alert(`🔔 Admin Message:\n\n${user.message}`);
      }
    }
  }
  const startBtn = document.querySelector('.floating-controls button:first-child');
  const authStatus = document.getElementById('auth-status');
  const speedBtn = document.getElementById('speed-toggle-btn');

  if (!startBtn || !authStatus || !speedBtn) return;

  // First check for reset status
  if (checkForResetStatus(user)) {
    return;
  }

  // First set status based on account activation
  if (user.status === 'Active') {
    authStatus.textContent = `Logged in as ${user.username}`;
    authStatus.style.color = "#28a745";
  } else {
    startBtn.disabled = true;
    startBtn.title = "Your account is not active. Contact support.";
    authStatus.textContent = `Logged in as ${user.username} (Inactive)`;
    authStatus.style.color = "#dc3545";
    return; // Skip UID check if account is inactive
  }

  // Check if user has a UID in the sheet
  if (!user.UID || user.UID.trim() === '') {
    startBtn.disabled = true;
    startBtn.title = "UID not registered - automation disabled";
    authStatus.textContent = `Logged in as ${user.username} (No UID registered)`;
    authStatus.style.color = "#ff9800";
    return;
  }

  // Check UID and update button state
  const verification = await verifyUID(true);
  if (!verification.valid) {
    startBtn.disabled = true; // Disable immediately on mismatch
    startBtn.title = "UID verification failed - automation disabled";
    authStatus.textContent = `Logged in as ${user.username} (Invalid UID)`;
    authStatus.style.color = "#ff9800";
  } else {
    startBtn.disabled = false; // Enable only when UID matches
    
    // Update speed button based on sheet setting
    if (user.speed !== '*' && !isNaN(user.speed)) {
      speedBtn.disabled = true;
      speedBtn.title = `Speed locked to ${user.speed}ms by admin`;
      startBtn.title = `Current speed: ${user.speed}ms (locked)`;
      
      // Update speed indicator for locked speed
      let closestMode = speedModes.reduce((prev, curr) => 
        Math.abs(curr.value - user.speed) < Math.abs(prev.value - user.speed) ? curr : prev
      );
      speedIndicator.textContent = closestMode.multiplier + ' (locked)';
    } else {
      speedBtn.disabled = false;
      speedBtn.title = `Current speed: ${speedModes[currentSpeedMode].label}`;
      startBtn.title = `Current speed: ${speedModes[currentSpeedMode].label}`;
      speedIndicator.textContent = speedModes[currentSpeedMode].multiplier;
    }
    
    authStatus.textContent = `Logged in as ${user.username}`;
    authStatus.style.color = "#28a745";
  }
}

// Modified polling with immediate UID checks
function startDataPolling() {
  if (pollingIntervalId) clearInterval(pollingIntervalId);
  
  loadUserData(true);
  
  pollingIntervalId = setInterval(async () => {
    await loadUserData();
    
    const savedUsername = localStorage.getItem('automationUsername');
    if (savedUsername) {
      const user = userCredentials.find(u => u.username === savedUsername.toLowerCase());
      if (user) {
        await updateUserStatus(user);
      }
    }
  }, POLLING_INTERVAL);
}

// Stop polling
function stopDataPolling() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

// Compact style for floating controls and panels
const speedIndicatorStyle = document.createElement("style");
speedIndicatorStyle.textContent = `
  .speed-indicator {
    position: fixed;
    bottom: 70px;
    left: 10px;
    background: rgba(0,0,0,0.7);
    color: #fff;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    z-index: 9999;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    pointer-events: none;
  }
`;
document.head.appendChild(speedIndicatorStyle);

const style = document.createElement("style");
style.textContent = `
  .floating-controls {
    position: fixed;
    bottom: 20px;
    left: 10px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .floating-controls button {
    padding: 4px 8px;
    background: #24292f;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    width: 40px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .floating-controls button:hover {
    background: #444c56;
  }
  .floating-controls button:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
  
  .floating-settings-panel {
    position: fixed;
    bottom: 80px;
    left: 10px;
    background: #fff;
    color: #000;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 6px;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    display: none;
    flex-direction: column;
    gap: 6px;
    width: 180px;
    font-size: 12px;
  }
  
  .floating-settings-panel label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-weight: bold;
    font-size: 11px;
  }
  .floating-settings-panel input {
    padding: 3px 6px;
    font-size: 11px;
    border: 1px solid #ccc;
    border-radius: 3px;
    width: 100%;
    box-sizing: border-box;
  }
  .floating-settings-panel button {
    padding: 4px 6px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    width: 100%;
    font-size: 11px;
  }
  .floating-settings-panel h3 {
    color: #000;
    font-size: 12px;
    margin: 0 0 6px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid #eee;
  }
  .auth-section {
    border-bottom: 1px solid #eee;
    padding-bottom: 6px;
    margin-bottom: 6px;
  }
  #auth-status {
    padding: 3px;
    background: #f6f8fa;
    border-radius: 3px;
    text-align: center;
    margin-bottom: 6px;
    font-size: 11px;
  }
  #data-loading-status {
    padding: 3px;
    background: #e8f5e9;
    color: #28a745;
    border-radius: 3px;
    margin: 3px 0;
    font-size: 10px;
  }
  .signup-link {
    text-align: center;
    margin-top: 4px;
    font-size: 10px;
  }
  .signup-link a {
    color: #0366d6;
    text-decoration: none;
    font-size: 10px;
  }
  .signup-link a:hover {
    text-decoration: underline;
  }
  .developer-banner {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    overflow: hidden;
    background: #111;
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    z-index: 9999;
    height: 22px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #28a745;
  }
  .developer-banner .marquee {
    white-space: nowrap;
    display: inline-block;
    animation: marquee 15s linear infinite;
    padding-left: 100%;
  }
  @keyframes marquee {
    0% { transform: translateX(0%); }
    100% { transform: translateX(-100%); }
  }
  .speed-info {
    font-size: 10px;
    color: #666;
    text-align: center;
    margin-top: 2px;
  }
  .button-row {
    display: flex;
    gap: 5px;
  }
  .button-row button {
    flex: 1;
  }
  #whatsapp-btn {
    background: #25D366 !important;
  }
`;
document.head.appendChild(style);

// Create compact floating controls
const container = document.createElement("div");
container.className = "floating-controls";

const startBtn = document.createElement("button");
startBtn.textContent = "▶";
startBtn.onclick = () => {
  window.startOrderAutomation && window.startOrderAutomation();
};
startBtn.disabled = true;

const stopBtn = document.createElement("button");
stopBtn.textContent = "⛔";
stopBtn.onclick = () => {
  window.stopOrderAutomation && window.stopOrderAutomation();
};

const speedBtn = document.createElement("button");
speedBtn.id = "speed-toggle-btn";
speedBtn.textContent = getSpeedIcon(speedModes[currentSpeedMode].name);
speedBtn.title = `Current speed: ${speedModes[currentSpeedMode].label}`;
speedBtn.onclick = toggleSpeedMode;

const settingsBtn = document.createElement("button");
settingsBtn.textContent = "⚙";
settingsBtn.onclick = () => {
  settingsPanel.style.display = settingsPanel.style.display === "none" ? "flex" : "none";
};

container.appendChild(startBtn);
container.appendChild(stopBtn);
container.appendChild(speedBtn);
container.appendChild(settingsBtn);
document.body.appendChild(container);

// Create the speed indicator element
const speedIndicator = document.createElement("div");
speedIndicator.className = "speed-indicator";
speedIndicator.textContent = speedModes[currentSpeedMode].multiplier;
document.body.appendChild(speedIndicator);

// Create compact settings panel with authentication
const settingsPanel = document.createElement("div");
settingsPanel.className = "floating-settings-panel";
settingsPanel.innerHTML = `
  <div class="auth-section">
    <h3>🔐 SOFTZEN V5.0 Pro</h3>
    <div id="auth-status">Not logged in</div>
    <div id="data-loading-status">Loading...</div>
    <div id="login-fields" style="display: none;">
      <label>
        Username:
        <input type="text" id="username-input" />
      </label>
      <label>
        Password:
        <input type="password" id="password-input" />
      </label>
      <button id="login-btn">Login</button>
      <button id="verify-uid-btn">🔍 Verify UID</button>
    </div>
    <button id="toggle-login-btn">Show Login</button>
    <div class="signup-link">
      <a href="https://forms.gle/F2A6xHTUAT1FuRxE9" target="_blank">Sign up</a>
    </div>
  </div>
  <label>
    Min Price:
    <input type="number" id="min-price-input" min="0" step="100" />
  </label>
  <label>
    PIN:
    <input type="password" id="pin-code-input" maxlength="6" />
  </label>
  <div class="button-row">
    <button id="save-settings-btn">💾 Save</button>
    <button id="whatsapp-btn">💬 WhatsApp</button>
  </div>
`;
document.body.appendChild(settingsPanel);

// Authentication functionality
const authStatus = settingsPanel.querySelector("#auth-status");
const loginFields = settingsPanel.querySelector("#login-fields");
const toggleLoginBtn = settingsPanel.querySelector("#toggle-login-btn");
const loginBtn = settingsPanel.querySelector("#login-btn");
const verifyUidBtn = settingsPanel.querySelector("#verify-uid-btn");
const usernameInput = settingsPanel.querySelector("#username-input");
const passwordInput = settingsPanel.querySelector("#password-input");

// Toggle login fields
toggleLoginBtn.addEventListener("click", () => {
  if (loginFields.style.display === "none") {
    loginFields.style.display = "block";
    toggleLoginBtn.textContent = "Hide Login";
  } else {
    loginFields.style.display = "none";
    toggleLoginBtn.textContent = "Show Login";
  }
});

// Manual UID verification button
verifyUidBtn.addEventListener("click", async () => {
  const verification = await verifyUID(true);
  alert(`UID Verification: ${verification.valid ? "✅ SUCCESS" : "❌ FAILED"}\n${verification.message}\n Contact Support: 03306320436`);
});

// WhatsApp button functionality
const whatsappBtn = settingsPanel.querySelector("#whatsapp-btn");
whatsappBtn.addEventListener("click", () => {
  window.open("https://wa.me/qr/TSGRQ3XQ2ICRN1", "_blank");
});

// Modified login button handler
loginBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
    
  if (!username || !password) {
    authStatus.textContent = "Please enter both username and password";
    authStatus.style.color = "#dc3545";
    return;
  }
    
  loginBtn.disabled = true;
  loginBtn.textContent = "Authenticating...";
  authStatus.textContent = "Authenticating...";
  authStatus.style.color = "#6c757d";
    
  try {
    const loaded = await loadUserData(true);
    if (!loaded) {
      throw new Error("Could not load user data");
    }
    
    const result = validateUser(username, password);
      
    if (result.authenticated) {
      localStorage.setItem('automationUsername', username);
      authStatus.textContent = `Logged in as ${username}`;
      authStatus.style.color = "#28a745";
      loginFields.style.display = "none";
      toggleLoginBtn.textContent = "Show Login";
        
      startDataPolling();
      
      const user = userCredentials.find(u => u.username === username.toLowerCase());
      if (user) {
        await updateUserStatus(user);
      }
    } else {
      authStatus.textContent = result.error;
      authStatus.style.color = "#dc3545";
    }
  } catch (error) {
    console.error("Login error:", error);
    authStatus.textContent = error.message || "Login failed. Please try again.";
    authStatus.style.color = "#dc3545";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});

// Load saved settings
const minPriceInput = settingsPanel.querySelector("#min-price-input");
const pinCodeInput = settingsPanel.querySelector("#pin-code-input");

const savedPrice = localStorage.getItem("dynamicMinPrice");
if (savedPrice) {
  minPriceInput.value = savedPrice;
  window.dynamicMinPrice = parseFloat(savedPrice);
} else {
  window.dynamicMinPrice = 500;
  minPriceInput.value = window.dynamicMinPrice;
}

const savedPin = localStorage.getItem("dynamicPinCode");
if (savedPin) {
  pinCodeInput.value = savedPin;
  window.dynamicPinCode = savedPin;
} else {
  window.dynamicPinCode = "123456";
  pinCodeInput.value = window.dynamicPinCode;
}

// Save settings
settingsPanel.querySelector("#save-settings-btn").onclick = () => {
  const priceValue = parseFloat(minPriceInput.value);
  const pinValue = pinCodeInput.value.trim();

  if (isNaN(priceValue)) {
    alert("Please enter a valid minimum price.");
    return;
  }

  if (!pinValue || pinValue.length !== 6) {
    alert("Please enter a 6-digit PIN code.");
    return;
  }

  localStorage.setItem("dynamicMinPrice", priceValue);
  window.dynamicMinPrice = priceValue;

  localStorage.setItem("dynamicPinCode", pinValue);
  window.dynamicPinCode = pinValue;
  
  alert("✅ Settings saved successfully!");
  settingsPanel.style.display = "none";
};

// Developer banner with dynamic text
const banner = document.createElement("div");
banner.className = "developer-banner";
banner.innerHTML = `
  <div class="marquee">${currentBannerText}</div>
`;
document.body.appendChild(banner);

// Auto-login if credentials exist
const savedUsername = localStorage.getItem('automationUsername');
if (savedUsername) {
  usernameInput.value = savedUsername;
  toggleLoginBtn.click();
  loginBtn.textContent = "Login (auto)";
}
// Helper function to create hash code for message comparison
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
// Initialize when page loads
startDataPolling();