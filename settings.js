/* =========================================
   THERMO BETA - SETTINGS LOGIC
   ========================================= */

const HOST = "64b3984aead9464a9b1aa9c3f34080bb.s1.eu.hivemq.cloud";
const PORT = 8884; 
const USER = "najibyazbeck";
const PASS = "Zaqwsx123*";
const CLIENT_ID = "THERMO_SET_" + Math.random().toString(16).substr(2, 6);
const client = new Paho.MQTT.Client(HOST, PORT, CLIENT_ID);

document.addEventListener('DOMContentLoaded', () => {
    // Load local names
    for (let i = 1; i <= 4; i++) {
        const val = localStorage.getItem(`relay-name-${i}`);
        if (val) document.getElementById(`name-input-${i}`).value = val;
    }

    setupLogToggle();
    client.connect({userName: USER, password: PASS, useSSL: true});
});

function setupLogToggle() {
    const btn = document.getElementById('toggle-log-btn');
    const log = document.getElementById('debug-log');
    if (!btn || !log) return;

    btn.onclick = () => {
        const isHidden = (log.style.display === 'none' || log.style.display === '');
        log.style.display = isHidden ? 'block' : 'none';
        btn.innerText = isHidden ? "HIDE SYSTEM LOG" : "SHOW SYSTEM LOG";
        if (isHidden) renderLogs();
    };
}

function renderLogs() {
    const logDiv = document.getElementById('debug-log');
    const logs = JSON.parse(localStorage.getItem('thermo_logs') || '[]');
    logDiv.innerHTML = logs.map(l => `
        <div style="margin-bottom:4px; border-bottom:1px solid #1e293b">
            <span style="color:#64748b">[${l.time}]</span> <span style="color:${l.color}">${l.msg}</span>
        </div>
    `).reverse().join('');
}

function saveAndExit() {
    for (let i = 1; i <= 4; i++) {
        const name = document.getElementById(`name-input-${i}`).value.trim();
        localStorage.setItem(`relay-name-${i}`, name);
        
        // Sync to Cloud
        if (client.isConnected()) {
            const msg = new Paho.MQTT.Message(name);
            msg.destinationName = `home/name/${i}`;
            msg.retained = true;
            client.send(msg);
        }
    }
    
    if (navigator.vibrate) navigator.vibrate(50);
    const btn = document.querySelector('.btn-save');
    btn.innerText = "✓ CLOUD SYNCED";
    btn.style.background = "#10b981";

    setTimeout(() => { window.location.href = 'index.html'; }, 800);
}