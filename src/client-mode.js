// client-mode.js - Orchestrator for Client mode
import { 
  status, statusSuccess, statusError, 
  formatIncoming, formatSent, createSpinner, 
  getPrompt, debug as debugLog, theme
} from './ui.js';
import { LanClient } from './client.js';
import { setupInput } from './input.js';

export async function startClient(serverAddress = process.env.SERVER) {
  const client = new LanClient({ serverAddress });
  let rl = null;

  client.on('status', (msg) => status('CLIENT', msg));
  client.on('debug', (msg) => debugLog('CLIENT', msg));
  
  const spinner = createSpinner('Searching for LAN Chat Server...');
  client.on('status', (msg) => {
    if (msg.includes('Searching')) spinner.start();
  });

  client.on('discovered', (address) => {
    spinner.succeed(theme.success(`Server found at ${theme.info(address)}`));
  });

  client.on('connected', (address) => {
    statusSuccess('CLIENT', `Connected to server at ${theme.info(address)}`);
    if (!rl) {
      rl = setupInput((text) => {
        if (client.send(text)) {
          formatSent(text);
        }
      }, getPrompt);
    }
    rl.prompt();
  });

  client.on('message', (envelope) => {
    formatIncoming(envelope);
    if (rl) rl.prompt();
  });

  client.on('error', (err) => {
    if (spinner.isSpinning) spinner.fail(theme.error(err.message));
    else statusError('CLIENT', err.message);
  });

  client.start();

  process.on('SIGINT', () => {
    console.log();
    status('CLIENT', theme.muted('Shutting down...'));
    client.stop();
    if (rl) rl.close();
    process.exit(0);
  });
}
