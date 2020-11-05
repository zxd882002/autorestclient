import { TextDocument } from "vscode-languageserver-textdocument";
import GrammarAnalyzer from "./GrammarAnalyzer";
import HttpGrammarAnalyzer from "./HttpGrammarAnalyzer";

//export const LineSplitterRegex: RegExp = /\r?\n/g;
export default class GrammarAnalyzerFactory{
    getGrammarAnalyzer(document: TextDocument):GrammarAnalyzer{
        //let lines = document.getText().split(LineSplitterRegex);
        return new HttpGrammarAnalyzer();
    }
}