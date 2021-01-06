import * as http from 'http';
import * as got from 'got';

export type ResponseHeaders = http.IncomingHttpHeaders;
// export type Nullable<T> = {
// 	[P in keyof T]: T[P] | null;
// };
export default class Response {
	public constructor(
		public statusCode: number,
		public body: any,
		public statusMessage?: string,
		public httpVersion?: string,
		public headers?: ResponseHeaders,
		public timingPhases?: got.GotTimingsPhases,) {
	}
}