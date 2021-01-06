import * as http from 'http';
export type RequestHeaders = http.OutgoingHttpHeaders;
export default class Request {
	public name: string;
	public method: string;
	public url: string;
	public headers: RequestHeaders;
	public body: any;
	public beforeScript: string;
	public afterScript: string;
	public startLine: number;
	public endLine: number;
	public innerRequests?: Request[];

	public constructor(startLine: number
	) {
		this.name = "";
		this.method = "";
		this.url = "";
		this.headers = {};
		this.body = "";
		this.beforeScript = "";
		this.afterScript = "";
		this.startLine = startLine;
		this.endLine = -1;
		this.innerRequests = undefined;
	}
}