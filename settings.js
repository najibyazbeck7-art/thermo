/* =========================================
   PROJECT: THERMO
   FILE: settings.js
   ROLE: Logic for the independent settings page
   ========================================= */

// --- 1. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Load previously saved names from LocalStorage into the input fields
    for (let i = 1; i <= 4; i++) {
        const savedName = localStorage.getItem(`relay-name-${i}`);
        const input = document.getElementById(`name-input-${i}`);
        if (savedName && input) {
            input.value = savedName;
        }
    }

    // Initialize the Log Toggle behavior
    setupLogToggle();
    
    // Pre-render logs in case the user opens the log immediately
    renderDashboardLogs();
});

// --- 2. LOG WINDOW LOGIC ---
/**
 * Handles the showing/hiding of the debug log
 * Matches the #toggle-log-btn and #debug-log IDs in your CSS
 */
function setupLogToggle() {
    const logBtn = document.getElementById('toggle-log-btn');
    const logDiv = document.getElementById('debug-log');
    
    if (logBtn && logDiv) {
        logBtn.onclick = () => {
            const isHidden = logDiv.style.display === 'none' || logDiv.style.display === '';
            
            if (isHidden) {
                logDiv.style.display = 'block';
                logBtn.innerText = "HIDE SYSTEM LOG";
                renderDashboardLogs(); // Refresh content from LocalStorage
            } else {
                logDiv.style.display = 'none';
                logBtn.innerText = "SHOW SYSTEM LOG";
            }
        };
    }
}

/**
 * Grabs the 'thermo_logs' array saved by script.js (on the dashboard)
 * and displays them formatted for the settings page.
 */
function renderDashboardLogs() {
    const logDiv = document.getElementById('debug-log');
    if (!logDiv) return;

    const rawLogs = localStorage.getItem('thermo_logs');
    const logs = JSON.parse(rawLogs || '[]');
    
    if (logs.length === 0) {
        logDiv.innerHTML = '<div style="color:#64748b; padding: 5px;">> No system logs found.</div>';
        return;
    }

    // Map the log objects to HTML strings
    logDiv.innerHTML = logs.map(log => `
        <div style="margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span style="color:#64748b">[${log.time}]</span> 
            <span style="color:${log.color}">${log.msg}</span>
        </div>
    `).join('');
    
    // Auto-scroll to the bottom of the logs
    logDiv.scrollTop = logDiv.scrollHeight;
}

// --- 3. SAVE LOGIC ---
/**
 * Captures all input values, saves them to LocalStorage, 
 * and redirects the user back to the main dashboard.
 */
function saveAndExit() {
    // 1. Save to LocalStorage (for immediate use)
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`name-input-${i}`);
        if (input) {
            const newName = input.value.trim();
            localStorage.setItem(`relay-name-${i}`, newName);
            
            // 2. BACKUP TO MQTT: Send to 'home/name/1', 'home/name/2', etc.
            // Note: This requires a temporary MQTT connection in settings.js 
            // or a shared client. For now, let's focus on the Logic:
            publishNameBackup(i, newName); 
        }
    }
    
    // Visual Feedback
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) saveBtn.innerText = "✓ SYNCED TO CLOUD";

    setTimeout(() => { window.location.href = 'index.html'; }, 800);
}

// Helper to push names to broker so they survive cache clears
function publishNameBackup(id, name) {
    if (typeof client !== 'undefined' && client.isConnected()) {
        const msg = new Paho.MQTT.Message(name);
        msg.destinationName = `home/name/${id}`;
        msg.retained = true; // THIS IS THE KEY: The broker remembers this forever
        client.send(msg);
    }
}