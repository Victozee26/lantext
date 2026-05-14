// utils.js - Shared utilities and constants
import os from 'os';

export const PORTS = {
  TCP: 41236,
  UDP_DISCOVERY: 41237,
};

export const DISCOVERY_MSG = 'LAN_CHAT_DISCOVERY';
export const FOUND_MSG = 'SERVER_FOUND';

export function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

export function getSubnet() {
  const ip = getLocalIP();
  return ip.split('.').slice(0, 3).join('.');
}

export function createEnvelope(sender, text) {
  return {
    sender,
    timestamp: Date.now(),
    text,
  };
}
