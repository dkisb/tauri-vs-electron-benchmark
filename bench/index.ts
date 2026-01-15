#!/usr/bin/env bun
import { spawn, spawnSync } from "child_process";
import { existsSync, statSync, readdirSync, writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { platform, arch } from "os";

const ROOT = join(import.meta.dir, "..");
const RESULTS_DIR = join(ROOT, "results");
const README_PATH = join(ROOT, "README.md");
const DEFAULT_RUNS = 5;

const args = Bun.argv.slice(2);
const onlyBench = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const numRuns = args.includes("--runs") ? parseInt(args[args.indexOf("--runs") + 1]) : DEFAULT_RUNS;

type Platform = "windows" | "macos" | "linux";
type Arch = "x64" | "arm64";

function getPlatform(): Platform {
  const p = platform();
  if (p === "win32") return "windows";
  if (p === "darwin") return "macos";
  return "linux";
}

function getArch(): Arch {
  return arch() === "arm64" ? "arm64" : "x64";
}

const PLATFORM = getPlatform();
const ARCH = getArch();

console.log("\n🖥️  Platform: " + PLATFORM + " (" + ARCH + ")\n");

function getElectronExe(): string | null {
  const outDir = join(ROOT, "electron-app", "out");
  if (!existsSync(outDir)) return null;
  if (PLATFORM === "windows") {
    const p = join(outDir, "win-unpacked", "ElectronBench.exe");
    if (existsSync(p)) return p;
  }
  if (PLATFORM === "macos") {
    for (const variant of ["mac-arm64", "mac"]) {
      const p = join(outDir, variant, "ElectronBench.app", "Contents", "MacOS", "ElectronBench");
      if (existsSync(p)) return p;
    }
  }
  if (PLATFORM === "linux") {
    const p = join(outDir, "linux-unpacked", "electron-bench-app");
    if (existsSync(p)) return p;
  }
  return null;
}

function getTauriExe(): string | null {
  const targetDir = join(ROOT, "tauri-app", "src-tauri", "target", "release");
  if (!existsSync(targetDir)) return null;
  if (PLATFORM === "windows") {
    const p = join(targetDir, "tauri-bench-app.exe");
    if (existsSync(p)) return p;
  }
  if (PLATFORM === "macos") {
    const bundleDir = join(targetDir, "bundle", "macos");
    if (existsSync(bundleDir)) {
      const apps = readdirSync(bundleDir).filter((f: string) => f.endsWith(".app"));
      if (apps.length > 0) return join(bundleDir, apps[0], "Contents", "MacOS", "TauriBench");
    }
    const p = join(targetDir, "tauri-bench-app");
    if (existsSync(p)) return p;
  }
  if (PLATFORM === "linux") {
    const p = join(targetDir, "tauri-bench-app");
    if (existsSync(p)) return p;
  }
  return null;
}

async function measureStartupTime(exePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    const proc = spawn(exePath, ["--bench"], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    const timeout = setTimeout(() => { proc.kill(); resolve(null); }, 30000);
    proc.on("close", () => {
      clearTimeout(timeout);
      const match = stderr.match(/BENCH_STARTUP_MS:([\d.]+)/);
      resolve(match ? parseFloat(match[1]) : null);
    });
    proc.on("error", () => { clearTimeout(timeout); resolve(null); });
  });
}

async function measureMemory(exePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    const proc = spawn(exePath, [], { stdio: ["ignore", "pipe", "pipe"], detached: false });
    const pid = proc.pid;
    if (!pid) { resolve(null); return; }
    setTimeout(() => {
      const memKB = getProcessMemory(pid);
      proc.kill();
      resolve(memKB ? memKB / 1024 : null);
    }, 2000);
    proc.on("error", () => resolve(null));
  });
}

async function measureCpuIdle(exePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    const proc = spawn(exePath, [], { stdio: ["ignore", "pipe", "pipe"], detached: false });
    const pid = proc.pid;
    if (!pid) { resolve(null); return; }

    // Wait for app to stabilize (3s), then measure CPU over 5 seconds
    setTimeout(async () => {
      const cpu = await getProcessCpuOverTime(pid, 5000);
      proc.kill();
      resolve(cpu);
    }, 3000);

    proc.on("error", () => resolve(null));
  });
}

