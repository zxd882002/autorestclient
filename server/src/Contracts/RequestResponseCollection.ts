import { Dictionary } from "./Dictionary";
import AutoRestClientRequest from "./AutoRestClientRequest";
import AutoRestClientResponse from "./AutoRestClientResponse"

export default class RequestResponseCollection {
    private responses: Dictionary<string, AutoRestClientResponse>;
    private requests: Dictionary<string, AutoRestClientRequest>;
    private currentRequest?: AutoRestClientRequest;
    private currentResponse?: AutoRestClientResponse;

    constructor(requests: Dictionary<string, AutoRestClientRequest>) {
        this.requests = requests;
        this.responses = {};
        this.currentRequest = undefined;
        this.currentResponse = undefined;
    }

    get Requests(): Dictionary<string, AutoRestClientRequest> {
        return this.requests;
    }

    get Responses(): Dictionary<string, AutoRestClientResponse> {
        return this.responses;
    }

    get CurrentRequest(): AutoRestClientRequest | undefined {
        return this.currentRequest;
    }

    set CurrentRequest(request: AutoRestClientRequest | undefined) {
        this.currentRequest = request;
    }

    get CurrentResponse(): AutoRestClientResponse | undefined {
        return this.currentResponse;
    }

    set CurrentResponse(response: AutoRestClientResponse | undefined) {
        this.currentResponse = response;
    }

    getResponseSummary(): string {
        let responseSummary: Dictionary<string, Dictionary<string, AutoRestClientRequest | AutoRestClientResponse>> = {};
        for (const name in this.requests) {
            if (this.responses[name] === null) {
                break;
            }

            let request = this.requests[name];
            let response = this.responses[name];

            if (request === undefined ||
                response === undefined)
                break;

            if (request !== null &&
                request.headers["Content-Type"] !== undefined && (request.headers["Content-Type"] as string).includes('json') ||
                request.headers["content-type"] !== undefined && (request.headers["content-type"] as string).includes('json')) {
                request.body = JSON.parse(request.body);
            }

            if (response.headers !== undefined &&
                (response.headers["Content-Type"] !== undefined && (response.headers["Content-Type"] as string).includes('json') ||
                    response.headers["content-type"] !== undefined && (response.headers["content-type"] as string).includes('json'))) {
                response.body = JSON.parse(response.body);
            }

            responseSummary[name] = {};
            responseSummary[name]["Request"] = request;
            responseSummary[name]["Response"] = response;
        }
        return JSON.stringify(responseSummary, null, 4);
    }
}