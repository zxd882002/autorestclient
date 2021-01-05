import Request from "../Contracts/Request";

export default interface GrammarAnalyzer {
    analyze(content: string): [Request[], string | undefined];
}