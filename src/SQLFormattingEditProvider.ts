import { DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider, Uri, workspace } from 'coc.nvim';
// @ts-ignore
import sqlFormatter from 'sql-formatter';
import { CancellationToken, FormattingOptions, Range, TextDocument, TextEdit } from 'vscode-languageserver-protocol';

export async function format(document: TextDocument, options: Partial<any>): Promise<string> {
  let u = Uri.parse(document.uri);
  const fileName = u.fsPath;
  let text = options.text;
  if (!text) {
    text = document.getText();
  }
  return safeExecution(
    () => {
      return sqlFormatter.format(text);
    },
    text,
    fileName
  );
}

function safeExecution(cb: (() => string) | Promise<string>, defaultText: string, fileName: string): string | Promise<string> {
  if (cb instanceof Promise) {
    return cb
      .then(returnValue => {
        return returnValue;
      })
      .catch((err: Error) => {
        console.error(fileName, err);

        return defaultText;
      });
  }

  try {
    const returnValue = cb();

    return returnValue;
  } catch (err) {
    console.error(fileName, err);

    return defaultText;
  }
}

export function fullDocumentRange(document: TextDocument): Range {
  const lastLineId = document.lineCount - 1;
  let doc = workspace.getDocument(document.uri);

  return Range.create({ character: 0, line: 0 }, { character: doc.getline(lastLineId).length, line: lastLineId });
}

class SQLFormattingEditProvider implements DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider {
  constructor() {}

  public provideDocumentFormattingEdits(document: TextDocument, _options: FormattingOptions, _token: CancellationToken): Promise<TextEdit[]> {
    return this._provideEdits(document, {});
  }

  public provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range,
    _options: FormattingOptions,
    _token: CancellationToken
  ): Promise<TextEdit[]> {
    return this._provideEdits(document, {
      rangeStart: document.offsetAt(range.start),
      rangeEnd: document.offsetAt(range.end)
    });
  }

  private async _provideEdits(document: TextDocument, options: Partial<any>): Promise<TextEdit[]> {
    const code = await format(document, options);
    const edits = [TextEdit.replace(fullDocumentRange(document), code)];
    if (edits && edits.length) {
      workspace.showMessage(`Formatted by sql.Format`);
      return edits;
    }
    return Promise.resolve([]);
  }
}

export default SQLFormattingEditProvider;
