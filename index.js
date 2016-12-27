const defaultMenu = require('electron-default-menu')
const electron = require('electron')
const menubar = require('menubar')
const path = require('path')

var m = menubar({
    'index': 'file://' + path.join(__dirname, '/app/index.html'),
    'icon': path.join(__dirname, 'IconTemplate.png'),
    'width': 130,
    'height': 100,
    'frame': false,
    'resizable': false
})

m.on('ready', () => {

})

m.on('after-create-window', () => {
    m.window.setVibrancy('ultra-dark')
    // m.window.toggleDevTools()
    electron.ipcMain.on('load', (w, a) => {
        // This doesn't work.
        m.window.setVibrancy('ultra-dark')
    })
    electron.ipcMain.on('window-height', (w, a) => {
        // This isn't really good because we should be doing stuff differently
        m.window.setContentSize(130, a, true)
        m.window.setContentSize(130, a, true)
    })
})
