// input.js - Multi-line input handling with paste detection
import readline from 'readline';

export function setupInput(onMessage, getPrompt) {
  let rl = null;
  let messageBuffer = [];
  let pasteTimeout = null;

  if (process.stdin.isTTY) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (getPrompt) {
      rl.setPrompt(getPrompt());
    }

    rl.on('line', (input) => {
      messageBuffer.push(input);

      if (pasteTimeout) clearTimeout(pasteTimeout);

      pasteTimeout = setTimeout(() => {
        if (messageBuffer.length > 1 && messageBuffer[messageBuffer.length - 1].trim() === '') {
          // Fast paste or explicit double-enter
          while (messageBuffer.length > 0 && messageBuffer[messageBuffer.length - 1].trim() === '') {
            messageBuffer.pop();
          }

          if (messageBuffer.length > 0) {
            const fullMessage = messageBuffer.join('\n');
            onMessage(fullMessage);
          }
          messageBuffer = [];
          rl.prompt();
        } else if (messageBuffer.length === 1 && messageBuffer[0].trim() === '') {
          // Empty input
          messageBuffer = [];
          rl.prompt();
        } else {
          // Active typing buffer
          rl.prompt();
        }
      }, 50);

      rl.prompt();
    });
  } else {
    // For piped input, use traditional stdin handling
    process.stdin.setEncoding('utf8');
    let pipeBuffer = '';

    process.stdin.on('data', (data) => {
      pipeBuffer += data;
      const lines = pipeBuffer.split('\n');
      pipeBuffer = lines.pop() || '';

      lines.forEach(line => {
        const message = line.trim();
        if (message) {
          onMessage(message);
        }
      });
    });
  }

  return rl;
}
