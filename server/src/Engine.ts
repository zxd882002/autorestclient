import EnvironmentConfigure from './EnvironmentConfigures/EnvironmentConfigure';
import GrammarAnalyzerFactory from './GrammarAnalyzers/grammarAnalyzerFactory';
import GrammarAnalyzer from './GrammarAnalyzers/GrammarAnalyzer';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import RequestResponseCollection from './Contracts/RequestResponseCollection';
import AutoRestClientStaticDecorator from './Contracts/AutoRestClientStaticDecorator';
import TypeScriptExecutor from './ScriptExecutors/TypeScriptExecutor';
import RequestSender from './RequestSenders/RequestSender';
import ScriptExecutor from './ScriptExecutors/ScriptExecutor';
import HttpRequestSender from './RequestSenders/HttpRequestSender';
import Response from './Contracts/Response';

export default class Engine {
    private environmentConfigure?: EnvironmentConfigure;
    private requestResponseCollection?: RequestResponseCollection;

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

    private initializeEngine(document: TextDocument): [GrammarAnalyzer, EnvironmentConfigure, ScriptExecutor, RequestSender] {
        // get grammarAnalyzer
        let grammarAnalyzer = new GrammarAnalyzerFactory().getGrammarAnalyzer(document);

        // get environment
        this.environmentConfigure = new EnvironmentConfigure();
        let environmentName: string | undefined = grammarAnalyzer.getEnvironmentString(document);
        this.environmentConfigure.initializeEnvironment(this.workSpaceFolder, environmentName);

        // get executor
        let executor = new TypeScriptExecutor();

        // get sender
        let sender = new HttpRequestSender();

        return [grammarAnalyzer, this.environmentConfigure, executor, sender];
    }

    public getRequestRange(document: TextDocument): Range[] {
        let [grammarAnalyzer] = this.initializeEngine(document);
        return grammarAnalyzer.getRequestRange(document);
    }

    public async execute(document: TextDocument, range: Range): Promise<string> {
        let [grammarAnalyzer, environmentConfigure, scriptExecutor, requestSender] = this.initializeEngine(document);

        // convert Requests
        this.requestResponseCollection = grammarAnalyzer.convertToRequests(document, range, environmentConfigure);

        // execute
        for (const name in this.requestResponseCollection.Requests) {
            let currentRequest = this.requestResponseCollection.Requests[name];
            this.requestResponseCollection.CurrentRequest = currentRequest;

            try {
                scriptExecutor.executeScript(currentRequest.beforeScript);

                // send request
                let currentResponse = await requestSender.send(currentRequest);
                this.requestResponseCollection.CurrentResponse = currentResponse;
                this.requestResponseCollection.Responses[name] = currentResponse;

                // execute after script
                scriptExecutor.executeScript(currentRequest.afterScript);
            }
            catch (error) {
                let currentResponse = new Response(500, error);
                this.requestResponseCollection.CurrentResponse = currentResponse;
                this.requestResponseCollection.Responses[name] = currentResponse;
                break;
            }
        }

        // save the environment
        environmentConfigure.saveEnvironment();

        // get response
        let responseText = this.requestResponseCollection.getResponseSummary();
        return responseText;
    }
}