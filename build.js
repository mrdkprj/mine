const builder = require("electron-builder");

builder.build({
    config: {
        "appId": "Minesweeper",
        "productName": "Minesweeper",
        "win":{
            "target": {
                "target": "nsis",
                "arch": [
                    "x64",
                ]
            },
            "icon": "./resources/icon.ico"
        },
        linux:{
            target: "deb",
            category: "Game",
            icon: "./resources/icon.icns"
        },
        "nsis": {
            "oneClick": true,
            "allowToChangeInstallationDirectory": false,
            "runAfterFinish": false,
        }
    }
});
