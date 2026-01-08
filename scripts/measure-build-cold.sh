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

measure_build_cold() {
  local app_path="$1"
  local app_name="$2"
  
  local start_time
  local end_time
  local build_cold

  # Clean build artifacts for a true cold build
  echo "Cleaning build artifacts for cold build..."
  rm -rf "$app_path/dist" 2>/dev/null
  rm -rf "$app_path/.vite" 2>/dev/null
  rm -rf "$app_path/node_modules/.vite" 2>/dev/null
  
  # For Tauri, also clean Rust build cache
  if [[ "$app_name" == "tauri" ]]; then
    rm -rf "$app_path/src-tauri/target" 2>/dev/null
  fi

  # Record start time
  start_time=$(get_time_ms)

  # Run the build
  if [[ "$app_name" == "tauri" ]]; then
    if ! (cd "$app_path" && bun run build 2>/dev/null); then
      echo "Error: Build failed"
      return 1
    fi
  elif [[ "$app_name" == "electron" ]]; then
    if ! (cd "$app_path" && bun run build 2>/dev/null); then
      echo "Error: Build failed"
      return 1
    fi
  else
    if ! (cd "$app_path" && bun run build 2>/dev/null); then
      echo "Error: Build failed"
      return 1
    fi
  fi

  # Record end time
  end_time=$(get_time_ms)

  # Calculate build time in milliseconds
  build_cold=$((end_time - start_time))

  if [ -z "$build_cold" ] || [ "$build_cold" -le 0 ]; then
    echo "Error: Invalid build time"
    return 1
  fi

  echo "${build_cold}ms"
}
