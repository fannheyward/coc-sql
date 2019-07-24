import { commands, ExtensionContext, workspace } from 'coc.nvim';

export async function activate(context: ExtensionContext): Promise<void> {
  console.log('aaaaaaaaaa');
  context.subscriptions.push(
    commands.registerCommand('sql.Format', async () => {
      let doc = await workspace.document;
      console.log(doc.uri);
    })
  );
}
