/* =========================================
    THERMO BETA - MASTER LOGIC
   ========================================= */

const CLIENT_ID = "THERMO_" + Math.random().toString(16).substr(2, 4);
const client = new Paho.MQTT.Client("64b3984aead9464a9b1aa9c3f34080bb.s1.eu.hivemq.cloud", 8884, CLIENT_ID);

// Helper for System Log
function writeLog(msg, color = "#94a3b8") {
    const logDiv = document.getElementById('debug-log');
    if (!logDiv) return;
    
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const entry = document.createElement('div');
    entry.style.marginBottom = "4px";
    entry.innerHTML = `<span style="color:#64748b">[${time}]</span> <span style="color:${color}">${msg}</span>`;
    
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
}

// MQTT Connection Logic
function connectMQTT() {
    writeLog("Connecting to THERMO Cloud...", "#3b82f6");
    client.connect({
        userName: "najibyazbeck",
        password: "Zaqwsx123*",
        useSSL: true,
        onSuccess: () => {
            writeLog("Connected Successfully!", "#10b981");
            const statusPill = document.getElementById('status-bar');
            if (statusPill) {
                statusPill.innerText = "ONLINE";
                statusPill.className = "status-pill is-online";
            }
            client.subscribe("home/relay/#");
        },
        onFailure: (e) => {
            writeLog("Connection Failed: " + e.errorMessage, "#ef4444");
            setTimeout(connectMQTT, 5000);
        }
    });
}

// Initialize UI
window.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Log Toggle
    const logBtn = document.getElementById('toggle-log-btn');
    const logDiv = document.getElementById('debug-log');
    if (logBtn && logDiv) {
        logBtn.onclick = () => {
            const isHidden = logDiv.style.display === 'none' || logDiv.style.display === '';
            logDiv.style.display = isHidden ? 'block' : 'none';
            logBtn.innerText = isHidden ? "HIDE SYSTEM LOG" : "SHOW SYSTEM LOG";
        };
    }

    // 2. Start MQTT
    connectMQTT();
    
    // 3. Apply saved names
    applyNames();
});

// Settings Navigation
function toggleView() {
    const main = document.getElementById('main-view');
    const sett = document.getElementById('settings-view');
    const btn = document.getElementById('nav-btn');

    if (!main || !sett) return;

    if (main.style.display !== 'none') {
        main.style.display = 'none';
        sett.style.display = 'block';
        if (btn) btn.innerHTML = '✕'; // Simple close icon
    } else {
        sett.style.display = 'none';
        main.style.display = 'block';
        if (btn) btn.innerHTML = '⚙'; // Back to gear
    }
}

function applyNames() {
    for (let i = 1; i <= 4; i++) {
        const name = localStorage.getItem(`relay-name-${i}`);
        const el = document.querySelector(`.relay-box[data-relay="${i}"] .device-name`);
        if (name && el) el.innerText = name;
    }
}