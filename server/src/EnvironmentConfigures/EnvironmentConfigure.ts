import * as fs from 'fs';
import { URI } from 'vscode-uri';
import EnvironmentConfigureItem from './EnvironmentConfigureItem';
import { Dictionary } from '../Contracts/Dictionary';
import DateFormator from '../Utils/DateFormator';
import GuidGenerator from '../Utils/GuidGenerator';

export const EnvironmentFilePrefix = 'environment';
export const EnvironmentFileSurfix = 'json';
export const SharedFileName = `${EnvironmentFilePrefix}.${EnvironmentFileSurfix}`;

export default class EnvironmentConfigure {
    private environmentConfigures: Dictionary<string, EnvironmentConfigureItem>;
    private workspaceFolder: string;

    public constructor() {
        this.environmentConfigures = {};
        this.workspaceFolder = "";
    }

    public initializeEnvironment(workspaceFolder: string, environmentName: string | undefined) {
        this.workspaceFolder = workspaceFolder;

        // get environment from environemt.json        
        let sharedUrl: URI = URI.parse(`${workspaceFolder}/${SharedFileName}`);
        const sharedContent = fs.readFileSync(sharedUrl.fsPath, 'utf8');
        this.extractEnvironment(sharedContent, SharedFileName);

        // override environment
        if (environmentName !== undefined) {
            environmentName = environmentName.toLocaleLowerCase();
            let environmentFileName = `${EnvironmentFilePrefix}.${environmentName}.${EnvironmentFileSurfix}`;
            let environmentUrl: URI = URI.parse(`${workspaceFolder}/${environmentFileName}`);
            const environmentContent = fs.readFileSync(environmentUrl.fsPath, 'utf8');
            this.extractEnvironment(environmentContent, environmentFileName);
        }

        // initialize internal environment value
        this.extractInternalEnvironment();
    }

    public setEnvironmentValue(environmentKeyName: string, environmentValue: string) {
        if (this.environmentConfigures[environmentKeyName] === undefined) {
            this.extract(environmentKeyName, () => environmentValue);
        }
        else {
            this.environmentConfigures[environmentKeyName].configureValue = () => environmentValue;
        }
    }

    public getEnvironmentValue(environmentKeyName: string, parameter?: string): string | undefined {
        if (this.environmentConfigures[environmentKeyName] !== undefined) {
            return this.environmentConfigures[environmentKeyName].configureValue(parameter);
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
                let configureValue: string = environmentConfigureItem.configureValue();
                let environmentKeyValueDictionary = environmentFileNameEnvironmentKeyValueDictionary[fileName];
                if (environmentKeyValueDictionary === undefined) {
                    environmentFileNameEnvironmentKeyValueDictionary[fileName] = {};
                    environmentKeyValueDictionary = environmentFileNameEnvironmentKeyValueDictionary[fileName];
                }
                environmentKeyValueDictionary[configureKey] = configureValue;
            }
        }

        for (let filePath in environmentFileNameEnvironmentKeyValueDictionary) {
            // convert json
            let environmentJson: string = JSON.stringify(environmentFileNameEnvironmentKeyValueDictionary[filePath], null, 4);

            // save it
            let fileUri: URI = URI.parse(`${this.workspaceFolder}/${filePath}`);
            //console.log(`save file to ${fileUri.fsPath}, data ${environmentJson}`);
            fs.writeFileSync(fileUri.fsPath, environmentJson);
        }
    }

    private extractEnvironment(content: string, path: string) {
        let configureJson = JSON.parse(content);
        for (const key in configureJson) {
            const value = configureJson[key];
            this.extract(key, () => value, path);
        }
    }

    private extractInternalEnvironment() {
        this.extract("guid", () => {
            return GuidGenerator.newGuid();
        });

        this.extract("now", (format?: string) => {
            return DateFormator.formatDate(new Date(), format);
        });

        this.extract("random", (format?: string) => {
            if (format != undefined) {
                let [min, max] = format.split(',');

                let minNum = Number(min);
                let maxNum = Number(max);
                if (minNum < maxNum)
                    return (Math.floor(Math.random() * (maxNum - minNum)) + minNum).toString();
                return Math.random().toString();
            }
            return Math.random().toString();
        });
    }

    private extract(environmentKeyName: string, environmentValue: (parameter?: string) => string, configureFileName?: string) {
        let configureItem: EnvironmentConfigureItem = new EnvironmentConfigureItem(environmentKeyName, environmentValue, configureFileName);
        this.environmentConfigures[environmentKeyName] = configureItem;
    }
}