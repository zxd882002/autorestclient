import * as http from 'http';
export type RequestHeaders = http.OutgoingHttpHeaders;
export class Request {
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