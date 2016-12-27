const kelvin = require('kelvin-to-rgb')
const electron = require('electron')
const request = require('request')

function requestUsername(cb) {
    electron.ipcRenderer.send('window-height', 100)
    let modal = document.createElement('div')
    modal.classList.add('modal')
    modal.appendChild(document.createTextNode('Username:'))
    let text = document.createElement('input')
    text.type = 'text'
    modal.appendChild(text)
    text.addEventListener('keypress', e => {
        if (e.keyCode == 13) {
            cb(text.value)
            document.body.removeChild(modal)
        }
    })
    let button = document.createElement('button')
    button.innerText = 'Use Clipboard'
    modal.appendChild(button)
    button.addEventListener('click', e => {
        let val = electron.clipboard.readText()
        cb(val)
        document.body.removeChild(modal)
    })
    document.body.appendChild(modal)
}

function getUsername(cb) {
    if (typeof localStorage['username'] == 'string') {
        cb(localStorage['username'])
    } else {
        requestUsername(a => {
            localStorage.setItem('username', a)
            cb(a)
        })
    }
}

function requestBridgeIp(cb) {
    electron.ipcRenderer.send('window-height', 100)
    let modal = document.createElement('div')
    modal.classList.add('modal')
    modal.appendChild(document.createTextNode('BridgeIp:'))
    let text = document.createElement('input')
    text.type = 'text'
    modal.appendChild(text)
    text.addEventListener('keypress', e => {
        if (e.keyCode == 13) {
            let val = text.value
            val = val.replace('http://', '')
            val = val.replace('https://', '')
            val = val.replace(/\//g, '')
            cb(val)
            document.body.removeChild(modal)
        }
    })
    let button = document.createElement('button')
    button.innerText = 'Use Clipboard'
    modal.appendChild(button)
    button.addEventListener('click', e => {
        let val = electron.clipboard.readText()
        val = val.replace('http://', '')
        val = val.replace('https://', '')
        val = val.replace(/\//g, '')
        cb(val)
        document.body.removeChild(modal)
    })
    document.body.appendChild(modal)
}

function getBridgeIp(cb) {
    if (typeof localStorage['bridge_ip'] == 'string') {
        cb(localStorage['bridge_ip'])
    } else {
        requestBridgeIp(a => {
            localStorage.setItem('bridge_ip', a)
            cb(a)
        })
    }
}

function resetButton() {
    let button = document.createElement('button')
    button.addEventListener('click', () => {
        delete localStorage['bridge_ip']
        delete localStorage['username']
        location.reload()
    })
    button.innerText = "Reset Everything"
    return button
}

let buttons = []

function updateButtons(id, on, off) {
    for (let button of buttons) {
        let bid = button.getAttribute('data-id')
        button.classList.toggle('selected', (bid == on && id != off) || bid == id)
    }
}

function lightstate2rgb(a) {
    let d = [1, 1, 1]
    if ('ct' in a) {
        let k = 1/(a.ct) * 1000000
        d = kelvin(k + 2000)
        for (let i in d) {
            d[i] = d[i] * (a.bri / 512 + .5)
        }
    } else if ('xy' in a) {
        let x = a.xy[0], y = a.xy[1], z = 1 - x - y,
            Y = a.bri / 255, X = Y/y*x, Z = Y/y*z;
        console.log('xy', x, y, 'XYZ', X, Y, Z)
        let r = X *  1.612 - Y * 0.203 - Z * 0.302,
            g = X * -0.509 + Y * 1.412 + Z * 0.066,
            b = X *  0.026 - Y * 0.072 + Z * 0.962;
        let minv = 0.0031308
        r = (r < minv) ? r = 12.92 * r : 1.055 * Math.pow(r, (0.416666)) - 0.055
        g = (g < minv) ? g = 12.92 * g : 1.055 * Math.pow(g, (0.416666)) - 0.055
        b = (b < minv) ? b = 12.92 * b : 1.055 * Math.pow(b, (0.416666)) - 0.055
        d = [r * 255, g * 255, b * 255]
    }
    // div = Math.max(d[0], d[1], d[2])
    for (let i in d) {
        d[i] = Math.min(Math.max(Math.round(d[i]), 0), 255)
    }
    return d
}

function colors2order(colors) {
    // - Prioritize colors with more similar red/green
    // - Prioritize colors with less blue
    // - Prioritize colors with higher brightness
    // This isn't anywhere near perfect or even good.
    return Math.round((  2000 * (colors[0][0] + colors[0][1] + colors[0][2])
                       +   10 * Math.log(colors[0][0] - colors[0][1])
                       -   10 * Math.log(colors[0][1] - colors[0][2])
                       -   10 * Math.log(colors[0][2] - colors[0][0])))
}

function sceneButton(classes, id, onid, offid, name, data, baseurl) {
    let button = document.createElement('button')
    button.addEventListener('click', () => {
        request.put(baseurl + '/groups/0/action',
        { json: { scene: id } },
            (e, r, b) => {
                if (e)
                    return
                if ('0' in b && 'success' in b[0])
                    updateButtons(id, onid, offid)
            }
        )
    })
    for (let thisClass of classes)
        button.classList.add(thisClass)
    button.innerText = name
    let swatch = document.createElement('div')
    swatch.classList.add('swatch')
    button.appendChild(swatch)
    button.setAttribute('data-id', id)
    buttons.push(button)
    if (['Off', 'On'].indexOf(name) == -1) {
        request.get(baseurl + '/scenes/' + data.id, { json: true }, (e, r, b) => {
            let colors = [],
                values = [],
                hadxy = false
            for (let light in b.lightstates)
                if ('xy' in b.lightstates[light])
                    hadxy = true
            for (let light in b.lightstates) {
                if (hadxy && !('xy' in b.lightstates[light]))
                    continue
                let vals = lightstate2rgb(b.lightstates[light])
                values.push(vals)
                colors.push('rgb(' + vals.join(',') + ')')
            }
            swatch.style.background = 'linear-gradient(to right, ' + colors + ')'
            button.style.order = 100000 - colors2order(values)
        })
    }
    if (name == 'Off') {
        button.addEventListener('click', e => {
            if (e.altKey && e.shiftKey) {
                delete localStorage.bridge_ip
                delete localStorage.username
                location.reload()
            }
        })
    }
    return button
}

module.exports = {
    'getUsername': getUsername,
    'getBridgeIp': getBridgeIp,
    'resetButton': resetButton,
    'sceneButton': sceneButton
}
