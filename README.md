# PACKAGE GUI (`stuff-manager`)

> **Local-first developer environment and package management dashboard for macOS.**

**PACKAGE GUI** brings software discovery, inspection, installation, updates, reinstallations, and diagnostics into a unified, high-performance web dashboard running locally on your Mac.

---

## 🌟 Key Features

- 📦 **Homebrew Management**: Full support for both Formulae and Casks with real-time upgrade detection, bottle metadata, dependencies, and caveats.
- ⚡ **npm Global Ecosystem**: Inspect and manage global Node.js packages and CLI tools with one click.
- 🐍 **Python pip Runtimes**: View installed pip packages, outdated versions, summary metadata, and locations.
- 🦀 **Cargo / Rust**: Native detection of installed Cargo binaries.
- 🐳 **Docker Engine & Containers**: Live container status, port mappings, and local image registry.
- 📱 **Android SDK & ADB**: Connected devices, ADB status, and SDK platform inspection.
- 🩺 **Environment Doctor**: Comprehensive health checks for Homebrew, Git, Node, npm, Python, Docker, ADB, and PATH integrity.
- 🔄 **Dev Processes & Ports**: Monitor active local servers (n8n, Ollama, Vite, Fastify, Python) and occupied TCP listening ports.
- 🖥️ **Native Terminal Privilege Flow**: Complete zero-trust security for administrator operations — macOS Terminal opens natively so you authenticate directly with macOS; passwords never enter the browser or backend.
- 📜 **Live Command Terminal**: Real-time streaming logs via WebSockets for package operations with ANSI support.
- 🔒 **100% Localhost Only**: Binds strictly to `127.0.0.1` — no external servers, no telemetry, no accounts.

---

## 🏗️ Architecture

```text
                         macOS (Local-Only)
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                  Web Browser (Chrome)                      │
│                  http://127.0.0.1:5173                     │
│                         │                                  │
│                         │ REST API & WebSockets            │
│                         ▼                                  │
│              ┌──────────────────────┐                     │
│              │      PACKAGE GUI     │                     │
│              │     Web Frontend     │                     │
│              │  React + TypeScript  │                     │
│              └──────────┬───────────┘                     │
│                         │                                  │
│                         │ http://127.0.0.1:4173            │
│                         ▼                                  │
│              ┌──────────────────────┐                     │
│              │    Local Backend     │                     │
│              │   Node.js + TS       │                     │
│              │       Fastify        │                     │
│              └──────────┬───────────┘                     │
│                         │                                  │
│          ┌──────────────┼──────────────┐                  │
│          │              │              │                  │
│          ▼              ▼              ▼                  │
│       Homebrew         npm          pip / Python          │
│          │              │              │                  │
│          ▼              ▼              ▼                  │
│       Docker         Cargo        Android SDK/ADB         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Security Model

1. **Localhost-Only Binding**: The Fastify backend binds strictly to `127.0.0.1`.
2. **Zero Password Storage / Transmission**: No sudo passwords are ever requested, processed, or stored in the browser or backend. Any operation requiring elevated administrator permissions executes through native macOS `Terminal.app` via AppleScript, allowing macOS to handle authentication securely.
3. **No Arbitrary Shell Execution**: The backend does not expose generic shell execution endpoints. All commands use strict schema validation and safe `spawn`/`execFile` with explicit argument arrays.
4. **Deterministic Source of Truth**: Package managers (`brew`, `npm`, `pip3`, `docker`, `adb`) and the OS filesystem remain the single source of truth. SQLite is used solely for local UI preferences and activity history.

---

## 🚀 Quick Start

### Prerequisites
- macOS (Apple Silicon or Intel)
- Node.js >= 20
- npm >= 9

### Installation & Development

```bash
# Clone repository
git clone https://github.com/Krinz-hub/stuff-manager.git
cd stuff-manager

# Install dependencies
npm install

# Start both backend and frontend concurrently
npm run dev
```

Once started:
- **Web Interface**: [http://localhost:5173](http://localhost:5173)
- **Local Backend API**: [http://127.0.0.1:4173/api/overview](http://127.0.0.1:4173/api/overview)
- **Live WebSocket**: `ws://127.0.0.1:4173/ws`

### Building for Production

```bash
npm run build
npm start
```

---

## 📂 Monorepo Structure

```text
stuff-manager/
├── apps/
│   ├── web/                    # React 19 + TypeScript + Vite + Tailwind CSS + TanStack Query
│   │   ├── src/
│   │   │   ├── api/            # Typed client
│   │   │   ├── components/     # UI primitives & view components
│   │   │   ├── context/        # Live Terminal WebSocket stream context
│   │   │   └── App.tsx         # Dashboard layout & routing
│   │
│   └── server/                 # Fastify + TypeScript + WebSocket
│       ├── src/
│       │   ├── providers/      # Homebrew, npm, pip, cargo, docker, android providers
│       │   ├── platform/       # macOS Terminal privileged elevation runner
│       │   ├── services/       # Runner, Doctor, and Process inspection services
│       │   ├── database/       # SQLite history & preferences
│       │   ├── routes/         # REST & WebSocket route handlers
│       │   └── index.ts        # Server entry point
│
├── packages/
│   └── shared/                 # Shared TypeScript interfaces and DTOs
│
├── cli/                        # package-gui CLI launcher
├── README.md
└── package.json
```

---

## 📜 License

MIT License. Designed and built with local-first security and developer ergonomics.
