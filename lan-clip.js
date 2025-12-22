// lan-clipboard.js
const dgram = require('dgram');
const os = require('os');
const { exec } = require('child_process');

// Config
const PORT = 41234;
const BROADCAST_ADDR = '255.255.255.255';
const POLL_INTERVAL = 500; // check clipboard every 0.5 sec

const socket = dgram.createSocket('udp4');

let lastClipboard = '';

// Detect OS
const isLinux = os.platform() === 'linux';
const isTermux = process.env.TERMUX_VERSION ? true : false;

// Function to get clipboard
function getClipboard(callback) {
    if (isTermux) {
        exec('termux-clipboard-get', (err, stdout) => {
            callback(err ? '' : stdout);
        });
    } else if (isLinux) {
        exec('xclip -selection clipboard -o', (err, stdout) => {
            callback(err ? '' : stdout);
        });
    } else {
        callback('');
    }
}

// Function to set clipboard
function setClipboard(text) {
    if (!text) return;
    if (isTermux) exec(`termux-clipboard-set "${text}"`);
    else if (isLinux) exec(`echo "${text}" | xclip -selection clipboard`);
}

// Send clipboard to network
function sendClipboard(text) {
    const message = Buffer.from(text);
    socket.send(message, 0, message.length, PORT, BROADCAST_ADDR);
}

// Listen for messages
socket.bind(PORT, () => {
    socket.setBroadcast(true);
    console.log(`Listening on port ${PORT} for LAN clipboard...`);
});

socket.on('message', (msg, rinfo) => {
    const text = msg.toString();
    // Ignore our own messages
    if (!text || text === lastClipboard) return;

    console.log(`\n[LAN CLIPBOARD RECEIVED]: ${text}`);
    setClipboard(text);
    lastClipboard = text;
});

// Poll clipboard every POLL_INTERVAL
setInterval(() => {
    getClipboard((current) => {
        if (current && current !== lastClipboard) {
            lastClipboard = current;
            sendClipboard(current);
        }
    });
}, POLL_INTERVAL);