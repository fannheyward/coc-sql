import { DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider, Range, TextDocument, TextEdit, Uri, window, workspace } from 'coc.nvim';
import { format } from 'sql-formatter';

export async function doFormat(document: TextDocument, range?: Range): Promise<string> {
  const fileName = Uri.parse(document.uri).fsPath;
  const text = document.getText(range);
  return safeExecution(
    () => {
      return format(text);
    },
    text,
    fileName
  );
}

function safeExecution(cb: (() => string) | Promise<string>, defaultText: string, fileName: string): string | Promise<string> {
  if (cb instanceof Promise) {
    return cb.then((returnValue) => {
      return returnValue;
    }).catch((err: Error) => {
      // eslint-disable-next-line no-console
      console.error(fileName, err);
      return defaultText;
    });
  }

  try {
    return cb();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(fileName, err);
    return defaultText;
  }
}

export function fullDocumentRange(document: TextDocument): Range {
  const lastLineId = document.lineCount - 1;
  const doc = workspace.getDocument(document.uri);

  return Range.create({ character: 0, line: 0 }, { character: doc.getline(lastLineId).length, line: lastLineId });
}

class SQLFormattingEditProvider implements DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider {
  constructor() {}

  public provideDocumentFormattingEdits(document: TextDocument): Promise<TextEdit[]> {
    return this._provideEdits(document, undefined);
  }

  public provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range,
  ): Promise<TextEdit[]> {
    return this._provideEdits(document, range);
  }

  private async _provideEdits(document: TextDocument, range?: Range): Promise<TextEdit[]> {
    const code = await doFormat(document, range);
    if (!range) {
      range = fullDocumentRange(document);
    }

    window.showMessage(`Formatted by sql.Format`);
    return [TextEdit.replace(range, code)];
  }
}

export default SQLFormattingEditProvider;
