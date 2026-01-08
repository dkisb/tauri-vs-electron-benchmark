#!/bin/bash

# Helper function to get current time in milliseconds (cross-platform)
get_time_ms() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000'
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    powershell -Command "[math]::Round((Get-Date).ToFileTimeUtc() / 10000 - 11644473600000)"
  else
    date +%s%3N
  fi
}

# Helper function to get CPU usage of a process (cross-platform)
get_cpu_usage() {
  local pid="$1"
  local cpu_usage=""
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - use ps to get CPU percentage
    cpu_usage=$(ps -p "$pid" -o %cpu= 2>/dev/null | tr -d ' ')
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows - use PowerShell to get CPU usage
    cpu_usage=$(powershell -Command "
      \$process = Get-Process -Id $pid -ErrorAction SilentlyContinue
      if (\$process) {
        \$cpu = (Get-Counter '\\Process(\$(\$process.ProcessName))\\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples.CookedValue
        if (\$cpu) { [math]::Round(\$cpu, 1) } else { 0 }
      }
    " 2>/dev/null)
  else
    # Linux - use ps to get CPU percentage
    cpu_usage=$(ps -p "$pid" -o %cpu= 2>/dev/null | tr -d ' ')
  fi
  
  echo "$cpu_usage"
}

# Simulate load by triggering UI interactions via the app's dev server
simulate_load() {
  local port="$1"
  local duration="$2"
  
  # Make rapid HTTP requests to simulate activity
  local end_time=$(($(date +%s) + duration))
  while [ $(date +%s) -lt $end_time ]; do
    curl -s "http://localhost:$port" &>/dev/null &
    sleep 0.1
  done
}

measure_cpu_load() {
  local app_path="$1"
  local app_name="$2"
  
  local pid
  local cpu_samples=()
  local total_cpu=0
  local avg_cpu
  local sample_count=3
  local sample_interval=2
  local dev_port=5173  # Default Vite port

  # Clean up any stale processes first
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
  echo "Starting $app_name app for CPU load measurement..."
  if [[ "$app_name" == "tauri" ]]; then
    (cd "$app_path" && bun run tauri dev &>/dev/null) &
    pid=$!
    dev_port=1420  # Tauri default port
  elif [[ "$app_name" == "electron" ]]; then
    (cd "$app_path" && bun run start &>/dev/null) &
    pid=$!
    dev_port=5173  # Vite default port
  fi

  # Wait for app to start - poll until process is detected
  local actual_pid=""
  local wait_count=0
  local max_wait=45
  
  while [ $wait_count -lt $max_wait ]; do
    if [[ "$OSTYPE" == "darwin"* ]]; then
      if [[ "$app_name" == "tauri" ]]; then
        actual_pid=$(pgrep -f "target/debug/app" | head -1)
      elif [[ "$app_name" == "electron" ]]; then
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
      sleep 2  # Let it stabilize
      break
    fi
    
    sleep 1
    wait_count=$((wait_count + 1))
  done

  if [ -z "$actual_pid" ]; then
    kill $pid 2>/dev/null
    pkill -f "target/debug/app" 2>/dev/null
    pkill -f "Electron Helper" 2>/dev/null
    pkill -f "node.*vite" 2>/dev/null
    echo "Error: App did not start"
    return 1
  fi

  # Start simulating load in background
  echo "Simulating load..."
  simulate_load $dev_port $((sample_count * sample_interval + 5)) &
  local load_pid=$!

  # Give load simulation time to start
  sleep 2

  # Collect CPU samples while app is under load
  echo "Measuring CPU usage under load (${sample_count} samples, ${sample_interval}s interval)..."
  for ((i=1; i<=sample_count; i++)); do
    local sample=$(get_cpu_usage "$actual_pid")
    # Default to 0 if empty
    if [ -z "$sample" ] || [ "$sample" = "" ]; then
      sample="0.0"
    fi
    cpu_samples+=("$sample")
    echo "  Sample $i: ${sample}%"
    sleep $sample_interval
  done

  # Stop load simulation
  kill $load_pid 2>/dev/null

  # Kill the app
  kill $pid 2>/dev/null
  pkill -f "target/debug/app" 2>/dev/null
  pkill -f "electron" 2>/dev/null
  pkill -f "Electron Helper" 2>/dev/null
  pkill -f "node.*vite" 2>/dev/null
  # removed broad pkill tauri

  # Calculate average CPU usage - samples will always exist now
  if [ ${#cpu_samples[@]} -eq 0 ]; then
    echo "0.00%"
    return 0
  fi

  for sample in "${cpu_samples[@]}"; do
    total_cpu=$(echo "$total_cpu + $sample" | bc 2>/dev/null || awk "BEGIN {print $total_cpu + $sample}")
  done
  
  # Use 2 decimal places for more precision
  avg_cpu=$(awk "BEGIN {printf \"%.2f\", $total_cpu / ${#cpu_samples[@]}}")

  echo "${avg_cpu}%"
}
