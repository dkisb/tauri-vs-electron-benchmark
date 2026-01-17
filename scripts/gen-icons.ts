#!/usr/bin/env bun

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { platform } from "os";

const ROOT = join(import.meta.dir, "..");
const ICONS_DIR = join(ROOT, "tauri-app", "src-tauri", "icons");

// Ensure icons directory exists
mkdirSync(ICONS_DIR, { recursive: true });

// Check if icons already exist
const requiredIcons = ["32x32.png", "128x128.png", "128x128@2x.png", "icon.icns", "icon.ico"];
const allExist = requiredIcons.every(f => existsSync(join(ICONS_DIR, f)));

if (allExist) {
  console.log("✅ Icons already exist, skipping generation");
  process.exit(0);
}

console.log("🎨 Generating icons...");

// Try to use Tauri CLI first
const tauriIconResult = spawnSync("bunx", ["tauri", "icon", "--help"], { 
  encoding: "utf-8",
  cwd: join(ROOT, "tauri-app"),
  shell: true
});

const hasTauriCli = tauriIconResult.status === 0;

if (hasTauriCli) {
  // Create a simplee icon using a data URL converted to file
  const baseIconPath = join(ROOT, ".tmp-icon.png");
  
  // Create a simple 1024x1024 orange PNG
  // This is a minimal valid PNG with orange color
  const response = await fetch("https://placehold.co/1024x1024/f5af19/ffffff/png?text=T");
  if (response.ok) {
    const buffer = await response.arrayBuffer();
    writeFileSync(baseIconPath, Buffer.from(buffer));
    
    // Run tauri icon
    const result = spawnSync("bunx", ["tauri", "icon", baseIconPath], {
      encoding: "utf-8",
      cwd: join(ROOT, "tauri-app"),
      shell: true,
      stdio: "inherit"
    });
    
    // Clean up temp file
    try { require("fs").unlinkSync(baseIconPath); } catch {}
    
    if (result.status === 0) {
      console.log("✅ Icons generated with Tauri CLI");
      process.exit(0);
    }
  }
}

// Fallback: Create minimal placeholder icons
console.log("⚠️  Using fallback icon generation...");

// Minimal valid 32x32 orange PNG
const PNG_32 = Buffer.from(
  "iVBORw0KGgoAAAANAAACAAAAAgCAYAAABzenr0AAAAMklEQVR4Ae3OMQEAAAjAIO1f2hRegwZsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+BgdTAAFbfZR7AAAAAElFTkSuQmCC",
  "base64"
);

// Write PNG files
writeFileSync(join(ICONS_DIR, "32x32.png"), PNG_32);
writeFileSync(join(ICONS_DIR, "128x128.png"), PNG_32);
writeFileSync(join(ICONS_DIR, "128x128@2x.png"), PNG_32);

// For macOS, we need a proper .icns file
// For Windows, we need a proper .ico file
// Create minimal versions that should work

if (platform() === "darwin") {
  // On macOS, try to use iconutil to create .icns
  const iconsetDir = join(ICONS_DIR, "icon.iconset");
  mkdirSync(iconsetDir, { recursive: true });
  
  // Create required sizes for iconset
  const sizes = [16, 32, 64, 128, 256, 512];
  for (const size of sizes) {
    writeFileSync(join(iconsetDir, `icon_${size}x${size}.png`), PNG_32);
    writeFileSync(join(iconsetDir, `icon_${size}x${size}@2x.png`), PNG_32);
  }
  
  // Try to create .icns using iconutil
  const iconutilResult = spawnSync("iconutil", ["-c", "icns", iconsetDir, "-o", join(ICONS_DIR, "icon.icns")], {
    encoding: "utf-8"
  });
  
  // Clean up iconset directory
  try {
    const fs = require("fs");
    fs.rmSync(iconsetDir, { recursive: true });
  } catch {}
  
  if (iconutilResult.status !== 0) {
    // Fallback: copy PNG as icns (may cause warnings but often works)
    writeFileSync(join(ICONS_DIR, "icon.icns"), PNG_32);
  }
} else {
  writeFileSync(join(ICONS_DIR, "icon.icns"), PNG_32);
}

// Create .ico file (minimal valid ICO)
const ICO_HEADER = Buffer.from([
  0x00, 0x00, // Reserved
  0x01, 0x00, // Type: ICO
  0x01, 0x00, // Number of images: 1
]);

const ICO_ENTRY = Buffer.from([
  0x20, // Width: 32
  0x20, // Height: 32
  0x00, // Color palette: 0
  0x00, // Reserved
  0x01, 0x00, // Color planes: 1
  0x20, 0x00, // Bits per pixel: 32
  ...new Uint8Array(new Uint32Array([PNG_32.length]).buffer), // Size of image data
  0x16, 0x00, 0x00, 0x00, // Offset to image data (22 bytes = header + entry)
]);

const icoBuffer = Buffer.concat([ICO_HEADER, ICO_ENTRY, PNG_32]);
writeFileSync(join(ICONS_DIR, "icon.ico"), icoBuffer);

console.log("✅ Fallback icons created in", ICONS_DIR);
