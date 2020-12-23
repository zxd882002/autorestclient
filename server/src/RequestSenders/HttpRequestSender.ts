import * as got from 'got';
import { Request, RequestHeaders } from '../OpenContracts/Request'
import { Response, ResponseHeaders } from '../OpenContracts/Response'
import { Dictionary } from '../OpenContracts/Dictionary';
import RequestSender from './RequestSender';

export class HttpRequestSender implements RequestSender {

	send = async (httpRequest: Request): Promise<Response> => {
		let bodySize = 0;
		let headersSize = 0;

		const options = this.prepareOptions(httpRequest);
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

		const responseHeaders: ResponseHeaders = this.normalizeHeaderNames(response.headers, response.rawHeaders);

		return new Response(
			response.statusCode,
			bodyString,
			response.statusMessage,
			response.httpVersion,
			responseHeaders,
			response.timings.phases);
	}

	private normalizeHeaderNames<T extends RequestHeaders | ResponseHeaders>(headers: T, rawHeaders: string[]): T {
		const headersDic: Dictionary<string, string> = rawHeaders.reduce(
			(prev: Dictionary<string, string>, cur: string) => {
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

	private prepareOptions(httpRequest: Request): got.GotBodyOptions<null> {
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
}