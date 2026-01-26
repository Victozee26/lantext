// hotspot.js - Combined server + client for hotspot devices
// Runs both server (to serve WiFi clients) and client (to participate in chat)
const net = require('net');
const dgram = require('dgram');
const readline = require('readline');

const SERVER_PORT = 41236;
const DISCOVERY_PORT = 41237;
const CLIENT_PORT = 41238;
const DEBUG = process.env.DEBUG === 'true';

// Store connected clients
const clients = new Set();

// Message tracking to prevent duplicates
const messageHistory = new Map();
const HISTORY_WINDOW = 2000; // 2 seconds

let clientConnection = null; // For when hotspot also acts as client

function log(msg) {
    console.log(`[HOTSPOT] ${msg}`);
}

function debug(msg) {
    if (DEBUG) log(msg);
}

// Create TCP server
const server = net.createServer((socket) => {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    clients.add(socket);
    log(`Client connected: ${clientId} (total: ${clients.size})`);

    socket.setEncoding('utf8');

    socket.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
            debug(`Received from ${clientId}: ${message}`);

            // Create message envelope with sender info
            const envelope = {
                sender: socket.remoteAddress,
                timestamp: Date.now(),
                text: message
            };

            // Broadcast to all other clients and to our own client connection
            broadcastToClients(envelope, socket);
            displayMessage(envelope);
        }
    });

    socket.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
            console.error(`Client error (${clientId}): ${err.message}`);
        }
    });

    socket.on('end', () => {
        clients.delete(socket);
        log(`Client disconnected: ${clientId} (total: ${clients.size})`);
    });
});

// Broadcast message to all connected clients
function broadcastToClients(envelope, excludeSocket = null) {
    const message = JSON.stringify(envelope) + '\n';
    const messageKey = `${envelope.sender}:${envelope.text}`;

    // Track message to prevent duplicates
    messageHistory.set(messageKey, envelope.timestamp);

    // Clean up old messages
    const now = Date.now();
    for (const [key, timestamp] of messageHistory.entries()) {
        if (now - timestamp > HISTORY_WINDOW) {
            messageHistory.delete(key);
        }
    }

    // Send to all clients except sender
    clients.forEach((client) => {
        if (client !== excludeSocket && client.writable) {
            client.write(message);
        }
    });

    debug(`Broadcast to ${clients.size - (excludeSocket ? 1 : 0)} clients`);
}

// Display message in our own terminal
function displayMessage(envelope) {
    console.log(`\n[LAN MESSAGE from ${envelope.sender}]: ${envelope.text}`);
    process.stdout.write('> ');
}

// Handle our own messages (when we type something)
function sendOwnMessage(text) {
    const envelope = {
        sender: 'HOTSPOT',
        timestamp: Date.now(),
        text: text
    };

    // Broadcast to all clients
    broadcastToClients(envelope);

    // Display our own message
    console.log(`[SENT]: ${text}`);
}

// UDP discovery broadcast (announce server presence)
const discoverySocket = dgram.createSocket('udp4');
discoverySocket.bind(DISCOVERY_PORT, () => {
    discoverySocket.setBroadcast(true);
    log(`Discovery broadcast listening on port ${DISCOVERY_PORT}`);
});

// Respond to discovery requests
discoverySocket.on('message', (msg, rinfo) => {
    const message = msg.toString().trim();
    if (message === 'LAN_CHAT_DISCOVERY') {
        debug(`Discovery request from ${rinfo.address}`);
        // Send server location back
        const response = JSON.stringify({
            type: 'SERVER_FOUND',
            port: SERVER_PORT,
            address: '0.0.0.0'
        });
        discoverySocket.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
            if (err) console.error(`Discovery response error: ${err.message}`);
        });
    }
});

// Start TCP server
server.listen(SERVER_PORT, '0.0.0.0', () => {
    log(`Server listening on port ${SERVER_PORT}`);
    log(`Waiting for clients...`);
});

server.on('error', (err) => {
    console.error(`Server error: ${err.message}`);
});

// Handle user input (our own messages)
let rl = null;
let messageBuffer = []; // Buffer for multi-line messages

if (process.stdin.isTTY) {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', (input) => {
        // If user presses Enter on empty line and we have buffered content, send it
        if (input.trim() === '' && messageBuffer.length > 0) {
            const fullMessage = messageBuffer.join('\n');
            sendOwnMessage(fullMessage);
            messageBuffer = [];
            rl.prompt();
            return;
        }
        
        // Add non-empty input to buffer
        if (input.trim() !== '') {
            messageBuffer.push(input);
            // Show continuation prompt for multi-line messages
            rl.prompt();
            return;
        }
        
        // If buffer is empty and input is empty, just show prompt
        rl.prompt();
    });
} else {
    // For piped input, use traditional stdin handling
    process.stdin.setEncoding('utf8');
    let pipeBuffer = '';
    
    process.stdin.on('data', (data) => {
        pipeBuffer += data;
        const lines = pipeBuffer.split('\n');
        
        // Keep the last incomplete line in buffer
        pipeBuffer = lines.pop() || '';
        
        // Send each complete line
        lines.forEach(line => {
            const message = line.trim();
            if (message) {
                sendOwnMessage(message);
            }
        });
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    log('Shutting down hotspot...');
    clients.forEach(client => client.end());
    if (clientConnection) clientConnection.end();
    server.close();
    discoverySocket.close();
    if (rl) rl.close();
    process.exit(0);
});

log('LAN Chat Hotspot initialized');
log('- Server port:', SERVER_PORT);
log('- Discovery port:', DISCOVERY_PORT);
log('- Type messages to chat with connected clients\n');
if (rl) {
    rl.setPrompt('> ');
    rl.prompt();
} else {
    process.stdout.write('> ');
}
