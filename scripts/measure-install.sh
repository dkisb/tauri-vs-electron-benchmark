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

measure_install() {
  local app_path="$1"
  local app_name="$2"
  
  local install_time
  local start_time
  local end_time

  # Clean node_modules for a fresh install measurement
  echo "Cleaning node_modules for fresh install measurement..."
  rm -rf "$app_path/node_modules" 2>/dev/null
  
  # Also clean bun lockfile cache for accurate measurement
  rm -rf "$app_path/.bun" 2>/dev/null

  # Record start time
  start_time=$(get_time_ms)

  # Install dependencies
  echo "Installing dependencies with bun..."
  if ! (cd "$app_path" && bun install 2>/dev/null); then
    echo "Error: Install failed"
    return 1
  fi

  # Record end time
  end_time=$(get_time_ms)

  # Calculate install time in milliseconds
  install_time=$((end_time - start_time))
  
  if [ -z "$install_time" ] || [ "$install_time" -le 0 ]; then
    echo "Error: Invalid install time"
    return 1
  fi
  
  echo "${install_time}ms"
}
