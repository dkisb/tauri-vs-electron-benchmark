import { createCliRenderer, TextAttributes } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { useState } from "react";

import { exec } from "child_process";
import { promisify } from "util";
import { resolve } from "path";

const execAsync = promisify(exec);

// Path to scripts directory
const SCRIPTS_DIR = resolve(import.meta.dir, "../../scripts");
const TAURI_APP = resolve(import.meta.dir, "../../tauri-bench-app");
const ELECTRON_APP = resolve(import.meta.dir, "../../electron-bench-app");

// Parse the final result from script output
function parseResult(output: string): string {
  const lines = output.trim().split('\n').filter(l => l.trim());
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line) continue;
    
    if (line.startsWith('Error')) return 'Error';
    
    if (line.includes('...') || line.startsWith('Sample') || line.startsWith('Building') || 
        line.startsWith('Starting') || line.startsWith('Measuring') || line.startsWith('Cleaning') ||
        line.startsWith('Ensuring') || line.startsWith('Testing') || line.startsWith('Progress')) {
      continue;
    }
    
    if (/^\d+ms$/i.test(line)) return line;
    if (/^\d+(\.\d+)?[KMGTkmgt]$/i.test(line)) return line;
    // Match percentages like "0%", "0.4%", "0.00%", ".4%" (bc may output ".4" instead of "0.4")
    if (/^\.?\d+(\.\d{1,2})?%$/.test(line)) return line;
  }
  
  return 'Error';
}

// Kill all stale processes
async function cleanupProcesses(): Promise<void> {
  try {
    // Be more specific to avoid killing shells that have "tauri" in their path
    // Use SIGKILL (-9) to ensure processes are actually terminated
    await execAsync('pkill -9 -f "target/debug/app" 2>/dev/null; pkill -9 -f "Electron Helper" 2>/dev/null; pkill -f "node.*vite" 2>/dev/null; sleep 3', {
      shell: '/bin/bash',
      timeout: 15000,
    });
  } catch {
    // Ignore errors - processes may not exist
  }
}

// Run a shell script and capture output
async function runScript(scriptName: string, appPath: string, appName: string): Promise<string> {
  try {
    const funcName = scriptName.replace('.sh', '').replace(/-/g, '_');
    const cmd = `source "${SCRIPTS_DIR}/${scriptName}" && ${funcName} "${appPath}" "${appName}" 2>&1`;
    
    const { stdout } = await execAsync(cmd, { 
      shell: '/bin/bash',
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
    });
    
    return parseResult(stdout);
  } catch (error: any) {
    if (error.stdout) {
      const result = parseResult(error.stdout);
      if (result !== 'Error') return result;
    }
    return 'Error';
  }
}

// Measurement functions
async function measureBundleSize(appPath: string, appName: string): Promise<string> {
  try {
    const cmd = `source "${SCRIPTS_DIR}/measure-size.sh" && measure_bundle_size "${appPath}" "${appName}" 2>&1`;
    const { stdout } = await execAsync(cmd, { shell: '/bin/bash', timeout: 180000, maxBuffer: 10 * 1024 * 1024 });
    return parseResult(stdout);
  } catch (error: any) {
    if (error.stdout) {
      const result = parseResult(error.stdout);
      if (result !== 'Error') return result;
    }
    return 'Error';
  }
}

async function measureMemory(appPath: string, appName: string): Promise<string> {
  return runScript("measure-memory.sh", appPath, appName);
}

async function measureStartup(appPath: string, appName: string): Promise<string> {
  return runScript("measure-startup.sh", appPath, appName);
}

async function measureBuildCold(appPath: string, appName: string): Promise<string> {
  return runScript("measure-build-cold.sh", appPath, appName);
}

async function measureBuildHot(appPath: string, appName: string): Promise<string> {
  return runScript("measure-build-hot.sh", appPath, appName);
}

async function measureCpuIdle(appPath: string, appName: string): Promise<string> {
  return runScript("measure-cpu-idle.sh", appPath, appName);
}

async function measureInstall(appPath: string, appName: string): Promise<string> {
  return runScript("measure-install.sh", appPath, appName);
}

let rendererRef: Awaited<ReturnType<typeof createCliRenderer>>;

type Metrics = {
  bundleSize: string;
  memoryUsage: string;
  startupTime: string;
  coldBuild: string;
  hotBuild: string;
  cpuIdle: string;
  installTime: string;
};

