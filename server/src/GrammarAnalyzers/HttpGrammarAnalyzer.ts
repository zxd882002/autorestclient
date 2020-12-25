import { Range, TextDocument } from "vscode-languageserver-textdocument";
import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import Request, { RequestHeaders } from "../OpenContracts/Request";
import RequestResponseCollection from "../OpenContracts/RequestResponseCollection";
import HttpRequestSender from "../RequestSenders/HttpRequestSender";
import TypeScriptExecutor from "../ScriptExecutors/TypeScriptExecutor";
import GrammarAnalyzer from "./GrammarAnalyzer";

export const LineSplitterRegex = /\r?\n/;
export const RequestNameRegex = /^@Name\s+(?<requestName>\w+)\s*$/;
export const RequestEnvironmentRegex = /^@Env\s+(?<envName>\w+)\s*$/;
export const RequestSplitRegex = /^\s*###+\s*$/;
export const RequestLineRegex = /^(?:(?<method>get|post|put|delete|patch|head|options|connect|trace)\s+)(?<url>.+?)(?:\s+(HTTP)\/(\d+.\d+))?$/i;
export const HeaderLineRegex = /^(?<headerName>[\w\-]+)\s*(\:)\s*(?<headerValue>.*?)\s*$/;
export const EmptyLineRegex = /^\s*$/;
export const BodyStartRegex = /^\s*{\s*$/;
export const ScriptStartRegex = /^\s*@{\s*$/;
export const BodyScriptEndRegex = /^\s*}\s*$/;
export const PlaceHolderRegexRegex = /{(?<propertyName>\w+?)}/g;
export const UrlSplitRegex = /\/(?<content>\w+)/g;

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
                if (this.isStartLine(line)) {
                    startLine = lineNumber;
                }
            }
            else if (endLine === -1) {
                // search end line
                if (this.isEndLine(line)) {
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

        // for the last request
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

    convertToRequests(document: TextDocument, range: Range, environmentConfigure: EnvironmentConfigure): RequestResponseCollection {
        // if the range doesn't cover the whole request, need to expand the request line
        let lines: string[] = this.expandRequestLines(document, range);
        let requests: { [requestName: string]: Request } = {};

        // split the requests
        let startLineNumber = 0;
        let endLineNumber = 0;
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            let line: string = lines[lineNumber];
            if (line.match(RequestSplitRegex) || lineNumber == lines.length - 1) {
                endLineNumber = lineNumber;
                let requestLines: string[] = lines.splice(startLineNumber, endLineNumber);
                let request: Request = this.convertToRequest(requestLines, environmentConfigure);
                requests[request.name] = request;
                startLineNumber = lineNumber + 1;
            }
        }

        let requestResponseCollection: RequestResponseCollection = new RequestResponseCollection(requests, new HttpRequestSender(), new TypeScriptExecutor());
        return requestResponseCollection;
    }

    getEnvironmentString(document: TextDocument, range: Range): string | undefined {
        let requestLines: string[] = this.expandRequestLines(document, range);
        let environmentName: string | undefined = undefined;

        // get the name from range
        for (let lineNumber: number = 0; lineNumber < requestLines.length; lineNumber++) {
            let line: string = requestLines[lineNumber];
            let match: RegExpMatchArray | null = line.match(RequestEnvironmentRegex);
            if (match && match.groups) {
                environmentName = match.groups["envName"];
                console.log(`got the env name from range: ${environmentName}`);
                break;
            }
        }

        // if the environment name is not defined, check the document first line
        if (environmentName === undefined) {
            let documentLines: string[] = document.getText().split(LineSplitterRegex);
            for (let lineNumber: number = 0; lineNumber < documentLines.length; lineNumber++) {
                let line: string = documentLines[lineNumber];
                let match: RegExpMatchArray | null = line.match(RequestEnvironmentRegex);
                if (match && match.groups) {
                    environmentName = match.groups["envName"];
                    console.log(`got the env name from top line: ${environmentName}`);
                    break;
                }
                else if (line.match(EmptyLineRegex)) {
                    continue;
                }
                else {
                    break;
                }
            }
        }

        return environmentName === undefined ? environmentName : environmentName.toLocaleLowerCase();
    }

    private convertToRequest(lines: string[], environmentConfigure: EnvironmentConfigure): Request {
        console.log(lines);

        let name: string = "";
        let method: string = "";
        let url: string = "";
        let headers: RequestHeaders = {};
        let body: string = "";
        let beforeScript: string = "";
        let afterScript: string = "";

        let scriptPosition: string = "before"; // before, after
        let collectBody: boolean = false;
        let collectBeforeScript: boolean = false;
        let collectAfterScript: boolean = false;

        lines.forEach(line => {
            const isMatchRequestNameLine: RegExpMatchArray | null = line.match(RequestNameRegex)
            if (isMatchRequestNameLine !== null && isMatchRequestNameLine.groups) {
                name = isMatchRequestNameLine.groups["requestName"];
            }

            const isMatchRequestLine: RegExpMatchArray | null = line.match(RequestLineRegex);
            if (isMatchRequestLine !== null && isMatchRequestLine.groups) {
                method = isMatchRequestLine.groups["method"];
                url = this.replaceEnvironmentValue(isMatchRequestLine.groups["url"], environmentConfigure);
                scriptPosition = "after";
                return;
            }

            const isMatchHeaderLine: RegExpMatchArray | null = line.match(HeaderLineRegex);
            if (isMatchHeaderLine !== null && isMatchHeaderLine.groups) {
                let fieldName: string = isMatchHeaderLine.groups["headerName"];
                let fieldValue: string = isMatchHeaderLine.groups["headerValue"];
                headers[fieldName] = this.replaceEnvironmentValue(fieldValue, environmentConfigure);
                return;
            }

            const isMatchBodyStart: boolean = BodyStartRegex.test(line);
            if (isMatchBodyStart) {
                collectBody = true;
            }

            const isMatchScriptStart: boolean = ScriptStartRegex.test(line);
            if (isMatchScriptStart) {
                if (scriptPosition === "before") {
                    collectBeforeScript = true;
                } else {
                    collectAfterScript = true;
                }

                return;
            }

            if (collectBody) {
                body += this.replaceEnvironmentValue(line, environmentConfigure);
            }

            const isMatchEnd: boolean = BodyScriptEndRegex.test(line);
            if (isMatchEnd) {
                collectBody = false;
                collectBeforeScript = false;
                collectAfterScript = false;
            }

            if (collectBeforeScript) {
                beforeScript += line;
                beforeScript += "\r\n";
            }

            if (collectAfterScript) {
                afterScript += line;
                afterScript += "\r\n";
            }
        });

        // if the name is not given. use the url as name
        if (name === "") {
            let match = UrlSplitRegex.exec(url);
            while (match !== null && match.groups !== undefined) {
                name = match.groups.content;
                match = UrlSplitRegex.exec(url);
            }

            name = `${name}_${Math.floor(Math.random() * 1000) + 1}`
        }

        return new Request(name, method, url, headers, body, beforeScript, afterScript);
    }

    private replaceEnvironmentValue(text: string, environmentConfigure: EnvironmentConfigure): string {
        let match = PlaceHolderRegexRegex.exec(text);
        while (match !== null && match.groups !== undefined) {
            const propertyName = match.groups.propertyName;
            const value = environmentConfigure.getEnvironmentValue(propertyName);
            if (value !== undefined) {
                text = text.replace(`{${propertyName}}`, value);
            }
            match = PlaceHolderRegexRegex.exec(text);
        }
        return text;
    }

    private expandRequestLines(document: TextDocument, range: Range): string[] {
        let lines: string[] = document.getText().split(LineSplitterRegex);


        // find start 
        let startLineNumber: number = range.start.line;
        let selectedStartLine: string = lines[startLineNumber];
        let foundNearestStartLine: boolean = this.isStartLine(selectedStartLine);
        if (!foundNearestStartLine) {
            // search ahead            
            for (let tempStartLineNumber = startLineNumber - 1; tempStartLineNumber >= 0; tempStartLineNumber--) {
                let startLine: string = lines[tempStartLineNumber];
                if (this.isStartLine(startLine)) {
                    foundNearestStartLine = true;
                    startLineNumber = tempStartLineNumber;
                    break;
                }
            }
        }
        if (foundNearestStartLine) {
            // search ahead to find the real start line            
            for (let tempStartLineNumber: number = startLineNumber - 1; tempStartLineNumber >= 0; tempStartLineNumber--) {
                let startLine: string = lines[tempStartLineNumber];
                if (!this.isStartLine(startLine)) {
                    startLineNumber = tempStartLineNumber + 1;
                    break;
                }
            }
        } else {
            // search the next start line
            for (let tempStartLineNumber: number = startLineNumber + 1; tempStartLineNumber < lines.length; tempStartLineNumber++) {
                let startLine: string = lines[tempStartLineNumber];
                if (this.isStartLine(startLine)) {
                    foundNearestStartLine = true;
                    startLineNumber = tempStartLineNumber + 1;
                    break;
                }
            }
        }

        if (!foundNearestStartLine) {
            return [];
        }

        // find end
        let endLineNumber: number = range.end.line;
        let foundNearestEndLine: boolean = false;
        for (let tempEndLineNumber = endLineNumber + 1; tempEndLineNumber < lines.length; tempEndLineNumber++) {
            let endLine: string = lines[tempEndLineNumber];
            if (endLine.match(EmptyLineRegex)) {
                continue;
            }
            if (this.isEndLine(endLine)) {
                foundNearestEndLine = true;
                endLineNumber = tempEndLineNumber - 1;
            }
        }

        if (!foundNearestEndLine) {
            foundNearestEndLine = true;
            endLineNumber = lines.length - 1;
        }

        console.log(`start = ${startLineNumber}, end = ${endLineNumber}`)
        return lines.slice(startLineNumber, endLineNumber + 1);
    }

    private isStartLine(line: string): boolean {
        let isStartLine: boolean = false;
        if (line.match(RequestNameRegex)) {
            isStartLine = true;
        }
        else if (line.match(ScriptStartRegex)) {
            isStartLine = true;
        }
        else if (line.match(RequestLineRegex)) {
            isStartLine = true;
        }
        return isStartLine;
    }

    private isEndLine(line: string): boolean {
        return line.match(RequestSplitRegex) !== null;
    }
}