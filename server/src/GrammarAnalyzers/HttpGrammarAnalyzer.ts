import * as fs from 'fs';
import AutoRestClientRequest from "../Contracts/AutoRestClientRequest";
import GuidGenerator from "../Utils/GuidGenerator";
import HttpGrammarElement from "./HttpGrammarElement";
import { URI } from "vscode-uri";
import GrammarAnalyzer from './GrammarAnalyzer';
import Engine from '../Engine';
import { stringify } from 'querystring';

export default class HttpGrammarAnalyzer implements GrammarAnalyzer {
    environmentElement: HttpGrammarElement = {
        regex: /^\s*@Env\s+(?<envName>\w+)\s*$/,
        environmentName: String,
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match) {
                this.environmentName = match.groups?.envName.toLocaleLowerCase();
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            return [requests, braceCounter, this.environmentName];
        },
        nextElements: []
    }

    requestNameElement: HttpGrammarElement = {
        regex: /^\s*@Name\s+(?<requestName>\w+)\s*$/,
        name: "",
        lineNumber: Number,
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            this.lineNumber = lineNumber;
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match) {
                this.name = match.groups?.requestName;
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            this.fileAnalyzer.createRequestIfNotExists(requests, this.lineNumber);
            requests[requests.length - 1].name = this.name;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    importFileElement: HttpGrammarElement = {
        regex: /^\s*@File\s+(?<filePath>[^\s]+)\s*$/,
        filePath: "",
        fileAnalyzer: this,
        lineNumber: Number,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            this.lineNumber = lineNumber;
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match) {
                this.filePath = match.groups?.filePath;
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            let innerFileUri = URI.parse(`${this.fileAnalyzer.workspaceFolder}/${this.filePath}`);
            const innerContent = fs.readFileSync(innerFileUri.fsPath, 'utf8');
            let innerRequests = this.fileAnalyzer.engine.analyzeContent(innerContent);
            this.fileAnalyzer.createRequestIfNotExists(requests, this.lineNumber);
            requests[requests.length - 1].innerRequests = innerRequests;
            requests[requests.length - 1].endLine = this.lineNumber;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    beforeScriptStartElement: HttpGrammarElement = {
        regex: /^\s*@{\s*$/,
        lineNumber: Number,
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            this.lineNumber = lineNumber;
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match && braceCounter == 0) {
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            this.fileAnalyzer.createRequestIfNotExists(requests, this.lineNumber);
            braceCounter++;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    beforeScriptContentElement: HttpGrammarElement = {
        regex: /^.*$/,
        line: "",
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            this.line = lines[lineNumber];;
            return true;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            braceCounter += this.line.match(/\{/g)?.length ?? 0;
            braceCounter -= this.line.match(/\}/g)?.length ?? 0;
            requests[requests.length - 1].beforeScript += this.line;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    beforeScriptEndElement: HttpGrammarElement = {
        regex: /^\s*}\s*$/,
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match && braceCounter == 1) {
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            braceCounter--;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    requestLineElement: HttpGrammarElement = {
        regex: /^\s*(?:(?<method>get|post|put|delete|patch|head|options|connect|trace)\s+)(?<url>.+?)(?:\s+(HTTP)\/(\d+.\d+))?$/i,
        lineNumber: Number,
        method: "",
        url: "",
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            this.lineNumber = lineNumber;
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match) {
                this.method = match.groups?.method.toLocaleUpperCase();
                this.url = match.groups?.url;
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            this.fileAnalyzer.createRequestIfNotExists(requests, this.lineNumber);
            let request = requests[requests.length - 1];
            request.method = this.method;
            request.url = this.url;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    requestHeaderLineElement: HttpGrammarElement = {
        regex: /^\s*(?<headerName>[\w\-]+)\s*(\:)\s*(?<headerValue>.*?)\s*$/,
        headerName: "",
        headerValue: "",
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match) {
                this.headerName = match.groups?.headerName;
                this.headerValue = match.groups?.headerValue;
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            let headers = requests[requests.length - 1].headers;
            if (headers === undefined) {
                headers = {};
            }
            headers[this.headerName] = this.headerValue;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    requestBodyStartElement: HttpGrammarElement = {
        regex: /^\s*{\s*$/,
        line: "",
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match && braceCounter == 0) {
                this.line = line;
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            braceCounter++;
            requests[requests.length - 1].body += this.line;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    requestBodyContentElement: HttpGrammarElement = {
        regex: /^.*$/,
        line: "",
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            this.line = lines[lineNumber];;
            return true;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            braceCounter += this.line.match(/\{/g)?.length ?? 0;
            braceCounter -= this.line.match(/\}/g)?.length ?? 0;
            requests[requests.length - 1].body += this.line
            return [requests, braceCounter];
        },
        nextElements: []
    }

    requestBodyEndElement: HttpGrammarElement = {
        regex: /^\s*}\s*$/,
        line: "",
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match && braceCounter == 1) {
                this.line = line;
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            braceCounter--;
            requests[requests.length - 1].body += this.line;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    afterScriptStartElement: HttpGrammarElement = {
        regex: /^\s*@{\s*$/,
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match && braceCounter == 0) {
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            braceCounter++;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    afterScriptContentElement: HttpGrammarElement = {
        regex: /^.*$/,
        line: "",
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            this.line = lines[lineNumber];;
            return true;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            braceCounter += this.line.match(/\{/g)?.length ?? 0;
            braceCounter -= this.line.match(/\}/g)?.length ?? 0;
            requests[requests.length - 1].afterScript += this.line;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    afterScriptEndElement: HttpGrammarElement = {
        regex: /^\s*}\s*$/,
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match && braceCounter == 1) {
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            braceCounter--;
            return [requests, braceCounter];
        },
        nextElements: []
    }

    requestSplitElement: HttpGrammarElement = {
        regex: /^\s*###+\s*$/,
        lineNumber: Number,
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            this.lineNumber = lineNumber;
            let line = lines[lineNumber];
            let match = this.regex.exec(line);
            if (match) {
                return true;
            }
            return false;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            if (requests.length > 0) {
                requests[requests.length - 1].endLine = this.lineNumber - 1;
                this.fileAnalyzer.fillName(requests[requests.length - 1]);
            }
            return [requests, braceCounter];
        },
        nextElements: []
    }

    headerElement: HttpGrammarElement = {
        regex: /^.*$/,
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            return true;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            // do nothing
            return [requests, braceCounter];
        },
        nextElements: []
    }

    endElement: HttpGrammarElement = {
        regex: /^.*$/,
        lineLength: Number,
        fileAnalyzer: this,
        isConditionPass(lines: string[], lineNumber: number, braceCounter: number) {
            this.lineLength = lines.length;
            return true;
        },
        onConditionPass(requests: AutoRestClientRequest[], braceCounter: number) {
            requests[requests.length - 1].endLine = this.lineLength;
            this.fileAnalyzer.fillName(requests[requests.length - 1]);
            return [requests, braceCounter];
        },
        nextElements: []
    }

    constructor(private workspaceFolder: string, private engine: Engine) {
        // header 
        this.headerElement.nextElements.push(this.environmentElement);
        this.headerElement.nextElements.push(this.requestSplitElement);
        this.headerElement.nextElements.push(this.requestNameElement);
        this.headerElement.nextElements.push(this.beforeScriptStartElement);
        this.headerElement.nextElements.push(this.requestLineElement);
        this.headerElement.nextElements.push(this.importFileElement);

        // environmentElement
        this.environmentElement.nextElements.push(this.requestNameElement);
        this.environmentElement.nextElements.push(this.requestSplitElement);
        this.environmentElement.nextElements.push(this.beforeScriptStartElement);
        this.environmentElement.nextElements.push(this.requestLineElement);
        this.environmentElement.nextElements.push(this.importFileElement);

        // requestNameElement
        this.requestNameElement.nextElements.push(this.beforeScriptStartElement);
        this.requestNameElement.nextElements.push(this.requestLineElement);

        // beforeScriptStartElement        
        this.beforeScriptStartElement.nextElements.push(this.beforeScriptEndElement);
        this.beforeScriptStartElement.nextElements.push(this.beforeScriptContentElement);

        // beforeScriptContentElement
        this.beforeScriptContentElement.nextElements.push(this.beforeScriptEndElement);
        this.beforeScriptContentElement.nextElements.push(this.beforeScriptContentElement);

        // beforeScriptEndElement
        this.beforeScriptEndElement.nextElements.push(this.requestLineElement);

        // requestLineElement
        this.requestLineElement.nextElements.push(this.requestHeaderLineElement);
        this.requestLineElement.nextElements.push(this.requestBodyStartElement);
        this.requestLineElement.nextElements.push(this.afterScriptStartElement);
        this.requestLineElement.nextElements.push(this.requestSplitElement);
        this.requestLineElement.nextElements.push(this.endElement);

        // requestHeaderLineElement
        this.requestHeaderLineElement.nextElements.push(this.requestBodyStartElement);
        this.requestHeaderLineElement.nextElements.push(this.afterScriptStartElement);
        this.requestHeaderLineElement.nextElements.push(this.requestSplitElement);
        this.requestHeaderLineElement.nextElements.push(this.endElement);

        // requestBodyStartElement
        this.requestBodyStartElement.nextElements.push(this.requestBodyEndElement);
        this.requestBodyStartElement.nextElements.push(this.requestBodyContentElement);

        // requestBodyContentElement
        this.requestBodyContentElement.nextElements.push(this.requestBodyEndElement);
        this.requestBodyContentElement.nextElements.push(this.requestBodyContentElement);

        // requestBodyEndElement
        this.requestBodyEndElement.nextElements.push(this.afterScriptStartElement);
        this.requestBodyEndElement.nextElements.push(this.requestSplitElement);
        this.requestBodyEndElement.nextElements.push(this.endElement);

        // afterScriptStartElement
        this.afterScriptStartElement.nextElements.push(this.afterScriptEndElement);
        this.afterScriptStartElement.nextElements.push(this.afterScriptContentElement);

        // afterScriptContentElement
        this.afterScriptContentElement.nextElements.push(this.afterScriptEndElement);
        this.afterScriptContentElement.nextElements.push(this.afterScriptContentElement);

        // afterScriptEndElement
        this.afterScriptEndElement.nextElements.push(this.requestSplitElement);
        this.afterScriptEndElement.nextElements.push(this.endElement);

        // requestSplitElement
        this.requestSplitElement.nextElements.push(this.requestSplitElement);
        this.requestSplitElement.nextElements.push(this.requestNameElement);
        this.requestSplitElement.nextElements.push(this.beforeScriptStartElement);
        this.requestSplitElement.nextElements.push(this.requestLineElement);
        this.requestSplitElement.nextElements.push(this.importFileElement);
        this.requestSplitElement.nextElements.push(this.endElement);

        // importFileElement
        this.importFileElement.nextElements.push(this.requestSplitElement);
        this.importFileElement.nextElements.push(this.endElement);
    }

    public analyze(content: string): [AutoRestClientRequest[], string | undefined] {
        let emptyLineRegex = /^\s*$/;
        let lineSplitterRegex = /\r?\n/
        let headerElement = this.headerElement;
        let requests: AutoRestClientRequest[] = [];
        let braceCounter = 0;
        let possibleElements = headerElement.nextElements;
        let environmentName = undefined;
        let lastLineNumber = -1;
        let lines: string[] = content.split(lineSplitterRegex);
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            if (emptyLineRegex.test(lines[lineNumber])) {
                continue;
            }
            else {
                lastLineNumber = lineNumber;
            }

            let foundPossibleElement = false;
            for (let possibleElement of possibleElements) {
                if (possibleElement.isConditionPass(lines, lineNumber, braceCounter)) {
                    let tempEnvironmentName: string | undefined;
                    [requests, braceCounter, tempEnvironmentName] = possibleElement.onConditionPass(requests, braceCounter);
                    if (tempEnvironmentName !== undefined) {
                        environmentName = tempEnvironmentName;
                    }
                    possibleElements = possibleElement.nextElements;
                    foundPossibleElement = true;
                    break;
                }
            }

            if (!foundPossibleElement) {
                console.log(`unexpected grammar is found on line ${lineNumber}: ${lines[lineNumber]}`);
                return [requests, environmentName];
            }
        }

        // handle last line
        let foundPossibleElement = false;
        for (let possibleElement of possibleElements) {
            if (possibleElement.isConditionPass(lines, lastLineNumber, braceCounter)) {
                [requests] = possibleElement.onConditionPass(requests, braceCounter);
                foundPossibleElement = true;
                break;
            }
        }
        if (!foundPossibleElement) {
            console.log(`unexpected grammar is found on line ${lastLineNumber}: ${lines[lastLineNumber]}, the request has not been ended`);
            return [requests, environmentName];
        }

        return [requests, environmentName];
    }

    private createRequestIfNotExists(requests: AutoRestClientRequest[], startLine: number) {
        if (requests.length == 0 || requests[requests.length - 1].endLine != -1) {
            requests.push(new AutoRestClientRequest(startLine));
        }
    }

    private fillName(request: AutoRestClientRequest) {
        if (request.name === "") {
            let urlSplitRegex = /\/(?<content>\w+)/g;
            let match = urlSplitRegex.exec(request.url);
            let name;
            while (match !== null && match.groups !== undefined) {
                name = match.groups.content;
                match = urlSplitRegex.exec(request.url);
            }
            request.name = `${name}_${GuidGenerator.newGuid}`
        }
    }
}