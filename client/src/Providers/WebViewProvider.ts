import * as vscode from 'vscode';
import * as fs from 'fs';

export default class WebViewProvider {
    public async displayOnWebView(response: string): Promise<void> {
        try {
            let now = new Date();
            let year = now.getFullYear().toString();
            let month = (now.getMonth() + 1).toString();
            let day = now.getDate().toString();
            let hour = now.getHours().toString();
            let minute = now.getMinutes().toString();
            let second = now.getSeconds().toString();

            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;
            if (hour.length < 2) hour = '0' + hour;
            if (minute.length < 2) minute = '0' + minute;
            if (second.length < 2) second = '0' + second;

            let workspaceFolder = vscode.workspace.workspaceFolders[0].uri;
            let responseFolder = vscode.Uri.parse(`${workspaceFolder}/Responses/`);
            if (!fs.existsSync(responseFolder.fsPath)) {
                fs.mkdirSync(responseFolder.fsPath);
            }
            let archiveFolder = vscode.Uri.parse(`${responseFolder}/${year}${month}${day}`)
            if (!fs.existsSync(archiveFolder.fsPath)) {
                fs.mkdirSync(archiveFolder.fsPath);
            }
            let fileUri = vscode.Uri.parse(`${archiveFolder}/Response_${year}${month}${day}_${hour}${minute}${second}.json`);
            fs.writeFileSync(fileUri.fsPath, response);

            let responseDocument = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(responseDocument)
        } catch (reason) {
            vscode.window.showErrorMessage(reason);
        }
    }
}