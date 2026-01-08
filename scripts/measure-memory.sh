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
  
  # Clean up any stale processes first (be specific to avoid killing shells)
  pkill -f "target/debug/app" 2>/dev/null
  pkill -f "Electron Helper" 2>/dev/null
  pkill -f "node.*vite" 2>/dev/null
  sleep 1

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
    (cd "$app_path" && bun run start &>/dev/null) &
    pid=$!
  fi
  
  # Wait for app to start - poll until process is detected
  local actual_pid=""
  local wait_count=0
  local max_wait=60  # 60 seconds max (Tauri needs time to compile)
  
  while [ $wait_count -lt $max_wait ]; do
    if [[ "$OSTYPE" == "darwin"* ]]; then
      if [[ "$app_name" == "tauri" ]]; then
        # Tauri dev mode runs as target/debug/app
        actual_pid=$(pgrep -f "target/debug/app" | head -1)
      elif [[ "$app_name" == "electron" ]]; then
        # Electron spawns multiple processes, get the main one
        actual_pid=$(pgrep -f "Electron Helper" | head -1)
        if [ -z "$actual_pid" ]; then
          actual_pid=$(pgrep -f "Electron" | head -1)
        fi
      fi
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
      actual_pid=$pid
    else
      if [[ "$app_name" == "tauri" ]]; then
        actual_pid=$(pgrep -f "target/debug/app" | head -1)
      elif [[ "$app_name" == "electron" ]]; then
        actual_pid=$(pgrep -f "electron" | head -1)
      fi
    fi
    
    if [ -n "$actual_pid" ]; then
      # Found the process, wait a bit more for it to stabilize
      sleep 2
      break
    fi
    
    sleep 1
    wait_count=$((wait_count + 1))
  done

  if [ -z "$actual_pid" ]; then
    # Kill the background process
    kill $pid 2>/dev/null
    pkill -f "target/debug/app" 2>/dev/null
    pkill -f "electron" 2>/dev/null
    pkill -f "Electron Helper" 2>/dev/null
    pkill -f "node.*vite" 2>/dev/null
    # removed broad pkill tauri
    echo "Error: App did not start"
    return 1
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
  pkill -f "target/debug/app" 2>/dev/null
  pkill -f "electron" 2>/dev/null
  pkill -f "Electron Helper" 2>/dev/null
  pkill -f "node.*vite" 2>/dev/null
  # removed broad pkill tauri
  
  # Calculate average memory usage
  if [ ${#memory_samples[@]} -eq 0 ]; then
    echo "Error: No memory samples collected"
    return 1
  fi

  for sample in "${memory_samples[@]}"; do
    total_memory=$(awk "BEGIN {print $total_memory + $sample}")
  done
  
  avg_memory=$(awk "BEGIN {printf \"%.1f\", $total_memory / ${#memory_samples[@]}}")
  
  echo "${avg_memory}M"
}
