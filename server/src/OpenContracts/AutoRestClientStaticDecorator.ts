import AutoRestClient from "./AutoRestClient";
import Request from "./Request";
import Response from "./Response";

export default class AutoRestClientStaticDecorator {
    static autoRestClient: AutoRestClient;

    static get Request(): Request {
        let request = this.autoRestClient.requestResponseCollection.CurrentRequest;
        if (request === undefined)
            throw new Error("Undefined Request");
        return request;
    }

    static get Response(): Response {
        let response = this.autoRestClient.requestResponseCollection.CurrentResponse
        if (response === undefined)
            throw new Error("Undefined Response");
        return response;
    }

    static setEnvironmentVariable(environmentName: string, environemtValue: string) {
        this.autoRestClient.environment.setEnvironmentValue(environmentName, environemtValue);
    }

    static getEnvironmentVariable(environmentName: string): string {
        let value = this.autoRestClient.environment.getEnvironmentValue(environmentName);
        if (value === undefined)
            throw new Error(`undefined environemnt name ${environmentName}`);
        return value;
    }
}