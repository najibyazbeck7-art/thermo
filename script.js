const HOST = "64b3984aead9464a9b1aa9c3f34080bb.s1.eu.hivemq.cloud";
const PORT = 8884;
const CLIENT_ID = "THERMO_" + Math.random().toString(16).substr(2, 4);
const client = new Paho.MQTT.Client(HOST, PORT, CLIENT_ID);

function writeLog(msg, color = "#94a3b8") {
    const logDiv = document.getElementById('debug-log');
    if (!logDiv) return;
    const time = new Date().toLocaleTimeString([], { hour12: false });
    logDiv.innerHTML += `<div><span style="color:#64748b">[${time}]</span> <span style="color:${color}">${msg}</span></div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function toggleView() {
    const main = document.getElementById('main-view');
    const sett = document.getElementById('settings-view');
    if (!main || !sett) return;

    if (main.style.display !== 'none') {
        main.style.display = 'none';
        sett.style.display = 'block';
        writeLog("Opened Settings");
    } else {
        sett.style.display = 'none';
        main.style.display = 'block';
        writeLog("Returned to Dashboard");
    }
}

// Log Toggle logic inside Settings
window.addEventListener('DOMContentLoaded', () => {
    const logBtn = document.getElementById('toggle-log-btn');
    const logDiv = document.getElementById('debug-log');
    if (logBtn && logDiv) {
        logDiv.style.display = 'none'; // Ensure hidden by default
        logBtn.onclick = () => {
            const isHidden = logDiv.style.display === 'none';
            logDiv.style.display = isHidden ? 'block' : 'none';
            logBtn.innerText = isHidden ? "HIDE SYSTEM LOG" : "SHOW SYSTEM LOG";
        };
    }
    
    // Connect MQTT
    client.connect({
        userName: "najibyazbeck",
        password: "Zaqwsx123*",
        useSSL: true,
        onSuccess: () => {
            writeLog("Connected to Cloud", "#10b981");
            client.subscribe("home/relay/#");
        },
        onFailure: (e) => writeLog("Connect Fail: " + e.errorMessage, "#ef4444")
    });
});