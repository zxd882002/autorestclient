import * as got from 'got';
import { BodyScriptEnd, BodyStart, HeaderLine, RequestLine, ScriptStart } from '../GrammarAnalyzers/HttpGrammarAnalyzer';
import {Request, RequestHeaders} from '../OpenContracts/Request'
import {Response, ResponseHeaders} from '../OpenContracts/Response'

export function convertToHttpRequest(lines: string[]): Request {
	let method: string = "";
	let url: string = "";
	let headers: RequestHeaders = {};
	let body: string = "";
	let beforeScript: string = "";
	let afterScript: string = "";

	let scriptPosition:string = "before"; // before, after
	let collectBody: boolean = false;
	let collectBeforeScript: boolean = false;
	let collectAfterScript: boolean = false;
	console.log(lines);
	lines.forEach(line => {
		const isMatchRequestLine: RegExpMatchArray | null = line.match(RequestLine);
		if (isMatchRequestLine !== null && isMatchRequestLine.groups) {
			method = isMatchRequestLine.groups["method"];
			url = isMatchRequestLine.groups["url"];
			scriptPosition = "after";
			return;
		}

		const isMatchHeaderLine: RegExpMatchArray | null = line.match(HeaderLine);
		if (isMatchHeaderLine !== null && isMatchHeaderLine.groups) {
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

		const isMatchEnd: boolean = BodyScriptEnd.test(line);
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

	return new Request(method, url, headers, body, beforeScript, afterScript);
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

export function executeScript(script: string): void{
	console.log(`execute script: ${script}`);
	eval(script);
}

export async function send(httpRequest: Request): Promise<Response> {
	let bodySize = 0;
	let headersSize = 0;

	const options = prepareOptions(httpRequest);
	const request = got(httpRequest.url, options);
	(request as any).on('response', (res: { rawHeaders: any[]; on: (arg0: string, arg1: (chunk: any) => void) => void; }) => {
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

	return new Response(
		response.statusCode,
		response.statusMessage,
		response.httpVersion,
		responseHeaders,
		bodyString,
		response.timings.phases);
}

export function normalizeHeaderNames<T extends RequestHeaders | ResponseHeaders>(headers: T, rawHeaders: string[]): T {
	const headersDic: { [key: string]: string } = rawHeaders.reduce(
		(prev: { [key: string]: string }, cur: string) => {
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

export function prepareOptions(httpRequest: Request): got.GotBodyOptions<null> {
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