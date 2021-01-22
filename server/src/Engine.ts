import EnvironmentConfigure from './EnvironmentConfigures/EnvironmentConfigure';
import { Range } from 'vscode-languageserver-textdocument';
import RequestResponseCollection from './Contracts/RequestResponseCollection';
import AutoRestClientStaticDecorator from './Contracts/AutoRestClientStaticDecorator';
import TypeScriptExecutor from './ScriptExecutors/TypeScriptExecutor';
import RequestSender from './RequestSenders/RequestSender';
import ScriptExecutor from './ScriptExecutors/ScriptExecutor';
import HttpRequestSender from './RequestSenders/HttpRequestSender';
import Response from './Contracts/AutoRestClientResponse';
import { Dictionary } from './Contracts/Dictionary';
import AutoRestClientRequest from './Contracts/AutoRestClientRequest';
import GrammarAnalyzer from './GrammarAnalyzers/GrammarAnalyzer';
import HttpGrammarAnalyzer from './GrammarAnalyzers/HttpGrammarAnalyzer';
import EnvironmentConfigureItem from './EnvironmentConfigures/EnvironmentConfigureItem';
import GrammarAnalyzerResult from './GrammarAnalyzers/GrammarAnalyzerResult';

export default class Engine {
    private environmentConfigure?: EnvironmentConfigure;
    private sender?: RequestSender;

    public get Environment(): EnvironmentConfigure {
        let environment = this.environmentConfigure;
        if (environment === undefined)
            throw new Error("Undefined Environment!");
        return environment;
    }

    private requestResponseCollection?: RequestResponseCollection;
    public get RequestResponseCollection(): RequestResponseCollection {
        let requestResponseCollection = this.requestResponseCollection;
        if (requestResponseCollection === undefined)
            throw new Error("Undefined RequestResponseCollection");
        return requestResponseCollection;
    }

    constructor(
        private workSpaceFolder: string
    ) {
        AutoRestClientStaticDecorator.engine = this;
    }

    public getRequestRange(content: string): Range[] {
        let result = this.analyzeContent(content);
        let ranges = [];

        for (let request of result.requests) {
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
        let lineSplitterRegex = /\r?\n/;
        let lines: string[] = content.split(lineSplitterRegex);
        let range: Range = {
            start: { line: 0, character: 0 },
            end: { line: lines.length - 1, character: 0 }
        };
        return range;
    }

    public analyzeContent(content: string): GrammarAnalyzerResult {
        let grammarAnalyzer = this.getGrammarAnalyzer();
        let result = grammarAnalyzer.analyze(content);
        return result;
    }

    public getLine(content: string, lineNumber: number): string | undefined {
        let grammarAnalyzer = this.getGrammarAnalyzer();
        let result = grammarAnalyzer.getLine(content, lineNumber);
        return result;
    }

    public async execute(content: string, range: Range): Promise<string> {
        let [environmentConfigure, scriptExecutor, requestSender] = this.initializeEngine();

        // convert Requests
        let result = this.analyzeContent(content);
        if (result.errorMessage !== undefined) {
            throw new Error(result.errorMessage);
        }

        let requests = result.requests;
        let environmentName = result.environmentName;
        let requestDictionary: Dictionary<string, AutoRestClientRequest> = {};
        this.convertRequestToDictionary(requests, requestDictionary, range);
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
                step = "executing before script";
                scriptExecutor.executeScript(currentRequest.beforeScript);

                step = "replacing place holder";
                this.replaceRequestEnvironmentValue(currentRequest, environmentConfigure);

                step = "sending request";
                let currentResponse = await requestSender.send(currentRequest);
                requestResponseCollection.CurrentResponse = currentResponse;
                requestResponseCollection.Responses[name] = currentResponse;

                step = "executing after script";
                scriptExecutor.executeScript(currentRequest.afterScript);
            }
            catch (error) {
                let currentResponse = new Response(500, `Error when ${step} for ${currentRequest.name}, ${error.toString()}`);
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

    public getEnvironmentConfigureItem(content: string, lineNumber: number, character: number): [EnvironmentConfigureItem | undefined, string | undefined] {
        const [environmentConfigure] = this.initializeEngine();
        let result = this.analyzeContent(content);
        environmentConfigure.initializeEnvironment(this.workSpaceFolder, result.environmentName);

        const line = this.getLine(content, lineNumber);
        if (line !== undefined) {
            const items = environmentConfigure.getEnvironmentConfigureItems(line);
            for (const item of items) {
                if (item.startPosition <= character && character <= item.endPosition) {
                    return [item.environmentConfigureItem, item.parameter];
                }
            }
        }

        return [undefined, undefined];
    }

    public cancel(): void {
        this.sender?.cancel();
    }

    private convertRequestToDictionary(requests: AutoRestClientRequest[], requestDictionary: Dictionary<string, AutoRestClientRequest>, range?: Range) {
        for (let request of requests) {
            let requestStartLine = request.startLine;
            let requestEndLine = request.endLine;
            if (range === undefined || !(range.end.line < requestStartLine || requestEndLine < range.start.line)) {
                if (request.innerRequests !== undefined) {
                    this.convertRequestToDictionary(request.innerRequests, requestDictionary)
                }
                else {
                    requestDictionary[request.name] = request;
                }
            }
        }
    }

    private getGrammarAnalyzer(): GrammarAnalyzer {
        // get grammarAnalyzer
        let grammarAnalyzer = new HttpGrammarAnalyzer(this.workSpaceFolder, this);
        return grammarAnalyzer;
    }

    private initializeEngine(): [EnvironmentConfigure, ScriptExecutor, RequestSender] {

        // get environment
        if (this.environmentConfigure === undefined) {
            this.environmentConfigure = new EnvironmentConfigure();
        }

        // get executor
        let executor = new TypeScriptExecutor();

        // get sender
        if (this.sender === undefined) {
            this.sender = new HttpRequestSender();
        }

        return [this.environmentConfigure, executor, this.sender];
    }

    private replaceRequestEnvironmentValue(request: AutoRestClientRequest, environmentConfigure: EnvironmentConfigure): void {
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