const { app, BrowserWindow, globalShortcut } = require('electron')
const file = require('./js/file.js')
const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        frame: false,
        icon: 'static/au-icon.png'
    })

    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname,'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    // Open the DevTools when Alt is pressed
    globalShortcut.register('Alt+X',() => {
        win.webContents.openDevTools()
    })

    // Emitted when the window is closed.
    win.on('closed',() => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready',createWindow)

// Quit when all windows are closed.
app.on('window-all-closed',() => {
    // It quits when all windows are closed, regardless of platform.
    app.quit()
})

app.on('activate',() => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow()
    }
})
