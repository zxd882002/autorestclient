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

    public initializeEnvironment(environmentName: string | undefined) {
        // get environment from environemt.json        
        let sharedUrl: URI = URI.parse(`${this.workspaceFolder}/${SharedFileName}`);
        const sharedContent = fs.readFileSync(sharedUrl.fsPath, 'utf8');
        this.extractEnvironment(sharedContent, SharedFileName);

        // override environment
        if (environmentName !== undefined) {
            environmentName = environmentName.toLocaleLowerCase();
            let environmentFileName = `${EnvironmentFilePrefix}.${environmentName}.${EnvironmentFileSurfix}`;
            let environmentUrl: URI = URI.parse(`${this.workspaceFolder}/${environmentFileName}`);
            const environmentContent = fs.readFileSync(environmentUrl.fsPath, 'utf8');
            this.extractEnvironment(environmentContent, environmentFileName);
        }
    }

    public setEnvironmentValue(environmentKeyName: string, environmentValue: string) {
        if (this.environmentConfigures[environmentKeyName] === undefined) {
            let configureItem: EnvironmentConfigureItem = new EnvironmentConfigureItem(environmentKeyName, environmentValue, undefined);
            this.environmentConfigures[environmentKeyName] = configureItem;
        }
        else {
            this.environmentConfigures[environmentKeyName].configureValue = environmentValue;
        }
    }

    public getEnvironmentValue(environmentKeyName: string): string | undefined {
        if (this.environmentConfigures[environmentKeyName] !== undefined) {
            return this.environmentConfigures[environmentKeyName].configureValue;
        }
        return undefined;
    }

    public saveEnvironment() {
        // group environmentConfigureItem by file path
        let environmentFileNameEnvironmentKeyValueDictionary: Dictionary<string, Dictionary<string, string>> = {};
        for (let key in this.environmentConfigures) {
            if (this.environmentConfigures[key].congigureFileName !== undefined) {
                let environmentConfigureItem = this.environmentConfigures[key];
                let fileName: string = environmentConfigureItem.congigureFileName as string;
                let configureKey: string = environmentConfigureItem.configureName;
                let configureValue: string = environmentConfigureItem.configureValue;
                environmentFileNameEnvironmentKeyValueDictionary[fileName][configureKey] = configureValue;
            }
        }

        for (let filePath in environmentFileNameEnvironmentKeyValueDictionary) {
            // convert json
            let environmentJson: string = JSON.stringify(environmentFileNameEnvironmentKeyValueDictionary[filePath], null, 4);

            // save it
            let fileUri: URI = URI.parse(`${this.workspaceFolder}/${filePath}`);
            console.log(`save file to ${fileUri.fsPath}, data ${environmentJson}`);
            fs.writeFileSync(fileUri.fsPath, environmentJson);
        }
    }

    private extractEnvironment(content: string, path: string) {
        let configureJson = JSON.parse(content);
        for (const key in configureJson) {
            const value = configureJson[key];
            let configureItem: EnvironmentConfigureItem = new EnvironmentConfigureItem(key, value, path);
            this.environmentConfigures[key] = configureItem;
        }
    }
}