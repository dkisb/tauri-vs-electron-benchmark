#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source all measurement scripts
source "$SCRIPT_DIR/compare-pms.sh"
source "$SCRIPT_DIR/measure-build-cold.sh"
source "$SCRIPT_DIR/measure-build-hot.sh"
source "$SCRIPT_DIR/measure-cpu-idle.sh"
source "$SCRIPT_DIR/measure-cpu-load.sh"
source "$SCRIPT_DIR/measure-install.sh"
source "$SCRIPT_DIR/measure-latency.sh"
source "$SCRIPT_DIR/measure-memory.sh"
source "$SCRIPT_DIR/measure-startup.sh"
source "$SCRIPT_DIR/measure-size.sh"

run_all() {
  local app_path="$1"
  local app_name="$2"
  
  if [ -z "$app_path" ] || [ -z "$app_name" ]; then
    echo "Usage: run_all <app_path> <app_name>"
    echo "  app_path: Path to the app directory"
    echo "  app_name: 'tauri' or 'electron'"
    return 1
  fi
  
  echo "============================================"
  echo "Running all benchmarks for: $app_name"
  echo "App path: $app_path"
  echo "============================================"
  echo ""
  
  local results=()
  
  # Run all measurements
  echo "[1/10] Measuring install time..."
  local install_result=$(measure_install "$app_path" "$app_name")
  results+=("Install time: $install_result")
  echo "  Result: $install_result"
  echo ""
  
  echo "[2/10] Measuring cold build time..."
  local cold_build_result=$(measure_build_cold "$app_path" "$app_name")
  results+=("Cold build time: $cold_build_result")
  echo "  Result: $cold_build_result"
  echo ""
  
  echo "[3/10] Measuring hot build time..."
  local hot_build_result=$(measure_build_hot "$app_path" "$app_name")
  results+=("Hot build time: $hot_build_result")
  echo "  Result: $hot_build_result"
  echo ""
  
  echo "[4/10] Measuring bundle size..."
  local bundle_size_result=$(measure_bundle_size "$app_path" "$app_name")
  results+=("Bundle size: $bundle_size_result")
  echo "  Result: $bundle_size_result"
  echo ""
  
  echo "[5/10] Measuring startup time..."
  local startup_result=$(measure_startup "$app_path" "$app_name")
  results+=("Startup time: $startup_result")
  echo "  Result: $startup_result"
  echo ""
  
  echo "[6/10] Measuring app latency..."
  local latency_result=$(measure_latency "$app_path" "$app_name")
  results+=("Latency: $latency_result")
  echo "  Result: $latency_result"
  echo ""
  
  echo "[7/10] Measuring memory usage..."
  local memory_result=$(measure_memory "$app_path" "$app_name")
  results+=("Memory usage: $memory_result")
  echo "  Result: $memory_result"
  echo ""
  
  echo "[8/10] Measuring CPU usage (idle)..."
  local cpu_idle_result=$(measure_cpu_idle "$app_path" "$app_name")
  results+=("CPU idle: $cpu_idle_result")
  echo "  Result: $cpu_idle_result"
  echo ""
  
  echo "[9/10] Measuring CPU usage (under load)..."
  local cpu_load_result=$(measure_cpu_load "$app_path" "$app_name")
  results+=("CPU load: $cpu_load_result")
  echo "  Result: $cpu_load_result"
  echo ""
  
  echo "[10/10] Comparing package managers..."
  compare_pms "$app_path" "$app_name"
  echo ""
  
  # Print summary
  echo "============================================"
  echo "BENCHMARK SUMMARY FOR: $app_name"
  echo "============================================"
  for result in "${results[@]}"; do
    echo "  $result"
  done
  echo "============================================"
}

# Run benchmarks for both apps
run_comparison() {
  local tauri_path="$1"
  local electron_path="$2"
  
  if [ -z "$tauri_path" ] || [ -z "$electron_path" ]; then
    echo "Usage: run_comparison <tauri_app_path> <electron_app_path>"
    return 1
  fi
  
  echo ""
  echo "########################################"
  echo "#  TAURI VS ELECTRON BENCHMARK SUITE  #"
  echo "########################################"
  echo ""
  
  echo ">>> BENCHMARKING TAURI APP <<<"
  run_all "$tauri_path" "tauri"
  
  echo ""
  echo ""
  
  echo ">>> BENCHMARKING ELECTRON APP <<<"
  run_all "$electron_path" "electron"
  
  echo ""
  echo "########################################"
  echo "#        BENCHMARK COMPLETE           #"
  echo "########################################"
}

# If script is run directly (not sourced), show usage
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "Tauri vs Electron Benchmark Suite"
  echo ""
  echo "Usage:"
  echo "  source run-all.sh"
  echo ""
  echo "Then call one of:"
  echo "  run_all <app_path> <app_name>     - Run all benchmarks for a single app"
  echo "  run_comparison <tauri_path> <electron_path> - Compare both apps"
  echo ""
  echo "Examples:"
  echo "  run_all ./tauri-bench-app tauri"
  echo "  run_all ./electron-bench-app electron"
  echo "  run_comparison ./tauri-bench-app ./electron-bench-app"
fi
