import * as vscode from 'vscode';
import { LanguageClient } from "vscode-languageclient/node";

export default class CancelRequestCommandProvider {
    constructor(
        private client: LanguageClient,
        private registerCommand: string,
    ) {
        vscode.commands.registerCommand(this.registerCommand, this.Command);
    };

    get Command() {
        return () => {
            this.client.sendNotification("auto-rest-client.cancelRequest");
        }
    }
}