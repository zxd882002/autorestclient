import AutoRestClientRequest from "../Contracts/AutoRestClientRequest";
import HttpGrammarAnalyzer from "./HttpGrammarAnalyzer";

export default interface HttpGrammarElement {
    regex: RegExp;
    isConditionPass: (lines: string[], lineNumber: number, braceCounter: number) => boolean;
    onConditionPass: (requests: AutoRestClientRequest[], braceCounter: number) => [AutoRestClientRequest[], number, string?];
    nextElements: HttpGrammarElement[];
    fileAnalyzer: HttpGrammarAnalyzer;
    [name: string]: any;
}