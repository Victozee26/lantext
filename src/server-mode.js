// server-mode.js - Orchestrator for Hotspot/Server mode
import { 
  status, statusSuccess, statusError, 
  formatIncoming, formatSent, 
  getPrompt, clientConnected, clientDisconnected, 
  debug as debugLog, theme
} from './ui.js';
import { LanServer } from './hotspot.js';
import { setupInput } from './input.js';

export async function startHotspot() {
  const server = new LanServer();
  let rl = null;

  server.on('ready', (port) => {
    statusSuccess('HOTSPOT', `Server listening on port ${theme.info(String(port))}`);
    status('HOTSPOT', 'Waiting for clients...');
    if (!rl) {
      rl = setupInput((text) => {
        server.send(text);
        formatSent(text);
      }, getPrompt);
    }
    rl.prompt();
  });

  server.on('clientConnected', (id, count) => {
    clientConnected(id, count);
    if (rl) rl.prompt();
  });

  server.on('clientDisconnected', (id, count) => {
    clientDisconnected(id, count);
    if (rl) rl.prompt();
  });

  server.on('message', (envelope) => {
    formatIncoming(envelope);
    if (rl) rl.prompt();
  });

  server.on('error', (msg) => statusError('HOTSPOT', msg));
  server.on('debug', (msg) => debugLog('HOTSPOT', msg));

  server.start();

  process.on('SIGINT', () => {
    console.log();
    status('HOTSPOT', theme.muted('Shutting down hotspot...'));
    server.stop();
    if (rl) rl.close();
    process.exit(0);
  });
}
