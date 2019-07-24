import { commands, Document, ExtensionContext, Uri, workspace } from 'coc.nvim';
import sqlFormatter from 'sql-formatter';
import { Range, TextEdit } from 'vscode-languageserver-protocol';

export async function activate(context: ExtensionContext): Promise<void> {
  context.subscriptions.push(
    commands.registerCommand('sql.Format', async () => {
      let doc = await workspace.document;

      let edits = await format(doc).then(code => [TextEdit.replace(fullDocumentRange(doc), code)]);
      if (edits && edits.length) {
        await doc.applyEdits(workspace.nvim, edits);
      }
    })
  );
}

async function format(doc: Document): Promise<string> {
  let u = Uri.parse(doc.uri);
  const fileName = u.fsPath;
  const text = doc.content;
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

function fullDocumentRange(doc: Document): Range {
  const lastLineId = doc.textDocument.lineCount - 1;

  return Range.create({ character: 0, line: 0 }, { character: doc.getline(lastLineId).length, line: lastLineId });
}
