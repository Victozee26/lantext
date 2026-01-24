# LAN Chat

A lightweight local area network chat application that enables real-time communication between WiFi-connected devices.

## Features

- **Auto-discovery**: Automatically finds the chat server on the network
- **Multiple clients**: Support for multiple simultaneous connections
- **Hotspot mode**: WiFi hotspot devices can both host and participate in chat
- **Real-time messaging**: Instant message delivery across the network

## Installation

```bash
npm install
```

## Usage

### Start a Hotspot Server

```bash
npm run hotspot
```

### Connect as a Client

```bash
npm run client
```

### Run with Debug Mode

```bash
npm run dev
```

## Architecture

- **Client** (`src/client.js`): Discovers and connects to a server on the network
- **Hotspot** (`src/hotspot.js`): Runs both server and client for hotspot devices
- **Main** (`src/main.js`): Entry point for the application

## Configuration

Environment variables:

- `DEBUG=true` - Enable debug logging
- `SERVER=<ip>` - Specify server IP address (skips discovery)

## License

MIT
