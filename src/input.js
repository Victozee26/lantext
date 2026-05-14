// input.js - Multi-line input handling with paste detection
import readline from 'readline';

/**
 * Processes the message buffer for TTY input.
 * Handles paste detection and double-enter to send.
 */
function processBuffer(messageBuffer, onMessage) {
  const lastLine = messageBuffer[messageBuffer.length - 1];
  const isLastLineEmpty = lastLine !== undefined && lastLine.trim() === '';

  if (messageBuffer.length > 1 && isLastLineEmpty) {
    // Fast paste or explicit double-enter
    while (messageBuffer.length > 0 && messageBuffer[messageBuffer.length - 1].trim() === '') {
      messageBuffer.pop();
    }

    if (messageBuffer.length > 0) {
      onMessage(messageBuffer.join('\n'));
    }
    return []; // Clear buffer
  }

  if (messageBuffer.length === 1 && isLastLineEmpty) {
    // Empty input
    return []; // Clear buffer
  }

  // Active typing buffer, keep it
  return messageBuffer;
}

/**
 * Sets up the readline interface for TTY input.
 */
function setupTTYInput(onMessage, getPrompt) {
  let messageBuffer = [];
  let pasteTimeout = null;

  const rl = readline.createInterface({
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
      messageBuffer = processBuffer(messageBuffer, onMessage);
      rl.prompt();
    }, 50);

    rl.prompt();
  });

  return rl;
}

/**
 * Sets up traditional stdin handling for piped input.
 */
function setupPipedInput(onMessage) {
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

export function setupInput(onMessage, getPrompt) {
  if (process.stdin.isTTY) {
    return setupTTYInput(onMessage, getPrompt);
  } else {
    setupPipedInput(onMessage);
    return null;
  }
}
