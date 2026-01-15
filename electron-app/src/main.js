const { app, BrowserWindow } = require('electron');
const path = require('path');

const LAUNCH_TIME = process.hrtime.bigint();
const isBenchMode = process.argv.includes('--bench');

app.disableHardwareAcceleration();

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    const now = process.hrtime.bigint();
    const startupMs = Number(now - LAUNCH_TIME) / 1_000_000;
    process.stderr.write("BENCH_STARTUP_MS:" + startupMs.toFixed(2) + "\n");
    
    mainWindow.show();
    
    if (isBenchMode) {
      setTimeout(() => app.quit(), 200);
    }
  });
});

app.on('window-all-closed', () => app.quit());
