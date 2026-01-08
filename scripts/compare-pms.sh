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

# Helper function to measure build time with a specific package manager
measure_build_time() {
  local app_path="$1"
  local pm="$2"
  
  local start_time
  local end_time
  local build_time
  
  # Clean node_modules and lock files for fair comparison
  rm -rf "$app_path/node_modules" 2>/dev/null
  
  # Install dependencies with the specified package manager
  start_time=$(get_time_ms)
  
  case "$pm" in
    "bun")
      (cd "$app_path" && bun install &>/dev/null)
      ;;
    "pnpm")
      (cd "$app_path" && pnpm install &>/dev/null)
      ;;
    "npm")
      (cd "$app_path" && npm install &>/dev/null)
      ;;
    "yarn")
      (cd "$app_path" && yarn install &>/dev/null)
      ;;
  esac
  
  if [ $? -ne 0 ]; then
    echo "Error: Failed to install with $pm"
    return 1
  fi
  
  end_time=$(get_time_ms)
  build_time=$((end_time - start_time))
  
  echo "${build_time}ms"
}

compare_pms() {
  local app_path="$1"
  local app_name="$2"
  local pm1="bun"
  local pm2="pnpm"
  local pm3="npm"
  local pm4="yarn"

  local build_time_pm1
  local build_time_pm2
  local build_time_pm3
  local build_time_pm4

  echo "Comparing package managers for $app_name..."
  echo "============================================"

  # Measure install time with each PM
  echo "Testing $pm1..."
  build_time_pm1=$(measure_build_time "$app_path" "$pm1")
  
  echo "Testing $pm2..."
  build_time_pm2=$(measure_build_time "$app_path" "$pm2")
  
  echo "Testing $pm3..."
  build_time_pm3=$(measure_build_time "$app_path" "$pm3")
  
  echo "Testing $pm4..."
  build_time_pm4=$(measure_build_time "$app_path" "$pm4")

  # Output results
  echo ""
  echo "Results:"
  echo "Install time with $pm1: $build_time_pm1"
  echo "Install time with $pm2: $build_time_pm2"
  echo "Install time with $pm3: $build_time_pm3"
  echo "Install time with $pm4: $build_time_pm4"
  
  # Restore with bun (default)
  (cd "$app_path" && bun install &>/dev/null)
}