async function getProcessCpuOverTime(pid: number, durationMs: number): Promise<number | null> {
  try {
    if (PLATFORM === "windows") {
      // Use typeperf for more accurate CPU sampling
      const counterPath = `\\Process(*)\\ID Process`;
      
      // First, get process name from PID
      const nameResult = spawnSync("powershell", [
        "-Command",
        `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessName`
      ], { encoding: "utf-8" });
      
      const processName = nameResult.stdout.trim();
      if (!processName) return null;

      // Sample CPU multiple times over the duration
      const samples: number[] = [];
      const sampleCount = 10;
      const sampleInterval = durationMs / sampleCount;

      for (let i = 0; i < sampleCount; i++) {
        const cpuResult = spawnSync("powershell", [
          "-Command",
          `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).CPU`
        ], { encoding: "utf-8" });
        
        const cpuTime = parseFloat(cpuResult.stdout.trim());
        if (!isNaN(cpuTime)) {
          samples.push(cpuTime);
        }
        
        if (i < sampleCount - 1) {
          await new Promise(r => setTimeout(r, sampleInterval));
        }
      }

      if (samples.length >= 2) {
        // Calculate CPU% from the difference in CPU time
        const cpuTimeDelta = samples[samples.length - 1] - samples[0];
        const wallTimeSeconds = (durationMs / 1000) * ((samples.length - 1) / sampleCount);
        const cpuPercent = (cpuTimeDelta / wallTimeSeconds) * 100;
        return Math.max(0, cpuPercent);
      }
      
      return null;
    } else {
      // Use ps on macOS/Linux - sample multiple times
      const samples: number[] = [];
      const sampleCount = 5;
      const sampleInterval = durationMs / sampleCount;

      for (let i = 0; i < sampleCount; i++) {
        const r = spawnSync("ps", ["-o", "%cpu=", "-p", pid.toString()], { encoding: "utf-8" });
        const cpu = parseFloat(r.stdout.trim());
        if (!isNaN(cpu)) samples.push(cpu);
        if (i < sampleCount - 1) {
          await new Promise(r => setTimeout(r, sampleInterval));
        }
      }

      if (samples.length > 0) {
        return samples.reduce((a, b) => a + b, 0) / samples.length;
      }
    }
  } catch {}
  return null;
}

function getProcessMemory(pid: number): number | null {
  try {
    if (PLATFORM === "windows") {
      const r = spawnSync("tasklist", ["/FI", "PID eq " + pid, "/FO", "CSV", "/NH"], { encoding: "utf-8" });
      const m = r.stdout.match(/"([\d,]+) K"/);
      if (m) return parseInt(m[1].replace(/,/g, ""));
    } else {
      const r = spawnSync("ps", ["-o", "rss=", "-p", pid.toString()], { encoding: "utf-8" });
      const rss = parseInt(r.stdout.trim());
      if (!isNaN(rss)) return rss;
    }
  } catch {}
  return null;
}

function getDirectorySize(dirPath: string): number {
  let size = 0;
  function walk(dir: string) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) size += statSync(p).size;
    }
  }
  if (existsSync(dirPath)) walk(dirPath);
  return size;
}

function measureElectronSize(): number | null {
  const outDir = join(ROOT, "electron-app", "out");
  if (!existsSync(outDir)) return null;
  for (const d of readdirSync(outDir)) {
    const p = join(outDir, d);
    if (statSync(p).isDirectory() && !d.startsWith(".")) return getDirectorySize(p);
  }
  return null;
}

function measureTauriSize(): number | null {
  const targetDir = join(ROOT, "tauri-app", "src-tauri", "target", "release");
  if (!existsSync(targetDir)) return null;
  if (PLATFORM === "windows") {
    const p = join(targetDir, "tauri-bench-app.exe");
    if (existsSync(p)) return statSync(p).size;
  }
  if (PLATFORM === "macos") {
    const bundleDir = join(targetDir, "bundle", "macos");
    if (existsSync(bundleDir)) return getDirectorySize(bundleDir);
  }
  if (PLATFORM === "linux") {
    const p = join(targetDir, "tauri-bench-app");
    if (existsSync(p)) return statSync(p).size;
  }
  return null;
}

