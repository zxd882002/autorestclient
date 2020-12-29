import { Range, TextDocument } from "vscode-languageserver-textdocument";
import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import Request, { RequestHeaders } from "../Contracts/Request";
import RequestResponseCollection from "../Contracts/RequestResponseCollection";
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
export const PlaceHolderRegexRegex = /{(?<property>\w+?)}/g;
export const UrlSplitRegex = /\/(?<content>\w+)/g;

export default class HttpGrammarAnalyzer implements GrammarAnalyzer {

    getRequestRange(document: TextDocument): Range[] {
        let ranges = [];
        let lines: string[] = document.getText().split(LineSplitterRegex);
        let startLine: number = 0;
        let endLine: number = 0;
        while (endLine <= lines.length - 1) {
            let [start, end] = this.expandRequestLines(lines, startLine, endLine);

            let range: Range = {
                start: { line: start, character: 0 },
                end: { line: end, character: 0 }
            };
            ranges.push(range);

            for (start = end + 1; start <= lines.length - 1; start++) {
                let line = lines[start];
                if (this.isStartLine(line)) {
                    startLine = start;
                    endLine = start;
                    break;
                }
            }

            if (start > lines.length - 1)
                break;
        }
        return ranges;
    }

    getAllRequestRange(document: TextDocument): Range {
        let lines: string[] = document.getText().split(LineSplitterRegex);
        let range: Range = {
            start: { line: 0, character: 0 },
            end: { line: lines.length - 1, character: 0 }
        };
        return range;
    }

    convertToRequests(document: TextDocument, range: Range, environmentConfigure: EnvironmentConfigure): RequestResponseCollection {
        // if the range doesn't cover the whole request, need to expand the request line
        let lines: string[] = document.getText().split(LineSplitterRegex);
        let [start, end] = this.expandRequestLines(lines, range.start.line, range.end.line);
        lines = lines.slice(start, end + 1);

        // split the requests
        let requests: { [requestName: string]: Request } = {};
        let startLineNumber = 0;
        let endLineNumber = 0;
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            let line: string = lines[lineNumber];
            if (line.match(RequestSplitRegex) || lineNumber == lines.length - 1) {
                endLineNumber = lineNumber;
                let requestLines: string[] = lines.slice(startLineNumber, endLineNumber + 1);
                let request: Request = this.convertToRequest(requestLines, environmentConfigure);
                requests[request.name] = request;
                startLineNumber = lineNumber + 1;
            }
        }

        let requestResponseCollection: RequestResponseCollection = new RequestResponseCollection(requests);
        return requestResponseCollection;
    }

    getEnvironmentString(document: TextDocument): string | undefined {
        let documentLines: string[] = document.getText().split(LineSplitterRegex);
        for (let lineNumber: number = 0; lineNumber < documentLines.length; lineNumber++) {
            let line: string = documentLines[lineNumber];
            let match: RegExpMatchArray | null = line.match(RequestEnvironmentRegex);
            if (match && match.groups) {
                let environmentName = match.groups["envName"];
                console.log(`got the env name from top line: ${environmentName}`);
                return environmentName.toLocaleLowerCase();
            }
            else if (line.match(EmptyLineRegex)) {
                continue;
            }
            else {
                break;
            }
        }
        return undefined;
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

        let braceCount = 0;

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
                braceCount += line.match(/\{/g)?.length ?? 0;
                braceCount -= line.match(/\}/g)?.length ?? 0;
                body += this.replaceEnvironmentValue(line, environmentConfigure);
            }

            const isMatchEnd: boolean = BodyScriptEndRegex.test(line);
            if (isMatchEnd) {
                if (collectBody && braceCount == 0) {
                    collectBody = false;
                }
                else {
                    collectBeforeScript = false;
                    collectAfterScript = false;
                }
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
            const property = match.groups.property;
            const [propertyName, parameter] = property.split("|");
            const value = environmentConfigure.getEnvironmentValue(propertyName, parameter);
            if (value !== undefined) {
                text = text.replace(`{${property}}`, value);
            }
            match = PlaceHolderRegexRegex.exec(text);
        }
        return text;
    }

    private expandRequestLines(lines: string[], startLineNumber: number, endLineNumber: number): [number, number] {
        // find start 
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
                    startLineNumber = tempStartLineNumber;
                    break;
                }
            }
        }

        if (!foundNearestStartLine) {
            throw new Error("Not found nearest start line");
        }

        // find end
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
        return [startLineNumber, endLineNumber];
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