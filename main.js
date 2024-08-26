// main.js
const { app, BrowserWindow } = require("electron");
const path = require("path");
const db = require("./db"); // Load the SQLite database
const { ipcMain } = require("electron");
const { dialog } = require("electron");

// Enable auto-reloading
require("electron-reload")(path.join(__dirname, "src/build"), {
  electron: require(`${__dirname}/node_modules/electron`),
});

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // In development, load React from localhost. In production, load the build files.
  // const startUrl =
  //   "http://localhost:3000" ||
  //   process.env.ELECTRON_START_URL ||
  //   `file://${path.join(__dirname, "src/build/index.html")}`;

  const startUrl = "src/build/index.html";
  win.loadURL(startUrl);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.handle("save-dialog", async (event, defaultPath) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath,
      filters: [{ name: "CSV Files", extensions: ["csv"] }],
    });
    return filePath;
  });

  ipcMain.handle("show-save-dialog", async () => {
    const { filePath } = await dialog.showSaveDialog({
      title: "Save CSV File",
      defaultPath: path.join(app.getPath("documents"), "exported-data.csv"),
      filters: [{ name: "CSV Files", extensions: ["csv"] }],
    });
    return filePath; // Return the selected file path or undefined if canceled
  });

  ipcMain.handle("show-save-dialog-pdf", async () => {
    const { filePath } = await dialog.showSaveDialog({
      title: "Save CSV File",
      defaultPath: path.join(app.getPath("documents"), "exported-data.pdf"),
      filters: [{ name: "CSV Files", extensions: ["pdf"] }],
    });
    return filePath; // Return the selected file path or undefined if canceled
  });

  // listening for database changes

  // CREATE
  ipcMain.handle("create-item", async (event, item) => {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO items (name, description) VALUES (?, ?)",
        [item.name, item.description],
        function (err) {
          if (err) {
            reject(err.message);
          } else {
            resolve({ id: this.lastID, ...item });
          }
        }
      );
    });
  });

  // READ
  ipcMain.handle("read-items", async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM items", [], (err, rows) => {
        if (err) {
          reject(err.message);
        } else {
          resolve(rows);
        }
      });
    });
  });

  // UPDATE
  ipcMain.handle("update-item", async (event, item) => {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE items SET name = ?, description = ? WHERE id = ?",
        [item.name, item.description, item.id],
        function (err) {
          if (err) {
            reject(err.message);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  });

  // DELETE
  ipcMain.handle("delete-item", async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM items WHERE id = ?", [id], function (err) {
        if (err) {
          reject(err.message);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// const { app, BrowserWindow } = require("electron");
// const path = require("path");

// function createWindow() {
//   const isDev = require("electron-is-dev");
//   // win.loadURL(

//   // );

//   const win = new BrowserWindow({
//     width: 800,
//     height: 600,
//     webPreferences: {
//       preload: path.join(__dirname, "preload.js"),
//       nodeIntegration: true,
//       contextIsolation: false,
//     },
//   });

//   win.loadURL(
//     isDev
//       ? "http://localhost:3000"
//       : `file://${path.join(__dirname, "../build/index.html")}`
//   );
// }

// app.whenReady().then(() => {
//   createWindow();

//   app.on("activate", () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow();
//     }
//   });
// });

// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });
