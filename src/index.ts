import { commands, Disposable, DocumentSelector, ExtensionContext, languages, TextEdit, workspace } from 'coc.nvim';
import SQLFormattingEditProvider, { doFormat, fullDocumentRange } from './SQLFormattingEditProvider';
import { SQLLintEngine } from './SQLLintEngine';

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
  const languageSelector = [
    { language: 'sql', scheme: 'file' },
    { language: 'sql', scheme: 'untitled' },
  ];
  const rangeLanguageSelector = [
    { language: 'sql', scheme: 'file' },
    { language: 'sql', scheme: 'untitled' },
  ];

  return {
    languageSelector,
    rangeLanguageSelector,
  };
}

export async function activate(context: ExtensionContext): Promise<void> {
  const { subscriptions } = context;
  const config = workspace.getConfiguration('sql');
  const editProvider = new SQLFormattingEditProvider();
  const engine = new SQLLintEngine();
  const priority = 1;

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

      const code = await doFormat(doc.textDocument, undefined);
      const edits = [TextEdit.replace(fullDocumentRange(doc.textDocument), code)];
      if (edits) {
        await doc.applyEdits(edits);
      }
    })
  );

  const onOpen = config.get('lintOnOpen') as boolean;
  if (onOpen) {
    workspace.documents.map(async (doc) => {
      await engine.lint(doc.textDocument);
    });

    workspace.onDidOpenTextDocument(
      async (e) => {
        await engine.lint(e);
      },
      null,
      subscriptions
    );
  }

  const onChange = config.get<boolean>('lintOnChange');
  if (onChange) {
    workspace.onDidChangeTextDocument(
      async (_e) => {
        const doc = await workspace.document;
        await engine.lint(doc.textDocument);
      },
      null,
      subscriptions
    );
  }

  const onSave = config.get<boolean>('lintOnSave');
  if (onSave) {
    workspace.onDidSaveTextDocument(
      async (e) => {
        await engine.lint(e);
      },
      null,
      subscriptions
    );
  }
}
