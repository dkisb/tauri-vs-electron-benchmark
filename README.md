# Tauri vs Electron Benchmark

A focused benchmark comparing **startup time**, **memory usage**, **CPU usage**, and **bundle size** between Tauri and Electron.

## Latest Results

<!-- BENCHMARK_RESULTS_START -->
**Platform:** macos (arm64) | **Runs:** 5 | **Date:** 1/17/2026

| Metric | Electron | Tauri | Δ |
|--------|----------|-------|---|
| **Startup Time** | 172ms ± 86ms | 168ms ± 15ms | 1.0x |
| **Memory Usage** | 113.5 MB | 67.6 MB | 1.7x |
| **CPU (Load)** | 0.0% | 0.0% | ~ |
| **Bundle Size** | 233.0 MB | 2.9 MB | 81x |
| **Installer Size** | 233.0 MB | 1.2 MB | 187x |

## 📜 Benchmark History

| # | Date | Platform | Startup (E/T) | Memory (E/T) | Bundle (E/T) |
|---|------|----------|---------------|--------------|---------------|
| 3 | 1/17/2026 | macos/arm64 | 172ms / 168ms | 114MB / 68MB | 233.0 MB / 2.9 MB |
| 2 | 1/17/2026 | macos/arm64 | 163ms / 234ms | 114MB / 68MB | 233.0 MB / 2.9 MB |
| 1 | 1/17/2026 | macos/arm64 | 162ms / 230ms | 114MB / 68MB | 233.0 MB / 2.9 MB |
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
