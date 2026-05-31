import { app, BrowserWindow, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 768,
    title: "RBMK Designer",
    backgroundColor: "#0c0f12",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Bypass CORS for file:// protocol asset loading
    },
  });

  // Load the compiled Vite bundle
  win.loadFile(path.join(__dirname, "dist", "index.html"));

  // Remove menu bar for a premium standalone window look
  win.setMenu(null);
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
