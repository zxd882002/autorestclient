import Request from "../Contracts/Request";
import HttpGrammarFileAnalyzer from "./HttpGrammarFileAnalyzer";

export default interface HttpGrammarElement {
    regex: RegExp;
    isConditionPass: (lines: string[], lineNumber: number, braceCounter: number) => boolean;
    onConditionPass: (requests: Request[], braceCounter: number) => [Request[], number, string?];
    nextElements: HttpGrammarElement[];
    fileAnalyzer: HttpGrammarFileAnalyzer;
    [name: string]: any;
}