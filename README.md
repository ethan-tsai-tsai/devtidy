# DevTidy

Cross-platform desktop application for scanning, viewing, and managing virtual environments (Python venv/conda/uv, Node.js node_modules) scattered across your machine.

## Tech Stack

- **Desktop**: [Tauri v2](https://v2.tauri.app/) (Rust backend)
- **Frontend**: React 19 + TypeScript
- **UI**: [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS v4
- **Build**: Vite + pnpm

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) >= 20 LTS
- [pnpm](https://pnpm.io/) >= 9

### Platform-specific

**macOS**: Xcode Command Line Tools

```sh
xcode-select --install
```

**Linux**: System dependencies for Tauri

```sh
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**Windows**: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" workload.

## Getting Started

```sh
# Install dependencies
pnpm install

# Run in development mode (frontend + Tauri)
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Project Structure

```
devtidy/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # React components
│   │   └── ui/             # shadcn/ui primitives
│   ├── lib/                # Shared utilities
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Entry point
│   └── index.css           # Tailwind + theme tokens
├── src-tauri/              # Backend (Rust)
│   ├── src/                # Rust source
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── components.json         # shadcn/ui configuration
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Node.js dependencies
```

## Testing

### Frontend

```sh
# Run unit tests (once test framework is set up)
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Rust Backend

```sh
# Run all Rust tests
cd src-tauri && cargo test

# Run tests with output
cd src-tauri && cargo test -- --nocapture

# Run a specific test module
cd src-tauri && cargo test scanner::detector::tests
```

### E2E Tests

```sh
# Run end-to-end tests (once Playwright is set up)
pnpm test:e2e
```

### Coverage Targets

| Layer | Target |
|-------|--------|
| Rust core (scanner, detector, sizer) | 90%+ |
| Frontend components | 80%+ |

## Development Workflow

This project follows an enterprise-grade git workflow:

1. Create a feature branch from `develop`: `git checkout -b feature/<name> develop`
2. Develop with TDD (write tests first)
3. Commit frequently with conventional commits: `feat(scanner): add venv detection`
4. Submit for code review
5. Merge back to `develop` after approval

### Commit Message Format

```
<type>(<scope>): <description>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

**Scopes**: `scanner`, `frontend`, `ipc`, `db`, `theme`, `i18n`, `build`

## License

MIT
