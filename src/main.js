#!/usr/bin/env node

// main.js - Entry point for LAN Chat application
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'help';

function showHelp() {
    console.log(`
LAN Chat - Local Area Network Chat Application

Usage:
  npm start [mode]              Start LAN Chat
  npm run client                Run as client
  npm run hotspot               Run as hotspot/server
  npm run dev                   Run with debug mode

Modes:
  client                        Connect to a server on the network
  hotspot                       Act as a server and accept connections
  help                          Show this help message

Environment Variables:
  DEBUG=true                    Enable debug logging
  SERVER=<ip>                   Specify server IP (for client mode)

Examples:
  npm start client
  npm start hotspot
  DEBUG=true npm start client
  SERVER=192.168.1.5 npm start client
    `);
}

// Load and run the appropriate module
function run(mode) {
    switch (mode) {
        case 'client':
            require('./client.js');
            break;
        case 'hotspot':
            require('./hotspot.js');
            break;
        case 'help':
        default:
            showHelp();
            process.exit(0);
    }
}

run(mode);
