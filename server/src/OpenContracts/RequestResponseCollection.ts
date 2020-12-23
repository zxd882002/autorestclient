import RequestSender from "../RequestSenders/RequestSender";
import { Dictionary } from "./Dictionary";
import { Request } from "./Request";
import { Response } from "./Response"

export default class RequestResponseCollection {
    private responses: Dictionary<string, Response>;
    private requests: Dictionary<string, Request>;
    private requestSender: RequestSender;

    constructor(requests: Dictionary<string, Request>, requestSender: RequestSender) {
        this.requests = requests;
        this.responses = {};
        this.requestSender = requestSender;
    }

    async execute() {
        for (const name in this.requests) {
            const request = this.requests[name];
            try {
                // execute before script
                console.log(`execute before script: ${request.beforeScript}`);
                eval(request.beforeScript);

                // send request
                const response = await this.requestSender.send(request);

                // save response

                // execute after script
                console.log(`execute after script: ${request.afterScript}`);
                eval(request.afterScript);
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