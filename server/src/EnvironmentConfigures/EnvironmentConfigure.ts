import * as fs from 'fs';
import { URI } from 'vscode-uri';
import EnvironmentConfigureItem from './EnvironmentConfigureItem';
import { Dictionary } from '../OpenContracts/Dictionary';

export const EnvironmentFilePrefix = 'environment';
export const EnvironmentFileSurfix = 'json';
export const SharedFileName = `${EnvironmentFilePrefix}.${EnvironmentFileSurfix}`;

export default class EnvironmentConfigure {
    private environmentConfigures: Dictionary<string, EnvironmentConfigureItem>;
    private workspaceFolder: string;

    public constructor(workspaceFolder: string) {
        this.workspaceFolder = workspaceFolder;
        this.environmentConfigures = {};
    }

    public initializeEnvironment(environmentName: string | undefined,) {
        // get environment from environemt.json        
        let sharedUrl: URI = URI.parse(`${this.workspaceFolder}/${SharedFileName}`);
        const sharedContent = fs.readFileSync(sharedUrl.fsPath, 'utf8');
        this.saveEnvironment(sharedContent, `${SharedFileName}`);

        // override environment
        if (environmentName !== undefined) {
            environmentName = environmentName.toLocaleLowerCase();
            let environmentUrl: URI = URI.parse(`${this.workspaceFolder}/${EnvironmentFilePrefix}.${environmentName}.${EnvironmentFileSurfix}`);
            const environmentContent = fs.readFileSync(environmentUrl.fsPath, 'utf8');
            this.saveEnvironment(environmentContent, `${EnvironmentFilePrefix}.${environmentName}.${EnvironmentFileSurfix}`);
        }
    }

    public setEnvironmentValue(environmentKeyName: string, environmentValue: string, environmentName?: string) {
        let saveFile: string;

        // save on memory
        if (this.environmentConfigures[environmentKeyName] === undefined) {
            saveFile = environmentName === undefined ? `${SharedFileName}` : `${EnvironmentFilePrefix}.${environmentName.toLocaleLowerCase()}.${EnvironmentFileSurfix}`;
            let configureItem: EnvironmentConfigureItem = new EnvironmentConfigureItem(environmentKeyName, environmentValue, saveFile);
            this.environmentConfigures[environmentKeyName] = configureItem;
        }
        else {
            let configureItem: EnvironmentConfigureItem = this.environmentConfigures[environmentKeyName];
            this.environmentConfigures[environmentKeyName].configureValue = environmentValue;
            saveFile = `${configureItem.congigureFileName}`;
        }

        // convert json
        let environmentObject: Dictionary<string, string> = {};
        for (let key in this.environmentConfigures) {
            if (this.environmentConfigures[key].congigureFileName === saveFile) {
                environmentObject[key] = this.environmentConfigures[key].configureValue;
            }
        }
        let environmentData: string = JSON.stringify(environmentObject, null, 4);

        // save it
        let fileUri: URI = URI.parse(`${this.workspaceFolder}/${saveFile}`);
        console.log(`save file to ${fileUri.fsPath}, data ${environmentData}`);
        fs.writeFileSync(fileUri.fsPath, environmentData);
    }

    public getEnvironmentValue(environmentKeyName: string): string | undefined {
        if (this.environmentConfigures[environmentKeyName] !== undefined) {
            return this.environmentConfigures[environmentKeyName].configureValue;
        }
        return undefined;
    }

    private saveEnvironment(content: string, path: string) {
        let configureJson = JSON.parse(content);
        for (const key in configureJson) {
            const value = configureJson[key];
            let configureItem: EnvironmentConfigureItem = new EnvironmentConfigureItem(key, value, path);
            this.environmentConfigures[key] = configureItem;
        }
    }
}