function measureElectronInstaller(): number | null {
  const outDir = join(ROOT, "electron-app", "out");
  if (!existsSync(outDir)) return null;
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".exe") || f.endsWith(".msi") || f.endsWith(".dmg") || f.endsWith(".AppImage")) {
      return statSync(join(outDir, f)).size;
    }
  }
  return measureElectronSize();
}

function measureTauriInstaller(): number | null {
  const bundleDir = join(ROOT, "tauri-app", "src-tauri", "target", "release", "bundle");
  if (!existsSync(bundleDir)) return measureTauriSize();
  
  if (PLATFORM === "windows") {
    const nsis = join(bundleDir, "nsis");
    const msi = join(bundleDir, "msi");
    for (const dir of [nsis, msi]) {
      if (existsSync(dir)) {
        for (const f of readdirSync(dir)) {
          if (f.endsWith(".exe") || f.endsWith(".msi")) {
            return statSync(join(dir, f)).size;
          }
        }
      }
    }
  }
  
  if (PLATFORM === "macos") {
    const dmg = join(bundleDir, "dmg");
    if (existsSync(dmg)) {
      for (const f of readdirSync(dmg)) {
        if (f.endsWith(".dmg")) return statSync(join(dmg, f)).size;
      }
    }
  }
  
  if (PLATFORM === "linux") {
    const appimage = join(bundleDir, "appimage");
    if (existsSync(appimage)) {
      for (const f of readdirSync(appimage)) {
        if (f.endsWith(".AppImage")) return statSync(join(appimage, f)).size;
      }
    }
  }
  
  return measureTauriSize();
}

function calcStats(v: number[]) {
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const stdDev = Math.sqrt(v.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / v.length);
  return { mean, stdDev, min: Math.min(...v), max: Math.max(...v) };
}

