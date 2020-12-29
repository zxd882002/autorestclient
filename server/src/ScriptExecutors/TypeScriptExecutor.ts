import ScriptExecutor from "./ScriptExecutor";
import AutoRestClientStaticDecorator from "../Contracts/AutoRestClientStaticDecorator"

class AutoRestClient {
    public static get Response() {
        return AutoRestClientStaticDecorator.Response;
    }

    public static get Request() {
        return AutoRestClientStaticDecorator.Request;
    }

    public static setEnvironmentVariable(environmentName: string, environemtValue: string) {
        AutoRestClientStaticDecorator.setEnvironmentVariable(environmentName, environemtValue);
    }

    public static getEnvironmentVariable(environmentName: string): string | undefined {
        return AutoRestClientStaticDecorator.getEnvironmentVariable(environmentName);
    }
}

export default class TypeScriptExecutor implements ScriptExecutor {
    executeScript(content: string) {
        // console.log(`execute script: ${content}`);
        eval(content);
    }
}