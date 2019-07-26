import { commands, ExtensionContext, languages, workspace } from 'coc.nvim';
import { Disposable, DocumentSelector, TextEdit } from 'vscode-languageserver-protocol';
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
  const editProvider = new SQLFormattingEditProvider();
  let priority = 1;

  function registerFormatter(): void {
    disposeHandlers();
    const { languageSelector, rangeLanguageSelector } = selectors();

    rangeFormatterHandler = languages.registerDocumentRangeFormatProvider(rangeLanguageSelector, editProvider, priority);
    formatterHandler = languages.registerDocumentFormatProvider(languageSelector, editProvider, priority);
  }
  registerFormatter();

  context.subscriptions.push(
    commands.registerCommand('sql.Format', async () => {
      let doc = await workspace.document;

      let edits = await format(doc.textDocument, {}).then(code => [TextEdit.replace(fullDocumentRange(doc.textDocument), code)]);
      if (edits && edits.length) {
        await doc.applyEdits(workspace.nvim, edits);
      }
    })
  );
}
