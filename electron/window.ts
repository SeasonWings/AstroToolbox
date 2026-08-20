import { app, BrowserWindow, Menu, nativeImage } from 'electron';
import path from 'node:path';

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function getIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(app.getAppPath(), 'public', 'icon.ico');
}

function getAppIcon() {
  return nativeImage.createFromPath(getIconPath());
}

export function createWindow(): void {
  const icon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1240,
    minHeight: 820,
    show: false,
    frame: false,
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  Menu.setApplicationMenu(null);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

export function minimizeWindow(): void {
  mainWindow?.minimize();
}

export function toggleMaximizeWindow(): boolean {
  if (!mainWindow) {
    return false;
  }

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  }

  mainWindow.maximize();
  return true;
}

export function isWindowMaximized(): boolean {
  return mainWindow?.isMaximized() ?? false;
}

export function closeWindow(): void {
  mainWindow?.close();
}
