import Engine from "../Engine";
import Request from "./Request";
import Response from "./Response";

export default class AutoRestClientStaticDecorator {
    static engine: Engine;

    static get Request(): Request {
        let request = this.engine.RequestResponseCollection.CurrentRequest;
        if (request === undefined)
            throw new Error("Undefined Request");
        return request;
    }

    static get Response(): Response {
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