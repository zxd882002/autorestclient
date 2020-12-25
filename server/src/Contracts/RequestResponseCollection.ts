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

            responseSummary[name] = {};
            responseSummary[name]["Request"] = this.requests[name];
            responseSummary[name]["Response"] = this.responses[name];
        }
        return JSON.stringify(responseSummary, null, 4);
    }
}