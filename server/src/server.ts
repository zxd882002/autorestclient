import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  CodeLensParams,
  CodeLens,
  Range,
  WorkspaceFolder,
  TextDocumentPositionParams,
  Hover
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import Engine from './Engine';

export default class Server {
  private workspaceFolders: WorkspaceFolder[] | null;
  private engine: Engine;
  private documentContent: string;
  private connection: any;
  private documents: TextDocuments<TextDocument>;
  private isRequestCalling: boolean;

  constructor() {
    this.workspaceFolders = [];
    this.engine = {} as Engine;
    this.documentContent = "";
    this.connection = createConnection(ProposedFeatures.all);
    this.documents = new TextDocuments(TextDocument);
    this.isRequestCalling = false;

    this.connection.onInitialize((params: InitializeParams) => {
      // pre-condition
      this.workspaceFolders = params.workspaceFolders;
      if (this.workspaceFolders === null) {
        throw new Error("workSpaceFolders is null");
      }

      this.engine = new Engine(this.workspaceFolders[0].uri);

      return {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          codeLensProvider: {
            resolveProvider: false
          },
          hoverProvider: true
        }
      };
    });

    this.connection.onCodeLens((codelensParam: CodeLensParams): CodeLens[] => {
      let codeLenses: CodeLens[] = [];
      if (!this.isRequestCalling) {
        this.documentContent = (this.documents.get(codelensParam.textDocument.uri) as TextDocument).getText();
        // run one request
        let requestRanges: Range[] = this.engine.getRequestRange(this.documentContent);
        for (const requestRange of requestRanges) {
          let requestCodeLens: CodeLens = {
            range: requestRange,
            command: {
              arguments: [requestRange],
              title: 'Send Request',
              command: 'auto-rest-client.request'
            }
          };
          codeLenses.push(requestCodeLens);
        }

        // run all
        let allRequstRange: Range = this.engine.getAllRequestRange(this.documentContent);
        let allRequestcodeLens: CodeLens = {
          range: allRequstRange,
          command: {
            arguments: [allRequstRange],
            title: 'Send All Request',
            command: 'auto-rest-client.requestAll'
          }
        };
        codeLenses.push(allRequestcodeLens);
      }
      else {
        // cancel
        let allRequstRange: Range = this.engine.getAllRequestRange(this.documentContent);
        let allRequestcodeLens: CodeLens = {
          range: allRequstRange,
          command: {
            arguments: [allRequstRange],
            title: 'Cancel Request',
            command: 'auto-rest-client.cancelRequest'
          }
        };
        codeLenses.push(allRequestcodeLens);
      }
      return codeLenses;
    });

    this.connection.onNotification("auto-rest-client.request", async ([range, message]: [Range, string]) => {
      try {
        console.log(`start ${message}...`);
        this.isRequestCalling = true;
        this.connection.sendNotification("auto-rest-client.onRequesting");
        let response: string = await this.engine.execute(this.documentContent, range);
        this.isRequestCalling = false;
        console.log(`${message} completed!`);

        // call back
        this.connection.sendNotification("auto-rest-client.onRequestComplete");
        this.connection.sendNotification("auto-rest-client.response", response);
      }
      catch (e) {
        this.isRequestCalling = false;
        this.connection.sendNotification("auto-rest-client.onRequestComplete");
        console.log(e.toString());
      }
    });

    this.connection.onNotification("auto-rest-client.cancelRequest", () => {
      try {
        console.log("start cancel request...");
        this.engine.cancel();
        console.log("request cancelled!");
      }
      catch (e) {
        console.log(e.toString());
      }
    })

    this.connection.onHover((params: TextDocumentPositionParams): Hover | undefined => {
      this.documentContent = (this.documents.get(params.textDocument.uri) as TextDocument).getText();
      let [configurationItem, parameter] = this.engine.getEnvironmentConfigureItem(this.documentContent, params.position.line, params.position.character);
      if (configurationItem === undefined) {
        return undefined;
      }
      return {
        contents: [
          `**${configurationItem.configureName}**`,
          `value: ${configurationItem.configureValue(parameter)}`,
          `path: ${configurationItem.congigureFileName ?? "Internal Variable"}`
        ],
      };
    })
  }

  main() {
    this.documents.listen(this.connection);
    this.connection.listen()
  }
}

new Server().main();