import { commands, ExtensionContext, languages, workspace } from 'coc.nvim';
import { Disposable, DocumentSelector, TextEdit } from 'vscode-languageserver-protocol';
import { SQLLintEngine } from './SQLLintEngine';
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
  const languageSelector = [{ language: 'sql', scheme: 'file' }, { language: 'sql', scheme: 'untitled' }];
  const rangeLanguageSelector = [{ language: 'sql', scheme: 'file' }, { language: 'sql', scheme: 'untitled' }];

  return {
    languageSelector,
    rangeLanguageSelector
  };
}

export async function activate(context: ExtensionContext): Promise<void> {
  const { subscriptions } = context;
  const editProvider = new SQLFormattingEditProvider();
  const engine = new SQLLintEngine();
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
      const doc = await workspace.document;

      const code = await format(doc.textDocument, undefined);
      const edits = [TextEdit.replace(fullDocumentRange(doc.textDocument), code)];
      if (edits && edits.length) {
        await doc.applyEdits(workspace.nvim, edits);
      }
    })
  );

  workspace.onDidOpenTextDocument(
    async e => {
      await engine.lint(e);
    },
    null,
    subscriptions
  );

  workspace.onDidChangeTextDocument(
    async _e => {
      const doc = await workspace.document;
      await engine.lint(doc.textDocument);
    },
    null,
    subscriptions
  );

  workspace.onDidSaveTextDocument(
    async e => {
      await engine.lint(e);
    },
    null,
    subscriptions
  );
}
