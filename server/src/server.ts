import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  CodeLensParams,
  CodeLens,
  Range,
  WorkspaceFolder
} from 'vscode-languageserver';

import { TextDocument } from 'vscode-languageserver-textdocument';
import Engine from './Engine';
import EnvironmentConfigure from './EnvironmentConfigures/EnvironmentConfigure';
import GrammarAnalyzerFactory from './GrammarAnalyzers/grammarAnalyzerFactory';

let connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
let workspaceFolders: WorkspaceFolder[] | null;
let engine: Engine;
let document: TextDocument;

connection.onInitialize((params: InitializeParams) => {
  // pre-condition
  workspaceFolders = params.workspaceFolders;
  if (workspaceFolders === null) {
    throw new Error("workSpaceFolders is null");
  }

  engine = new Engine(workspaceFolders[0].uri);

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      codeLensProvider: {
        resolveProvider: false
      }
    }
  };
});

connection.onCodeLens((codelensParam: CodeLensParams): CodeLens[] => {
  document = documents.get(codelensParam.textDocument.uri) as TextDocument;

  let codeLenses: CodeLens[] = [];
  let ranges: Range[] = engine.getRequestRange(document);
  for (const range of ranges) {
    let codeLens: CodeLens = {
      range: range,
      command: {
        arguments: [range],
        title: 'Send Request',
        command: 'auto-rest-client.request'
      }
    };
    codeLenses.push(codeLens);
  }

  return codeLenses;
});

connection.onNotification("auto-rest-client.request", async (range: Range) => {
  try {
    console.log("start request: ");
    let response: string = await engine.execute(document, range);

    // call back
    connection.sendNotification("auto-rest-client.response", response);
  }
  catch (e) {
    console.log(e);
  }
})

documents.listen(connection);

connection.listen();