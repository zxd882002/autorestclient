import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import { Range, TextDocument } from 'vscode-languageserver-textdocument';

export default interface GrammarAnalyzer{
    getRequestRange(document: TextDocument) : Range[];
    convertToRequests(document: TextDocument, range : Range, environmentConfigure: EnvironmentConfigure): import("../OpenContracts/RequestCollection").RequestCollection | undefined;
    getEnvironmentString(document: TextDocument, range : Range): string|undefined;
}