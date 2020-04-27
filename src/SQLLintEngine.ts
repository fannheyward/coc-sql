import { DiagnosticCollection, languages, workspace } from 'coc.nvim';
import { Option, Parser } from 'node-sql-parser';
import { DiagnosticSeverity, Position, Range, TextDocument } from 'vscode-languageserver-protocol';

export class SQLLintEngine {
  private collection: DiagnosticCollection;

  constructor() {
    this.collection = languages.createDiagnosticCollection('sql');
  }

  public async lint(textDocument: TextDocument): Promise<void> {
    if (workspace.match(['sql'], textDocument) <= 0) {
      return;
    }

    this.collection.clear();

    try {
      const database = workspace.getConfiguration('sql').get('database') as string;
      const opt: Option = { database };
      const parser = new Parser();
      parser.parse(textDocument.getText(), opt);
    } catch (err) {
      if (err.name !== 'SyntaxError') {
        return;
      }

      const start = Position.create(err.location.start.line - 1, err.location.start.column);
      const end = Position.create(err.location.end.line - 1, err.location.end.column);
      const range = Range.create(start.line, start.character, end.line, end.character);

      this.collection.set(textDocument.uri, [
        {
          range: range,
          message: err.message,
          severity: DiagnosticSeverity.Error,
          source: 'sql',
          relatedInformation: [],
        },
      ]);
    }
  }
}