function formatBytes(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + " MB";
  return (b / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

function formatCpu(cpu: number): string {
  if (cpu < 0.01) return "<0.01%";
  if (cpu < 0.1) return cpu.toFixed(3) + "%";
  if (cpu < 1) return cpu.toFixed(2) + "%";
  return cpu.toFixed(1) + "%";
}

interface Results {
  platform: string; arch: string; timestamp: string; runs: number;
  electron: { startupMs?: any; memoryMB?: any; cpuIdle?: any; sizeBytes?: number; installerBytes?: number };
  tauri: { startupMs?: any; memoryMB?: any; cpuIdle?: any; sizeBytes?: number; installerBytes?: number };
}

async function runBenchmarks() {
  const results: Results = {
    platform: PLATFORM, arch: ARCH, timestamp: new Date().toISOString(), runs: numRuns,
    electron: {}, tauri: {},
  };

  const electronExe = getElectronExe();
  const tauriExe = getTauriExe();

  if (!electronExe && !tauriExe) {
    console.error("No apps built. Run: bun run build");
    process.exit(1);
  }

  if (!onlyBench || onlyBench === "startup") {
    console.log("⏱️  Measuring Startup Time...\n");
    for (const [name, exe, res] of [["Electron", electronExe, results.electron], ["Tauri", tauriExe, results.tauri]] as const) {
      if (!exe) continue;
      const times: number[] = [];
      for (let i = 0; i < numRuns; i++) {
        process.stdout.write("   " + name + " run " + (i + 1) + "/" + numRuns + "...");
        const t = await measureStartupTime(exe);
        if (t !== null) { times.push(t); console.log(" " + t.toFixed(0) + "ms"); }
        else console.log(" failed");
      }
      if (times.length) res.startupMs = calcStats(times);
    }
    console.log();
  }

  if (!onlyBench || onlyBench === "memory") {
    console.log("🧠 Measuring Memory Usage...\n");
    for (const [name, exe, res] of [["Electron", electronExe, results.electron], ["Tauri", tauriExe, results.tauri]] as const) {
      if (!exe) continue;
      const mems: number[] = [];
      for (let i = 0; i < numRuns; i++) {
        process.stdout.write("   " + name + " run " + (i + 1) + "/" + numRuns + "...");
        const m = await measureMemory(exe);
        if (m !== null) { mems.push(m); console.log(" " + m.toFixed(1) + " MB"); }
        else console.log(" failed");
      }
      if (mems.length) res.memoryMB = calcStats(mems);
    }
    console.log();
  }

  if (!onlyBench || onlyBench === "cpu") {
    console.log("🔥 Measuring CPU Usage (Idle)...\n");
    console.log("   (Each measurement takes ~8 seconds)\n");
    for (const [name, exe, res] of [["Electron", electronExe, results.electron], ["Tauri", tauriExe, results.tauri]] as const) {
      if (!exe) continue;
      const cpus: number[] = [];
      for (let i = 0; i < numRuns; i++) {
        process.stdout.write("   " + name + " run " + (i + 1) + "/" + numRuns + "...");
        const c = await measureCpuIdle(exe);
        if (c !== null) { cpus.push(c); console.log(" " + formatCpu(c)); }
        else console.log(" failed");
      }
      if (cpus.length) res.cpuIdle = calcStats(cpus);
    }
    console.log();
  }

  if (!onlyBench || onlyBench === "size") {
    console.log("📦 Measuring Bundle Size...\n");
    const eSize = measureElectronSize();
    const tSize = measureTauriSize();
    if (eSize) { console.log("   Electron: " + formatBytes(eSize)); results.electron.sizeBytes = eSize; }
    if (tSize) { console.log("   Tauri:    " + formatBytes(tSize)); results.tauri.sizeBytes = tSize; }
    console.log();
  }

  if (!onlyBench || onlyBench === "installer") {
    console.log("💾 Measuring Installer Size...\n");
    const eInstaller = measureElectronInstaller();
    const tInstaller = measureTauriInstaller();
    if (eInstaller) { console.log("   Electron: " + formatBytes(eInstaller)); results.electron.installerBytes = eInstaller; }
    if (tInstaller) { console.log("   Tauri:    " + formatBytes(tInstaller)); results.tauri.installerBytes = tInstaller; }
    console.log();
  }

  printSummary(results);
  saveResults(results);
  updateReadme(results);
}

function printSummary(r: Results) {
  console.log("━".repeat(70));
  console.log("                         📊 BENCHMARK RESULTS");
  console.log("━".repeat(70) + "\n");

  const lines: string[][] = [
    ["Metric", "Electron", "Tauri", "Winner"],
    ["────────────", "──────────────────", "──────────────────", "──────────"],
  ];

  if (r.electron.startupMs || r.tauri.startupMs) {
    const e = r.electron.startupMs, t = r.tauri.startupMs;
    lines.push([
      "Startup",
      e ? e.mean.toFixed(0) + "ms ± " + e.stdDev.toFixed(0) + "ms" : "N/A",
      t ? t.mean.toFixed(0) + "ms ± " + t.stdDev.toFixed(0) + "ms" : "N/A",
      e && t ? (e.mean < t.mean ? "Electron" : "Tauri") : "—",
    ]);
  }

  if (r.electron.memoryMB || r.tauri.memoryMB) {
    const e = r.electron.memoryMB, t = r.tauri.memoryMB;
    lines.push([
      "Memory",
      e ? e.mean.toFixed(1) + " MB" : "N/A",
      t ? t.mean.toFixed(1) + " MB" : "N/A",
      e && t ? (e.mean < t.mean ? "Electron" : "Tauri") : "—",
    ]);
  }

  if (r.electron.cpuIdle || r.tauri.cpuIdle) {
    const e = r.electron.cpuIdle, t = r.tauri.cpuIdle;
    lines.push([
      "CPU (Idle)",
      e ? formatCpu(e.mean) : "N/A",
      t ? formatCpu(t.mean) : "N/A",
      e && t ? (e.mean <= t.mean ? "Electron" : "Tauri") : "—",
    ]);
  }

  if (r.electron.sizeBytes || r.tauri.sizeBytes) {
    const e = r.electron.sizeBytes, t = r.tauri.sizeBytes;
    lines.push([
      "Bundle Size",
      e ? formatBytes(e) : "N/A",
      t ? formatBytes(t) : "N/A",
      e && t ? (e < t ? "Electron" : "Tauri") : "—",
    ]);
  }

  if (r.electron.installerBytes || r.tauri.installerBytes) {
    const e = r.electron.installerBytes, t = r.tauri.installerBytes;
    lines.push([
      "Installer",
      e ? formatBytes(e) : "N/A",
      t ? formatBytes(t) : "N/A",
      e && t ? (e < t ? "Electron" : "Tauri") : "—",
    ]);
  }

  const w = [14, 20, 20, 12];
  for (const row of lines) console.log("  " + row.map((c, i) => c.padEnd(w[i])).join("│ "));
  console.log("\n" + "━".repeat(70));
}

function saveResults(r: Results) {
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  const p = join(RESULTS_DIR, "bench-" + PLATFORM + "-" + ARCH + ".json");
  writeFileSync(p, JSON.stringify(r, null, 2));
  console.log("\n📄 Results saved to: " + p);
}

function updateReadme(r: Results) {
  if (!existsSync(README_PATH)) return;

  const e = r.electron, t = r.tauri;
  let table = "| Metric | Electron | Tauri | Δ |\n|--------|----------|-------|---|\n";

  if (e.startupMs || t.startupMs) {
    const eVal = e.startupMs?.mean, tVal = t.startupMs?.mean;
    const eStr = eVal ? eVal.toFixed(0) + "ms ± " + e.startupMs.stdDev.toFixed(0) + "ms" : "—";
    const tStr = tVal ? tVal.toFixed(0) + "ms ± " + t.startupMs.stdDev.toFixed(0) + "ms" : "—";
    const delta = eVal && tVal ? (eVal / tVal).toFixed(1) + "x" : "—";
    table += "| **Startup Time** | " + eStr + " | " + tStr + " | " + delta + " |\n";
  }

  if (e.memoryMB || t.memoryMB) {
    const eVal = e.memoryMB?.mean, tVal = t.memoryMB?.mean;
    const eStr = eVal ? eVal.toFixed(1) + " MB" : "—";
    const tStr = tVal ? tVal.toFixed(1) + " MB" : "—";
    const delta = eVal && tVal ? (eVal / tVal).toFixed(1) + "x" : "—";
    table += "| **Memory Usage** | " + eStr + " | " + tStr + " | " + delta + " |\n";
  }

  if (e.cpuIdle || t.cpuIdle) {
    const eVal = e.cpuIdle?.mean, tVal = t.cpuIdle?.mean;
    const eStr = eVal !== undefined ? formatCpu(eVal) : "—";
    const tStr = tVal !== undefined ? formatCpu(tVal) : "—";
    const delta = eVal !== undefined && tVal !== undefined && tVal > 0.001 ? (eVal / tVal).toFixed(1) + "x" : "~";
    table += "| **CPU (Idle)** | " + eStr + " | " + tStr + " | " + delta + " |\n";
  }

  if (e.sizeBytes || t.sizeBytes) {
    const eVal = e.sizeBytes, tVal = t.sizeBytes;
    const eStr = eVal ? formatBytes(eVal) : "—";
    const tStr = tVal ? formatBytes(tVal) : "—";
    const delta = eVal && tVal ? (eVal / tVal).toFixed(0) + "x" : "—";
    table += "| **Bundle Size** | " + eStr + " | " + tStr + " | " + delta + " |\n";
  }

  if (e.installerBytes || t.installerBytes) {
    const eVal = e.installerBytes, tVal = t.installerBytes;
    const eStr = eVal ? formatBytes(eVal) : "—";
    const tStr = tVal ? formatBytes(tVal) : "—";
    const delta = eVal && tVal ? (eVal / tVal).toFixed(0) + "x" : "—";
    table += "| **Installer Size** | " + eStr + " | " + tStr + " | " + delta + " |\n";
  }

  const header = "**Platform:** " + r.platform + " (" + r.arch + ") | **Runs:** " + r.runs + " | **Date:** " + new Date(r.timestamp).toLocaleDateString();
  const md = header + "\n\n" + table;

  let readme = readFileSync(README_PATH, "utf-8");
  readme = readme.replace(
    /<!-- BENCHMARK_RESULTS_START -->[\s\S]*<!-- BENCHMARK_RESULTS_END -->/,
    "<!-- BENCHMARK_RESULTS_START -->\n" + md + "<!-- BENCHMARK_RESULTS_END -->"
  );
  writeFileSync(README_PATH, readme);
  console.log("📝 README.md updated with results");
}

runBenchmarks().catch(console.error);
