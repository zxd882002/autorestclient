import AutoRestClientRequest from "../Contracts/AutoRestClientRequest";

export default interface GrammarAnalyzer {
    analyze(content: string): [AutoRestClientRequest[], string | undefined];
    getLine(content: string, lineNumber: number): string | undefined;
}