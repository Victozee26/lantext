# LAN Chat

A Node.js application for real-time LAN communication with support for standard networks and hotspot scenarios.

## Features

### LAN Chat

- Real-time messaging across devices on the same network
- UDP broadcasting for instant message delivery
- TCP fallback for hotspot networks (Phone A hotspot → Phone B WiFi client)
- Automatic peer discovery
- Simple terminal-based interface

## Installation

```bash
git clone <repository-url>
cd lan-chat
npm install
```

## Usage

### Chat

```bash
npm run chat
# or
node src/lan-chat.js
```

Type messages and press Enter to broadcast to all devices on the LAN.

#### Hybrid Mode (Recommended for Hotspot Networks)

For networks where one device is a hotspot (e.g., Phone A is hotspot, Phone B connects via WiFi), use the hybrid mode which combines UDP broadcasting with TCP direct connections:

```bash
npm run chat:hybrid
# or
node src/lan-chat-hybrid.js
```

This mode works around hotspot gateway issues where UDP broadcast replies may not reach the client device.

#### TCP-Only Mode

For testing or extreme network isolation, force TCP-only mode:

```bash
npm run chat:tcp
# or
TCP_ONLY=true node src/lan-chat-hybrid.js
```

## Development

### Test Mode

For local testing (sends to localhost instead of broadcast):

```bash
TEST_MODE=true node src/lan-chat.js
```

Or with hybrid mode:

```bash
TEST_MODE=true node src/lan-chat-hybrid.js
```

## Requirements

- Node.js >= 14.0.0

## License

MIT
