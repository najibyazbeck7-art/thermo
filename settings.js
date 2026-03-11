/* =========================================
   PROJECT: THERMO
   FILE: settings.js
   ROLE: Logic for settings with Cloud Sync
   ========================================= */

// --- 1. CONFIGURATION (Same as Dashboard) ---
const HOST = "64b3984aead9464a9b1aa9c3f34080bb.s1.eu.hivemq.cloud";
const PORT = 8884; 
const USER = "najibyazbeck";
const PASS = "Zaqwsx123*";
const CLIENT_ID = "THERMO_SETTINGS_" + Math.random().toString(16).substr(2, 6);

const client = new Paho.MQTT.Client(HOST, PORT, CLIENT_ID);

// --- 2. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Load local names immediately
    for (let i = 1; i <= 4; i++) {
        const savedName = localStorage.getItem(`relay-name-${i}`);
        const input = document.getElementById(`name-input-${i}`);
        if (savedName && input) input.value = savedName;
    }

    setupLogToggle();
    connectSettingsMQTT();
});

// --- 3. CLOUD SYNC LOGIC ---

function connectSettingsMQTT() {
    client.connect({
        userName: USER, password: PASS, useSSL: true,
        onSuccess: () => {
            console.log("Settings synced with Cloud");
            // Optional: subscribe to names to see what the cloud currently has
            client.subscribe("home/name/#");
        },
        onFailure: (err) => console.log("Sync failed: " + err.errorMessage)
    });
}

/**
 * Pushes names to the Broker with RETAIN = TRUE
 * This is what makes them survive a cache clear.
 */
function publishNameBackup(id, name) {
    if (client.isConnected()) {
        const message = new Paho.MQTT.Message(name);
        message.destinationName = `home/name/${id}`;
        message.retained = true; // THE MAGIC SETTING
        client.send(message);
    }
}

// --- 4. SAVE & EXIT ---

function saveAndExit() {
    const saveBtn = document.querySelector('.btn-save');
    
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`name-input-${i}`);
        if (input) {
            const newName = input.value.trim();
            
            // Save Locally
            localStorage.setItem(`relay-name-${i}`, newName);
            
            // Save to Cloud Backup
            publishNameBackup(i, newName);
        }
    }
    
    if (navigator.vibrate) navigator.vibrate(50);

    if (saveBtn) {
        saveBtn.innerText = "✓ SYNCED TO CLOUD";
        saveBtn.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
    }

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 800);
}

// --- 5. LOG & UI UTILITIES ---

function setupLogToggle() {
    const logBtn = document.getElementById('toggle-log-btn');
    const logDiv = document.getElementById('debug-log');
    
    if (logBtn && logDiv) {
        logBtn.onclick = () => {
            const isHidden = logDiv.style.display === 'none' || logDiv.style.display === '';
            if (isHidden) {
                logDiv.style.display = 'block';
                logBtn.innerText = "HIDE SYSTEM LOG";
                renderDashboardLogs(); 
            } else {
                logDiv.style.display = 'none';
                logBtn.innerText = "SHOW SYSTEM LOG";
            }
        };
    }
}

function renderDashboardLogs() {
    const logDiv = document.getElementById('debug-log');
    if (!logDiv) return;
    const logs = JSON.parse(localStorage.getItem('thermo_logs') || '[]');
    
    logDiv.innerHTML = logs.length === 0 ? 
        '<div style="color:#64748b; padding:10px;">> No logs...</div>' :
        logs.map(log => `
            <div style="margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.03);">
                <span style="color:#64748b; font-size: 0.65rem;">[${log.time}]</span> 
                <span style="color:${log.color || '#f1f5f9'}; font-size: 0.75rem;"> ${log.msg}</span>
            </div>
        `).join('');
    
    logDiv.scrollTop = logDiv.scrollHeight;
}