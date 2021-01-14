import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import TriggerableProvider from './utils/TriggerableCodeLensProvider'
import {
	LanguageClient,
	LanguageClientOptions,
	Range,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
	connectServiceLanguageProtocol(context);
	let triggerableProvider = new TriggerableProvider();
	context.subscriptions.push(vscode.languages.registerCodeLensProvider('http', triggerableProvider));
	context.subscriptions.push(vscode.commands.registerCommand("auto-rest-client.request", (range: Range) => {
		client.sendNotification("auto-rest-client.request", range);
		client.onNotification("auto-rest-client.onRequesting", () => {
			triggerableProvider.onDidChangeConfiguration(null);
		});
		client.onNotification("auto-rest-client.onRequestComplete", () => {
			triggerableProvider.onDidChangeConfiguration(null);
		})
		client.onNotification("auto-rest-client.response", (response) => {
			displayOnWebView(response, context);
		});
	}));
	context.subscriptions.push(vscode.commands.registerCommand("auto-rest-client.requestAll", (range: Range) => {
		client.sendNotification("auto-rest-client.requestAll", range);
		client.onNotification("auto-rest-client.onRequestingAll", () => {
			triggerableProvider.onDidChangeConfiguration(null);
		});
		client.onNotification("auto-rest-client.onRequestComplete", () => {
			triggerableProvider.onDidChangeConfiguration(null);
		})
		client.onNotification("auto-rest-client.responseAll", (response) => {
			displayOnWebView(response, context);
		});
	}));
	context.subscriptions.push(vscode.commands.registerCommand("auto-rest-client.cancelRequest", () => {
		client.sendNotification("auto-rest-client.cancelRequest");
	}));
}

async function displayOnWebView(response: string, context: vscode.ExtensionContext): Promise<void> {
	try {
		let now = new Date();
		let year = now.getFullYear().toString();
		let month = (now.getMonth() + 1).toString();
		let day = now.getDate().toString();
		let hour = now.getHours().toString();
		let minute = now.getMinutes().toString();
		let second = now.getSeconds().toString();

		if (month.length < 2) month = '0' + month;
		if (day.length < 2) day = '0' + day;
		if (hour.length < 2) hour = '0' + hour;
		if (minute.length < 2) minute = '0' + minute;
		if (second.length < 2) second = '0' + second;

		let workspaceFolder = vscode.workspace.workspaceFolders[0].uri;
		let responseFolder = vscode.Uri.parse(`${workspaceFolder}/Responses/`);
		if (!fs.existsSync(responseFolder.fsPath)) {
			fs.mkdirSync(responseFolder.fsPath);
		}
		let archiveFolder = vscode.Uri.parse(`${responseFolder}/${year}${month}${day}`)
		if (!fs.existsSync(archiveFolder.fsPath)) {
			fs.mkdirSync(archiveFolder.fsPath);
		}
		let fileUri = vscode.Uri.parse(`${archiveFolder}/Response_${year}${month}${day}_${hour}${minute}${second}.json`);
		fs.writeFileSync(fileUri.fsPath, response);

		let responseDocument = await vscode.workspace.openTextDocument(fileUri);
		await vscode.window.showTextDocument(responseDocument)
	} catch (reason) {
		vscode.window.showErrorMessage(reason);
	}
}

function connectServiceLanguageProtocol(context: vscode.ExtensionContext) {
	let serverOptions: ServerOptions = defineServerOptions(context);

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for http documents
		documentSelector: [{ scheme: 'file', language: 'http' }]
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'httpLsp',
		'Http Language Service Protocol',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();

	vscode.window.showInformationMessage('Connected!');
}

function defineServerOptions(context: vscode.ExtensionContext) {
	let serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};
	return serverOptions;

}

export function deactive(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

