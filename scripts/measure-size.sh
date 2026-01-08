#!/bin/bash

# Helper function to get directory size in human-readable format (cross-platform)
get_dir_size() {
  local dir_path="$1"
  local size=""
  
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows - use PowerShell
    local size_bytes=$(powershell -Command "
      if (Test-Path '$dir_path') {
        (Get-ChildItem -Recurse '$dir_path' -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
      }
    " 2>/dev/null)
    
    if [ -n "$size_bytes" ] && [ "$size_bytes" != "" ]; then
      # Convert to human readable
      if [ "$size_bytes" -ge 1073741824 ]; then
        size=$(awk "BEGIN {printf \"%.1fG\", $size_bytes / 1073741824}")
      elif [ "$size_bytes" -ge 1048576 ]; then
        size=$(awk "BEGIN {printf \"%.1fM\", $size_bytes / 1048576}")
      else
        size=$(awk "BEGIN {printf \"%.1fK\", $size_bytes / 1024}")
      fi
    fi
  else
    # macOS/Linux - use du
    size=$(du -sh "$dir_path" 2>/dev/null | cut -f1)
  fi
  
  echo "$size"
}

measure_bundle_size() {
  local app_path="$1"
  local app_name="$2"
  
  local size
  
  # Build the app first
  echo "Building $app_name for bundle size measurement..."
  if ! (cd "$app_path" && bun run build &>/dev/null); then
    echo "Error: Build failed"
    return 1
  fi
  
  # Measure dist folder size
  if [ ! -d "$app_path/dist" ]; then
    echo "Error: dist folder not found"
    return 1
  fi
  
  size=$(get_dir_size "$app_path/dist")
  
  if [ -z "$size" ]; then
    echo "Error: Could not measure size"
    return 1
  fi
  
  echo "$size"
}

# Also provide a function to measure the full app size (including node_modules for Electron)
measure_app_size() {
  local app_path="$1"
  local app_name="$2"
  
  local size
  
  echo "Measuring total app size for $app_name..."
  
  if [[ "$app_name" == "tauri" ]]; then
    # For Tauri, measure the built binary size
    local binary_path
    if [[ "$OSTYPE" == "darwin"* ]]; then
      binary_path="$app_path/src-tauri/target/release/bundle/macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
      binary_path="$app_path/src-tauri/target/release"
    else
      binary_path="$app_path/src-tauri/target/release/bundle"
    fi
    
    if [ -d "$binary_path" ]; then
      size=$(get_dir_size "$binary_path")
    else
      # Fallback to dist folder
      size=$(get_dir_size "$app_path/dist")
    fi
  elif [[ "$app_name" == "electron" ]]; then
    # For Electron, the packaged app includes node_modules
    # Check for electron-builder output
    local build_path="$app_path/dist-electron"
    if [ -d "$build_path" ]; then
      size=$(get_dir_size "$build_path")
    else
      # Fallback to dist folder
      size=$(get_dir_size "$app_path/dist")
    fi
  fi
  
  if [ -z "$size" ]; then
    echo "Error: Could not measure size"
    return 1
  fi
  
  echo "$size"
}
