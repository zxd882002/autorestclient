import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import RequestResponseCollection from "../OpenContracts/RequestResponseCollection";

export default interface GrammarAnalyzer {
    getRequestRange(document: TextDocument): Range[];
    convertToRequests(document: TextDocument, range: Range, environmentConfigure: EnvironmentConfigure): RequestResponseCollection;
    getEnvironmentString(document: TextDocument, range: Range): string | undefined;
}