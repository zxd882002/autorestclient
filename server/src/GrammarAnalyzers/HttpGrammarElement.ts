import Request from "../Contracts/Request";
import HttpGrammarAnalyzer from "./HttpGrammarAnalyzer";

export default interface HttpGrammarElement {
    regex: RegExp;
    isConditionPass: (lines: string[], lineNumber: number, braceCounter: number) => boolean;
    onConditionPass: (requests: Request[], braceCounter: number) => [Request[], number, string?];
    nextElements: HttpGrammarElement[];
    fileAnalyzer: HttpGrammarAnalyzer;
    [name: string]: any;
}