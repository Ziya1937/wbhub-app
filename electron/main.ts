import { app, BrowserWindow, ipcMain } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

app.setName("WB Hub");

let mainWindow: BrowserWindow | null = null;
let updateReady = false;

function createWindow() {
  const win = new BrowserWindow({
    title: "WB Hub",
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: "#f7f6f9",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = win;

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.on("update-downloaded", () => {
      updateReady = true;
      mainWindow?.webContents.send("wbhub:update-downloaded");
    });
    autoUpdater.checkForUpdates().catch(() => {
      // Нет сети или фид недоступен — тихо игнорируем, приложение продолжает работать.
    });
  }
});

ipcMain.handle("wbhub:is-update-ready", () => updateReady);

ipcMain.on("wbhub:install-update", () => {
  autoUpdater.quitAndInstall();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
