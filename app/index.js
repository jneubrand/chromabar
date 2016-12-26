const main = document.querySelector('main')
const request = require('request')
const ui = require('./boring_ui')
const electron = require('electron')

const ignoredNames = ["Go to sleep start", "Go to sleep end", "Wake Up init", "Wake Up end", "Off", "Last on state", "Bright"]

function buildList(ip, username) {
    let baseurl = 'http://' + ip + '/api/' + username
    request.get(baseurl + '/scenes', (e, r, b) => {
        if (e) {
            let errortext = document.createElement('pre')
            errortext.innerText = e
            document.body.appendChild(errortext)
            document.body.appendChild(ui.resetButton())
        }
        var json = JSON.parse(b)
        console.log(json)
        if ('0' in json && 'error' in json[0]) {
            let errortext = document.createElement('pre')
            errortext.innerText = json[0].error.description
            document.body.appendChild(errortext)
            document.body.appendChild(ui.resetButton())
        }
        let offState = null, lastOnState = null
        let addedNames = []
        let parsedScenes = []
        for (let id in json) {
            let item = json[id]
            item.id = id
            if (item.name == 'Off')
                offState = item
            if (item.name == 'Last on state')
                lastOnState = item
            if (ignoredNames.indexOf(item.name) >= 0 ||
                  addedNames.indexOf(item.name) >= 0)
                continue
            addedNames.push(item.name)
            parsedScenes.push(item)
        }
        electron.ipcRenderer.send('window-height', (1 + addedNames.length) * 50)
        let toprow = document.createElement('section')
        if (offState)
            toprow.appendChild(ui.sceneButton(['off'], offState.id,
                lastOnState.id, offState.id, 'Off', offState, baseurl))
        if (lastOnState)
            toprow.appendChild(ui.sceneButton(['on'], lastOnState.id,
                lastOnState.id, offState.id, 'On', lastOnState, baseurl))
        main.appendChild(toprow)
        for (let scene of parsedScenes) {
            main.appendChild(ui.sceneButton([], scene.id,
                lastOnState.id, offState.id, scene.name, scene, baseurl))
        }
    })
}

ui.getBridgeIp(ip => {
    ui.getUsername(username => {
        console.warn('Starting with username', username)
        console.warn('Starting with ip', ip)
        buildList(ip, username)
    })
})

electron.ipcRenderer.send('load', true)

window.addEventListener('keypress', e => console.log(e))
