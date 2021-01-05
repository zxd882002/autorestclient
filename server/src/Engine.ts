import EnvironmentConfigure from './EnvironmentConfigures/EnvironmentConfigure';
import { Range } from 'vscode-languageserver-textdocument';
import RequestResponseCollection from './Contracts/RequestResponseCollection';
import AutoRestClientStaticDecorator from './Contracts/AutoRestClientStaticDecorator';
import TypeScriptExecutor from './ScriptExecutors/TypeScriptExecutor';
import RequestSender from './RequestSenders/RequestSender';
import ScriptExecutor from './ScriptExecutors/ScriptExecutor';
import HttpRequestSender from './RequestSenders/HttpRequestSender';
import Response from './Contracts/Response';
import { Dictionary } from './Contracts/Dictionary';
import Request from './Contracts/Request';
import GrammarAnalyzer from './GrammarAnalyzers/GrammarAnalyzer';
import HttpGrammarAnalyzer from './GrammarAnalyzers/HttpGrammarAnalyzer';

export default class Engine {
    private environmentConfigure?: EnvironmentConfigure;
    private requestResponseCollection?: RequestResponseCollection;
    private lineSplitterRegex = /\r?\n/;

    public get Environment(): EnvironmentConfigure {
        let environment = this.environmentConfigure;
        if (environment === undefined)
            throw new Error("Undefined Environment!");
        return environment;
    }

    public get RequestResponseCollection(): RequestResponseCollection {
        let requestResponseCollection = this.requestResponseCollection;
        if (requestResponseCollection === undefined)
            throw new Error("Undefined RequestResponseCollection");
        return requestResponseCollection;
    }

    constructor(
        private workSpaceFolder: string
    ) {
        this.requestResponseCollection = undefined;
        AutoRestClientStaticDecorator.engine = this;
    }

    public getRequestRange(content: string): Range[] {
        let [grammarFileAnalyzer] = this.initializeEngine();
        let [requests] = grammarFileAnalyzer.analyze(content);
        let ranges = [];

        for (let request of requests) {
            if (request.startLine != -1 && request.endLine != -1) {
                let range: Range = {
                    start: { line: request.startLine, character: 0 },
                    end: { line: request.endLine, character: 0 }
                };
                ranges.push(range);
            }
        }

        return ranges;
    }

    public getAllRequestRange(content: string): Range {
        let lines: string[] = content.split(this.lineSplitterRegex);
        let range: Range = {
            start: { line: 0, character: 0 },
            end: { line: lines.length - 1, character: 0 }
        };
        return range;
    }

    public async execute(content: string, range: Range): Promise<string> {
        let [grammarAnalyzer, environmentConfigure, scriptExecutor, requestSender] = this.initializeEngine();

        // convert Requests
        let [requests, environmentName] = grammarAnalyzer.analyze(content);
        let requestDictionary: Dictionary<string, Request> = {};
        for (let request of requests) {
            let requestStartLine = request.startLine;
            let requestEndLine = request.endLine;
            if (!(range.end.line < requestStartLine || requestEndLine < range.start.line)) {
                requestDictionary[request.name] = request;
            }
        }
        let requestResponseCollection: RequestResponseCollection = new RequestResponseCollection(requestDictionary);
        this.requestResponseCollection = requestResponseCollection;

        // initialize configure
        environmentConfigure.initializeEnvironment(this.workSpaceFolder, environmentName);

        // execute
        for (const name in requestResponseCollection.Requests) {
            let currentRequest = requestResponseCollection.Requests[name];
            requestResponseCollection.CurrentRequest = currentRequest;

            let step: string = "";
            try {
                step = "replacing place holder";
                this.replaceRequestEnvironmentValue(currentRequest, environmentConfigure);

                step = "executing before script";
                scriptExecutor.executeScript(currentRequest.beforeScript);

                step = "sending request";
                let currentResponse = await requestSender.send(currentRequest);
                requestResponseCollection.CurrentResponse = currentResponse;
                requestResponseCollection.Responses[name] = currentResponse;

                step = "executing after script";
                scriptExecutor.executeScript(currentRequest.afterScript);
            }
            catch (error) {
                let currentResponse = new Response(500, `Error when ${step} for ${currentRequest.name}, Error message: ${error.toString()}`);
                requestResponseCollection.CurrentResponse = currentResponse;
                requestResponseCollection.Responses[name] = currentResponse;
                break;
            }
        }

        // save the environment
        environmentConfigure.saveEnvironment();

        // get response
        let responseText = requestResponseCollection.getResponseSummary();
        return responseText;
    }

    private initializeEngine(): [GrammarAnalyzer, EnvironmentConfigure, ScriptExecutor, RequestSender] {
        // get grammarAnalyzer
        let grammarAnalyzer = new HttpGrammarAnalyzer(this.workSpaceFolder);

        // get environment
        let environmentConfigure = new EnvironmentConfigure();
        this.environmentConfigure = environmentConfigure;

        // get executor
        let executor = new TypeScriptExecutor();

        // get sender
        let sender = new HttpRequestSender();

        return [grammarAnalyzer, environmentConfigure, executor, sender];
    }

    private replaceRequestEnvironmentValue(request: Request, environmentConfigure: EnvironmentConfigure): void {
        // url
        request.url = environmentConfigure.replaceEnvironmentValue(request.url);

        // header
        for (let key in request.headers) {
            request.headers[key] = environmentConfigure.replaceEnvironmentValue(request.headers[key] as string);
        }

        // body
        request.body = environmentConfigure.replaceEnvironmentValue(request.body);
    }
}