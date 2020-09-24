"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactive = exports.activate = void 0;
const vscode = require("vscode");
let client;
function activate(context) {
    vscode.window.showInformationMessage('Hello World!');
}
exports.activate = activate;
function deactive() {
}
exports.deactive = deactive;
//# sourceMappingURL=extension.js.map