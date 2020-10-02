import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  CodeLensParams, 
  CodeLens, 
  Range
} from 'vscode-languageserver';

import { TextDocument } from 'vscode-languageserver-textdocument';

let connection = createConnection(ProposedFeatures.all);

let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      codeLensProvider: {
        resolveProvider: false
      }
    }
  };
});

export const LineSplitterRegex: RegExp = /\r?\n/g;

connection.onCodeLens((codelensParam: CodeLensParams): CodeLens[] => {
  let codeLenses: CodeLens[] = [];
  let document: TextDocument = documents.get(codelensParam.textDocument.uri) as TextDocument;
  let lines = document.getText().split(LineSplitterRegex);
  let range: Range =
  {
    start: { line: 0, character: 0 },
    end: { line: lines.length, character: 0 }
  };
  let codeLens: CodeLens = {
    range: range,
    command: {
      arguments: [lines],
      title: 'Send Request',
      command: 'auto-rest-client.request'
    }
  };  
  codeLenses.push(codeLens);
  return codeLenses;
});

documents.listen(connection);

connection.listen();