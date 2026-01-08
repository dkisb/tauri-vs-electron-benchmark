# Tauri vs Electron Benchmark

A comprehensive benchmark suite comparing Tauri and Electron desktop app frameworks.

## Project Structure

```
├── convex/                 # Shared Convex backend (single database for all apps)
├── electron-bench-app/     # Electron benchmark app (React)
├── tauri-bench-app/        # Tauri benchmark app (React)
├── scripts/                # Benchmark measurement scripts
└── benchmark-tui/          # TUI for running benchmarks
```

## Setup

### 1. Install Dependencies

```bash
# Install root dependencies (Convex)
bun install

# Install Electron app dependencies
cd electron-bench-app && bun install && cd ..

# Install Tauri app dependencies
cd tauri-bench-app && bun install && cd ..
```

### 2. Configure Convex

The Convex backend is shared at the root level. Run:

```bash
npx convex dev
```

This will create a `.env.local` file with your `CONVEX_URL`. You need to copy this URL to both apps:

```bash
# Copy the VITE_CONVEX_URL from root .env.local to both apps
# electron-bench-app/.env.local
# tauri-bench-app/.env.local
```

Or create the `.env.local` files manually with:
```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

### 3. Run the Apps

**Electron:**
```bash
cd electron-bench-app
bun run start
```

**Tauri:**
```bash
cd tauri-bench-app
bun run tauri dev
```

## Running Benchmarks

### Using the Scripts

Source the benchmark scripts and run:

```bash
source scripts/run-all.sh

# Run all benchmarks for a single app
run_all ./tauri-bench-app tauri
run_all ./electron-bench-app electron

# Or compare both apps
run_comparison ./tauri-bench-app ./electron-bench-app
```

### Individual Benchmarks

Each benchmark can be run individually:

- `measure-install.sh` - Dependency installation time
- `measure-build-cold.sh` - Cold build time (clean build)
- `measure-build-hot.sh` - Hot build time (incremental)
- `measure-startup.sh` - App startup time
- `measure-latency.sh` - App launch latency
- `measure-memory.sh` - Memory usage
- `measure-cpu-idle.sh` - CPU usage when idle
- `measure-cpu-load.sh` - CPU usage under load
- `measure-size.sh` - Bundle size
- `compare-pms.sh` - Package manager comparison (bun, pnpm, npm, yarn)

## Cross-Platform Support

All benchmark scripts support:
- **macOS** (darwin)
- **Windows** (via Git Bash/MSYS2)
- **Linux**

## Benchmarks Measured

| Metric | Description |
|--------|-------------|
| Install Time | Time to install dependencies |
| Cold Build | Full build from clean state |
| Hot Build | Incremental build with cache |
| Startup Time | Time from launch to window visible |
| Memory Usage | RAM consumption at idle |
| CPU Idle | CPU % when app is idle |
| CPU Load | CPU % under simulated load |
| Bundle Size | Size of built application |
