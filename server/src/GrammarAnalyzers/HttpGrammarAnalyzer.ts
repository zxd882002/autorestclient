import { Range, TextDocument } from "vscode-languageserver-textdocument";
import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import { RequestCollection } from "../OpenContracts/RequestCollection";
import GrammarAnalyzer from "./GrammarAnalyzer";

export const LineSplitterRegex: RegExp = /\r?\n/;
export const RequestNameRegex: RegExp = /^@Name\s+(?<requestName>\w+)\s*$/;
export const RequestEnvironmentRegex: RegExp = /^@Env\s+(?<envName>\w+)\s*$/;
export const RequestSplitRegex: RegExp = /^\s*###+\s*$/;
export const RequestLine: RegExp = /^(?:(?<method>get|post|put|delete|patch|head|options|connect|trace)\s+)(?<url>.+?)(?:\s+(HTTP)\/(\d+.\d+))?$/i;
export const HeaderLine: RegExp = /^(?<headerName>[\w\-]+)\s*(\:)\s*(?<headerValue>.*?)\s*$/;
export const EmptyLine: RegExp = /^\s*$/;
export const BodyStart: RegExp = /^\s*{\s*$/;
export const ScriptStart: RegExp = /^\s*@{\s*$/;
export const BodyScriptEnd: RegExp = /^\s*}\s*$/;

export default class HttpGrammarAnalyzer implements GrammarAnalyzer {

    getRequestRange(document: TextDocument): Range[] {
        let ranges = [];

        let lines: string[] = document.getText().split(LineSplitterRegex);
        let startLine: number = -1;
        let endLine: number = -1;
        for (let lineNumber: number = 0; lineNumber < lines.length; lineNumber++) {
            let line: string = lines[lineNumber];

            if (startLine === -1) {
                // search start line
                if (line.match(RequestNameRegex)) {
                    startLine = lineNumber;
                }
                else if (line.match(ScriptStart)) {
                    startLine = lineNumber;
                }
                else if (line.match(RequestLine)) {
                    startLine = lineNumber;
                }
                else if (line.match(RequestSplitRegex)) {
                    startLine = lineNumber + 1;
                }
            }
            else if (endLine === -1) {
                // search end line
                if (line.match(RequestSplitRegex)) {
                    endLine = lineNumber - 1;

                    let range: Range = {
                        start: { line: startLine, character: 0 },
                        end: { line: endLine, character: 0 }
                    };
                    console.log(`1: startLine = ${startLine}, endLine = ${endLine}`);
                    ranges.push(range);

                    startLine = -1;
                    endLine = -1;
                }
            }
        }
        if (startLine !== -1 && endLine === -1) {
            endLine = lines.length;
            if (startLine < endLine) {
                let range: Range = {
                    start: { line: startLine, character: 0 },
                    end: { line: endLine, character: 0 }
                };
                console.log(`2: startLine = ${startLine}, endLine = ${endLine}`);
                ranges.push(range);
            }
        }

        return ranges;
    }

    convertToRequests(document: TextDocument, range: Range, environmentConfigure: EnvironmentConfigure): RequestCollection | undefined {
        let lines: string[] = document.getText().split(LineSplitterRegex);
        throw new Error("Method not implemented.");
    }

    getEnvironmentString(document: TextDocument, range: Range): string | undefined {
        let lines: string[] = document.getText().split(LineSplitterRegex);
        let environmentName: string | undefined = undefined;

        // get the name from range
        for (let lineNumber: number = range.start.line; lineNumber < range.end.line; lineNumber++) {
            let line: string = lines[lineNumber];
            let match: RegExpMatchArray | null = line.match(RequestEnvironmentRegex);
            if (match && match.groups) {
                environmentName = match.groups["envName"];
                console.log(`got the env name from range: ${environmentName}`);
                break;
            }
        }

        // if the environment name is not defined, check the document first line
        if (environmentName === undefined) {
            for (let lineNumber: number = 0; lineNumber < lines.length; lineNumber++) {
                let line: string = lines[lineNumber];
                let match: RegExpMatchArray | null = line.match(RequestEnvironmentRegex);
                if (match && match.groups) {
                    environmentName = match.groups["envName"];
                    console.log(`got the env name from top line: ${environmentName}`);
                    break;
                }
                else if (line.match(EmptyLine)) {
                    continue;
                }
                else {
                    break;
                }
            }
        }

        return environmentName === undefined ? environmentName : environmentName.toLocaleLowerCase();
    }
}