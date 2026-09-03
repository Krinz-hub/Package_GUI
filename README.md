# PACKAGE GUI

A local-first GUI dashboard for managing your development environment, package managers, listening ports, and background services across **macOS**, **Windows**, and **Linux**.

---

## ⚡ Install

```bash
npm install -g package-gui
```

## 🚀 Run

```bash
pakage
```

or:

```bash
pakage gui
```

That's it! PACKAGE GUI will start locally and automatically open the dashboard in your default browser.

```text
PACKAGE GUI v1.0.0

✓ Starting server
✓ Detecting operating system
✓ Detecting package managers
✓ Detecting installed packages
✓ Detecting listening ports
✓ Detecting processes
✓ Detecting development environments

Dashboard:
http://127.0.0.1:7421

Opening browser...
```

---

## 🛑 Stop

Press `Ctrl+C` in your terminal, or run:

```bash
pakage stop
```

---

## 🩺 Diagnostics (Doctor)

Run a complete system and environment health check:

```bash
pakage doctor
```

Inspects:
- Node.js & npm runtimes
- Production server and frontend build integrity
- Localhost (127.0.0.1) loopback socket availability
- System commands & Git
- Detected package managers (Homebrew, npm, pip, Cargo, WinGet, Chocolatey, Scoop, APT, DNF, Pacman)
- Python environments & PEP 668 externally-managed safety
- Docker Engine & daemon status
- Android SDK & ADB connection
- User data directory permissions

---

## 📊 Status

Inspect your active local instance and environment summary:

```bash
pakage status
```

---

## 📜 Logs

View recent logs or follow live runtime output:

```bash
# View last 50 log lines
pakage logs

# Follow live output stream
pakage logs -f

# View last 100 log lines
pakage logs -n 100
```

---

## 🔄 Check for Updates

```bash
pakage update
```

---

## ⚙️ CLI Options

```text
USAGE:
  pakage [command] [options]
  pakage gui [options]

COMMANDS:
  gui            Launch the PACKAGE GUI server and open dashboard (default)
  status         Show current server status, port, and system summary
  doctor         Run system and environment diagnostic health checks
  logs           Display or tail recent PACKAGE GUI application logs
  stop           Stop the currently running PACKAGE GUI background server
  update         Check npm for the latest version of package-gui
  --help, -h     Show this help message
  --version, -v  Show PACKAGE GUI version

OPTIONS:
  -p, --port <number>   Specify port for the local server (default: 7421)
  --host <ip>           Specify host binding (default: 127.0.0.1)
  --no-open             Start server without opening browser automatically
  --debug               Enable verbose debugging logs and diagnostic traces
```

---

## 🌐 Cross-Platform Support

PACKAGE GUI is fully cross-platform and adapts to your operating system:

- **macOS**: Native Homebrew (Formulae & Casks), global npm, pip, Cargo, Docker, Android ADB, and native Terminal privilege flow for elevated actions.
- **Windows**: WinGet, Chocolatey, Scoop, npm, pip, Cargo, Docker, and background service inspection.
- **Linux**: APT, DNF, Pacman, Homebrew on Linux, npm, pip, Cargo, Docker, and system services.

---

## 🛡️ Security Model

1. **Strict Localhost Only**: The local server binds to `127.0.0.1` by default — never exposed to the public network.
2. **Zero Password Collection**: Administrator / sudo passwords are **never** requested inside the browser. Any elevated operation utilizes your system's native terminal authentication flow.
3. **No External Dependencies**: No remote databases, no tracking, and no external accounts required.

---

## 🧑‍💻 Developer Setup (Contributing)

If you are contributing to PACKAGE GUI or developing locally:

```bash
# Clone the repository
git clone https://github.com/Krinz-hub/stuff-manager.git
cd stuff-manager

# Install development dependencies
npm install

# Start development servers (Hot Reloading Frontend + Backend)
npm run dev

# Build production bundle
npm run build

# Run local CLI
node bin/pakage.js
```

---

## 📜 License

MIT License.
