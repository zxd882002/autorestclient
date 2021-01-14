import Engine from "../Engine";
import AutoRestClientRequest from "./AutoRestClientRequest";
import AutoRestClientResponse from "./AutoRestClientResponse";

export default class AutoRestClientStaticDecorator {
    static engine: Engine;

    static get Request(): AutoRestClientRequest {
        let request = this.engine.RequestResponseCollection.CurrentRequest;
        if (request === undefined)
            throw new Error("Undefined Request");
        return request;
    }

    static get Response(): AutoRestClientResponse {
        let response = this.engine.RequestResponseCollection.CurrentResponse
        if (response === undefined)
            throw new Error("Undefined Response");
        return response;
    }

    static setEnvironmentVariable(environmentName: string, environemtValue: string) {
        this.engine.Environment.setEnvironmentValue(environmentName, environemtValue);
    }

    static getEnvironmentVariable(environmentName: string): string {
        let value = this.engine.Environment.getEnvironmentValue(environmentName);
        if (value === undefined)
            throw new Error(`undefined environemnt name ${environmentName}`);
        return value;
    }
}