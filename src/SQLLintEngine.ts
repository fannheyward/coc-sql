import { DiagnosticCollection, DiagnosticSeverity, languages, Position, Range, TextDocument, workspace } from 'coc.nvim';
import { Option, Parser } from 'node-sql-parser';
import Module from 'pg-query-emscripten';
import { getDatabase } from './utils';

export class SQLLintEngine {
  private collection: DiagnosticCollection;
  private pgQuery;

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
      if (database === 'postgresql') {
        if (this.pgQuery === undefined){
          this.pgQuery = await new Module();
        }
        // We use pg-query-parser for PostgreSQL
        const result = this.pgQuery.parse(textDocument.getText());
        if (result.error) {
          const { error } = result;
          const cursorPosition = error.cursorpos;
          error.range = {
            start: textDocument.positionAt(cursorPosition - 1),
            end: textDocument.positionAt(cursorPosition),
          };
          throw error;
        }
      } else {
        // All other databases use node-sql-parser
        const parser = new Parser();
        try {
          const opt: Option = { database };
          parser.parse(textDocument.getText(), opt);
        } catch (err) {
          if (err.name !== 'SyntaxError') {
            return;
          }
          const start = Position.create(err.location.start.line - 1, err.location.start.column);
          const end = Position.create(err.location.end.line - 1, err.location.end.column);
          const range = Range.create(start.line, start.character, end.line, end.character);
          err.range = range;
          throw err;
        }
      }
    } catch (err) {
      const diagnostic = {
        range: err.range,
        message: err.message,
        severity: DiagnosticSeverity.Error,
        source: 'sql',
        relatedInformation: [],
      };
      this.collection.set(textDocument.uri, [diagnostic]);
    }
  }
}
