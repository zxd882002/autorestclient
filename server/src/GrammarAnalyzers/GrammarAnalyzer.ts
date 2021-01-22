import GrammarAnalyzerResult from "./GrammarAnalyzerResult";

export default interface GrammarAnalyzer {
    analyze(content: string): GrammarAnalyzerResult;
    getLine(content: string, lineNumber: number): string | undefined;
}