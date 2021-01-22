import AutoRestClientRequest from "../Contracts/AutoRestClientRequest";
import HttpGrammarAnalyzer from "./HttpGrammarAnalyzer";

export interface OnConditionPassResult {
    autoRestClientRequest: AutoRestClientRequest[],
    braceCounter: number,
    environmentName?: string,
    errorString?: string,
}

export default interface HttpGrammarElement {
    regex: RegExp;
    isConditionPass: (lines: string[], lineNumber: number, braceCounter: number) => boolean;
    onConditionPass: (requests: AutoRestClientRequest[], braceCounter: number) => OnConditionPassResult;
    nextElements: HttpGrammarElement[];
    fileAnalyzer: HttpGrammarAnalyzer;
    [name: string]: any;
}