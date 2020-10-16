import * as http from 'http';
import * as got from 'got';

export type ResponseHeaders = http.IncomingHttpHeaders;
export type Nullable<T> = {
	[P in keyof T]: T[P] | null;
};
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