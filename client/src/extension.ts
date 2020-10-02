import * as vscode from 'vscode';
import * as path from 'path';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

import * as http from 'http';
import got = require('got');
import { cwd } from 'process';

export type ResponseHeaders = http.IncomingHttpHeaders;
export type RequestHeaders = http.OutgoingHttpHeaders;
export type Nullable<T> = {
	[P in keyof T]: T[P] | null;
};

export class HttpRequest {
	public constructor(
		public method: string,
		public url: string,
		public headers: RequestHeaders,
		public body: string,
		public beforeScript: string,
		public afterScript: string) {
		this.method = method.toLocaleUpperCase();
	}
}
export class HttpResponse {
	public constructor(
		public statusCode: number,
		public statusMessage: string,
		public httpVersion: string,
		public headers: ResponseHeaders,
		public body: string,
		public timingPhases: Nullable<got.GotTimingsPhases>,) {
	}
}

export function activate(context: vscode.ExtensionContext) {
	connectServiceLanguageProtocol(context);
	context.subscriptions.push(vscode.commands.registerCommand('auto-rest-client.request', (async (lines: string[]) => {
		try {
			console.log("start request");
			let httpRequest: HttpRequest = convertToHttpRequest(lines);
			executeScript(httpRequest.beforeScript);
			let response: HttpResponse = await send(httpRequest);
			console.log(response.body);
			executeScript(httpRequest.afterScript);
			displayOnWebView(response, context);
		}
		catch (e) {
			console.log(e);
		}
	})));
}

let client: LanguageClient;
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

export const LineSplitterRegex: RegExp = /\r?\n/g;
export const RequestLine: RegExp = /^(?:(?<method>get|post|put|delete|patch|head|options|connect|trace)\s+)(?<url>.+?)(?:\s+(HTTP)\/(\d+.\d+))?$/i;
export const HeaderLine: RegExp = /^(?<headerName>[\w\-]+)\s*(\:)\s*(?<headerValue>.*?)\s*$/;
export const BodyStart: RegExp = /^\s*{\s*$/;	
export const ScriptStart: RegExp = /^\s*@{\s*$/;
export const End: RegExp = /^\s*}\s*$/;

function convertToHttpRequest(lines: string[]): HttpRequest {
	let method: string;
	let url: string;
	let headers: RequestHeaders = {};
	let body: string = "";
	let beforeScript: string = "";
	let afterScript: string = "";

	let scriptPosition:string = "before"; // before, after
	let collectBody: boolean = false;
	let collectBeforeScript: boolean = false;
	let collectAfterScript: boolean = false;
	lines.forEach(line => {
		const isMatchRequestLine: RegExpMatchArray = line.match(RequestLine);
		if (isMatchRequestLine !== null) {
			method = isMatchRequestLine.groups["method"];
			url = isMatchRequestLine.groups["url"];
			scriptPosition = "after";
			return;
		}

		const isMatchHeaderLine: RegExpMatchArray = line.match(HeaderLine);
		if (isMatchHeaderLine !== null) {
			let fieldName: string = isMatchHeaderLine.groups["headerName"];
			let fieldValue: string = isMatchHeaderLine.groups["headerValue"];
			headers[fieldName] = fieldValue;
			return;
		}

		const isMatchBodyStart: boolean = BodyStart.test(line);
		if (isMatchBodyStart) {
			collectBody = true;
		}

		const isMatchScriptStart: boolean = ScriptStart.test(line);
		if (isMatchScriptStart) {
			if(scriptPosition === "before"){
				collectBeforeScript= true;
			} else {
				collectAfterScript= true;
			}

			return;
		}

		if (collectBody) {
			body += line;
		}		

		const isMatchEnd: boolean = End.test(line);
		if (isMatchEnd) {
			collectBody = false;
			collectBeforeScript = false;
			collectAfterScript = false;
		}

		if (collectBeforeScript){
			beforeScript += line;
			beforeScript += "\r\n";
		}

		if (collectAfterScript){
			afterScript += line;
			beforeScript += "\r\n";
		}
	});

	return new HttpRequest(method, url, headers, body, beforeScript, afterScript);
}

export class AutoRestClient{

	public SetEnvironmentVariable(name:string, value:string)
	{
		console.log(`call AutoRestClient SetEnvironmentVariable() method, name = ${name}, value=${value}`)
	}
	
	public Show() {
		console.log("call AutoRestClient Show() method")
	}
}

function executeScript(script: string): void{
	console.log(`execute script: ${script}`);
	eval(script);
}

async function send(httpRequest: HttpRequest): Promise<HttpResponse> {
	let bodySize = 0;
	let headersSize = 0;

	const options = prepareOptions(httpRequest);
	const request = got(httpRequest.url, options);
	(request as any).on('response', res => {
		if (res.rawHeaders) {
			headersSize += res.rawHeaders.map(h => h.length).reduce((a, b) => a + b, 0);
			headersSize += (res.rawHeaders.length) / 2;
		}
		res.on('data', chunk => {
			bodySize += chunk.length;
		});
	});

	const response = await request;
	const bodyBuffer = response.body;
	let bodyString = bodyBuffer.toString();

	const responseHeaders: ResponseHeaders = normalizeHeaderNames(response.headers, response.rawHeaders);

	return new HttpResponse(
		response.statusCode,
		response.statusMessage,
		response.httpVersion,
		responseHeaders,
		bodyString,
		response.timings.phases);
}

function normalizeHeaderNames<T extends RequestHeaders | ResponseHeaders>(headers: T, rawHeaders: string[]): T {
	const headersDic: { [key: string]: string } = rawHeaders.reduce(
		(prev, cur) => {
			prev[cur.toLowerCase()] = cur;
			return prev;
		}, {});
	const adjustedResponseHeaders = {} as RequestHeaders | ResponseHeaders;
	for (const header in headers) {
		const adjustedHeaderName = headersDic[header] || header;
		adjustedResponseHeaders[adjustedHeaderName] = headers[header];
	}

	return adjustedResponseHeaders as T;
}

async function displayOnWebView(response: HttpResponse, context: vscode.ExtensionContext): Promise<void>{
	try {
		let responseDocument: vscode.TextDocument = await vscode.workspace.openTextDocument({ language: 'json', content: JSON.stringify(response, null, 4) });
		await vscode.window.showTextDocument(responseDocument)		
	} catch (reason) {
		vscode.window.showErrorMessage(reason);
	}
}

function prepareOptions(httpRequest: HttpRequest): got.GotBodyOptions<null> {
	const options: got.GotBodyOptions<null> = {
		headers: httpRequest.headers,
		method: httpRequest.method,
		body: httpRequest.body,
		encoding: null,
		decompress: true,
		//followRedirect: this._settings.followRedirect,
		rejectUnauthorized: false,
		throwHttpErrors: false,
		//cookieJar: this._settings.rememberCookiesForSubsequentRequests ? new CookieJar(this.cookieStore, { rejectPublicSuffixes: false }) : undefined,
		retry: 0,
		hooks: {
			afterResponse: [],
			// Following port reset on redirect can be removed after upgrade got to version 10.0
			// https://github.com/sindresorhus/got/issues/719
			beforeRedirect: [
				opts => {
					const redirectHost = ((opts as any).href as string).split('/')[2];
					if (!redirectHost.includes(':')) {
						delete opts.port;
					}
				}
			],
			beforeRequest: [],
		}
	};

	return options;
}

export function deactive(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