const defaultMetrics: Metrics = {
  bundleSize: "--",
  memoryUsage: "--",
  startupTime: "--",
  coldBuild: "--",
  hotBuild: "--",
  cpuIdle: "--",
  installTime: "--",
};

type BenchmarkType = 'all' | 'quick' | 'size' | 'memory' | 'startup' | 'build' | 'cpu' | 'install';
type Phase = 'idle' | 'tauri' | 'electron' | 'done';

function BenchmarkTUI() {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkType>('quick');
  
  const [tauriMetrics, setTauriMetrics] = useState<Metrics>({ ...defaultMetrics });
  const [electronMetrics, setElectronMetrics] = useState<Metrics>({ ...defaultMetrics });

  const benchmarkOptions: { key: string; type: BenchmarkType; label: string }[] = [
    { key: '1', type: 'quick', label: 'Quick (size, memory, startup)' },
    { key: '2', type: 'all', label: 'All Benchmarks' },
    { key: '3', type: 'size', label: 'Bundle Size Only' },
    { key: '4', type: 'memory', label: 'Memory Only' },
    { key: '5', type: 'startup', label: 'Startup Time Only' },
    { key: '6', type: 'build', label: 'Build Times Only' },
    { key: '7', type: 'cpu', label: 'CPU Usage Only' },
    { key: '8', type: 'install', label: 'Install Time Only' },
  ];

  // Get benchmarks to run based on type
  const getBenchmarksToRun = (type: BenchmarkType): string[] => {
    switch (type) {
      case 'quick': return ['size', 'memory', 'startup'];
      case 'all': return ['size', 'memory', 'startup', 'coldBuild', 'hotBuild', 'cpu', 'install'];
      case 'size': return ['size'];
      case 'memory': return ['memory'];
      case 'startup': return ['startup'];
      case 'build': return ['coldBuild', 'hotBuild'];
      case 'cpu': return ['cpu'];
      case 'install': return ['install'];
      default: return [];
    }
  };

  const runBenchmarks = async (type: BenchmarkType) => {
    setIsRunning(true);
    setErrors([]);
    setPhase('tauri');
    
    const newErrors: string[] = [];
    const benchmarks = getBenchmarksToRun(type);
    
    // Reset metrics
    const newTauriMetrics = { ...defaultMetrics };
    const newElectronMetrics = { ...defaultMetrics };
    setTauriMetrics(newTauriMetrics);
    setElectronMetrics(newElectronMetrics);

    // ============ PHASE 1: Run all Tauri benchmarks ============
    setPhase('tauri');
    
    for (const benchmark of benchmarks) {
      switch (benchmark) {
        case 'size':
          setCurrentStatus("📦 Bundle Size...");
          newTauriMetrics.bundleSize = await measureBundleSize(TAURI_APP, "tauri");
          if (newTauriMetrics.bundleSize === "Error") newErrors.push("Tauri: bundle size");
          setTauriMetrics({ ...newTauriMetrics });
          break;
        case 'memory':
          setCurrentStatus("🧹 Cleanup...");
          await cleanupProcesses();
          setCurrentStatus("🧠 Memory...");
          newTauriMetrics.memoryUsage = await measureMemory(TAURI_APP, "tauri");
          if (newTauriMetrics.memoryUsage === "Error") newErrors.push("Tauri: memory");
          setTauriMetrics({ ...newTauriMetrics });
          break;
        case 'startup':
          setCurrentStatus("🧹 Cleanup...");
          await cleanupProcesses();
          setCurrentStatus("🚀 Startup...");
          newTauriMetrics.startupTime = await measureStartup(TAURI_APP, "tauri");
          if (newTauriMetrics.startupTime === "Error") newErrors.push("Tauri: startup");
          setTauriMetrics({ ...newTauriMetrics });
          break;
        case 'coldBuild':
          setCurrentStatus("🔨 Cold Build...");
          newTauriMetrics.coldBuild = await measureBuildCold(TAURI_APP, "tauri");
          if (newTauriMetrics.coldBuild === "Error") newErrors.push("Tauri: cold build");
          setTauriMetrics({ ...newTauriMetrics });
          break;
        case 'hotBuild':
          setCurrentStatus("🔥 Hot Build...");
          newTauriMetrics.hotBuild = await measureBuildHot(TAURI_APP, "tauri");
          if (newTauriMetrics.hotBuild === "Error") newErrors.push("Tauri: hot build");
          setTauriMetrics({ ...newTauriMetrics });
          break;
        case 'cpu':
          setCurrentStatus("🧹 Cleanup...");
          await cleanupProcesses();
          setCurrentStatus("⚡ CPU (idle)...");
          newTauriMetrics.cpuIdle = await measureCpuIdle(TAURI_APP, "tauri");
          if (newTauriMetrics.cpuIdle === "Error") newErrors.push("Tauri: CPU");
          setTauriMetrics({ ...newTauriMetrics });
          break;
        case 'install':
          setCurrentStatus("📥 Install...");
          newTauriMetrics.installTime = await measureInstall(TAURI_APP, "tauri");
          if (newTauriMetrics.installTime === "Error") newErrors.push("Tauri: install");
          setTauriMetrics({ ...newTauriMetrics });
          break;
      }
    }

    // ============ PHASE 2: Run all Electron benchmarks ============
    setPhase('electron');
    
    for (const benchmark of benchmarks) {
      switch (benchmark) {
        case 'size':
          setCurrentStatus("📦 Bundle Size...");
          newElectronMetrics.bundleSize = await measureBundleSize(ELECTRON_APP, "electron");
          if (newElectronMetrics.bundleSize === "Error") newErrors.push("Electron: bundle size");
          setElectronMetrics({ ...newElectronMetrics });
          break;
        case 'memory':
          setCurrentStatus("🧹 Cleanup...");
          await cleanupProcesses();
          setCurrentStatus("🧠 Memory...");
          newElectronMetrics.memoryUsage = await measureMemory(ELECTRON_APP, "electron");
          if (newElectronMetrics.memoryUsage === "Error") newErrors.push("Electron: memory");
          setElectronMetrics({ ...newElectronMetrics });
          break;
        case 'startup':
          setCurrentStatus("🧹 Cleanup...");
          await cleanupProcesses();
          setCurrentStatus("🚀 Startup...");
          newElectronMetrics.startupTime = await measureStartup(ELECTRON_APP, "electron");
          if (newElectronMetrics.startupTime === "Error") newErrors.push("Electron: startup");
          setElectronMetrics({ ...newElectronMetrics });
          break;
        case 'coldBuild':
          setCurrentStatus("🔨 Cold Build...");
          newElectronMetrics.coldBuild = await measureBuildCold(ELECTRON_APP, "electron");
          if (newElectronMetrics.coldBuild === "Error") newErrors.push("Electron: cold build");
          setElectronMetrics({ ...newElectronMetrics });
          break;
        case 'hotBuild':
          setCurrentStatus("🔥 Hot Build...");
          newElectronMetrics.hotBuild = await measureBuildHot(ELECTRON_APP, "electron");
          if (newElectronMetrics.hotBuild === "Error") newErrors.push("Electron: hot build");
          setElectronMetrics({ ...newElectronMetrics });
          break;
        case 'cpu':
          setCurrentStatus("🧹 Cleanup...");
          await cleanupProcesses();
          setCurrentStatus("⚡ CPU (idle)...");
          newElectronMetrics.cpuIdle = await measureCpuIdle(ELECTRON_APP, "electron");
          if (newElectronMetrics.cpuIdle === "Error") newErrors.push("Electron: CPU");
          setElectronMetrics({ ...newElectronMetrics });
          break;
        case 'install':
          setCurrentStatus("📥 Install...");
          newElectronMetrics.installTime = await measureInstall(ELECTRON_APP, "electron");
          if (newElectronMetrics.installTime === "Error") newErrors.push("Electron: install");
          setElectronMetrics({ ...newElectronMetrics });
          break;
      }
    }

    // ============ PHASE 3: Done - show comparison ============
    setPhase('done');
    setCurrentStatus("");
    setErrors(newErrors);
    setIsRunning(false);
  };

  // Handle keyboard input
  useKeyboard((e) => {
    if (e.name === "q" || e.name === "escape") {
      rendererRef?.destroy?.();
      process.exit(0);
    }
    if (e.name === "r" && !isRunning) {
      runBenchmarks(selectedBenchmark);
    }
    if (e.name === "c" && !isRunning) {
      setTauriMetrics({ ...defaultMetrics });
      setElectronMetrics({ ...defaultMetrics });
      setErrors([]);
      setPhase('idle');
    }
    const option = benchmarkOptions.find(o => o.key === e.name);
    if (option && !isRunning) {
      setSelectedBenchmark(option.type);
    }
  });

  // Calculate winner for each metric
  const getWinner = (tauriVal: string, electronVal: string): 'tauri' | 'electron' | 'tie' | 'none' => {
    if (tauriVal === "--" || electronVal === "--" || tauriVal === "Error" || electronVal === "Error") {
      return 'none';
    }
    const tauriNum = parseFloat(tauriVal);
    const electronNum = parseFloat(electronVal);
    if (isNaN(tauriNum) || isNaN(electronNum)) return 'none';
    if (tauriNum === electronNum) return 'tie';
    return tauriNum < electronNum ? 'tauri' : 'electron';
  };

  const formatMetric = (value: string, winner: 'tauri' | 'electron' | 'tie' | 'none', side: 'tauri' | 'electron'): string => {
    // Only show winner indicator after comparison (phase === 'done')
    if (phase === 'done' && winner === side) return `✓ ${value}`;
    return `  ${value}`;
  };

  // Get phase indicator
  const getPhaseText = () => {
    switch (phase) {
      case 'tauri': return '🦀 Running TAURI benchmarks...';
      case 'electron': return '⚛️  Running ELECTRON benchmarks...';
      case 'done': return '✅ Comparison complete!';
      default: return '';
    }
  };

  return (
    <box flexDirection="column" padding={1} flexGrow={1}>
      {/* Header */}
      <box marginBottom={1} flexDirection="column" alignItems="center">
        <ascii-font font="slick" text="BENCHMARK" />
        <box marginTop={1} />
        <ascii-font font="tiny" text="Tauri vs Electron" />
      </box>

      {/* Status */}
      {isRunning && (
        <box flexDirection="column" alignItems="center" marginBottom={1}>
          <text attributes={TextAttributes.BOLD}>{getPhaseText()}</text>
          {currentStatus && (
            <text attributes={TextAttributes.DIM}>{currentStatus}</text>
          )}
        </box>
      )}

      {/* Phase complete indicator */}
      {phase === 'done' && !isRunning && (
        <box flexDirection="column" alignItems="center" marginBottom={1}>
          <text attributes={TextAttributes.BOLD}>{getPhaseText()}</text>
        </box>
      )}

      {/* Benchmark Selection */}
      {!isRunning && phase !== 'done' && (
        <box flexDirection="column" alignItems="center" marginBottom={1}>
          <text attributes={TextAttributes.BOLD}>Select Benchmark (1-8):</text>
          <box flexDirection="row" gap={1} flexWrap="wrap" justifyContent="center">
            {benchmarkOptions.map((opt) => (
              <text 
                key={opt.key}
                attributes={selectedBenchmark === opt.type ? TextAttributes.INVERSE : TextAttributes.DIM}
              >
                [{opt.key}] {opt.label}
              </text>
            ))}
          </box>
        </box>
      )}

      {/* Metrics Table */}
      <box flexDirection="column" marginTop={1} alignItems="center">
        {/* Environment Info */}
        <box flexDirection="row" gap={2} marginBottom={1}>
          <text attributes={TextAttributes.DIM}>Environment: </text>
          <text>Bun</text>
          <text attributes={TextAttributes.DIM}>|</text>
          <text>Vite</text>
          <text attributes={TextAttributes.DIM}>|</text>
          <text>React</text>
          <text attributes={TextAttributes.DIM}>|</text>
          <text>Convex</text>
        </box>

        {/* Metrics Columns */}
        <box flexDirection="row" gap={4}>
          {/* Tauri */}
          <box flexDirection="column" minWidth={28}>
            <text attributes={phase === 'tauri' ? TextAttributes.BOLD : (phase === 'done' ? TextAttributes.BOLD : TextAttributes.DIM)}>
              🦀 TAURI {phase === 'tauri' ? '⏳' : ''}
            </text>
            <box marginTop={1} flexDirection="column">
              <text>{formatMetric(tauriMetrics.bundleSize, getWinner(tauriMetrics.bundleSize, electronMetrics.bundleSize), 'tauri')} Bundle Size</text>
              <text>{formatMetric(tauriMetrics.memoryUsage, getWinner(tauriMetrics.memoryUsage, electronMetrics.memoryUsage), 'tauri')} Memory</text>
              <text>{formatMetric(tauriMetrics.startupTime, getWinner(tauriMetrics.startupTime, electronMetrics.startupTime), 'tauri')} Startup</text>
              <text>{formatMetric(tauriMetrics.coldBuild, getWinner(tauriMetrics.coldBuild, electronMetrics.coldBuild), 'tauri')} Cold Build</text>
              <text>{formatMetric(tauriMetrics.hotBuild, getWinner(tauriMetrics.hotBuild, electronMetrics.hotBuild), 'tauri')} Hot Build</text>
              <text>{formatMetric(tauriMetrics.cpuIdle, getWinner(tauriMetrics.cpuIdle, electronMetrics.cpuIdle), 'tauri')} CPU (idle)</text>
              <text>{formatMetric(tauriMetrics.installTime, getWinner(tauriMetrics.installTime, electronMetrics.installTime), 'tauri')} Install</text>
            </box>
          </box>

          {/* Divider */}
          <box flexDirection="column" alignItems="center">
            <text attributes={TextAttributes.DIM}>│</text>
            <text attributes={TextAttributes.DIM}>│</text>
            <text attributes={TextAttributes.DIM}>│</text>
            <text attributes={TextAttributes.DIM}>│</text>
            <text attributes={TextAttributes.DIM}>│</text>
            <text attributes={TextAttributes.DIM}>│</text>
            <text attributes={TextAttributes.DIM}>│</text>
            <text attributes={TextAttributes.DIM}>│</text>
          </box>

          {/* Electron */}
          <box flexDirection="column" minWidth={28}>
            <text attributes={phase === 'electron' ? TextAttributes.BOLD : (phase === 'done' ? TextAttributes.BOLD : TextAttributes.DIM)}>
              ⚛️  ELECTRON {phase === 'electron' ? '⏳' : ''}
            </text>
            <box marginTop={1} flexDirection="column">
              <text>{formatMetric(electronMetrics.bundleSize, getWinner(tauriMetrics.bundleSize, electronMetrics.bundleSize), 'electron')} Bundle Size</text>
              <text>{formatMetric(electronMetrics.memoryUsage, getWinner(tauriMetrics.memoryUsage, electronMetrics.memoryUsage), 'electron')} Memory</text>
              <text>{formatMetric(electronMetrics.startupTime, getWinner(tauriMetrics.startupTime, electronMetrics.startupTime), 'electron')} Startup</text>
              <text>{formatMetric(electronMetrics.coldBuild, getWinner(tauriMetrics.coldBuild, electronMetrics.coldBuild), 'electron')} Cold Build</text>
              <text>{formatMetric(electronMetrics.hotBuild, getWinner(tauriMetrics.hotBuild, electronMetrics.hotBuild), 'electron')} Hot Build</text>
              <text>{formatMetric(electronMetrics.cpuIdle, getWinner(tauriMetrics.cpuIdle, electronMetrics.cpuIdle), 'electron')} CPU (idle)</text>
              <text>{formatMetric(electronMetrics.installTime, getWinner(tauriMetrics.installTime, electronMetrics.installTime), 'electron')} Install</text>
            </box>
          </box>
        </box>
      </box>

      {/* Legend - only show when comparison is done */}
      {phase === 'done' && (
        <box flexDirection="row" justifyContent="center" marginTop={1} gap={2}>
          <text attributes={TextAttributes.DIM}>✓ = Winner (lower is better)</text>
        </box>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <box flexDirection="column" marginTop={1} alignItems="center">
          <text attributes={TextAttributes.BOLD}>⚠️  Errors:</text>
          {errors.map((error, index) => (
            <text key={index} attributes={TextAttributes.DIM}>{error}</text>
          ))}
        </box>
      )}

      {/* Footer */}
      <box marginTop={2} flexDirection="column" alignItems="center">
        <text attributes={TextAttributes.DIM}>
          [r] Run  |  [c] Clear  |  [1-8] Select Benchmark  |  [q] Quit
        </text>
      </box>
    </box>
  );
}

const renderer = await createCliRenderer();
rendererRef = renderer;
createRoot(renderer).render(<BenchmarkTUI />);
