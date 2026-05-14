// hotspot.js - Combined server + client logic for hotspot devices
import net from 'net';
import dgram from 'dgram';
import { EventEmitter } from 'events';
import { PORTS, DISCOVERY_MSG, FOUND_MSG, createEnvelope } from './utils.js';

export class LanServer extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
    this.messageHistory = new Map();
    this.HISTORY_WINDOW = 2000;
    this.server = null;
    this.discoverySocket = null;
  }

  start() {
    // TCP Server
    this.server = net.createServer((socket) => {
      const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
      this.clients.add(socket);
      this.emit('clientConnected', clientId, this.clients.size);

      socket.setEncoding('utf8');
      socket.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          const envelope = createEnvelope(socket.remoteAddress, message);
          this.broadcast(envelope, socket);
          this.emit('message', envelope);
        }
      });

      socket.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
          this.emit('error', `Client error (${clientId}): ${err.message}`);
        }
      });

      socket.on('end', () => {
        this.clients.delete(socket);
        this.emit('clientDisconnected', clientId, this.clients.size);
      });
    });

    this.server.listen(PORTS.TCP, '0.0.0.0', () => {
      this.emit('ready', PORTS.TCP);
    });

    this.server.on('error', (err) => {
      this.emit('error', `Server error: ${err.message}`);
    });

    // UDP Discovery
    this.discoverySocket = dgram.createSocket('udp4');
    this.discoverySocket.bind(PORTS.UDP_DISCOVERY, () => {
      this.discoverySocket.setBroadcast(true);
      this.emit('debug', `Discovery listening on ${PORTS.UDP_DISCOVERY}`);
    });

    this.discoverySocket.on('message', (msg, rinfo) => {
      if (msg.toString().trim() === DISCOVERY_MSG) {
        const response = JSON.stringify({
          type: FOUND_MSG,
          port: PORTS.TCP,
          address: '0.0.0.0',
        });
        this.discoverySocket.send(response, 0, response.length, rinfo.port, rinfo.address);
      }
    });
  }

  broadcast(envelope, excludeSocket = null) {
    const message = JSON.stringify(envelope) + '\n';
    const messageKey = `${envelope.sender}:${envelope.text}`;

    this.messageHistory.set(messageKey, envelope.timestamp);
    this.cleanHistory();

    this.clients.forEach((client) => {
      if (client !== excludeSocket && client.writable) {
        client.write(message);
      }
    });
  }

  cleanHistory() {
    const now = Date.now();
    for (const [key, timestamp] of this.messageHistory.entries()) {
      if (now - timestamp > this.HISTORY_WINDOW) {
        this.messageHistory.delete(key);
      }
    }
  }

  send(text) {
    const envelope = createEnvelope('HOTSPOT', text);
    this.broadcast(envelope);
    return envelope;
  }

  stop() {
    this.clients.forEach(client => client.end());
    if (this.server) this.server.close();
    if (this.discoverySocket) this.discoverySocket.close();
  }
}
