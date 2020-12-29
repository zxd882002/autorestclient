import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import RequestResponseCollection from "../Contracts/RequestResponseCollection";
import Request from "../Contracts/Request";

export default interface GrammarAnalyzer {
    getRequestRange(document: TextDocument): Range[];
    getAllRequestRange(document: TextDocument): Range;
    convertToRequests(document: TextDocument, range: Range): RequestResponseCollection;
    getEnvironmentName(document: TextDocument): string | undefined;
    replaceRequestEnvironmentValue(request: Request, environmentConfigure: EnvironmentConfigure): void;
}