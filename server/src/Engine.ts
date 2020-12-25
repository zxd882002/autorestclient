import EnvironmentConfigure from './EnvironmentConfigures/EnvironmentConfigure';
import GrammarAnalyzerFactory from './GrammarAnalyzers/grammarAnalyzerFactory';
import GrammarAnalyzer from './GrammarAnalyzers/GrammarAnalyzer';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import RequestResponseCollection from './OpenContracts/RequestResponseCollection';
import AutoRestClient from './OpenContracts/AutoRestClient';

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

        // convert Requests
        let RequestResponseCollection: RequestResponseCollection = grammarAnalyzer.convertToRequests(document, range, this.environmentConfigure);

        // initialize autoRestClient object
        let autoRestClient = new AutoRestClient(this.environmentConfigure, RequestResponseCollection);

        // // execute Requests
        await RequestResponseCollection.execute();
        // let responseText: string = autoRestClient.requests?.getResponses() ?? "";

        // save the environment
        this.environmentConfigure.saveEnvironment();

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