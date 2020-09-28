import * as vscode from 'vscode';
import * as path from 'path';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
  } from 'vscode-languageclient';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
	// The server is implemented in node
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

function defineServerOptions(context : vscode.ExtensionContext) {
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