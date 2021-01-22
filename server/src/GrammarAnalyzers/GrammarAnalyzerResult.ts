import AutoRestClientRequest from "../Contracts/AutoRestClientRequest";

export default class GrammarAnalyzerResult {
    constructor(
        public requests: AutoRestClientRequest[],
        public environmentName: string | undefined,
        public errorLine: number | undefined,
        public errorMessage: string | undefined
    ) { }
}