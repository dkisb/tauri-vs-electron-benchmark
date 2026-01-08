import { createCliRenderer, TextAttributes } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { useState } from "react";

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function measureBundleSize(appPath: string): Promise<string> {
  try {
    // Build the app first
    await execAsync(`cd ${appPath} && bun run build`);
    
    // Measure dist folder size (macOS/Linux)
    const { stdout } = await execAsync(`du -sh ${appPath}/dist`);
    const size = stdout?.split('\t')[0]?.trim() || "Error";
    return size;
  } catch (error) {
    console.error("Error measuring bundle size:", error);
    return "Error";
  }
}

async function startAppAndMeasureMemory(
  appPath: string, 
  appType: 'tauri' | 'electron'
): Promise<{ memory: string; startupTime: string }> {
  const start = Date.now();
  const maxWait = 60000; // Max 60 seconds timeout
  
  try {
    let child;
    let searchPattern: string;
    let killPattern: string;
    
    if (appType === 'electron') {
      child = exec(`cd ${appPath} && bun run electron:dev`);
      searchPattern = 'Electron';
      killPattern = 'electron';
    } else {
      child = exec(`cd ${appPath} && bun run tauri:dev`);
      searchPattern = 'app'; // The Tauri binary is usually named 'app' in dev
      killPattern = 'tauri dev';
    }
    
    // Poll until the app process is detected (fair measurement)
    let appDetected = false;
    while (Date.now() - start < maxWait) {
      try {
        const { stdout } = await execAsync(
          `ps aux | grep -iE "${searchPattern}" | grep -v grep | grep -v bun | grep -v cargo | grep -v rustc`
        );
        // Check if we found actual app processes (not just build processes)
        if (stdout.trim().length > 0) {
          // Give it a tiny bit more time to fully initialize after detection
          await new Promise(r => setTimeout(r, 500));
          appDetected = true;
          break;
        }
      } catch {
        // grep returns error if no matches, continue polling
      }
      await new Promise(r => setTimeout(r, 200)); // Poll every 200ms
    }
    
    const startupTime = Date.now() - start;
    
    if (!appDetected) {
      child.kill('SIGTERM');
      return { memory: "Timeout", startupTime: "Timeout" };
    }
    
    // Measure memory now that app is running
    const { stdout } = await execAsync(
      `ps aux | grep -iE "${searchPattern}" | grep -v grep | grep -v bun | grep -v cargo | grep -v rustc | awk '{sum+=$6} END {print sum}'`
    );
    const memoryKB = parseInt(stdout.trim()) || 0;
    const memoryMB = (memoryKB / 1024).toFixed(1);

    // Cleanup
    child.kill('SIGTERM');
    try {
      await execAsync(`pkill -f "${killPattern}" || true`);
    } catch {
      // Ignore pkill errors
    }
    
    return {
      memory: `${memoryMB} MB`,
      startupTime: `${startupTime} ms`,
    };
  } catch (error) {
    return { memory: "Error", startupTime: "Error" };
  }
}
let rendererRef: Awaited<ReturnType<typeof createCliRenderer>>;

type Metrics = {
  bundleSize: string;
  memoryUsage: string;
  startupTime: string;
};

function BenchmarkTUI() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  
  const [tauriMetrics, setTauriMetrics] = useState<Metrics>({
    bundleSize: "-- MB",
    memoryUsage: "-- MB",
    startupTime: "-- ms",
  });

  const [electronMetrics, setElectronMetrics] = useState<Metrics>({
    bundleSize: "-- MB",
    memoryUsage: "-- MB",
    startupTime: "-- ms",
  });

const runBenchmarks = async () => {
  setIsRunning(true);
  setErrors([]);
  const newErrors: string[] = [];
  
  // Bundle sizes
  setCurrentStatus("Building Tauri app and measuring bundle size...");
  const tauriBundleSize = await measureBundleSize("../tauri-bench-app");
  if (tauriBundleSize === "Error") {
    newErrors.push("Failed to measure Tauri bundle size");
  }
  
  setCurrentStatus("Building Electron app and measuring bundle size...");
  const electronBundleSize = await measureBundleSize("../electron-bench-app");
  if (electronBundleSize === "Error") {
    newErrors.push("Failed to measure Electron bundle size");
  }
  
  // Start apps and measure memory + startup time together
  setCurrentStatus("Starting Tauri app and measuring memory/startup time...");
  const tauriResults = await startAppAndMeasureMemory("../tauri-bench-app", "tauri");
  if (tauriResults.memory === "Error") {
    newErrors.push("Failed to measure Tauri memory/startup time");
  }
  
  setCurrentStatus("Starting Electron app and measuring memory/startup time...");
  const electronResults = await startAppAndMeasureMemory("../electron-bench-app", "electron");
  if (electronResults.memory === "Error") {
    newErrors.push("Failed to measure Electron memory/startup time");
  }
  
  setTauriMetrics({
    bundleSize: tauriBundleSize,
    memoryUsage: tauriResults.memory,
    startupTime: tauriResults.startupTime,
  });
  
  setElectronMetrics({
    bundleSize: electronBundleSize,
    memoryUsage: electronResults.memory,
    startupTime: electronResults.startupTime,
  });
  
  setCurrentStatus("");
  setErrors(newErrors);
  setIsRunning(false);
};

  // Handle keyboard input
  useKeyboard((e) => {
    if (e.name === "q" || e.name === "escape") {
      // Properly cleanup and exit
      rendererRef?.destroy?.();
      process.exit(0);
    }
    if (e.name === "r" && !isRunning) {
      runBenchmarks();
    }
  });

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
          <text attributes={TextAttributes.BLINK}>Running benchmarks...</text>
          {currentStatus && (
            <text attributes={TextAttributes.DIM}>{currentStatus}</text>
          )}
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
        </box>

        {/* Metrics Columns */}
        <box flexDirection="row" gap={2}>
          {/* Tauri */}
          <box flexDirection="column" minWidth={25}>
            <text attributes={TextAttributes.BOLD}>TAURI</text>
            <box marginTop={1} flexDirection="column">
              <text>Bundle Size:  {tauriMetrics.bundleSize}</text>
              <text>Memory Usage: {tauriMetrics.memoryUsage}</text>
              <text>Startup Time: {tauriMetrics.startupTime}</text>
            </box>
          </box>

          {/* Electron */}
          <box flexDirection="column" minWidth={25}>
            <text attributes={TextAttributes.BOLD}>ELECTRON</text>
            <box marginTop={1} flexDirection="column">
              <text>Bundle Size:  {electronMetrics.bundleSize}</text>
              <text>Memory Usage: {electronMetrics.memoryUsage}</text>
              <text>Startup Time: {electronMetrics.startupTime}</text>
            </box>
          </box>
        </box>
      </box>

      {/* Errors */}
      {errors.length > 0 && (
        <box flexDirection="column" marginTop={1} alignItems="center">
          <text attributes={TextAttributes.BOLD}>Errors:</text>
          {errors.map((error, index) => (
            <text key={index} attributes={TextAttributes.BOLD}>{error}</text>
          ))}
        </box>
      )}

      {/* Footer */}
      <box marginTop={2} alignItems="center">
        <text attributes={TextAttributes.DIM}>Press 'r' to run benchmarks | 'q' to quit</text>
      </box>
    </box>
  );
}

const renderer = await createCliRenderer();
rendererRef = renderer;
createRoot(renderer).render(<BenchmarkTUI />);
