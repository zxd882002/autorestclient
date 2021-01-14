import RequestSender from './RequestSender';
import got, { Options, CancelableRequest, Response } from 'got';
import AutoRestClientRequest from '../Contracts/AutoRestClientRequest';
import AutoRestClientResponse from '../Contracts/AutoRestClientResponse';

export default class HttpRequestSender implements RequestSender {
	private sendTask: CancelableRequest<Response<string>> | undefined = undefined;

	async send(request: AutoRestClientRequest): Promise<AutoRestClientResponse> {

		if (this.sendTask !== undefined)
			throw new Error("The send task is still on going. Please cancel the previous task and retry");

		const options: Options = {
			headers: request.headers,
			method: request.method,
			body: request.body,
			encoding: undefined,
			decompress: true,
			throwHttpErrors: false,
			retry: 0,
		};

		try {
			console.log(`Send Request: ${request.name}`)
			this.sendTask = got(request.url, options) as CancelableRequest<Response<string>>;
			const response = await this.sendTask;
			this.sendTask = undefined;
			console.log(`Receive Response: ${request.name}, Status code: ${response.statusCode}`);

			return new AutoRestClientResponse(
				response.statusCode,
				response.body,
				response.statusMessage,
				response.httpVersion,
				response.headers,
				response.timings);
		}
		catch (error) {
			if (this.sendTask !== undefined && this.sendTask.isCanceled) {
				this.sendTask = undefined;
				throw new Error("Request is cancelled");
			}
			this.sendTask = undefined;
			throw error;
		}
	}

	cancel() {
		if (this.sendTask !== undefined) {
			this.sendTask.cancel();
		}
	}
}