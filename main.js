const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");
const aws4 = require("aws4");
const log = require("electron-log");
const { autoUpdater } = require("electron-updater");

let mainWindow;

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

console.log("Region", process.env.REGION);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  mainWindow.loadFile("index.html");
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.on("ready", () => {
  var updater = new AppUpdater();
  createWindow();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on("app_version", (event) => {
  console.log(app.getVersion());
  event.sender.send("app_version", { version: app.getVersion() });
});

class AppUpdater {
  constructor() {
    log.transports.file.level = "info";
    autoUpdater.logger = log;

    autoUpdater.autoDownload = false;

    // To check for updates
    // To get the latest.yml file we are authenticating the request with getOptions func
    autoUpdater.logger.info("Auto update initiated...");
    autoUpdater.on("checking-for-update", () => {
      autoUpdater.logger?.info("checking for updates...");
      autoUpdater.requestHeaders = getOptions("latest.yml").headers;
    });

    // To get the latest exe file we are authenticating the request with getOptions func
    // options.path contains name of latest exe
    autoUpdater.on("update-available", (options) => {
      autoUpdater.logger?.info("update available event is triggered");
      autoUpdater.requestHeaders = getOptions(options.path).headers;
    });

    autoUpdater.on("update-downloaded", async (event, arg) => {
      autoUpdater.logger?.info("update download triggered");
    });

    // Set the feed URL of our s3 bucket
    autoUpdater.setFeedURL(`${process.env.AWS_FEED_URL}`);

    // Checks for updates and notifies the user
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      autoUpdater.logger = err;
    });
  }
}

const getOptions = (path) => {
  const options = {
    service: process.env.AWS_SERVICE,
    region: process.env.REGION,
    method: "GET",
    // define your host variable elsewhere
    host:
      process.env.AWS_S3_BUCKET +
      ".s3." +
      process.env.REGION +
      ".amazonaws.com",
    // define your latest.yml path elsewhere
    path,
  };
  // autoUpdater.logger?.info('options--', options);

  aws4.sign(options, {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
  // autoUpdater.logger?.info('options2--', options);
  return options;
};
