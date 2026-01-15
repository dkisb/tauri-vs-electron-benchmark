# Tauri vs Electron Benchmark

A focused benchmark comparing **startup time**, **memory usage**, **CPU usage**, and **bundle size** between Tauri and Electron.

## Latest Results

<!-- BENCHMARK_RESULTS_START -->
**Platform:** windows (x64) | **Runs:** 5 | **Date:** 1/15/2026

| Metric | Electron | Tauri | Δ |
|--------|----------|-------|---|
| **Startup Time** | 159ms ± 4ms | 255ms ± 5ms | 0.6x |
| **Memory Usage** | 99.2 MB | 24.5 MB | 4.1x |
| **CPU (Idle)** | 0.14% | <0.01% | ~ |
| **Bundle Size** | 268.0 MB | 2.9 MB | 92x |
| **Installer Size** | 268.0 MB | 1.0 MB | 262x |
<!-- BENCHMARK_RESULTS_END -->

## Quick Start
```bash
# Install dependencies
bun install
bun run setup

# Build both apps (required before benchmarking)
bun run build

# Run all benchmarks
bun run bench
```

## Requirements

- [Bun](https://bun.sh) (or npm/pnpm)
- [Rust](https://rustup.rs) (for Tauri)
- Platform-specific dependencies:

### Windows
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++"
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 11)

### macOS
```bash
xcode-select --install
```

### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Benchmarks

| Metric | Description | How It's Measured |
|--------|-------------|-------------------|
| **Startup Time** | Cold start to window ready | Timer in main process |
| **Memory Usage** | RSS after 2s idle | OS process stats |
| **CPU (Idle)** | CPU % when app is idle | OS process stats over 2s |
| **Bundle Size** | Unpacked app size | Filesystem walk |
| **Installer Size** | Distributable size | Installer file size |

## Commands
```bash
bun run bench              # Run all benchmarks (5 runs each)
bun run bench --runs 10    # Custom number of runs
bun run bench --only startup
bun run bench --only memory
bun run bench --only cpu
bun run bench --only size
bun run bench --only installer
```
