import { contextBridge, ipcRenderer } from 'electron';
import type { ActivitySnapshot } from '@hourly/shared';

export interface HourlyAPI {
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<boolean>;
  captureScreenshot: () => Promise<string | null>;
  getVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  readFileBase64: (filepath: string) => Promise<string>;
  onScreenshot: (cb: (path: string) => void) => () => void;
  onActivity: (cb: (data: ActivitySnapshot & { idleSeconds: number }) => void) => () => void;
  onIdle: (cb: (idleSeconds: number) => void) => () => void;
  onTrayStart: (cb: () => void) => () => void;
  onTrayStop: (cb: () => void) => () => void;
}

const api: HourlyAPI = {
  startTracking: () => ipcRenderer.invoke('tracker:start'),
  stopTracking: () => ipcRenderer.invoke('tracker:stop'),
  captureScreenshot: () => ipcRenderer.invoke('tracker:screenshot-now'),
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  readFileBase64: (filepath) => ipcRenderer.invoke('fs:read-file-base64', filepath),
  onScreenshot: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, path: string) => cb(path);
    ipcRenderer.on('tracker:screenshot', handler);
    return () => ipcRenderer.removeListener('tracker:screenshot', handler);
  },
  onActivity: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, data: ActivitySnapshot & { idleSeconds: number }) =>
      cb(data);
    ipcRenderer.on('tracker:activity', handler);
    return () => ipcRenderer.removeListener('tracker:activity', handler);
  },
  onIdle: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, idle: number) => cb(idle);
    ipcRenderer.on('tracker:idle', handler);
    return () => ipcRenderer.removeListener('tracker:idle', handler);
  },
  onTrayStart: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('tray:start', handler);
    return () => ipcRenderer.removeListener('tray:start', handler);
  },
  onTrayStop: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('tray:stop', handler);
    return () => ipcRenderer.removeListener('tray:stop', handler);
  },
};

contextBridge.exposeInMainWorld('hourly', api);

declare global {
  interface Window {
    hourly: HourlyAPI;
  }
}
