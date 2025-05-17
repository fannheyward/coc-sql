import { DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider, DocumentUri, Range, TextDocument, TextEdit, Uri, window, workspace } from 'coc.nvim';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { format } from 'sql-formatter';

export async function doFormat(document: TextDocument, range?: Range): Promise<string> {
  const options = await getConfiguration(document.uri);
  const fileName = Uri.parse(document.uri).fsPath;
  const text = document.getText(range);
  return safeExecution(
    () => {
      return format(text, options);
    },
    text,
    fileName
  );
}

async function getConfiguration(uri: DocumentUri): Promise<Object> {
  let previousPath = Uri.parse(uri).fsPath;
  let currentPath = path.dirname(previousPath);
  while ( previousPath !== currentPath && ! fs.existsSync(path.join(currentPath,'.sql-formatter.json')) ) {
    console.debug(currentPath);
    previousPath = currentPath;
    currentPath = path.resolve(previousPath,'..');
  }
  const configPath = path.join(currentPath,'.sql-formatter.json');

  try {
    return JSON.parse(await promisify(fs.readFile)(configPath, { encoding: 'utf-8' }));
  } catch (err) {
    console.debug(err);
    return workspace.getConfiguration('sql').get('formatOptions', {});
  }

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
