import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  powerMonitor,
  desktopCapturer,
  screen,
  shell,
} from 'electron';
import { join } from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const IDLE_THRESHOLD_SECONDS = 300; // 5 min auto-pause
const SCREENSHOT_INTERVAL_MS = 10 * 60 * 1000; // 10 min
const ACTIVITY_INTERVAL_MS = 60 * 1000; // 1 min activity snapshots
const MAX_EVENTS_PER_MINUTE = 120; // baseline for 100% activity

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let screenshotTimer: ReturnType<typeof setInterval> | null = null;
let activityTimer: ReturnType<typeof setInterval> | null = null;
let idleCheckTimer: ReturnType<typeof setInterval> | null = null;

let keysCount = 0;
let clicksCount = 0;
let trackingActive = false;
let uiohook: typeof import('uiohook-napi') | null = null;

function createTrayIcon(): Electron.NativeImage {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const offset = i * 4;
    canvas[offset] = 14; // R
    canvas[offset + 1] = 165; // G
    canvas[offset + 2] = 233; // B
    canvas[offset + 3] = i < size * 4 ? 255 : 200; // simple gradient bar
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 680,
    minWidth: 380,
    minHeight: 600,
    show: false,
    title: 'Hourly',
    backgroundColor: '#f4fce7',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.on('close', (e) => {
    if (process.platform !== 'darwin') {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray(): void {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Hourly — Time Tracker');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Hourly',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'Start Timer',
      click: () => mainWindow?.webContents.send('tray:start'),
    },
    {
      label: 'Stop Timer',
      click: () => mainWindow?.webContents.send('tray:stop'),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        stopTracking();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

async function initActivityHook(): Promise<void> {
  try {
    // Optional native module — installed separately for full activity counting
    uiohook = await import(/* @vite-ignore */ 'uiohook-napi');
    uiohook.uIOhook.on('keydown', () => {
      if (trackingActive) keysCount++;
    });
    uiohook.uIOhook.on('mousedown', () => {
      if (trackingActive) clicksCount++;
    });
    uiohook.uIOhook.start();
  } catch {
    console.warn('uiohook-napi unavailable — activity counts will be estimated from idle time');
  }
}

function calcActivityPercent(keys: number, clicks: number): number {
  const total = keys + clicks;
  const percent = Math.min(100, Math.round((total / MAX_EVENTS_PER_MINUTE) * 100));
  return percent;
}

async function captureScreenshot(): Promise<string | null> {
  try {
    const displays = screen.getAllDisplays();
    const primary = displays[0];
    const { width, height } = primary.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) },
    });

    const source = sources[0];
    if (!source?.thumbnail) return null;

    const jpeg = source.thumbnail.toJPEG(70);
    const dir = join(app.getPath('userData'), 'screenshots');
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });

    const filename = `screenshot-${Date.now()}.jpg`;
    const filepath = join(dir, filename);
    await writeFile(filepath, jpeg);
    return filepath;
  } catch (err) {
    console.error('Screenshot failed:', err);
    return null;
  }
}

function startTracking(): void {
  if (trackingActive) return;
  trackingActive = true;
  keysCount = 0;
  clicksCount = 0;

  screenshotTimer = setInterval(async () => {
    const path = await captureScreenshot();
    if (path) mainWindow?.webContents.send('tracker:screenshot', path);
  }, SCREENSHOT_INTERVAL_MS);

  activityTimer = setInterval(() => {
    const idleSeconds = powerMonitor.getSystemIdleTime();
    let percent = calcActivityPercent(keysCount, clicksCount);

    if (!uiohook && idleSeconds < 5) {
      percent = Math.max(percent, 80);
    } else if (idleSeconds > 30) {
      percent = Math.min(percent, 10);
    }

    mainWindow?.webContents.send('tracker:activity', {
      keysCount,
      clicksCount,
      activityPercent: percent,
      idleSeconds,
    });

    keysCount = 0;
    clicksCount = 0;
  }, ACTIVITY_INTERVAL_MS);

  idleCheckTimer = setInterval(() => {
    const idle = powerMonitor.getSystemIdleTime();
    if (idle >= IDLE_THRESHOLD_SECONDS) {
      mainWindow?.webContents.send('tracker:idle', idle);
    }
  }, 30_000);
}

function stopTracking(): void {
  trackingActive = false;
  if (screenshotTimer) clearInterval(screenshotTimer);
  if (activityTimer) clearInterval(activityTimer);
  if (idleCheckTimer) clearInterval(idleCheckTimer);
  screenshotTimer = null;
  activityTimer = null;
  idleCheckTimer = null;
}

function setupIpc(): void {
  ipcMain.handle('tracker:start', () => {
    startTracking();
    return true;
  });

  ipcMain.handle('tracker:stop', () => {
    stopTracking();
    return true;
  });

  ipcMain.handle('tracker:screenshot-now', async () => {
    return captureScreenshot();
  });

  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('shell:open-external', (_e, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle('fs:read-file-base64', async (_e, filepath: string) => {
    const buffer = await readFile(filepath);
    return buffer.toString('base64');
  });
}

app.whenReady().then(async () => {
  createWindow();
  createTray();
  setupIpc();
  await initActivityHook();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopTracking();
  try {
    uiohook?.uIOhook.stop();
  } catch {
    /* ignore */
  }
});
