import * as vscode from 'vscode';
import { TankaEnvironmentsTreeDataProvider, TankaNode } from './explorer';
import { Tanka } from './tanka';

function toggleDisplayProvider() {
	console.log(111, vscode.workspace.getConfiguration().get<boolean>('tanka.enable'));
	const toggle = vscode.workspace.getConfiguration().get<boolean>('tanka.enable');
	vscode.commands.executeCommand('setContext', 'tankaEnabled', toggle);
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "tanka" is now active!');

	const registerCommand = (command: string, callback: (...args: any[]) => any, thisArg?: any) =>
		context.subscriptions.push(vscode.commands.registerCommand(command, callback, thisArg));

	const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('tanka');
	context.subscriptions.push(outputChannel);

	const rootPath =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

	vscode.workspace.onDidChangeConfiguration(
		(event: vscode.ConfigurationChangeEvent) => {
			if (event.affectsConfiguration('tanka')) {
				toggleDisplayProvider();
			}
		},
		{},
		context.subscriptions,
	);

	const tanka = new Tanka(rootPath!, outputChannel);

	const tankaProvider = new TankaEnvironmentsTreeDataProvider(tanka);
	context.subscriptions.push(vscode.window.registerTreeDataProvider('TankaExplorer', tankaProvider));

	tanka.freshEnvironments().then(() => toggleDisplayProvider());

	registerCommand('tanka.refresh', async () => {
		await tanka.freshEnvironments();
		tankaProvider.refresh(undefined);
	});

	registerCommand('vscode-tanka.env.show', async (tankaNode: TankaNode) => {
		const { code, stdout, stderr } = await tanka.show(tankaNode.env);
		if (code === 0) {
			const doc = await vscode.workspace.openTextDocument({ language: 'yaml', content: stdout });
			vscode.window.showTextDocument(doc, { preview: true });
			outputChannel.appendLine(stdout);
			return;
		}
		outputChannel.appendLine(stderr);
		outputChannel.show();
	});

	registerCommand('vscode-tanka.env.apply', async (tankaNode: TankaNode) => {
		const name = tankaNode.env?.metadata.name!;
		const { code, stdout, stderr } = await tanka.apply(tankaNode.env);
		if (code === 0) {
			outputChannel.appendLine(stdout);
			return;
		}
		outputChannel.appendLine(stderr);
		outputChannel.show();
	});
}

export function deactivate() { }
