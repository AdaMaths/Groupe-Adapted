const { app, BrowserWindow } = require("electron");
const path = require("node:path");
function createWindow() {
  const window = new BrowserWindow({
    width: 1440, height: 1000, minWidth: 900, minHeight: 700,
    backgroundColor: "#0d1727",
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  window.loadFile(path.join(__dirname, "..", "index.html"));
}
app.whenReady().then(() => { createWindow(); app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });