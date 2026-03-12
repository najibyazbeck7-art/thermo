/* =========================================
    THERMO BETA - DASHBOARD LOGIC
   ========================================= */

const HOST = "64b3984aead9464a9b1aa9c3f34080bb.s1.eu.hivemq.cloud";
const PORT = 8884; 
const USER = "najibyazbeck";
const PASS = "Zaqwsx123*";
const CLIENT_ID = "THERMO_" + Math.random().toString(16).substr(2, 6);

let deferredPrompt;
let activeTimers = {}; 
let heartbeatTimeout; 
const client = new Paho.MQTT.Client(HOST, PORT, CLIENT_ID);

// --- 1. MQTT CONNECTION & HEARTBEAT ---

function connectMQTT() {
    saveLog("Linking to Cloud...", "#3b82f6");
    client.connect({
        userName: USER, password: PASS, useSSL: true,
        onSuccess: () => {
            updateStatus("CHECKING...", "offline"); 
            client.subscribe("home/status/#"); 
            client.subscribe("home/relay/#");
            client.subscribe("home/availability");
            client.subscribe("home/name/#"); // Listen for cloud backup names
            saveLog("Broker Connected.", "#10b981");
        },
        onFailure: (err) => {
            updateStatus("DISCONNECTED", "offline");
            saveLog("Offline: Check Internet", "#ef4444");
            setTimeout(connectMQTT, 5000);
        }
    });
}

client.onMessageArrived = (message) => {
    const topic = message.destinationName;
    const payload = message.payloadString;

    // A. Handle Hardware Availability
    if (topic.includes("/availability")) {
        updateStatus(payload, payload === "ONLINE" ? "online" : "offline");
        
        // ADDED TO LOG:
        saveLog(`Device status: ${payload}`, payload === "ONLINE" ? "#10b981" : "#fbbf24");

        if (payload === "OFFLINE") {
            clearTimeout(heartbeatTimeout);
            return; 
        }
    }

    // B. Handle Relay State
    if (topic.includes("/status")) {
        const id = topic.split('/')[2];
        updateRelayUI(id, payload);
        
        // ADDED TO LOG:
        saveLog(`Relay ${id} turned ${payload}`, "#94a3b8");
        
        const currentBar = document.getElementById('status-bar').innerText;
        if (!currentBar.includes("OFFLINE")) updateStatus("ONLINE", "online");
    }

    // C. Handle Name Sync from Cloud
    if (topic.includes("/name/")) {
        const id = topic.split('/')[2];
        if (localStorage.getItem(`relay-name-${id}`) !== payload) {
            localStorage.setItem(`relay-name-${id}`, payload);
            applyCustomNames();
            
            // ADDED TO LOG:
            saveLog(`Updated name for Relay ${id}: ${payload}`, "#3b82f6");
        }
    }

    // D. Heartbeat Timer (65s)
    if (payload !== "OFFLINE") {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = setTimeout(() => {
            updateStatus("OFFLINE (TIMEOUT)", "offline");
            saveLog("Signal Lost: Heartbeat Timeout", "#ef4444");
        }, 65000);
    }
};

// --- 2. COMMANDS & UI ---

function publishCommand(num, val) {
    if (!client.isConnected()) return;
    const message = new Paho.MQTT.Message(val);
    message.destinationName = `home/relay/${num}`;
    message.retained = true; 
    client.send(message);

    if (val === "ON") {
        const input = document.getElementById(`timer-input-${num}`);
        const secs = input ? parseInt(input.value) : 0;
        if (secs > 0) startTimer(num, secs);
    } else {
        stopTimer(num);
    }
}

function updateRelayUI(id, state) {
    const badge = document.getElementById(`badge-${id}`);
    const btnOn = document.getElementById(`btn-on-${id}`);
    const btnOff = document.getElementById(`btn-off-${id}`);
    const box = document.querySelector(`.relay-box[data-relay="${id}"]`);
    
    if (!badge) return;
    badge.innerText = state;

    if (state === "ON") {
        box.classList.add('active');
        btnOn.className = "btn btn-inactive";
        btnOff.className = "btn btn-off";
    } else {
        box.classList.remove('active');
        btnOn.className = "btn btn-on";
        btnOff.className = "btn btn-inactive";
        stopTimer(id);
    }
}

function updateStatus(text, status) {
    const bar = document.getElementById('status-bar');
    if (!bar) return;
    bar.innerText = text;
    bar.className = (status === "online") ? 'status-pill is-online' : 'status-pill is-offline';
    bar.style.backgroundColor = (text === "DISCONNECTED") ? "#475569" : "";
}

// --- 3. UTILITIES ---

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
        const disp = document.getElementById(`countdown-${num}`);
        if(disp) disp.innerText = "";
    }
}

function saveLog(msg, color) {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    let logs = JSON.parse(localStorage.getItem('thermo_logs') || '[]');
    logs.push({ time, msg, color });
    if (logs.length > 20) logs.shift();
    localStorage.setItem('thermo_logs', JSON.stringify(logs));
}

function applyCustomNames() {
    for (let i = 1; i <= 4; i++) {
        const name = localStorage.getItem(`relay-name-${i}`);
        const label = document.querySelector(`.relay-box[data-relay="${i}"] .device-name`);
        if (name && label) label.innerText = name;
    }
}

function shareDashboard() {
    if (navigator.share) {
        navigator.share({ title: 'Thermo Hub', url: window.location.href });
    }
}


// --- 4. SENSOR SIMULATION (Temporary) ---
function simulateTemperature() {
    // Generate a random number between 22.0 and 26.0
    const mockTemp = (Math.random() * (26 - 22) + 22).toFixed(1);
    const tempElement = document.getElementById('temp-value');
    
    if (tempElement) {
        tempElement.innerText = mockTemp;
    }
}

// Start simulation every 5 seconds
setInterval(simulateTemperature, 5000);

// Run once immediately on load
window.addEventListener('DOMContentLoaded', () => {
    simulateTemperature();
    // ... your existing init code
});

// Init
window.addEventListener('DOMContentLoaded', () => {
    applyCustomNames();
    connectMQTT();
});