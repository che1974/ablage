# Ablage

Desktop app for automatic document organization. Monitors folders, analyzes file contents, classifies documents by type, and moves them into a structured folder hierarchy.

Built for the DE/EU market — recognizes German document types (invoices, contracts, payslips, bank statements, etc.) using keyword and regex matching.

No cloud services, no AI APIs. Everything runs locally.

## Download

Pre-built binaries are available on the [Releases](https://github.com/che1974/ablage/releases) page.

| Platform | File | Notes |
|----------|------|-------|
| macOS (Apple Silicon) | `Ablage-*-mac-arm64.dmg` | M1/M2/M3/M4 |
| macOS (Intel) | `Ablage-*-mac-x64.dmg` | 2015+ Macs |
| Windows | `Ablage-*-win-x64.exe` | Installer (NSIS) |
| Windows (portable) | `Ablage-*-win-x64.exe` | No installation needed |
| Linux | `Ablage-*-linux-x64.AppImage` | Most distros |
| Linux (Debian/Ubuntu) | `Ablage-*-linux-x64.deb` | apt-compatible |

## How It Works

1. **Watch** — monitors configured folders for new PDF, DOCX, JPG, PNG files
2. **Extract** — pulls text from PDFs and DOCX files
3. **Classify** — matches text against configurable rules (keywords or regex)
4. **Suggest** — shows a notification with the detected type, proposed filename, and target folder
5. **Move** — on user confirmation, renames and moves the file. Full undo support.

## Getting Started

### First Launch

1. Set a **target folder** — where organized files will be moved
2. Add **watched folders** — directories to monitor (e.g. Downloads)
3. Drop a document into a watched folder — a suggestion notification appears within seconds
4. Click **Apply** to move, or **Skip** to ignore

## Building from Source

### Prerequisites

- Node.js 20+
- npm 9+
- Python 3 and C++ build tools (for native SQLite module)

Platform-specific requirements:

| Platform | Additional requirements |
|----------|----------------------|
| macOS | Xcode Command Line Tools (`xcode-select --install`) |
| Windows | Visual Studio Build Tools with "Desktop development with C++" |
| Linux (Ubuntu/Debian) | `sudo apt install build-essential python3 libsqlite3-dev rpm` |
| Linux (Fedora) | `sudo dnf install gcc-c++ make python3 sqlite-devel` |

### Development

```bash
git clone https://github.com/che1974/ablage.git
cd ablage
npm install
npm run rebuild-sqlite
npm run dev
```

### Building for Your Platform

```bash
# Build distributable for current OS
npm run dist
```

Output goes to `release/` directory.

### Building for a Specific Platform

```bash
# macOS (from macOS only)
npx electron-builder --mac --arm64
npx electron-builder --mac --x64

# Windows (from Windows, or macOS/Linux with Wine)
npx electron-builder --win --x64

# Linux (from Linux only)
npx electron-builder --linux --x64
```

### Cross-Compilation Notes

- **macOS** builds can only be produced on macOS (code signing requirement)
- **Windows** builds can be produced on macOS/Linux if Wine is installed
- **Linux** builds can be produced on any platform

For automated multi-platform builds, push a version tag — GitHub Actions will build for all platforms and create a release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode with hot reload |
| `npm run build` | TypeScript check + Vite production build |
| `npm run dist` | Build + package with electron-builder |
| `npm run typecheck` | Type-check without emitting |
| `npm run rebuild-sqlite` | Rebuild better-sqlite3 for Electron |

## Stack

- Electron 41 + React 19 + TypeScript 5
- Vite + vite-plugin-electron
- SQLite (better-sqlite3) for rules, history, settings
- chokidar for file watching
- pdf-parse for PDF text extraction
- mammoth for DOCX text extraction

## Rule System

Two rule types:

- **Keywords** — comma-separated terms matched against document text. Configurable minimum match threshold. Example: `invoice, total, payment, due date` with min 2 matches.
- **Regex** — regular expression pattern. Example: `rechnung.*nr.*\d+`

Each rule maps to a document type, target folder (`Finance/Invoices/{YYYY}/`), and filename template (`Invoice_{Sender}_{Date}`).

### Template Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{Sender}` | Detected company or sender name |
| `{Date}` | Document date (YYYY-MM-DD) |
| `{YYYY}` | Year (for folder paths) |
| `{ext}` | Original file extension |

7 default rules ship out of the box for German document types. Custom rules can be added via the step-by-step wizard or inline editor.

## Localization

English (default), Deutsch, Українська, Français. Language is selectable in the Folders tab and persisted across sessions.

## Architecture

```
src/
  main/           # Electron main process
    index.ts        # App lifecycle, init
    watcher.ts      # File system monitoring (chokidar)
    extractor.ts    # Text extraction (PDF, DOCX, images)
    classifier.ts   # Rule-based document classification
    pipeline.ts     # Orchestration: watch → extract → classify → notify
    mover.ts        # File rename + move with undo
    database.ts     # SQLite: rules, history, settings
    tray.ts         # System tray menu
    notifications.ts # Native + in-app notifications
    ipc-handlers.ts # IPC bridge to renderer
  renderer/        # React UI
    App.tsx          # Layout with sidebar navigation
    components/
      Settings.tsx     # Watch folders + language
      RuleEditor.tsx   # Rule list with inline editing
      RuleWizard.tsx   # Step-by-step rule creation
      History.tsx      # Operation log with undo
      Notification.tsx # In-app suggestion cards
      Onboarding.tsx   # First-launch guide
  shared/
    types.ts         # Shared TypeScript interfaces
    i18n/            # Locale files (en, de, uk, fr)
  preload.ts       # Secure IPC bridge
```

## License

MIT
