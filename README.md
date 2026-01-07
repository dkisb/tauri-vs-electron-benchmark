# 🎨 tauri-vs-electron-benchmark

> **A comprehensive benchmark suite to measure and compare Tauri vs Electron across frameworks, package managers, and environments.**

[![Frameworks](https://img.shields.io/badge/Frameworks-Next. js%20%7C%20React%20%7C%20Svelte%20%7C%20Angular-blue?style=flat-square)](https://github.com)
[![Targets](https://img.shields.io/badge/Targets-Tauri%20%7C%20Electron-orange?style=flat-square)](https://github.com)
[![Package Managers](https://img.shields.io/badge/PMs-pnpm%20%7C%20npm%20%7C%20bun%20%7C%20yarn-brightgreen?style=flat-square)](https://github.com)
[![Visualization](https://img.shields.io/badge/Charts-@anomalyco/opentui-purple?style=flat-square)](https://github.com/anomalyco/opentui)
[![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)](https://github.com)

---

## 🚀 What is this?

This repository answers critical questions when choosing between **Tauri** and **Electron**:

- 📦 **How much smaller** is a Tauri packaged app vs Electron for the same UI?
- ⚡ **How fast** are builds with different package managers (pnpm vs bun vs npm)?
- 🧠 **What's the memory footprint** and cold-start time of equivalent apps?
- 🔄 **How does dev iteration speed** (HMR) compare across frameworks?
- 📊 **What are the CPU and performance characteristics** at runtime?

We provide **consistent, reproducible benchmarks** across multiple frameworks, package managers, and operating systems so you can make data-driven decisions.  

**Results are visualized using [@anomalyco/opentui](https://github.com/anomalyco/opentui)** — a beautiful terminal UI toolkit — making benchmark exploration interactive and intuitive.

---

## ✨ Key Features

| Feature | Details |
|---------|---------|
| 🎯 **Multi-Framework Support** | Next.js, React (Vite/CRA), Svelte, SvelteKit, Angular, Vue, Solid |
| 📦 **Multiple Package Managers** | pnpm, npm, yarn, bun |
| 🖥️ **Cross-Platform** | macOS (Intel/ARM), Windows (x64), Linux (x64/ARM) |
| 📊 **Rich Metrics** | Build time, artifact size, memory, CPU, startup time, HMR latency, Lighthouse scores |
| 🔄 **Reproducible** | Automated harness with consistent test matrix and pinned versions |
| 📈 **Machine-Readable Output** | JSON and CSV results for analysis and charting |
| 🎨 **Beautiful Terminal UI** | [@anomalyco/opentui](https://github.com/anomalyco/opentui) powered dashboard with 5000+ activity tracking |

---

## 📊 Quick Look:  Test Matrix

```
┌─────────────────┬────────────────────���──────────────────┐
│   Frameworks    │  Package Managers  │   Environments   │
��─────────────────┼────────────────────┼──────────────────┤
│ ✅ Next.js      │ ✅ pnpm            │ ✅ Tauri + Rust  │
│ ✅ React (Vite) │ ✅ npm             │ ✅ Electron      │
│ ✅ Svelte       │ ✅ bun             │ ✅ macOS         │
│ ✅ Angular      │ ✅ yarn            │ ✅ Windows       │
│ ✅ Vue          │                    │ ✅ Linux         │
│ ✅ Solid        │                    │                  │
└─────────────────┴────────────────────┴──────────────────┘
```

---

## 🎯 About the Benchmark App

This repository includes a **real-world todo tracking application** built with: 

- **Frontend:** React + Vite (with hot module reloading)
- **Backend:** Convex (serverless backend for data sync)
- **Data Scale:** 5,000+ activity records (realistic load)
- **States:** In-progress, completed, and archived todos
- **Features:** Real-time sync, live filtering, performance monitoring

The same application is built as both a **Tauri desktop app** and an **Electron desktop app**, providing an apples-to-apples comparison across all metrics.

---

## 🧱 Repository Structure

```
tauri-vs-electron-benchmark/
├── 📁 apps/                    # Minimal example apps for each framework
│   ├── nextjs/                 # Next.js app
│   ├── react-vite/             # React Vite app (with Convex backend & 5K todos)
│   ├── svelte/                 # Svelte app
│   ├── angular/                # Angular app
│   └── ...  
├── 📁 harness/                 # Automation & measurement engine
│   ├── install.sh              # Install dependencies
│   ├── build.sh                # Build for Tauri/Electron
│   ├── package.sh              # Package into distributable
│   ├── run-runtime.sh          # Measure runtime metrics
│   ├── flows/                  # Playwright automation flows
│   ├── aggregate. js            # Aggregate results into CSV
│   └── visualize.js            # Generate @anomalyco/opentui dashboard
├── 📁 results/                 # Test results (JSON, CSV, OpenTUI data)
│   ├── raw/                    # Raw JSON from each run
│   ├── aggregate/              # Aggregated CSV files
│   └── dashboard-data/         # OpenTUI dashboard data
├── 📁 docs/                    # Documentation
│   ├── MEASUREMENT_GUIDE.md    # How to measure accurately
│   ├── ADDING_FRAMEWORKS.md    # Guide to add new frameworks
│   └── images/                 # Reference images and screenshots
├── 📁 config/                  # Configuration files
│   ├── matrix.yaml             # Test matrix definition
│   └── ci.yml                  # CI/CD workflow
├── 📁 dashboard/               # OpenTUI dashboard (React Vite + Convex)
│   ├── src/
│   ├── convex/                 # Convex backend (5K todo sync)
│   └── package.json
└── 📄 package.json             # Root dependencies
```

---

## 🎨 Interactive Dashboard with @anomalyco/opentui

This project uses **[@anomalyco/opentui](https://github.com/anomalyco/opentui)** to visualize benchmark results in a beautiful, interactive terminal UI. The dashboard:

- 📊 **Displays** benchmark metrics with color-coded status
- 🔍 **Filters** by framework, target (Tauri/Electron), package manager
- 📈 **Shows trends** across multiple runs
- 🎨 **Real-time updates** using OpenTUI's reactive components
- 💾 **Manages** 5,000+ activity records (similar to the benchmark app's todo workload)
- 🏃 **Tracks** in-progress vs completed benchmark runs

```bash
# Run the interactive dashboard
pnpm dashboard

# Opens OpenTUI dashboard with live benchmark results
```

Example visualization: 

```
╔════════════════════════════════════════════════════════════════╗
║                    Benchmark Results Dashboard                 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Frameworks:  [✓] Next.js  [✓] React  [✓] Svelte  [ ] Angular  ║
║                                                                ║
║  ┌─ Build Time (seconds) ──────────────────────────────────┐  ║
║  │ Tauri:                                                   │  ║
║  │   Next.js    ████████░░ 12.3s (pnpm)                    │  ║
║  │   React      ██████░░░░  8.9s (pnpm)                    │  ║
║  │ Electron:                                                │  ║
║  │   Next.js    ████████░░ 14.2s (pnpm)                    │  ║
║  │   React      ███████░░░ 10.1s (pnpm)                    │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                ║
║  ┌─ Artifact Size (MB) ────────────────────────────────────┐  ║
║  │ Tauri:  ████░░░░░░ 85 MB                                │  ║
║  │ Electron: ████████░░ 180 MB  (+111%)                    │  ║
║  └──────────────���──────────────────────────────────────────┘  ║
║                                                                ║
║  ┌─ Cold Start (ms) ──────────────────────────────────────┐   ║
║  │ Tauri:  ████░░░░░░ 245 ms                               │   ║
║  │ Electron: ██████░░░░ 520 ms  (+112%)                    │   ║
║  └─────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  ☑ In-progress:  127  ☑ Completed: 4,873  (5,000 activities)   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🎯 What We Measure

### 🏗️ Build & Tooling

| Metric | Importance | Notes |
|--------|------------|-------|
| **Install Time** | 🔴 High | Time to install dependencies with each PM |
| **Dependency Size** | 🟡 Medium | Size of node_modules and lockfiles |
| **Build Time (cold)** | 🔴 High | Production build from scratch |
| **Bundle Size** | 🔴 High | Rendered output size (JS, CSS, assets) |
| **Packaged App Size** | 🔴 High | Final . app, .exe, .AppImage size |

### 🚀 Runtime Characteristics

| Metric | Importance | Notes |
|--------|------------|-------|
| **Cold Start Time** | 🔴 High | Time from launch to ready (with 5K todos loaded) |
| **Warm Start Time** | 🟡 Medium | Subsequent launches (cache effects) |
| **Memory (RSS/Heap)** | 🔴 High | Peak and sustained memory with full dataset |
| **CPU Usage** | 🟡 Medium | Idle and under load (sorting, filtering 5K items) |
| **Frame Rate (FPS)** | 🟡 Medium | Animations and scrolling performance with large lists |

### ⚡ Dev Iteration

| Metric | Importance | Notes |
|--------|------------|-------|
| **HMR Latency** | 🔴 High | Time from code change to UI update |
| **First Dev Build** | 🟡 Medium | Time to first compile in dev mode |
| **Watch Rebuild** | 🟡 Medium | Incremental rebuild time |

### 📱 User Experience

| Metric | Importance | Notes |
|--------|------------|-------|
| **Sync Latency** | 🟡 Medium | Time to sync 5K todo items with backend |
| **Filter/Search Time** | 🟡 Medium | Performance when filtering large lists |
| **Lighthouse Score** | 🟡 Medium | Performance, accessibility, best practices |
| **Interaction Latency** | 🟡 Medium | Time to respond to user actions |

---

## 📈 Sample Results (Placeholder Images)

> **Replace these placeholders with your actual benchmark results! **
> Generate charts from results/ and place them in docs/images/

### Build Time Comparison (Lower is Better ⬇️)

![Build Times Chart](https://via.placeholder.com/1200x400/0F172A/64748B?text=Build+Times: +Framework+Comparison)

*Example: * Shows build time (seconds) for each framework with Tauri vs Electron across pnpm, npm, and bun.

### Packaged Binary Size (Lower is Better ⬇️)

![Artifact Sizes Chart](https://via.placeholder.com/1200x400/1E293B/94A3B8?text=Packaged+App+Size:+Tauri+vs+Electron)

*Example:* Tauri apps are typically 40-60% smaller than Electron equivalents.

### Cold Start Time with 5K Todos (Lower is Better ⬇️)

![Cold Start Chart](https://via.placeholder.com/1200x400/0369A1/0EA5E9?text=Cold+Start+Latency:+ms+with+5000+Todos)

*Example:* Startup time from launch to fully interactive with full todo dataset.

### Memory Usage at Idle (Lower is Better ⬇️)

![Memory Chart](https://via.placeholder.com/1200x400/7C2D12/FB923C?text=Memory+Usage:+MB+at+Idle)

*Example:* RSS memory usage at idle for each framework target combo, loaded with 5K todos.

### Dev Iteration Speed - HMR Latency (Lower is Better ⬇️)

![HMR Latency Chart](https://via.placeholder.com/1200x400/431407/FCD34D?text=HMR+Latency:+ms+to+Update)

*Example:* Time from code save to UI reflection in dev mode.

### Todo Sync Performance (Lower is Better ⬇️)

![Sync Chart](https://via.placeholder.com/1200x400/064E3B/10B981?text=Convex+Sync+Latency:+ms+for+5000+Items)

*Example:* Time to sync all 5,000 todo items with Convex backend on cold start.

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
- Node.js (LTS recommended)
- Rust toolchain (for Tauri)
- Git

# Package Managers (install one or more)
- pnpm   :  npm install -g pnpm
- bun    : npm install -g bun
- npm    : comes with Node.js
- yarn   : npm install -g yarn

# For Convex backend (optional, if modifying backend)
- Convex CLI : npm install -g convex

# Optional (for automation)
- Playwright  : npm install -D @playwright/test
- hyperfine   : brew install hyperfine  # macOS
```

### Clone & Setup

```bash
git clone https://github.com/dkisb/tauri-vs-electron-benchmark.git
cd tauri-vs-electron-benchmark

# Install harness dependencies
pnpm install

# Setup dashboard (Convex + Vite)
cd dashboard && pnpm install && pnpm convex auth
cd .. 
```

### Run a Single Test

```bash
# Install dependencies for React Vite with pnpm
./harness/install. sh --app react-vite --pm pnpm

# Build for Tauri (production)
./harness/build.sh --app react-vite --env tauri --pm pnpm

# Package into distributable
./harness/package.sh --app react-vite --env tauri --pm pnpm

# Measure runtime characteristics (with 5K todos loaded)
./harness/run-runtime. sh --app react-vite --env tauri --pm pnpm \
  --metrics cpu,memory,startup,sync \
  --out results/react-vite-tauri-pnpm.json
```

### Run Full Matrix

```bash
# Run all configured combinations (takes time!)
./harness/run-matrix.sh --matrix config/matrix.yaml --out results/

# Aggregate results into CSV
node harness/aggregate. js --input results/raw --output results/aggregate/

# Generate OpenTUI dashboard data
node harness/visualize.js --csv results/aggregate/ --out dashboard/convex/

# Launch interactive dashboard
cd dashboard && pnpm dev
```

---

## 🎨 Using the OpenTUI Dashboard

The dashboard is a **React Vite + Convex** application that mirrors the benchmark app's architecture: 

### View Results Interactively

```bash
# Start dashboard dev server
cd dashboard
pnpm dev

# Dashboard loads 5K+ benchmark activity records
# Similar to: React Vite with Convex backend (same as benchmark app)
```

### Features

- 🎛️ **Filter by** framework, Tauri/Electron, package manager
- 📊 **Visualize** metrics as bar charts, sparklines, and tables
- 🏃 **Track** in-progress benchmark runs
- 💾 **Manage** all benchmark activities (5K+ records like the benchmark app)
- 🔄 **Real-time** updates using Convex subscription
- 📈 **Trends** across multiple runs
- 🎨 **Beautiful** UI powered by [@anomalyco/opentui](https://github.com/anomalyco/opentui)

### Example: Query Benchmark Results

```javascript
// In dashboard/convex/benchmarks.ts
import { query } from ". /_generated/server";

export const listResults = query(async (ctx) => {
  return await ctx.db.query("benchmarks").collect();
});

export const filterByFramework = query(async (ctx, framework:  string) => {
  return await ctx.db
    .query("benchmarks")
    .filter((q) => q.eq(q.field("framework"), framework))
    .collect();
});
```

---

## 💡 Examples:  Common Workflows

### Measure Build Time for All PMs

```bash
# Test pnpm, npm, and bun build times for React Vite + Tauri
for pm in pnpm npm bun; do
  ./harness/build.sh --app react-vite --env tauri --pm $pm \
    --measure --out results/build-$pm.json
done
```

### Compare Electron vs Tauri with Real Workload

```bash
# Test with 5K todos loaded
./harness/package.sh --app react-vite --env tauri --pm pnpm \
  --workload 5000 \
  --out results/react-vite-tauri. json

./harness/package.sh --app react-vite --env electron --pm pnpm \
  --workload 5000 \
  --out results/react-vite-electron.json

# Results will show size difference, build time, startup with full dataset
```

### Measure Dev Iteration (HMR) Speed

```bash
./harness/measure-hmr.sh --app react-vite --env tauri --pm pnpm \
  --iterations 10 \
  --out results/react-vite-tauri-hmr.json
```

### Run Sync Performance Test (Convex Backend)

```bash
# Measures time to sync 5K todos on cold start
./harness/measure-sync.sh --app react-vite --env tauri --pm pnpm \
  --todo-count 5000 \
  --out results/react-vite-tauri-sync.json
```

### Run User Flow Performance Test

```bash
# Uses Playwright to navigate and measure with 5K todos
./harness/run-user-flow.sh --app react-vite --env electron --pm npm \
  --workload 5000 \
  --flow flows/user-navigation.js \
  --out results/react-vite-electron-flow. json
```

### View Results in OpenTUI Dashboard

```bash
# Sync benchmark results to Convex backend
node harness/sync-to-dashboard.js --csv results/aggregate/ --api-key $CONVEX_API_KEY

# Open dashboard
cd dashboard && pnpm dev

# Browse beautiful results with full interactivity! 
```

---

## 📊 Interpreting Results

### Raw JSON Output

Each test produces a JSON file with: 

```json
{
  "metadata": {
    "app": "react-vite",
    "framework": "react",
    "environment": "tauri",
    "packageManager": "pnpm",
    "nodeVersion": "18.14.0",
    "os":  "macos",
    "osVersion": "13.2.1",
    "cpuModel": "Apple M1 Pro",
    "ramGB": 16,
    "timestamp": "2024-01-15T10:30:00Z",
    "workloadSize": 5000
  },
  "steps": {
    "install": {
      "duration_ms": 3420,
      "nodeModules_bytes": 542000000
    },
    "build": {
      "duration_ms": 8900,
      "bundleSize_bytes": 2100000
    },
    "package": {
      "duration_ms": 7200,
      "artifactSize_bytes": 85000000
    },
    "runtime": {
      "coldStart_ms": 245,
      "warmStart_ms": 120,
      "memoryRSS_mb": 125,
      "memoryHeap_mb": 45,
      "cpuIdle_percent": 2. 1,
      "cpuLoad_percent": 45. 3,
      "syncLatency_ms": 1230
    }
  }
}
```

### Aggregated CSV

Results are combined into CSV for easy analysis:

```
app,framework,env,pm,build_time_ms,bundle_size_mb,artifact_size_mb,cold_start_ms,memory_mb,sync_latency_ms
react-vite,react,tauri,pnpm,8900,2.1,85,245,125,1230
react-vite,react,electron,pnpm,10100,2.3,150,420,280,1450
react-vite,react,tauri,npm,9200,2.1,85,250,128,1240
react-vite,react,electron,npm,10800,2.3,150,450,290,1480
```

### Generating Charts with OpenTUI

```bash
# Generate OpenTUI dashboard data from CSV
node harness/visualize.js \
  --csv results/aggregate/results.csv \
  --out dashboard/convex/ \
  --colors tauri:#0EA5E9 electron:#F97316

# The script creates Convex-ready JSON with color-coded results
# Launch dashboard to see interactive charts! 
```

---

## 🧩 Adding a New Framework

### Step-by-Step Guide

1. **Create app skeleton:**
   ```bash
   mkdir -p apps/my-framework
   cd apps/my-framework
   npm init -y
   ```

2. **Use the same UI pattern** (must support 5K todo workload):
   - Todo list display and management
   - Filter by in-progress, completed, archived
   - One animated component
   - Convex backend integration
   - Clear "app ready" marker (DOM selector or IPC)

3. **Add Tauri & Electron configs:**
   ```
   apps/my-framework/
   ├── src/
   ├── public/
   ├── tauri/              # Rust + Tauri config
   │   └── tauri.conf.json
   ├── electron/           # Electron main process
   │   └── main.js
   ├── convex/             # Backend schema and queries
   │   ├── schema.ts
   │   └── todos.ts
   └── package. json        # with build scripts
   ```

4. **Add matrix entry** in `config/matrix.yaml`:
   ```yaml
   - name: my-framework
     displayName: "My Framework"
     path: apps/my-framework
     supportedPMs:  [pnpm, npm, bun]
     buildCommand: 
       tauri:  "pnpm build: tauri"
       electron: "pnpm build:electron"
     packageCommand:
       tauri: "pnpm package:tauri"
       electron: "pnpm package:electron"
     readyMarker: "#app-ready"  # DOM selector
     workloadSupport: true       # Supports 5K todos
   ```

5. **Add Playwright flow** in `harness/flows/my-framework.js`:
   ```javascript
   module.exports = async (page) => {
     await page.goto('about:blank');
     await page.waitForSelector('. todo-list');
     await page.click('button. filter-in-progress');
     await page.waitForLoadState('networkidle');
   };
   ```

6. **Run harness against your app:**
   ```bash
   ./harness/build.sh --app my-framework --env tauri --pm pnpm
   ./harness/package.sh --app my-framework --env tauri --pm pnpm
   ```

7. **Commit and open PR** with results JSON and screenshots! 

See [ADDING_FRAMEWORKS.md](docs/ADDING_FRAMEWORKS.md) for more details.

---

## 🔬 Measurement Best Practices

| Practice | Reason |
|----------|--------|
| ✅ **Repeat ≥5 times** | Reduce noise; report median + std dev |
| ✅ **Use dedicated machines** | Avoid throttling and background tasks |
| ✅ **Pin versions** | Ensure reproducibility (Node, Rust, Electron, Tauri) |
| ✅ **Record metadata** | CPU model, RAM, OS version for context |
| ✅ **Warm up runs** | Discard first run to eliminate cold-cache effects |
| ✅ **Document environment** | Cloud region, instance type, throttling limits |
| ✅ **Load full workload** | Test with 5K todos to simulate real usage |
| ❌ **Don't measure on laptop** | Battery, thermal throttling, background apps distort results |
| ❌ **Don't run single pass** | Variance is high; need multiple runs |

See [MEASUREMENT_GUIDE.md](docs/MEASUREMENT_GUIDE.md) for detailed guidance.

---

## 🛠️ Tooling Recommendations

### Timing & Profiling

| Tool | Purpose | Install |
|------|---------|---------|
| **hyperfine** | Repeatable benchmarking | `brew install hyperfine` |
| **/usr/bin/time** | System metrics | Built-in (macOS/Linux) |
| **psrecord** | Process CPU/memory over time | `pip install psrecord` |
| **pidstat** | Process stats (Linux) | `apt-get install sysstat` |

### Automation & Measurement

| Tool | Purpose | Install |
|------|---------|---------|
| **Playwright** | Browser automation | `npm install -D @playwright/test` |
| **Puppeteer** | Headless Chrome control | `npm install -D puppeteer` |
| **Lighthouse** | Performance auditing | `npm install -D lighthouse` |

### Visualization & Backend

| Tool | Purpose |
|------|---------|
| **@anomalyco/opentui** | Beautiful terminal UI for dashboard |
| **Convex** | Serverless backend (real-time sync) |
| **React Vite** | Fast frontend development |
| **matplotlib** (Python) | Quick charts for CI |

---

## 📋 CI/CD & Automated Runs

### GitHub Actions Workflow

The repository includes `.github/workflows/benchmark.yml` to run benchmarks on schedule:

```yaml
name: Benchmark Suite
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly at 2 AM UTC
  workflow_dispatch:

jobs:
  benchmark:
    runs-on:  ubuntu-latest
    steps: 
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: ./harness/run-matrix.sh --matrix config/matrix.yaml --out results/
      - run: node harness/aggregate. js
      - run: node harness/visualize.js
      - name:  Sync to Dashboard
        run: node harness/sync-to-dashboard.js
        env:
          CONVEX_API_KEY: ${{ secrets.CONVEX_API_KEY }}
      - uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path:  results/
```

This automatically: 
- Runs full test matrix weekly
- Generates CSV and dashboard data
- Syncs results to Convex backend
- Updates OpenTUI dashboard in real-time
- Uploads artifacts for download

---

## 📁 Results Storage & Tracking

### Committing Results

```bash
# After running benchmarks, commit baseline
git add results/aggregate/
git add dashboard/convex/data/
git commit -m "chore: benchmark run $(date +%Y-%m-%d)"
git push
```

### Comparing Runs

```bash
# Compare two runs (e.g., after framework update)
node harness/compare. js \
  --baseline results/aggregate/baseline-2024-01-01.csv \
  --current results/aggregate/current-2024-01-15.csv \
  --out results/diff.json
```

Output shows % change for each metric and flags regressions.

### View in Dashboard

```bash
# All comparisons and trends visible in OpenTUI dashboard
cd dashboard && pnpm dev

# Navigate to "Trends" tab to see historical data
```

---

## 🤝 Contributing

We welcome contributions! Here's how: 

1. **Open an issue** describing what you'd like to add (new framework, metric, or fix)
2. **Fork the repository** and create a feature branch
3. **Add your code** (new framework in `apps/`, updates to harness, etc.)
4. **Run the harness locally** to test your changes
5. **Commit results** (JSON and dashboard data) to your PR
6. **Open a PR** with a description and OpenTUI dashboard screenshots
7. **We'll review** and merge! 

### Contribution Ideas

- ✅ Add a new framework (Vue, Solid, Remix, etc.)
- ✅ Add a new metric (power consumption, accessibility, network latency)
- ✅ Improve harness reliability or speed
- ✅ Enhance OpenTUI dashboard with new visualizations
- ✅ Add CI/CD improvements
- ✅ Fix bugs or improve documentation
- ✅ Create custom workload scenarios (e.g., 10K todos, 50K todos)

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📜 License

This project is released under the **MIT License**.

See [LICENSE](LICENSE) for full text.

---

## 🙏 Acknowledgments

- **Tauri** — https://tauri.app — Build smaller, faster desktop apps
- **Electron** — https://www.electronjs.org — Build cross-platform apps with web tech
- **Playwright** — https://playwright.dev — Browser automation
- **hyperfine** — https://github.com/sharkdp/hyperfine — Benchmarking CLI tool
- **@anomalyco/opentui** — https://github.com/anomalyco/opentui — Beautiful terminal UI components
- **Convex** — https://www.convex.dev — Serverless backend for real-time sync
- **React + Vite** — Lightning-fast frontend development

---

## 📞 Get Help & Questions

- 💬 **Open an issue** for bugs or suggestions
- 📧 **Discussions** for general questions and ideas
- 🚀 **Check docs/** for detailed guides (measurement, adding frameworks, CI setup)
- 🎨 **View the dashboard** for interactive result exploration

---

## 📊 Status & Roadmap

### ✅ Current (v1)
- [x] Initial scaffolding with React Vite (+ Convex) benchmark app
- [x] Tauri & Electron targets
- [x] pnpm, npm, bun support
- [x] Build time, artifact size, runtime metrics
- [x] JSON and CSV output
- [x] @anomalyco/opentui dashboard with 5K+ activity tracking
- [x] Convex backend for real-time result sync

### 🚧 Planned (v2)
- [ ] Add more frameworks (Next.js, Vue, Solid, Angular)
- [ ] Add Lighthouse and accessibility metrics
- [ ] GitHub Actions CI for weekly baseline runs
- [ ] Historical trend tracking in dashboard
- [ ] Automated regression detection with alerts
- [ ] Energy/power consumption metrics
- [ ] Linux ARM64 support
- [ ] Workload scaling (10K, 50K todo scenarios)

### 💭 Future Ideas
- [ ] Container-based reproducible environments
- [ ] Multi-OS CI matrix (macOS, Windows, Linux)
- [ ] Real-world app benchmarks (VSCode-like, IDE features)
- [ ] Plugin ecosystem for custom metrics
- [ ] Collaborative result sharing and comparison
- [ ] ML-powered anomaly detection in benchmarks

---

## 📞 Contact

- **Repository:** https://github.com/dkisb/tauri-vs-electron-benchmark
- **Issues:** https://github.com/dkisb/tauri-vs-electron-benchmark/issues
- **Discussions:** https://github.com/dkisb/tauri-vs-electron-benchmark/discussions
- **Dashboard:** See dashboard/ for Convex + React Vite setup

---

<p align="center">
  <strong>Made with ❤️ for the desktop development community</strong>
  <br/>
  <img src="https://img.shields.io/badge/Built%20with-Tauri%20%2B%20Electron-blue? style=flat-square" />
  <img src="https://img.shields.io/badge/Benchmarked%20with-Hyperfine%20%2B%20Playwright-green?style=flat-square" />
  <img src="https://img.shields.io/badge/Visualized%20with-@anomalyco/opentui-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/Backend-Convex-orange?style=flat-square" />
</p>
