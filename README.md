# LanText

A lightweight local area network chat application that enables real-time communication between WiFi-connected devices.

## Why LanText Exists
Sending a quick message from your phone to your laptop or to a colleague’s device is surprisingly complicated. Most solutions require WhatsApp, email, or cloud apps, which is overkill for a single text. LanText solves this by providing direct, local, real-time messaging with minimal setup.

## Features

- **Auto-discovery**: Automatically finds the chat server on the network
- **Multiple clients**: Support for multiple simultaneous connections
- **Hotspot mode**: WiFi hotspot devices can both host and participate in chat
- **Real-time messaging**: Instant message delivery across the network
- **Global CLI**: Install once, run anywhere with `lantext` command

## Installation

### Global Installation (Recommended)

```bash
npm install -g lantext
```

### Local Installation

```bash
npm install lantext
```

## Usage

### Interactive Mode (Recommended)

Simply run `lantext` and choose your mode:

```bash
lantext
```

The CLI will ask you whether you want to be a **WiFi client** (connect to existing network) or **hotspot** (create server).

### Direct Mode

You can also specify the mode directly:

```bash
# Connect as WiFi client
lantext client
# or
lantext wifi

# Start as hotspot server
lantext hotspot
# or
lantext server
```

### Debug Mode

```bash
DEBUG=true lantext client
```

### Connect to Specific Server

```bash
SERVER=192.168.1.5 lantext client
```

## Architecture

- **Client** (`src/client.js`): Discovers and connects to a server on the network
- **Hotspot** (`src/hotspot.js`): Runs both server and client for hotspot devices
- **Main** (`src/main.js`): CLI entry point with interactive mode

## Configuration

Environment variables:

- `DEBUG=true` - Enable debug logging
- `SERVER=<ip>` - Specify server IP address (skips discovery)

## License

MIT
