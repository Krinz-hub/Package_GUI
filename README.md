# PACKAGE GUI

A local GUI for managing your development environment.

## Install

```bash
npm install -g package-gui
```

## Run

```bash
pakage
```

That's it.

PACKAGE GUI will start locally and open the dashboard in your browser.

Also supported:

```bash
pakage gui
# or
package-gui
```

Expected terminal output:

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
http://localhost:7421

Opening browser...
```

---

## Stop

```text
Ctrl+C
```

or:

```bash
pakage stop
```

---

## Diagnostics

```bash
pakage doctor
```

Inspects your development environment:
- Node.js & npm runtime versions
- Backend & frontend production bundle integrity
- Localhost (`127.0.0.1`) loopback socket availability
- System tools (Git, curl)
- Package managers (Homebrew, npm, pip, Cargo, WinGet, Chocolatey, Scoop, APT, DNF, Pacman)
- Python environment status & PEP 668 externally-managed safety
- Docker Engine & daemon status
- Android SDK & ADB devices
- User configuration directory permissions

---

## Status

```bash
pakage status
```

Displays active server status, dashboard URL, PID, port, operating system, detected package managers, package counts, listening ports, and monitored processes.

---

## Help

```bash
pakage --help
```

### CLI Options

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

## Logs

```bash
# View recent logs
pakage logs

# Follow live output stream
pakage logs -f

# View specific number of lines
pakage logs -n 100
```

---

## Updates

```bash
pakage update
```

Checks the npm registry for newer versions of `package-gui`.

---

## Cross-Platform Support

PACKAGE GUI works across:

- **macOS**: Homebrew (Formulae & Casks), global npm, pip, Cargo, Docker, Android ADB, and native Terminal privilege flow for elevated actions.
- **Windows**: WinGet, Chocolatey, Scoop, npm, pip, Cargo, Docker, and background services.
- **Linux**: APT, DNF, Pacman, Homebrew on Linux, npm, pip, Cargo, Docker, and system services.

---

## Security

- **Strict Localhost Binding**: PACKAGE GUI binds to `127.0.0.1` by default and is never exposed to the public network without explicit configuration.
- **Zero Sudo Password in Browser**: Administrator passwords are never entered or captured in the browser. Elevated actions use your system's native terminal authentication.
- **Local-First**: Runs 100% on your machine with no external databases or telemetry.

---

## Developer Setup

For contributing or running from source:

```bash
# Clone the repository
git clone https://github.com/Krinz-hub/stuff-manager.git
cd stuff-manager

# Install dependencies
npm install

# Start development servers (Frontend + Backend with hot reload)
npm run dev

# Build production bundle
npm run build

# Run local CLI
node bin/pakage.js
```

---

## License

MIT License.
