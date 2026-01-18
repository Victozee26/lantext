# LAN Chat & Clipboard

A collection of Node.js applications for LAN communication: real-time chat and clipboard synchronization.

## Features

### LAN Chat

- Real-time messaging across devices on the same network
- UDP broadcasting for instant message delivery
- Simple terminal-based interface

### LAN Clipboard

- Synchronize clipboard content across devices
- Automatic detection of clipboard changes
- Cross-platform support (Linux, Termux)

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

### Clipboard Sync

```bash
npm run clip
# or
node src/lan-clip.js
```

The clipboard will automatically sync between running instances.

## Development

### Test Mode

For local testing (sends to localhost instead of broadcast):

```bash
TEST_MODE=true node src/lan-chat.js
```

## Requirements

- Node.js >= 14.0.0
- For clipboard sync: `xclip` on Linux, `termux-clipboard-*` on Termux

## License

MIT
