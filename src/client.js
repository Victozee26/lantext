// client.js - Client for WiFi devices
import net from 'net';
import dgram from 'dgram';
import { EventEmitter } from 'events';
import { PORTS, DISCOVERY_MSG, FOUND_MSG, getSubnet } from './utils.js';

export class LanClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.serverAddress = options.serverAddress || null;
    this.serverPort = PORTS.TCP;
    this.connection = null;
    this.discoveryTimeout = 5000;
  }

  discover() {
    this.emit('status', 'Searching for LAN Chat Server...');
    const discoverySocket = dgram.createSocket('udp4');
    const subnet = getSubnet();
    const msg = Buffer.from(DISCOVERY_MSG);

    let found = false;
    const timeout = setTimeout(() => {
      if (!found) {
        this.emit('error', new Error('No server found'));
      }
      discoverySocket.close();
    }, this.discoveryTimeout);

    // Scan subnet
    for (let i = 1; i <= 254; i++) {
      discoverySocket.send(msg, 0, msg.length, PORTS.UDP_DISCOVERY, `${subnet}.${i}`);
    }

    discoverySocket.on('message', (msg, rinfo) => {
      try {
        const response = JSON.parse(msg.toString());
        if (response.type === FOUND_MSG && !found) {
          found = true;
          clearTimeout(timeout);
          discoverySocket.close();
          this.serverAddress = rinfo.address;
          this.emit('discovered', this.serverAddress);
        }
      } catch (err) {
        this.emit('debug', `Invalid discovery response: ${err.message}`);
      }
    });

    discoverySocket.on('error', (err) => {
      this.emit('debug', `Discovery error: ${err.message}`);
    });
  }

  connect(address = this.serverAddress) {
    if (this.connection) return;
    this.serverAddress = address;

    this.connection = net.createConnection({ host: address, port: this.serverPort }, () => {
      this.emit('connected', address);
    });

    this.connection.setEncoding('utf8');

    let buffer = '';
    this.connection.on('data', (data) => {
      buffer += data;
      const lines = buffer.split('\n');
      buffer = lines.pop();

      lines.forEach(line => {
        if (line.trim()) {
          try {
            const envelope = JSON.parse(line);
            this.emit('message', envelope);
          } catch (err) {
            this.emit('debug', `Failed to parse message: ${err.message}`);
          }
        }
      });
    });

    this.connection.on('error', (err) => {
      this.emit('error', err);
      this.connection = null;
      this.emit('status', 'Reconnecting...');
      setTimeout(() => this.start(), 2000);
    });

    this.connection.on('end', () => {
      this.emit('disconnected');
      this.connection = null;
      this.emit('status', 'Reconnecting...');
      setTimeout(() => this.start(), 2000);
    });
  }

  send(text) {
    if (this.connection && this.connection.writable) {
      this.connection.write(text + '\n');
      return true;
    }
    return false;
  }

  start() {
    if (this.serverAddress) {
      this.connect();
    } else {
      this.discover();
      this.once('discovered', (address) => this.connect(address));
    }
  }

  stop() {
    if (this.connection) {
      this.connection.end();
    }
  }
}
