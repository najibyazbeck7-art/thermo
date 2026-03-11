/* =========================================
    THERMO BETA - MASTER DASHBOARD LOGIC
   ========================================= */

// --- 1. CONFIGURATION & GLOBALS ---
const HOST = "64b3984aead9464a9b1aa9c3f34080bb.s1.eu.hivemq.cloud";
const PORT = 8884; 
const USER = "najibyazbeck";
const PASS = "Zaqwsx123*";
const CLIENT_ID = "THERMO_" + Math.random().toString(16).substr(2, 6);

let deferredPrompt;
let activeTimers = {}; 
let heartbeatTimeout; 
const client = new Paho.MQTT.Client(HOST, PORT, CLIENT_ID);

// --- 2. MQTT CORE CONNECTION & EVENT HANDLERS ---

/**
 * Initiates connection to HiveMQ Cloud.
 */
function connectMQTT() {
    saveLog("Attempting to reach Cloud...", "#3b82f6");
    client.connect({
        userName: USER, password: PASS, useSSL: true,
        onSuccess: () => {
            // App has internet connection, hardware status unknown initially
            updateStatus("CHECKING DEVICE...", "offline"); 
            client.subscribe("home/status/#"); 
            client.subscribe("home/relay/#");
            client.subscribe("home/availability");
            saveLog("Broker Linked. Waiting for Device...", "#10b981");
        },
        onFailure: (err) => {
            // Mobile device has no internet or Broker is unreachable
            updateStatus("DISCONNECTED", "offline");
            saveLog("Connection Failed: Check Internet", "#ef4444");
            setTimeout(connectMQTT, 5000);
        }
    });
}

/**
 * Handles incoming messages from the MQTT Broker.
 * Routes data to UI updates and handles system availability.
 */
client.onMessageArrived = (message) => {
    const topic = message.destinationName;
    const payload = message.payloadString;

    // A. HANDLE AVAILABILITY (The "Master" Status)
    if (topic.includes("/availability")) {
        updateStatus(payload, payload === "ONLINE" ? "online" : "offline");
        saveLog(`Device Availability: ${payload}`, "#fbbf24");
        
        if (payload === "OFFLINE") {
            clearTimeout(heartbeatTimeout);
            return; 
        }
    }

    // B. HANDLE RELAY DATA
    if (topic.includes("/status")) {
        const id = topic.split('/')[2];
        updateRelayUI(id, payload);
        saveLog(`Relay ${id}: ${payload}`, "#94a3b8");

        // Only flip to ONLINE if the current bar doesn't already say OFFLINE
        const currentStatus = document.getElementById('status-bar').innerText;
        if (!currentStatus.includes("OFFLINE")) {
            updateStatus("ONLINE", "online");
        }
    }

    // C. DEAD MAN'S SWITCH (Heartbeat)
    if (payload !== "OFFLINE") {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = setTimeout(() => {
            updateStatus("OFFLINE (TIMEOUT)", "offline");
            saveLog("Hardware Signal Lost", "#ef4444");
        }, 65000);
    }
};

/**
 * Handles unexpected disconnection from the MQTT Broker.
 */
client.onConnectionLost = (resp) => {
    updateStatus("DISCONNECTED", "offline");
    saveLog("Broker Connection Lost", "#ef4444");
    setTimeout(connectMQTT, 5000);
};

// --- 3. RELAY COMMANDS & COUNTDOWN TIMERS ---

/**
 * Publishes ON/OFF commands to specific relays.
 */
function publishCommand(num, val) {
    if (!client.isConnected()) {
        saveLog("Error: No Connection", "#ef4444");
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

/**
 * Visual countdown logic for Auto-OFF functionality.
 */
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

/**
 * Clears active countdown and UI display.
 */
function stopTimer(num) {
    if (activeTimers[num]) {
        clearInterval(activeTimers[num]);
        delete activeTimers[num];
        const display = document.getElementById(`countdown-${num}`);
        if(display) display.innerText = "";
    }
}

// --- 4. UI COMPONENTS & LOGGING ---

/**
 * Updates the Relay boxes and badges based on state.
 */
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

/**
 * Updates the Global Status Bar (Online/Offline/Disconnected).
 */
function updateStatus(text, status) {
    const bar = document.getElementById('status-bar');
    if (bar) {
        bar.innerText = text;
        bar.className = (status === "online") ? 'status-pill is-online' : 'status-pill is-offline';
        
        if (text === "DISCONNECTED") {
            bar.style.backgroundColor = "#475569"; 
        } else {
            bar.style.backgroundColor = ""; 
        }
    }
}

/**
 * Saves activity logs to LocalStorage for debugging on the Settings page.
 */
function saveLog(msg, color) {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const logEntry = { time, msg, color };
    
    let logs = JSON.parse(localStorage.getItem('thermo_logs') || '[]');
    logs.push(logEntry);
    if (logs.length > 20) logs.shift();
    
    localStorage.setItem('thermo_logs', JSON.stringify(logs));
    console.log(`[${time}] ${msg}`);
}

/**
 * Loads custom device names from LocalStorage.
 */
function applyCustomNames() {
    for (let i = 1; i <= 4; i++) {
        const savedName = localStorage.getItem(`relay-name-${i}`);
        const label = document.querySelector(`.relay-box[data-relay="${i}"] .device-name`);
        if (savedName && label && savedName.trim() !== "") {
            label.innerText = savedName;
        }
    }
}

// --- 5. PWA INSTALLATION LOGIC ---

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => console.log("THERMO: SW Registered"));
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) installBtn.style.display = 'block';
});

function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') console.log('User installed Thermo');
        deferredPrompt = null;
        document.getElementById('install-pwa-btn').style.display = 'none';
    });
}

// --- 6. APP INITIALIZATION ---

window.addEventListener('DOMContentLoaded', () => {
    applyCustomNames();
    connectMQTT();
});