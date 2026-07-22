import { contextBridge, ipcRenderer } from 'electron';
import { DESKTOP_CHANNEL } from '../shared/channels';

const desktopBridge = Object.freeze({
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(DESKTOP_CHANNEL.getAppVersion),
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke(DESKTOP_CHANNEL.openExternal, url),
});

contextBridge.exposeInMainWorld('desktop', desktopBridge);
