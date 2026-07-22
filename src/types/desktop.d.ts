interface DesktopBridge {
  getAppVersion(): Promise<string>;
  openExternal(url: string): Promise<boolean>;
}

interface Window {
  readonly desktop?: DesktopBridge;
}
