#!/bin/bash

# Helper function to get memory usage of a process in MB (cross-platform)
get_memory_mb() {
  local pid="$1"
  local memory=""
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - use ps to get RSS (Resident Set Size) in KB, convert to MB
    local rss_kb=$(ps -o rss= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ -n "$rss_kb" ]; then
      memory=$(awk "BEGIN {printf \"%.1f\", $rss_kb / 1024}")
    fi
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows - get memory usage via PowerShell (WorkingSet64 in bytes)
    memory=$(powershell -Command "
      \$process = Get-Process -Id $pid -ErrorAction SilentlyContinue
      if (\$process) {
        [math]::Round(\$process.WorkingSet64 / 1MB, 1)
      }
    " 2>/dev/null)
  else
    # Linux - use ps to get RSS in KB, convert to MB
    local rss_kb=$(ps -o rss= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ -n "$rss_kb" ]; then
      memory=$(awk "BEGIN {printf \"%.1f\", $rss_kb / 1024}")
    fi
  fi
  
  echo "$memory"
}

measure_memory() {
  local app_path="$1"
  local app_name="$2"
  
  local pid
  local memory_samples=()
  local total_memory=0
  local avg_memory
  local sample_count=3
  local sample_interval=2
  
  # Build the app first
  if ! (cd "$app_path" && bun run build &>/dev/null); then
    echo "Error: Build failed"
    return 1
  fi
  
  # Start the app and get its PID
  echo "Starting $app_name app for memory measurement..."
  if [[ "$app_name" == "tauri" ]]; then
    (cd "$app_path" && bun run tauri dev &>/dev/null) &
    pid=$!
  elif [[ "$app_name" == "electron" ]]; then
    (cd "$app_path" && bun run dev &>/dev/null) &
    pid=$!
  fi
  
  # Wait for app to start
  sleep 8
  
  # Find the actual app process (child process)
  local actual_pid
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if [[ "$app_name" == "tauri" ]]; then
      actual_pid=$(pgrep -f "tauri-bench-app" | head -1)
    elif [[ "$app_name" == "electron" ]]; then
      # Electron spawns multiple processes, get the main one
      actual_pid=$(pgrep -f "Electron" | head -1)
    fi
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    actual_pid=$pid
  else
    if [[ "$app_name" == "tauri" ]]; then
      actual_pid=$(pgrep -f "tauri-bench-app" | head -1)
    elif [[ "$app_name" == "electron" ]]; then
      actual_pid=$(pgrep -f "electron" | head -1)
    fi
  fi

  if [ -z "$actual_pid" ]; then
    actual_pid=$pid
  fi
  
  # Collect memory samples
  echo "Measuring memory usage (${sample_count} samples, ${sample_interval}s interval)..."
  for ((i=1; i<=sample_count; i++)); do
    local sample=$(get_memory_mb "$actual_pid")
    if [ -n "$sample" ] && [ "$sample" != "" ]; then
      memory_samples+=("$sample")
      echo "  Sample $i: ${sample}M"
    fi
    sleep $sample_interval
  done
  
  # Kill the app
  kill $pid 2>/dev/null
  pkill -f "tauri-bench-app" 2>/dev/null
  pkill -f "electron" 2>/dev/null
  pkill -f "Electron" 2>/dev/null
  
  # Calculate average memory usage
  if [ ${#memory_samples[@]} -eq 0 ]; then
    echo "Error: No memory samples collected"
    return 1
  fi

  for sample in "${memory_samples[@]}"; do
    total_memory=$(echo "$total_memory + $sample" | bc 2>/dev/null || awk "BEGIN {print $total_memory + $sample}")
  done
  
  avg_memory=$(echo "scale=1; $total_memory / ${#memory_samples[@]}" | bc 2>/dev/null || awk "BEGIN {printf \"%.1f\", $total_memory / ${#memory_samples[@]}}")
  
  echo "${avg_memory}M"
}
