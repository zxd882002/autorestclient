import { Range, TextDocument } from "vscode-languageserver-textdocument";
import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import Request from "../Contracts/Request";
import RequestResponseCollection from "../Contracts/RequestResponseCollection";
import GrammarAnalyzer from "./GrammarAnalyzer";
import HttpGrammarFileAnalyzer from "./HttpGrammarFileAnalyzer";
import { Dictionary } from "../Contracts/Dictionary";

export default class HttpGrammarAnalyzer implements GrammarAnalyzer {

    private httpGrammarFileAnalyzer: HttpGrammarFileAnalyzer;
    private placeHolderRegexRegex = /{(?<property>\w+?)}/g;
    private lineSplitterRegex = /\r?\n/;

    constructor() {
        this.httpGrammarFileAnalyzer = new HttpGrammarFileAnalyzer();
    }

    getRequestRange(document: TextDocument): Range[] {
        let lines: string[] = document.getText().split(this.lineSplitterRegex);
        let [requests] = this.httpGrammarFileAnalyzer.analyzeDocument(lines);
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

    getAllRequestRange(document: TextDocument): Range {
        let lines: string[] = document.getText().split(this.lineSplitterRegex);
        let range: Range = {
            start: { line: 0, character: 0 },
            end: { line: lines.length - 1, character: 0 }
        };
        return range;
    }

    convertToRequests(document: TextDocument, range: Range): RequestResponseCollection {
        let lines: string[] = document.getText().split(this.lineSplitterRegex);
        let [requests] = this.httpGrammarFileAnalyzer.analyzeDocument(lines);
        let requestDictionary: Dictionary<string, Request> = {};
        for (let request of requests) {
            let requestStartLine = request.startLine;
            let requestEndLine = request.endLine;
            if (!(range.end.line < requestStartLine || requestEndLine < range.start.line)) {
                requestDictionary[request.name] = request;
            }
        }
        let requestResponseCollection: RequestResponseCollection = new RequestResponseCollection(requestDictionary);
        return requestResponseCollection;
    }

    getEnvironmentName(document: TextDocument): string | undefined {
        let lines: string[] = document.getText().split(this.lineSplitterRegex);
        let [requests, environmentName] = this.httpGrammarFileAnalyzer.analyzeDocument(lines, true);
        return environmentName;
    }

    replaceRequestEnvironmentValue(request: Request, environmentConfigure: EnvironmentConfigure): void {
        // url
        request.url = this.replaceEnvironmentValue(request.url, environmentConfigure);

        // header
        for (let key in request.headers) {
            request.headers[key] = this.replaceEnvironmentValue(request.headers[key] as string, environmentConfigure);
        }

        // body
        request.body = this.replaceEnvironmentValue(request.body, environmentConfigure);
    }

    private replaceEnvironmentValue(text: string, environmentConfigure: EnvironmentConfigure): string {
        let match = this.placeHolderRegexRegex.exec(text);
        while (match !== null && match.groups !== undefined) {
            const property = match.groups.property;
            const [propertyName, parameter] = property.split("|");
            const value = environmentConfigure.getEnvironmentValue(propertyName, parameter);
            if (value !== undefined) {
                text = text.replace(`{${property}}`, value);
            }
            match = this.placeHolderRegexRegex.exec(text);
        }
        return text;
    }
}