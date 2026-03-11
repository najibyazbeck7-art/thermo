const CLIENT_ID = "THERMO_" + Math.random().toString(16).substr(2, 4);
const client = new Paho.MQTT.Client("64b3984aead9464a9b1aa9c3f34080bb.s1.eu.hivemq.cloud", 8884, CLIENT_ID);

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

// Ensure log toggle works on load
window.addEventListener('DOMContentLoaded', () => {
    const logBtn = document.getElementById('toggle-log-btn');
    const logDiv = document.getElementById('debug-log');

    if (logBtn && logDiv) {
        logBtn.onclick = () => {
            const isHidden = logDiv.style.display === 'none' || logDiv.style.display === '';
            logDiv.style.display = isHidden ? 'block' : 'none';
            logBtn.innerText = isHidden ? "HIDE SYSTEM LOG" : "SHOW SYSTEM LOG";
            writeLog(isHidden ? "User opened log" : "User closed log");
        };
    }
    connectMQTT();
});

function connectMQTT() {
    writeLog("Connecting to THERMO Cloud...", "#3b82f6");
    client.connect({
        userName: "najibyazbeck",
        password: "Zaqwsx123*",
        useSSL: true,
        onSuccess: () => {
            writeLog("Connected Successfully!", "#10b981");
            client.subscribe("home/relay/#");
        },
        onFailure: (e) => {
            writeLog("Connection Failed: " + e.errorMessage, "#ef4444");
            setTimeout(connectMQTT, 5000);
        }
    });
}