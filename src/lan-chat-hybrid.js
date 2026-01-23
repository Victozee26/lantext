// lan-chat-hybrid.js - LAN chat with TCP fallback for hotspot support
const dgram = require('dgram');
const net = require('net');
const os = require('os');

// Configuration
const UDP_PORT = 41235;
const TCP_PORT = 41236;
const BROADCAST_ADDR = '255.255.255.255';
const TEST_MODE = process.env.TEST_MODE === 'true';
const USE_TCP_ONLY = process.env.TCP_ONLY === 'true'; // Force TCP mode for testing

// UDP socket for broadcasting
const udpSocket = dgram.createSocket('udp4');

// TCP server for direct connections
const tcpServer = net.createServer((socket) => {
    socket.setEncoding('utf8');
    
    socket.on('data', (data) => {
        const text = data.toString().trim();
        if (text) {
            const clientIp = socket.remoteAddress;
            console.log(`\n[LAN MESSAGE from ${clientIp}]: ${text}`);
            process.stdout.write('> ');
        }
    });
    
    socket.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
            console.error(`TCP connection error: ${err.message}`);
        }
    });
});

// Store discovered peers for TCP fallback
const peers = new Set();

// Get local IP addresses
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

// Send via UDP broadcast
function sendViaBroadcast(text) {
    if (USE_TCP_ONLY) return;
    
    const message = Buffer.from(text);
    const targetAddr = TEST_MODE ? '127.0.0.1' : BROADCAST_ADDR;
    udpSocket.send(message, 0, message.length, UDP_PORT, targetAddr, (err) => {
        if (err && err.code !== 'EBADF') {
            console.error(`UDP Send error: ${err.message}`);
        }
    });
}

// Send via TCP to discovered peers
function sendViaTCP(text) {
    const message = text + '\n';
    peers.forEach((peerIp) => {
        const client = net.createConnection({ host: peerIp, port: TCP_PORT }, () => {
            client.write(message);
            client.end();
        });
        
        client.on('error', (err) => {
            if (err.code !== 'ECONNREFUSED') {
                console.error(`TCP send error to ${peerIp}: ${err.message}`);
            }
        });
    });
}

// Send message via both UDP and TCP
function sendMessage(text) {
    sendViaBroadcast(text);
    // Delay TCP sends slightly to avoid overwhelming
    setTimeout(() => sendViaTCP(text), 100);
}

// Setup UDP socket
udpSocket.bind(UDP_PORT, () => {
    udpSocket.setBroadcast(true);
    console.log(`LAN Chat initialized`);
    console.log(`UDP listening on port ${UDP_PORT}`);
    console.log(`TCP listening on port ${TCP_PORT}`);
    console.log(`Mode: ${USE_TCP_ONLY ? 'TCP Only' : TEST_MODE ? 'Test (localhost)' : 'Hybrid (UDP + TCP)'}`);
    console.log('Type your messages and press Enter to send to all devices on LAN\n');
    process.stdout.write('> ');
});

// Listen for UDP messages
udpSocket.on('message', (msg, rinfo) => {
    const text = msg.toString().trim();
    const senderIp = rinfo.address;
    
    // Add sender to peers for TCP fallback
    if (!senderIp.includes('127.0.0.1') && !senderIp.includes('255')) {
        peers.add(senderIp);
    }
    
    if (text) {
        console.log(`\n[LAN MESSAGE from ${senderIp}]: ${text}`);
        process.stdout.write('> ');
    }
});

udpSocket.on('error', (err) => {
    if (err.code !== 'EADDRINUSE') {
        console.error(`UDP socket error: ${err.message}`);
    }
});

// Setup TCP server
tcpServer.listen(TCP_PORT, () => {
    if (process.env.DEBUG === 'true') {
        console.log(`TCP server listening on port ${TCP_PORT}`);
    }
});

tcpServer.on('error', (err) => {
    if (err.code !== 'EADDRINUSE') {
        console.error(`TCP server error: ${err.message}`);
    }
});

// Handle user input
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
        sendMessage(message);
        console.log(`[SENT]: ${message}`);
    }
    process.stdout.write('> ');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down LAN Chat...');
    udpSocket.close();
    tcpServer.close();
    process.exit(0);
});

// Periodic peer discovery (try to connect to subnet)
setInterval(() => {
    const localIPs = getLocalIPs();
    if (localIPs.length > 0) {
        const subnet = localIPs[0].split('.').slice(0, 3).join('.');
        // Try a few IPs in the subnet
        for (let i = 1; i <= 10; i++) {
            const testIp = `${subnet}.${i}`;
            const client = net.createConnection({ host: testIp, port: TCP_PORT, timeout: 500 }, () => {
                peers.add(testIp);
                client.end();
            });
            client.on('error', () => {
                // Ignore errors from peer discovery
            });
        }
    }
}, 30000); // Every 30 seconds
