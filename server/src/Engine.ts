import EnvironmentConfigure from './EnvironmentConfigures/EnvironmentConfigure';
import GrammarAnalyzerFactory from './GrammarAnalyzers/grammarAnalyzerFactory';
import GrammarAnalyzer from './GrammarAnalyzers/GrammarAnalyzer';
import AutoRestClient from './OpenContracts/AutoRestClient';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';

export class Engine {

    constructor(
        private environmentConfigure: EnvironmentConfigure,
        private grammarAnalyzerFactory: GrammarAnalyzerFactory
    ) { }

    public getRequestRange(document: TextDocument): Range[] {
        // get grammar
        let grammarAnalyzer: GrammarAnalyzer = this.grammarAnalyzerFactory.getGrammarAnalyzer(document);

        // get request range
        return grammarAnalyzer.getRequestRange(document);
    }

    public async execute(document: TextDocument, range: Range): Promise<string> {
        // get grammar analyzer
        let grammarAnalyzer: GrammarAnalyzer = this.grammarAnalyzerFactory.getGrammarAnalyzer(document);

        // get environment
        let environmentName: string | undefined = grammarAnalyzer.getEnvironmentString(document, range);
        this.environmentConfigure.initializeEnvironment(environmentName);

        // initialize autoRestClient object
        let autoRestClient: AutoRestClient = new AutoRestClient(this.environmentConfigure);

        // convert Requests
        autoRestClient.requests = grammarAnalyzer.convertToRequests(document, range, this.environmentConfigure);

        // // execute Requests
        // autoRestClient.requests?.execute();
        // let responseText: string = autoRestClient.requests?.getResponses() ?? "";

        let responseText = "";
        return responseText;


        // let httpRequest: HttpRequest = HttpClient.convertToHttpRequest(lines);
        // HttpClient.executeScript(httpRequest.beforeScript);
        // let response: HttpResponse = await HttpClient.send(httpRequest);
        // console.log(response.body);
        // HttpClient.executeScript(httpRequest.afterScript);
        // let responseText: string = JSON.stringify(response, null, 4);
    }
}