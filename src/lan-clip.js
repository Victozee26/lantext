// lan-clipboard.js
const dgram = require('dgram');
const os = require('os');
const { execFile, spawn } = require('child_process');

// Config
const PORT = process.env.CLIP_PORT ? parseInt(process.env.CLIP_PORT) : 41234;
const BROADCAST_ADDR = process.env.CLIP_BROADCAST || '255.255.255.255';
const POLL_INTERVAL = process.env.CLIP_POLL_INTERVAL ? parseInt(process.env.CLIP_POLL_INTERVAL) : 1000; // check clipboard every 1 sec
const EXEC_TIMEOUT = process.env.CLIP_EXEC_TIMEOUT ? parseInt(process.env.CLIP_EXEC_TIMEOUT) : 2000; // 2 second timeout
const MAX_MESSAGE_SIZE = process.env.CLIP_MAX_SIZE ? parseInt(process.env.CLIP_MAX_SIZE) : 1024 * 1024; // 1MB max
const DEBUG = process.env.CLIP_DEBUG === 'true';

const socket = dgram.createSocket('udp4');
socket.setMaxListeners(10);

let lastClipboard = '';
let isGettingClipboard = false; // prevent concurrent requests

// Detect OS
const isLinux = os.platform() === 'linux';
const isTermux = process.env.TERMUX_VERSION ? true : false;

// Function to get clipboard
function getClipboard(callback) {
    if (isGettingClipboard) {
        callback('');
        return;
    }
    
    isGettingClipboard = true;
    
    try {
        if (isTermux) {
            execFile('termux-clipboard-get', { timeout: EXEC_TIMEOUT, maxBuffer: MAX_MESSAGE_SIZE }, (err, stdout) => {
                isGettingClipboard = false;
                callback(err ? '' : (stdout || '').trim());
            });
        } else if (isLinux) {
            execFile('xclip', ['-selection', 'clipboard', '-o'], { timeout: EXEC_TIMEOUT, maxBuffer: MAX_MESSAGE_SIZE }, (err, stdout) => {
                isGettingClipboard = false;
                callback(err ? '' : (stdout || '').trim());
            });
        } else {
            isGettingClipboard = false;
            callback('');
        }
    } catch (err) {
        isGettingClipboard = false;
        callback('');
    }
}

// Function to set clipboard
function setClipboard(text) {
    if (!text) return;
    try {
        if (isTermux) {
            execFile('termux-clipboard-set', [text], { timeout: EXEC_TIMEOUT });
        } else if (isLinux) {
            const proc = spawn('xclip', ['-selection', 'clipboard']);
            proc.stdin.write(text);
            proc.stdin.end();
        }
    } catch (err) {
        // silently fail
    }
}

// Send clipboard to network
// Helpers to compute broadcast addresses for interfaces
function ipToInt(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function intToIp(int) {
    return [24,16,8,0].map(shift => (int >>> shift) & 255).join('.');
}

function getBroadcastAddrs() {
    const nets = os.networkInterfaces();
    const addrs = [];
    for (const name of Object.keys(nets)) {
        for (const info of nets[name]) {
            if (info.family !== 'IPv4' || info.internal) continue;
            try {
                const ipInt = ipToInt(info.address);
                const maskInt = ipToInt(info.netmask);
                const bcastInt = (ipInt & maskInt) | (~maskInt >>> 0);
                const bcast = intToIp(bcastInt);
                addrs.push(bcast);
            } catch (err) {
                // ignore malformed addresses
            }
        }
    }
    // fallback to generic broadcast
    if (addrs.length === 0) addrs.push(BROADCAST_ADDR);
    // Deduplicate
    return Array.from(new Set(addrs));
}

function sendClipboard(text) {
    if (!text || text.length > MAX_MESSAGE_SIZE) {
        if (DEBUG) console.log('Skipping send: empty or too large');
        return;
    }
    const message = Buffer.from(text);
    const targets = getBroadcastAddrs();
    if (!targets.length) targets.push(BROADCAST_ADDR);
    targets.forEach((addr) => {
        socket.send(message, 0, message.length, PORT, addr, (err) => {
            if (err) {
                console.error(`Send to ${addr} error:`, err.message);
            } else if (DEBUG) {
                console.log(`Sent clipboard to ${addr}:${PORT}`);
            }
        });
    });
    if (DEBUG) console.log(`Broadcasting clipboard: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
}

// Listen for messages
socket.bind(PORT, () => {
    socket.setBroadcast(true);
    console.log(`LAN Clipboard listening on port ${PORT} (poll: ${POLL_INTERVAL}ms, timeout: ${EXEC_TIMEOUT}ms)`);
    if (DEBUG) console.log('Debug mode enabled');
});

socket.on('listening', () => {
    const address = socket.address();
    console.log(`Socket listening on ${address.address}:${address.port}`);
    const bcasts = getBroadcastAddrs();
    console.log('Computed broadcast addrs:', bcasts.join(', '));
});

socket.on('message', (msg, rinfo) => {
    const text = msg.toString().trim();
    // Ignore our own messages
    if (!text || text === lastClipboard || text.length > MAX_MESSAGE_SIZE) return;

    console.log(`\n[LAN CLIPBOARD RECEIVED from ${rinfo.address}]: ${text}`);
    if (DEBUG) console.log(`Setting clipboard: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    setClipboard(text);
    lastClipboard = text;
});

socket.on('error', (err) => {
    if (err.code !== 'EADDRINUSE') {
        console.error('Socket error:', err.message);
    }
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

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    socket.close();
    process.exit(0);
});