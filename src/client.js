// client.js - Client for WiFi devices (Phone B)
// Connects to a LAN Chat Server
const net = require('net');
const dgram = require('dgram');
const os = require('os');
const readline = require('readline');

const CLIENT_PORT = 41238;
const DISCOVERY_PORT = 41237;
const SERVER_DISCOVERY_TIMEOUT = 5000;
const DEBUG = process.env.DEBUG === 'true';

let serverAddress = process.env.SERVER || null;
const serverPort = 41236;
let connection = null;

function log(msg) {
    console.log(`[CLIENT] ${msg}`);
}

function debug(msg) {
    if (DEBUG) log(msg);
}

// Get local IP subnet
function getSubnet() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address.split('.').slice(0, 3).join('.');
            }
        }
    }
    return '192.168';
}

// Discover server on the network
function discoverServer(callback) {
    log('Searching for LAN Chat Server...');
    
    const discoverySocket = dgram.createSocket('udp4');
    const subnet = getSubnet();
    const discoveryMsg = Buffer.from('LAN_CHAT_DISCOVERY');
    
    let foundServer = false;
    const timeout = setTimeout(() => {
        if (!foundServer) {
            log('No server found. Specify with SERVER=<ip> node src/client.js');
        }
        discoverySocket.close();
    }, SERVER_DISCOVERY_TIMEOUT);
    
    // Scan subnet for server
    for (let i = 1; i <= 254; i++) {
        const testAddr = `${subnet}.${i}`;
        discoverySocket.send(discoveryMsg, 0, discoveryMsg.length, DISCOVERY_PORT, testAddr, () => {});
    }
    
    discoverySocket.on('message', (msg, rinfo) => {
        try {
            const response = JSON.parse(msg.toString());
            if (response.type === 'SERVER_FOUND' && !foundServer) {
                foundServer = true;
                clearTimeout(timeout);
                discoverySocket.close();
                serverAddress = rinfo.address;
                log(`Server found at ${serverAddress}:${response.port}`);
                callback(serverAddress);
            }
        } catch (err) {
            debug(`Invalid discovery response: ${err.message}`);
        }
    });
    
    discoverySocket.on('error', (err) => {
        debug(`Discovery error: ${err.message}`);
    });
}

// Connect to server
function connectToServer(address) {
    if (connection) return;
    
    connection = net.createConnection({ host: address, port: serverPort }, () => {
        log(`Connected to server at ${address}:${serverPort}`);
        log('Type your messages and press Enter to send\n');
        if (rl) {
            rl.setPrompt('> ');
            rl.prompt();
        } else {
            process.stdout.write('> ');
        }
    });
    
    connection.setEncoding('utf8');
    
    // Handle incoming messages from server
    let buffer = '';
    connection.on('data', (data) => {
        buffer += data;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        lines.forEach(line => {
            if (line.trim()) {
                try {
                    const envelope = JSON.parse(line);
                    console.log(`\n[LAN MESSAGE from ${envelope.sender}]: ${envelope.text}`);
                    if (rl) rl.prompt();
                } catch (err) {
                    debug(`Failed to parse message: ${err.message}`);
                }
            }
        });
    });
    
    connection.on('error', (err) => {
        console.error(`\nConnection error: ${err.message}`);
        connection = null;
        log('Reconnecting...');
        setTimeout(() => discoverServer(connectToServer), 2000);
    });
    
    connection.on('end', () => {
        log('Disconnected from server');
        connection = null;
        log('Reconnecting...');
        setTimeout(() => discoverServer(connectToServer), 2000);
    });
}

// Handle user input
// Create readline interface only if stdin is a TTY (interactive terminal)
let rl = null;

if (process.stdin.isTTY) {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', (input) => {
        const message = input.trim();
        if (message && connection) {
            connection.write(message + '\n');
            console.log(`[SENT]: ${message}`);
        }
        rl.prompt();
    });
} else {
    // For piped input, use traditional stdin handling
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
        const message = data.toString().trim();
        if (message && connection) {
            connection.write(message + '\n');
            console.log(`[SENT]: ${message}`);
        }
    });
}

// Start client
function start() {
    if (serverAddress) {
        connectToServer(serverAddress);
    } else {
        discoverServer(connectToServer);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down LAN Chat Client...');
    if (connection) connection.end();
    if (rl) rl.close();
    process.exit(0);
});

log('LAN Chat Client initialized');
log('- Discovery port:', DISCOVERY_PORT);
log('- Server port:', serverPort);
log('');
start();
