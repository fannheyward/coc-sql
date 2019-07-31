import { DiagnosticCollection, languages, workspace } from 'coc.nvim';
import { Parser } from 'node-sql-parser';
import { DiagnosticSeverity, Position, Range, TextDocument } from 'vscode-languageserver-protocol';

export class SQLLintEngine {
  private collection: DiagnosticCollection;

  constructor() {
    this.collection = languages.createDiagnosticCollection('sql');
  }

  public async lint(e: TextDocument): Promise<void> {
    if (workspace.match(['sql'], e) <= 0) {
      return;
    }

    this.collection.clear();

    try {
      const parser = new Parser();
      parser.parse(e.getText());
    } catch (err) {
      if (err.name !== 'SyntaxError') {
        return;
      }

      const start = Position.create(err.location.start.line - 1, err.location.start.column);
      const end = Position.create(err.location.end.line - 1, err.location.end.column);
      const range = Range.create(start.line, start.character, end.line, end.character);

      this.collection.set(e.uri, [
        {
          range: range,
          message: err.message,
          severity: DiagnosticSeverity.Error,
          source: 'sql',
          relatedInformation: []
        }
      ]);
    }
  }
}
