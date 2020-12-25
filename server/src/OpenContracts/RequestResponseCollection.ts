import RequestSender from "../RequestSenders/RequestSender";
import ScriptExecutor from "../ScriptExecutors/ScriptExecutor";
import { Dictionary } from "./Dictionary";
import Request from "./Request";
import Response from "./Response"

export default class RequestResponseCollection {
    private responses: Dictionary<string, Response>;
    private requests: Dictionary<string, Request>;
    private currentRequest?: Request;
    private currentResponse?: Response;
    private requestSender: RequestSender;
    private scriptExecutor: ScriptExecutor;

    constructor(requests: Dictionary<string, Request>, requestSender: RequestSender, scriptExecutor: ScriptExecutor) {
        this.requests = requests;
        this.responses = {};
        this.currentRequest = undefined;
        this.currentResponse = undefined;
        this.requestSender = requestSender;
        this.scriptExecutor = scriptExecutor;
    }

    get CurrentRequest(): Request | undefined {
        return this.currentRequest;
    }

    get CurrentResponse(): Response | undefined {
        return this.currentResponse;
    }

    async execute(): Promise<void> {
        for (const name in this.requests) {
            this.currentRequest = this.requests[name];
            try {
                this.scriptExecutor.executeScript(this.currentRequest.beforeScript);

                // send request
                this.currentResponse = await this.requestSender.send(this.currentRequest);

                // save response
                this.responses[name] = this.currentResponse;

                // execute after script
                this.scriptExecutor.executeScript(this.currentRequest.afterScript);
            }
            catch (error) {
                this.responses[name] = new Response(500, error);
                break;
            }
        }
    }


    getResponses(): string {
        return "";
    }
}