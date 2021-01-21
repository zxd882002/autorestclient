import * as vscode from 'vscode';
import { LanguageClient, Range } from "vscode-languageclient/node";
import TriggerableCodeLensProvider from "./TriggerableCodeLensProvider";
import WebViewProvider from './WebViewProvider';

export default class RequestCommandProvider {

    constructor(
        private client: LanguageClient,
        private triggerableCodeLensProvider: TriggerableCodeLensProvider,
        private webViewProvider: WebViewProvider,
        private registerCommand: string,
        private message: string
    ) {
        vscode.commands.registerCommand(this.registerCommand, this.Command);
    };

    get Command() {
        return (range: Range) => {
            let msg = this.message;
            this.client.sendNotification("auto-rest-client.request", [range, msg]);
            this.client.onNotification("auto-rest-client.onRequesting", () => {
                this.triggerableCodeLensProvider.onDidChangeConfiguration(null);
            });
            this.client.onNotification("auto-rest-client.onRequestComplete", () => {
                this.triggerableCodeLensProvider.onDidChangeConfiguration(null);
            })
            this.client.onNotification("auto-rest-client.response", (response) => {
                this.webViewProvider.displayOnWebView(response,);
            });
        };
    }
}