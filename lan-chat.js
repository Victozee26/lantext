// lan-chat.js - Simple LAN chat application
const dgram = require('dgram');

// Configuration
const PORT = 41235; // Different port from clipboard
const BROADCAST_ADDR = '255.255.255.255';

const socket = dgram.createSocket('udp4');