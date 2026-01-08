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

measure_startup() {
  local app_path="$1"
  local app_name="$2"

  local startup_time
  local start_time
  local end_time
  local pid

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

  # Record start time
  start_time=$(get_time_ms)

  # Start the app and get its PID
  echo "Starting $app_name app for startup measurement..."
  if [[ "$app_name" == "tauri" ]]; then
    (cd "$app_path" && bun run tauri dev 2>/dev/null) &
    pid=$!
  elif [[ "$app_name" == "electron" ]]; then
    (cd "$app_path" && bun run start 2>/dev/null) &
    pid=$!
  fi

  # Wait for the app window to appear (poll for process to be ready)
  local max_wait=300  # 30 seconds (300 * 0.1s)
  local waited=0
  local app_ready=false
  
  while [ $waited -lt $max_wait ]; do
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS - check if app has a window
      if [[ "$app_name" == "tauri" ]]; then
        # Tauri dev mode runs as target/debug/app
        if pgrep -f "target/debug/app" &>/dev/null; then
          app_ready=true
          break
        fi
      elif [[ "$app_name" == "electron" ]]; then
        # Check for Electron Helper (indicates app is fully loaded)
        if pgrep -f "Electron Helper" &>/dev/null; then
          app_ready=true
          break
        fi
        # Fallback to main Electron process
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
      # Linux - check if process exists
      if [[ "$app_name" == "tauri" ]]; then
        if pgrep -f "target/debug/app" &>/dev/null; then
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

  # Calculate startup time in milliseconds
  startup_time=$((end_time - start_time))

  # Kill the app
  kill $pid 2>/dev/null
  pkill -f "target/debug/app" 2>/dev/null
  pkill -f "electron" 2>/dev/null
  pkill -f "Electron Helper" 2>/dev/null
  pkill -f "node.*vite" 2>/dev/null
  # removed broad pkill tauri

  if [ "$app_ready" = false ]; then
    echo "Error: App did not start within timeout"
    return 1
  fi

  if [ -z "$startup_time" ] || [ "$startup_time" -le 0 ]; then
    echo "Error: Invalid startup time"
    return 1
  fi

  echo "${startup_time}ms"
}
