# LanText Architecture

LanText is a decentralized, local area network (LAN) chat application designed for real-time communication between WiFi-connected devices. It operates without a centralized internet server, relying on peer discovery and TCP/IP networking.

## System Overview

The system consists of two primary modes: **Client** and **Hotspot**.

### 1. Networking Protocol

LanText uses a combination of UDP for discovery and TCP for reliable message transmission.

| Protocol | Port  | Usage |
| :------- | :---- | :---- |
| **UDP**  | 41237 | Server discovery and response |
| **TCP**  | 41236 | Chat message transmission and client connections |

### 2. Core Components

#### `main.js` (Entry Point)
The orchestrator that handles CLI arguments and interactive mode. It uses `@clack/prompts` to provide a user-friendly interface for choosing between Client and Hotspot modes.

#### `ui.js` (Shared UI Library)
A central module for consistent terminal styling.
- **Theming**: Uses `chalk` for a modern, color-coded interface.
- **Formatting**: Handles banner display, status messages, incoming/sent message formatting, and spinners.
- **Utilities**: Provides IP address resolution and timestamping.

#### `client.js` (Client Mode)
Handles connection to a LanText server.
- **Discovery**: Scans the local subnet (e.g., `192.168.1.1-254`) via UDP broadcast to find an active server.
- **Connection**: Establishes a TCP connection to the discovered server.
- **Input Handling**: Implements a clever multi-line input buffer that detects double-enters or fast pastes.

#### `hotspot.js` (Hotspot/Server Mode)
Acts as both a server and a local client.
- **Server**: Listens for incoming TCP connections from clients.
- **Discovery Responder**: Listens for UDP discovery packets and responds to announce its presence.
- **Broadcasting**: When a message is received (from a client or local input), it is encapsulated in a JSON envelope and broadcasted to all connected clients.
- **Deduplication**: Maintains a short-term message history window to prevent circular message loops.

## Message Flow

1.  **Discovery**:
    - Client sends a UDP packet `LAN_CHAT_DISCOVERY` to port 41237 across the subnet.
    - Hotspot receives the packet and responds with a JSON payload containing its TCP port.
2.  **Handshake**:
    - Client connects to the Hotspot's TCP port (41236).
3.  **Messaging**:
    - Messages are sent as newline-delimited JSON envelopes:
      ```json
      {
        "sender": "192.168.1.15",
        "timestamp": 1715682400000,
        "text": "Hello, world!"
      }
      ```
    - The Hotspot relays these envelopes to all other connected peers.

## Input Mechanism

LanText supports multi-line messages through a timeout-based buffer:
- Single lines are buffered.
- If a second Enter is pressed within 50ms (or a paste occurs), the buffer is sent.
- This allows for natural typing of single-line messages while supporting complex multi-line text blocks.

## Environment Variables

- `DEBUG=true`: Enables verbose logging of network events.
- `SERVER=<ip>`: Skips UDP discovery and connects directly to the specified IP.
