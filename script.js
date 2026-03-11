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

// --- 2. PWA INSTALLATION & SERVICE WORKER ---
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

// --- 3. MQTT CONNECTION ---
function connectMQTT() {
    saveLog("Attempting to reach Cloud...", "#3b82f6");
    client.connect({
        userName: USER, password: PASS, useSSL: true,
        onSuccess: () => {
            // App has internet/broker connection, but hardware status is unknown yet
            updateStatus("CHECKING DEVICE...", "offline"); 
            client.subscribe("home/status/#"); 
            client.subscribe("home/relay/#");
            client.subscribe("home/availability");
            saveLog("Broker Linked. Waiting for Device...", "#10b981");
        },
        onFailure: (err) => {
            // No internet or Broker is down
            updateStatus("DISCONNECTED", "offline");
            saveLog("Connection Failed: Check Internet", "#ef4444");
            setTimeout(connectMQTT, 5000);
        }
    });
}

client.onMessageArrived = (message) => {
    const topic = message.destinationName;
    const payload = message.payloadString;

    // 1. HANDLE AVAILABILITY (The "Master" Status)
    if (topic.includes("/availability")) {
        // This will set the bar to "OFFLINE" if the payload is OFFLINE
        updateStatus(payload, payload === "ONLINE" ? "online" : "offline");
        saveLog(`Device Availability: ${payload}`, "#fbbf24");
        
        // If the device is explicitly OFFLINE, we stop the heartbeat timer
        if (payload === "OFFLINE") {
            clearTimeout(heartbeatTimeout);
            return; // Don't process relay data if device is dead
        }
    }

    // 2. HANDLE RELAY DATA
    if (topic.includes("/status")) {
        const id = topic.split('/')[2];
        updateRelayUI(id, payload);
        saveLog(`Relay ${id}: ${payload}`, "#94a3b8");

        // HEARTBEAT SAFETY:
        // Only flip to ONLINE if the current bar doesn't already say OFFLINE
        const currentStatus = document.getElementById('status-bar').innerText;
        if (!currentStatus.includes("OFFLINE")) {
            updateStatus("ONLINE", "online");
        }
    }

    // 3. DEAD MAN'S SWITCH (Heartbeat)
    // Only reset this if the message isn't an "OFFLINE" announcement
    if (payload !== "OFFLINE") {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = setTimeout(() => {
            updateStatus("OFFLINE (TIMEOUT)", "offline");
            saveLog("Hardware Signal Lost", "#ef4444");
        }, 65000);
    }
};

client.onConnectionLost = (resp) => {
    // This happens when the Phone/Browser loses internet or connection to HiveMQ
    updateStatus("DISCONNECTED", "offline");
    saveLog("Broker Connection Lost", "#ef4444");
    setTimeout(connectMQTT, 5000);
};

// --- 4. COMMANDS & TIMERS ---
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

// --- 5. UI & LOGGING UTILITIES ---
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
        // Logic: Only 'online' status gets the green color
        bar.className = (status === "online") ? 'status-pill is-online' : 'status-pill is-offline';
        
        // Custom color for DISCONNECTED state if you want it to look different than OFFLINE
        if (text === "DISCONNECTED") {
            bar.style.backgroundColor = "#475569"; // Slate gray for no internet
        } else {
            bar.style.backgroundColor = ""; // Use CSS classes
        }
    }
}

function saveLog(msg, color) {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const logEntry = { time, msg, color };
    
    let logs = JSON.parse(localStorage.getItem('thermo_logs') || '[]');
    logs.push(logEntry);
    if (logs.length > 20) logs.shift();
    
    localStorage.setItem('thermo_logs', JSON.stringify(logs));
    console.log(`[${time}] ${msg}`);
}

function applyCustomNames() {
    for (let i = 1; i <= 4; i++) {
        const savedName = localStorage.getItem(`relay-name-${i}`);
        const label = document.querySelector(`.relay-box[data-relay="${i}"] .device-name`);
        if (savedName && label && savedName.trim() !== "") {
            label.innerText = savedName;
        }
    }
}

// --- 6. INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    applyCustomNames();
    connectMQTT();
});