"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactive = exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
const vscode_languageclient_1 = require("vscode-languageclient");
let client;
function activate(context) {
    vscode.window.showInformationMessage('Connecting...');
    // The server is implemented in node
    let serverOptions = defineServerOptions(context);
    // Options to control the language client
    let clientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: 'file', language: 'http' }],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    // Create the language client and start the client.
    client = new vscode_languageclient_1.LanguageClient('languageServerExample', 'Language Server Example', serverOptions, clientOptions);
    // Start the client. This will also launch the server
    client.start();
    vscode.window.showInformationMessage('Connected');
}
exports.activate = activate;
function defineServerOptions(context) {
    let serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    let serverOptions = {
        run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc,
            options: debugOptions
        }
    };
    return serverOptions;
}
function deactive() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactive = deactive;
//# sourceMappingURL=extension.js.map