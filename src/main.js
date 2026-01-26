#!/usr/bin/env node

// main.js - Entry point for LAN Chat application
const path = require('path');
const readline = require('readline');

// Get command line arguments
const args = process.argv.slice(2);
const mode = args[0];

function showHelp() {
    console.log(`
LanText - Local Area Network Chat Application

Usage:
  lantext                        Interactive mode (choose hotspot or wifi)
  lantext client                 Run as wifi client
  lantext hotspot                Run as hotspot/server
  lantext help                   Show this help message

Modes:
  client                         Connect to a server on the network (wifi mode)
  hotspot                        Act as a server and accept connections (hotspot mode)

Environment Variables:
  DEBUG=true                     Enable debug logging
  SERVER=<ip>                    Specify server IP (for client mode)

Examples:
  lantext                        # Interactive mode
  lantext client                 # Direct client mode
  lantext hotspot                # Direct hotspot mode
  DEBUG=true lantext client      # Client with debug
  SERVER=192.168.1.5 lantext client  # Client with specific server
    `);
}

function askMode() {
    console.log('\nWelcome to LanText - LAN Chat Application');
    console.log('==========================================\n');

    // Only create readline interface for interactive mode
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Are you connecting to WiFi (client) or creating a hotspot (server)? [wifi/hotspot]: ', (answer) => {
        const choice = answer.toLowerCase().trim();

        if (choice === 'wifi' || choice === 'client' || choice === 'c') {
            console.log('\nStarting WiFi client mode...\n');
            rl.close();
            require('./client.js');
        } else if (choice === 'hotspot' || choice === 'server' || choice === 'h' || choice === 's') {
            console.log('\nStarting hotspot/server mode...\n');
            rl.close();
            require('./hotspot.js');
        } else {
            console.log('Invalid choice. Please enter "wifi" or "hotspot".\n');
            askMode(); // Ask again
        }
    });
}

// Load and run the appropriate module
function run(mode) {
    switch (mode) {
        case 'client':
        case 'wifi':
            require('./client.js');
            break;
        case 'hotspot':
        case 'server':
            require('./hotspot.js');
            break;
        case 'help':
        case '--help':
        case '-h':
            showHelp();
            process.exit(0);
            break;
        case undefined:
            // No arguments provided, run interactive mode
            askMode();
            break;
        default:
            console.log(`Unknown mode: ${mode}\n`);
            showHelp();
            process.exit(1);
    }
}

run(mode);
