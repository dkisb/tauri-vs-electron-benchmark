#!/bin/bash

# Helper function to get current time in milliseconds (cross-platform)
get_time_ms() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - use perl for millisecond precision
    perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000'
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows - use PowerShell
    powershell -Command "[math]::Round((Get-Date).ToFileTimeUtc() / 10000 - 11644473600000)"
  else
    # Linux - date supports %N for nanoseconds
    date +%s%3N
  fi
}

# Wait for dev server to be ready
wait_for_server() {
  local port="$1"
  local max_wait=60
  local waited=0
  
  while [ $waited -lt $max_wait ]; do
    if curl -s "http://localhost:$port" &>/dev/null; then
      return 0
    fi
    sleep 0.5
    waited=$((waited + 1))
  done
  
  return 1
}

measure_latency() {
  local app_path="$1"
  local app_name="$2"
  
  local latency
  local start_time
  local end_time
  local pid
  local dev_port=5173  # Default Vite port

  # Build the app first
  if ! (cd "$app_path" && bun run build &>/dev/null); then
    echo "Error: Build failed"
    return 1
  fi
  
  # Record start time
  start_time=$(get_time_ms)
  
  # Start the app and get its PID
  echo "Starting $app_name app for latency measurement..."
  if [[ "$app_name" == "tauri" ]]; then
    (cd "$app_path" && bun run tauri dev 2>/dev/null) &
    pid=$!
    dev_port=1420  # Tauri default port
  elif [[ "$app_name" == "electron" ]]; then
    (cd "$app_path" && bun run dev 2>/dev/null) &
    pid=$!
    dev_port=5173  # Vite default port
  fi
  
  # Wait for the app window to appear (poll for process to be ready)
  local max_wait=60
  local waited=0
  local app_ready=false
  
  while [ $waited -lt $max_wait ]; do
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS - check if app has a window
      if [[ "$app_name" == "tauri" ]]; then
        if pgrep -f "tauri-bench-app" &>/dev/null; then
          app_ready=true
          break
        fi
      elif [[ "$app_name" == "electron" ]]; then
        if pgrep -f "Electron" &>/dev/null; then
          app_ready=true
          break
        fi
      fi
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
      # Windows - check if process exists
      if powershell -Command "Get-Process -Id $pid -ErrorAction SilentlyContinue" &>/dev/null; then
        app_ready=true
        break
      fi
    else
      # Linux - check if process exists and has GUI
      if [[ "$app_name" == "tauri" ]]; then
        if pgrep -f "tauri-bench-app" &>/dev/null; then
          app_ready=true
          break
        fi
      elif [[ "$app_name" == "electron" ]]; then
        if pgrep -f "electron" &>/dev/null; then
          app_ready=true
          break
        fi
      fi
    fi
    sleep 0.1
    waited=$((waited + 1))
  done
  
  # Record end time
  end_time=$(get_time_ms)
  
  # Calculate latency in milliseconds
  latency=$((end_time - start_time))
  
  # Kill the app
  kill $pid 2>/dev/null
  pkill -f "tauri-bench-app" 2>/dev/null
  pkill -f "electron" 2>/dev/null
  pkill -f "Electron" 2>/dev/null
  
  if [ "$app_ready" = false ]; then
    echo "Error: App did not start within timeout"
    return 1
  fi
  
  if [ -z "$latency" ] || [ "$latency" -le 0 ]; then
    echo "Error: Invalid latency measurement"
    return 1
  fi
  
  echo "${latency}ms"
}
