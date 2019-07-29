import { commands, ExtensionContext, languages, workspace } from 'coc.nvim';
import { Range, Diagnostic, Disposable, DocumentSelector, TextEdit } from 'vscode-languageserver-protocol';
import SQLFormattingEditProvider, { format, fullDocumentRange } from './SQLFormattingEditProvider';
import { Parser } from 'node-sql-parser';
import { Position, DiagnosticSeverity } from 'vscode-languageserver-types';

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
      try {
        const parser = new Parser();
        parser.parse(e.getText());
      } catch (err) {
        if (err.name !== 'SyntaxError') {
          console.error(err);
          return;
        }

        const start = Position.create(err.location.start.line - 1, err.location.start.column);
        const end = Position.create(err.location.end.line - 1, err.location.end.column);
        const range = Range.create(start.line, start.character, end.line, end.character);
        Diagnostic.create(range, err.message, DiagnosticSeverity.Error);
        let diagnostics: Diagnostic[] = [];
        diagnostics.push({
          range: range,
          message: err.message,
          severity: DiagnosticSeverity.Error,
          source: 'sql',
          relatedInformation: []
        });

        console.log(err);
        let info = { error: 0, warning: 0, information: 0, hint: 0 };
        for (let diagnostic of diagnostics) {
          switch (diagnostic.severity) {
            case DiagnosticSeverity.Warning:
              info.warning = info.warning + 1;
              break;
            case DiagnosticSeverity.Information:
              info.information = info.information + 1;
              break;
            case DiagnosticSeverity.Hint:
              info.hint = info.hint + 1;
              break;
            default:
              info.error = info.error + 1;
          }
        }
        let doc = await workspace.getDocument(e.uri);
        workspace.nvim.call('coc#util#set_buf_var', [doc.bufnr, 'coc_diagnostic_info', info], true);
        workspace.nvim.command('redraws', true);
        workspace.nvim.call('coc#util#do_autocmd', ['CocDiagnosticChange'], true);

        if (!workspace.nvim.hasFunction('nvim_buf_set_virtual_text')) {
          return;
        }
        let buffer = workspace.nvim.createBuffer(doc.bufnr);
        let lines: Set<number> = new Set();
        let srcId = 100;
        let prefix = '=';
        buffer.clearNamespace(srcId);
        for (let diagnostic of diagnostics) {
          let { line } = diagnostic.range.start;
          if (lines.has(line)) continue;
          lines.add(line);
          let highlight = 'CocError' + 'VirtualText';
          let msg = diagnostic.message
            .split(/\n/)
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0);
          buffer.setVirtualText(srcId, line, [[prefix + msg, highlight]], {}).logError();
        }
      }
    },
    null,
    subscriptions
  );
}
