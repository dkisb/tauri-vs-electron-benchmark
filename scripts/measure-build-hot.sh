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

measure_build_hot() {
  local app_path="$1"
  local app_name="$2"
  
  local start_time
  local end_time
  local build_hot

  # First, ensure we have a previous build (warm cache)
  echo "Ensuring warm build cache exists..."
  if ! (cd "$app_path" && bun run build &>/dev/null); then
    echo "Error: Initial build failed"
    return 1
  fi

  # Touch a source file to trigger incremental rebuild
  # This simulates a small code change
  if [[ "$app_name" == "tauri" ]]; then
    touch "$app_path/src/main.tsx" 2>/dev/null || touch "$app_path/src/App.tsx" 2>/dev/null
  elif [[ "$app_name" == "electron" ]]; then
    touch "$app_path/src/main.tsx" 2>/dev/null || touch "$app_path/src/App.tsx" 2>/dev/null
  else
    touch "$app_path/src/main.tsx" 2>/dev/null || touch "$app_path/src/App.tsx" 2>/dev/null
  fi

  # Record start time
  start_time=$(get_time_ms)

  # Run the build (this should be faster due to caching)
  if ! (cd "$app_path" && bun run build 2>/dev/null); then
    echo "Error: Hot build failed"
    return 1
  fi

  # Record end time
  end_time=$(get_time_ms)

  # Calculate build time in milliseconds
  build_hot=$((end_time - start_time))

  if [ -z "$build_hot" ] || [ "$build_hot" -le 0 ]; then
    echo "Error: Invalid build time"
    return 1
  fi

  echo "${build_hot}ms"
}
