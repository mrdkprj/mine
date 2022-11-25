const {app, BrowserWindow, ipcMain, Menu, clipboard, dialog, shell, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const proc = require("child_process");

let mainWindow;
let currentDirectory;

const defaultConfig = {
    bounds: {width:1200, height:800, isMaximized: false, x:0, y:0},
}

let config = defaultConfig;

const locked = app.requestSingleInstanceLock(process.argv);

if(!locked) {
    app.quit()
    return;
}

app.on("ready", async () => {

    directLaunch = process.argv.length > 1 && process.argv[1] != "./src/main.js";

    currentDirectory = path.join(app.getPath("userData"), "temp");

    init();

    mainWindow = new BrowserWindow({
        width: config.bounds.width,
        height: config.bounds.height,
        x:config.bounds.x,
        y:config.bounds.y,
        autoHideMenuBar: true,
        show: false,
        icon: "./resources/icon.ico",
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, "preload.js")
        },
    });

    mainWindow.on("ready-to-show", () => {

        if(config.bounds.isMaximized){
            mainWindow.maximize();
        }

        mainWindow.show();

        mainWindow.webContents.send("config", {config})

    })

    mainWindow.on("closed", function() {
        mainWindow = null;
    });

    mainWindow.loadURL("file://" + __dirname + "/index.html");

});

function init(){

    exists(currentDirectory, true);

    const configFilePath = path.join(currentDirectory,"minesweeper.config.json");

    const fileExists = exists(configFilePath, false);

    if(fileExists){
        const rawData = fs.readFileSync(configFilePath, {encoding:"utf8"});
        config = JSON.parse(rawData);
        Object.keys(defaultConfig).forEach(key => {
            if(!config.hasOwnProperty(key)){
                config[key] = defaultConfig[key];
            }
        })
    }else{
        config = defaultConfig;
        writeConfig()
    }
}

function exists(target, createIfNotFound = false){

    try{
        fs.statSync(target);

        return true;

    }catch(ex){

        if(createIfNotFound){
            fs.mkdirSync(target);
        }

        return false;
    }
}

function writeConfig(){
    try{
        fs.writeFileSync(path.join(currentDirectory,"minesweeper.config.json"), JSON.stringify(config));
    }catch(ex){
        sendError(ex);
    }
}

function toggleMaximize(){

    if(mainWindow.isMaximized()){
        mainWindow.unmaximize();
        config.bounds.isMaximized = false;
    }else{
        mainWindow.maximize();
        config.bounds.isMaximized = true;
    }

    mainWindow.webContents.send("afterToggleMaximize", {isMaximized: config.bounds.isMaximized});
}

function save(){

    config.bounds.isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();
    config.bounds.width = bounds.width;
    config.bounds.height = bounds.height;
    config.bounds.x = bounds.x;
    config.bounds.y = bounds.y;

    try{
        writeConfig();
    }catch(ex){
        return sendError(ex);
    }
}

async function closeWindow(){
    save();
    mainWindow.close();
}

function sendError(ex){
    mainWindow.webContents.send("error", {message:ex.message})
}

ipcMain.on("minimize", () => mainWindow.minimize())

ipcMain.on("toggle-maximize", () => toggleMaximize())

ipcMain.on("close", (e, data) => closeWindow(data))
