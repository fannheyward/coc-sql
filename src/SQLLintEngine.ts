import { DiagnosticCollection, DiagnosticSeverity, languages, Position, Range, TextDocument, workspace } from 'coc.nvim';
import { Option, Parser } from 'node-sql-parser';
import { getDatabase } from './utils';

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
      const database = getDatabase();
      const parser = new Parser();
      const opt: Option = { database };
      console.error(database)
      console.error(textDocument.getText())
      parser.parse(textDocument.getText(), opt);
    } catch (err) {
      console.error('error:', err)
      if (err.name !== 'SyntaxError') {
        return;
      }
      const start = Position.create(err.location.start.line - 1, err.location.start.column - 1);
      const end = Position.create(err.location.end.line - 1, err.location.end.column - 1);
      const range = Range.create(start.line, start.character, end.line, end.character);

      this.collection.set(textDocument.uri, [
        {
          range: range,
          message: err.message,
          severity: DiagnosticSeverity.Error,
          source: 'sql',
          relatedInformation: [],
        }
      ]);
    }
  }
}
