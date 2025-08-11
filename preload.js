const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder for any electron-specific APIs
  platform: process.platform,
  versions: process.versions
});