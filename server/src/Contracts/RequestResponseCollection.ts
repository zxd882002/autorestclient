import { Dictionary } from "./Dictionary";
import Request from "./Request";
import Response from "./Response"

export default class RequestResponseCollection {
    private responses: Dictionary<string, Response>;
    private requests: Dictionary<string, Request>;
    private currentRequest?: Request;
    private currentResponse?: Response;

    constructor(requests: Dictionary<string, Request>) {
        this.requests = requests;
        this.responses = {};
        this.currentRequest = undefined;
        this.currentResponse = undefined;
    }

    get Requests(): Dictionary<string, Request> {
        return this.requests;
    }

    get Responses(): Dictionary<string, Response> {
        return this.responses;
    }

    get CurrentRequest(): Request | undefined {
        return this.currentRequest;
    }

    set CurrentRequest(request: Request | undefined) {
        this.currentRequest = request;
    }

    get CurrentResponse(): Response | undefined {
        return this.currentResponse;
    }

    set CurrentResponse(response: Response | undefined) {
        this.currentResponse = response;
    }

    getResponseSummary(): string {
        let responseSummary: Dictionary<string, Dictionary<string, Request | Response>> = {};
        for (const name in this.requests) {
            if (this.responses[name] === null) {
                break;
            }

            let request = this.requests[name];
            if (request.headers !== undefined && (request.headers["Content-Type"] as string).includes('json')) {
                request.body = JSON.parse(request.body);
            }

            let response = this.responses[name];
            if (response.headers !== undefined && (response.headers['Content-Type'] as string).includes('json')) {
                response.body = JSON.parse(response.body);
            }

            responseSummary[name] = {};
            responseSummary[name]["Request"] = request;
            responseSummary[name]["Response"] = response;
        }
        return JSON.stringify(responseSummary, null, 4);
    }
}