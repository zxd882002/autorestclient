import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import RequestCollection from "../OpenContracts/RequestCollection";

export default interface GrammarAnalyzer{
    getRequestRange(document: TextDocument) : Range[];
    convertToRequests(document: TextDocument, range : Range, environmentConfigure: EnvironmentConfigure): RequestCollection;
    getEnvironmentString(document: TextDocument, range : Range): string|undefined;
}