// client.js - Client for WiFi devices
import net from 'net';
import dgram from 'dgram';
import { EventEmitter } from 'events';
import { PORTS, DISCOVERY_MSG, FOUND_MSG, getSubnet } from './utils.js';

export class LanClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.fixedAddress = options.serverAddress || null;
    this.serverAddress = this.fixedAddress;
    this.serverPort = PORTS.TCP;
    this.connection = null;
    this.discoveryTimeout = 5000;
    this.retryDelay = 2000;
    this.isStopped = false;
    this.isSearching = false;
    this._discoveryTimer = null;
    this._reconnectTimer = null;
  }

  discover() {
    if (this.isStopped) return;
    
    if (!this.isSearching) {
      this.emit('status', 'Searching for LAN Chat Server...');
      this.isSearching = true;
    }

    const discoverySocket = dgram.createSocket('udp4');
    const subnet = getSubnet();
    const msg = Buffer.from(DISCOVERY_MSG);

    let found = false;
    const timeout = setTimeout(() => {
      discoverySocket.close();
      if (!found && !this.isStopped) {
        // Retry discovery without emitting error to avoid UI spam
        this._discoveryTimer = setTimeout(() => this.discover(), 1000);
      }
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
          this.isSearching = false;
          clearTimeout(timeout);
          discoverySocket.close();
          this.serverAddress = rinfo.address;
          this.emit('discovered', this.serverAddress);
          this.connect();
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
    if (this.connection || this.isStopped) return;
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

    const handleDisconnect = (reason) => {
      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }
      
      if (this.isStopped) return;

      this.emit('status', `Disconnected (${reason}). Reconnecting...`);
      this.isSearching = false;
      
      // If we discovered the address, clear it so we re-discover
      if (!this.fixedAddress) {
        this.serverAddress = null;
      }

      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = setTimeout(() => this.start(), this.retryDelay);
    };

    this.connection.on('error', (err) => {
      this.emit('debug', `Connection error: ${err.message}`);
      handleDisconnect('error');
    });

    this.connection.on('end', () => {
      handleDisconnect('server closed');
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
    this.isStopped = false;
    if (this.serverAddress) {
      this.connect();
    } else {
      this.discover();
    }
  }

  stop() {
    this.isStopped = true;
    this.isSearching = false;
    clearTimeout(this._discoveryTimer);
    clearTimeout(this._reconnectTimer);
    if (this.connection) {
      this.connection.end();
      this.connection.destroy();
      this.connection = null;
    }
  }
}
