// lan-chat.js - Simple LAN chat application
const dgram = require('dgram');

// Configuration
const PORT = 41235; // Different port from clipboard
const BROADCAST_ADDR = '255.255.255.255';

const socket = dgram.createSocket('udp4');

// Function to send message to LAN
function sendMessage(text) {
    const message = Buffer.from(text);
    socket.send(message, 0, message.length, PORT, BROADCAST_ADDR, (err) => {
        if (err) {
            console.error('Send error:', err.message);
        }
    });
}

// Bind socket and enable broadcasting
socket.bind(PORT, () => {
    socket.setBroadcast(true);
    console.log(`LAN Chat listening on port ${PORT}`);
    console.log('Type your messages and press Enter to send to all devices on LAN');
});

// Listen for incoming messages
socket.on('message', (msg, rinfo) => {
    const text = msg.toString().trim();
    if (text) {
        console.log(`\n[LAN MESSAGE from ${rinfo.address}]: ${text}`);
        process.stdout.write('> '); // Reprompt for input
    }
});