import { commands, ExtensionContext, languages, workspace } from 'coc.nvim';
import { Parser } from 'node-sql-parser';
import { DiagnosticSeverity, Disposable, DocumentSelector, Position, Range, TextEdit } from 'vscode-languageserver-protocol';
import SQLFormattingEditProvider, { format, fullDocumentRange } from './SQLFormattingEditProvider';

interface Selectors {
  rangeLanguageSelector: DocumentSelector;
  languageSelector: DocumentSelector;
}

let formatterHandler: undefined | Disposable;
let rangeFormatterHandler: undefined | Disposable;

/**
 * Dispose formatters
 */
function disposeHandlers(): void {
  if (formatterHandler) {
    formatterHandler.dispose();
  }
  if (rangeFormatterHandler) {
    rangeFormatterHandler.dispose();
  }
  formatterHandler = undefined;
  rangeFormatterHandler = undefined;
}

/**
 * Build formatter selectors
 */
function selectors(): Selectors {
  // TODO
  // * @sample `let sel:DocumentSelector = [{ language: 'typescript' }, { language: 'json', pattern: '**∕tsconfig.json' }]`;
  let languageSelector = [{ language: 'sql' }];
  let rangeLanguageSelector = [{ language: 'sql', scheme: 'file' }, { language: 'sql', scheme: 'untitled' }];

  return {
    languageSelector,
    rangeLanguageSelector
  };
}

export async function activate(context: ExtensionContext): Promise<void> {
  const { subscriptions } = context;
  const editProvider = new SQLFormattingEditProvider();
  let priority = 1;

  function registerFormatter(): void {
    disposeHandlers();
    const { languageSelector, rangeLanguageSelector } = selectors();

    rangeFormatterHandler = languages.registerDocumentRangeFormatProvider(rangeLanguageSelector, editProvider, priority);
    formatterHandler = languages.registerDocumentFormatProvider(languageSelector, editProvider, priority);
  }
  registerFormatter();

  subscriptions.push(
    commands.registerCommand('sql.Format', async () => {
      let doc = await workspace.document;

      const code = await format(doc.textDocument, undefined);
      const edits = [TextEdit.replace(fullDocumentRange(doc.textDocument), code)];
      if (edits && edits.length) {
        await doc.applyEdits(workspace.nvim, edits);
      }
    })
  );

  workspace.onDidOpenTextDocument(
    async e => {
      const doc = await workspace.document;
      if (workspace.match(['sql'], doc.textDocument) <= 0) {
        return;
      }

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

        let collection = languages.createDiagnosticCollection('sql');
        collection.set(e.uri, [
          {
            range: range,
            message: err.message,
            severity: DiagnosticSeverity.Error,
            source: 'sql',
            relatedInformation: []
          }
        ]);
      }
    },
    null,
    subscriptions
  );
}
