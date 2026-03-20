#!/usr/bin/env node

// main.js - Entry point for LAN Chat application
import { select, intro, outro, isCancel } from '@clack/prompts';
import { showBanner, formatHelp, theme } from './ui.js';

// Get command line arguments
const args = process.argv.slice(2);
const mode = args[0];

async function askMode() {
    showBanner();

    intro(theme.bold('Choose your connection mode'));

    const selected = await select({
        message: 'How are you connecting?',
        options: [
            {
                value: 'wifi',
                label: `${theme.brand('📡  WiFi Client')}`,
                hint: 'Connect to an existing server on the network',
            },
            {
                value: 'hotspot',
                label: `${theme.accent('📶  Hotspot Server')}`,
                hint: 'Create a server and accept connections',
            },
        ],
    });

    if (isCancel(selected)) {
        outro(theme.muted('Cancelled. Goodbye!'));
        process.exit(0);
    }

    if (selected === 'wifi') {
        outro(theme.success('Starting WiFi client mode...'));
        await import('./client.js');
    } else if (selected === 'hotspot') {
        outro(theme.success('Starting hotspot/server mode...'));
        await import('./hotspot.js');
    }
}

// Load and run the appropriate module
async function run(mode) {
    switch (mode) {
        case 'client':
        case 'wifi':
            showBanner('client');
            await import('./client.js');
            break;
        case 'hotspot':
        case 'server':
            showBanner('hotspot');
            await import('./hotspot.js');
            break;
        case 'help':
        case '--help':
        case '-h':
            formatHelp();
            process.exit(0);
            break;
        case undefined:
            // No arguments provided, run interactive mode
            await askMode();
            break;
        default:
            console.log(theme.error(`Unknown mode: ${mode}\n`));
            formatHelp();
            process.exit(1);
    }
}

run(mode);
