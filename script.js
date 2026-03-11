/* =========================================
    THERMO BETA - MASTER JAVASCRIPT
   ========================================= */

// --- 1. CONFIGURATION & GLOBALS ---
let lastSignalTime = Date.now();
const HOST = "64b3984aead9464a9b1aa9c3f34080bb.s1.eu.hivemq.cloud";
const PORT = 8884; 
const USER = "najibyazbeck";
const PASS = "Zaqwsx123*";
const CLIENT_ID = "THERMO_" + Math.random().toString(16).substr(2, 6);

let deferredPrompt;
let activeTimers = {}; 
const client = new Paho.MQTT.Client(HOST, PORT, CLIENT_ID);

// SVG Icons (2D Gear and Close)
const GEAR_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>`;
const CLOSE_SVG = `<svg width="24" height="24" style="color:#ef4444" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

// --- 2. PWA SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => console.log("THERMO: SW Registered"));
}

// --- 3. MQTT CONNECTION ---
function connectMQTT() {
    writeLog("Connecting to THERMO Cloud...", "#3b82f6");
    client.connect({
        userName: USER, password: PASS, useSSL: true,
        onSuccess: () => {
            updateStatus("ONLINE", "online");
            client.subscribe("home/relay/#");
            writeLog("Connected Successfully!", "#10b981");
        },
        onFailure: (err) => {
            updateStatus("FAILED", "offline");
            writeLog("Connect Fail: " + err.errorMessage, "#ef4444");
            setTimeout(connectMQTT, 5000);
        }
    });
}

client.onMessageArrived = (message) => {
    lastSignalTime = Date.now(); 
    const topic = message.destinationName;
    const payload = message.payloadString;

    if (topic.includes("/status")) {
        const id = topic.split('/')[2];
        writeLog(`FEEDBACK: Relay ${id} is ${payload}`, "#94a3b8");
        updateRelayUI(id, payload);
    }
};

client.onConnectionLost = (resp) => {
    updateStatus("OFFLINE", "offline");
    writeLog("Signal Lost: " + resp.errorMessage, "#ef4444");
    setTimeout(connectMQTT, 5000);
};

// --- 4. COMMANDS & TIMERS ---
function publishCommand(num, val) {
    if (!client.isConnected()) {
        writeLog("Error: Not Connected", "#ef4444");
        return;
    }
    const message = new Paho.MQTT.Message(val);
    message.destinationName = `home/relay/${num}`;
    message.retained = true; 
    client.send(message);

    if (val === "ON") {
        const input = document.getElementById(`timer-input-${num}`);
        const seconds = input ? parseInt(input.value) : 0;
        if (seconds > 0) startTimer(num, seconds);
    } else {
        stopTimer(num);
    }
}

function startTimer(num, seconds) {
    stopTimer(num);
    let timeLeft = seconds;
    const display = document.getElementById(`countdown-${num}`);
    activeTimers[num] = setInterval(() => {
        timeLeft--;
        if (display) display.innerText = `⏱ ${timeLeft}s`;
        if (timeLeft <= 0) {
            publishCommand(num, "OFF");
            stopTimer(num);
        }
    }, 1000);
}

function stopTimer(num) {
    if (activeTimers[num]) {
        clearInterval(activeTimers[num]);
        delete activeTimers[num];
        const display = document.getElementById(`countdown-${num}`);
        if(display) display.innerText = "";
    }
}

// --- 5. VIEW TOGGLE & SETTINGS ---
function toggleView() {
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const navBtn = document.getElementById('nav-btn');

    if (mainView.classList.contains('view-active')) {
        // Switch to Settings
        mainView.classList.replace('view-active', 'view-hidden');
        settingsView.classList.replace('view-hidden', 'view-active');
        navBtn.innerHTML = CLOSE_SVG;
        loadSettingsInputs();
    } else {
        // Switch to Dashboard
        settingsView.classList.replace('view-active', 'view-hidden');
        mainView.classList.replace('view-hidden', 'view-active');
        navBtn.innerHTML = GEAR_SVG;
    }
}

function loadSettingsInputs() {
    for (let i = 1; i <= 4; i++) {
        const saved = localStorage.getItem(`relay-name-${i}`);
        const input = document.getElementById(`name-input-${i}`);
        if (saved && input) input.value = saved;
    }
}

function saveAllSettings() {
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`name-input-${i}`);
        if (input) localStorage.setItem(`relay-name-${i}`, input.value);
    }
    applyNamesToDashboard();
    toggleView();
    writeLog("SYSTEM: Names Saved", "#34d399");
}

function applyNamesToDashboard() {
    for (let i = 1; i <= 4; i++) {
        const savedName = localStorage.getItem(`relay-name-${i}`);
        const label = document.querySelector(`.relay-box[data-relay="${i}"] .device-name`);
        if (savedName && label) label.innerText = savedName;
    }
}

// --- 6. UI UTILITIES ---
function updateRelayUI(id, state) {
    const badge = document.getElementById(`badge-${id}`);
    const btnOn = document.getElementById(`btn-on-${id}`);
    const btnOff = document.getElementById(`btn-off-${id}`);
    if (!badge) return;

    const box = badge.closest('.relay-box');
    badge.innerText = state;

    if (state === "ON") {
        box.classList.add('active');
        if (btnOn) btnOn.className = "btn btn-inactive";
        if (btnOff) btnOff.className = "btn btn-off";
    } else {
        box.classList.remove('active');
        if (btnOn) btnOn.className = "btn btn-on";
        if (btnOff) btnOff.className = "btn btn-inactive";
        stopTimer(id);
    }
}

function updateStatus(text, status) {
    const bar = document.getElementById('status-bar');
    if (bar) {
        bar.innerText = text;
        bar.className = (status === "online") ? 'status-pill is-online' : 'status-pill is-offline';
    }
}

function writeLog(msg, color) {
    const logDiv = document.getElementById('debug-log');
    if (!logDiv) return;
    const time = new Date().toLocaleTimeString([], { hour12: false });
    logDiv.innerHTML += `<div><span style="color:#64748b">[${time}]</span> <span style="color:${color}">${msg}</span></div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

// --- 7. INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    // Log Toggle Setup
    const logBtn = document.getElementById('toggle-log-btn');
    const logDiv = document.getElementById('debug-log');
    if (logBtn && logDiv) {
        logBtn.onclick = () => {
            const isHidden = logDiv.style.display === 'none' || logDiv.style.display === '';
            logDiv.style.display = isHidden ? 'block' : 'none';
            logBtn.innerText = isHidden ? "HIDE SYSTEM LOG" : "SHOW SYSTEM LOG";
        };
    }

    applyNamesToDashboard();
    connectMQTT();
});

// Heartbeat Timer
setInterval(() => {
    const elapsed = Math.round((Date.now() - lastSignalTime) / 1000);
    const display = document.getElementById('heartbeat-timer');
    if (display) {
        display.innerText = `SIGNAL: ${elapsed}S AGO`;
        display.style.color = elapsed > 30 ? "#ef4444" : "#94a3b8";
    }
}, 1000);