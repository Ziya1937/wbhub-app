const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wbhub", {
  onUpdateDownloaded: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("wbhub:update-downloaded", listener);
    return () => ipcRenderer.removeListener("wbhub:update-downloaded", listener);
  },
  installUpdate: () => ipcRenderer.send("wbhub:install-update"),
});
