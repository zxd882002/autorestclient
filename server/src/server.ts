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
import TimeDelayer from './Utils/TimeDelayer';

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

  // one request
  let requestRanges: Range[] = engine.getRequestRange(document);
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
  let allRequstRange: Range = engine.getAllRequestRange(document);
  let allRequestcodeLens: CodeLens = {
    range: allRequstRange,
    command: {
      arguments: [allRequstRange],
      title: 'Send All Request',
      command: 'auto-rest-client.requestAll'
    }
  };
  codeLenses.push(allRequestcodeLens);
  return codeLenses;
});

connection.onNotification("auto-rest-client.request", async (range: Range) => {
  try {
    console.log("start request...");
    let response: string = await engine.execute(document, range);
    console.log("completed!");

    // call back
    connection.sendNotification("auto-rest-client.response", response);
  }
  catch (e) {
    console.log(e.toString());
  }
})

connection.onNotification("auto-rest-client.requestAll", async (range: Range) => {
  try {
    console.log("start request all...");
    let response: string = await engine.execute(document, range);
    console.log("completed!");

    // call back
    connection.sendNotification("auto-rest-client.responseAll", response);
  }
  catch (e) {
    console.log(e.toString());
  }
})

for (let i = 1; i < 10; i++) {
  try {
    documents.listen(connection);
    connection.listen();
    break;
  }
  catch (e) {
    console.log(e.toString());
    TimeDelayer.delay(2000);
  }
}