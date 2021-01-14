import { IncomingHttpHeaders } from "http2";
import { Timings } from '@szmarczak/http-timer';

export default class AutoRestClientResponse {
	public constructor(
		public statusCode: number,
		public body: any,
		public statusMessage?: string,
		public httpVersion?: string,
		public headers?: IncomingHttpHeaders,
		public timingPhases?: Timings) {
	}
}