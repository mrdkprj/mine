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
        "nsis": {
            "oneClick": true,
            "allowToChangeInstallationDirectory": false,
            "runAfterFinish": false,
        }
    }
});