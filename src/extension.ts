import * as  fs from 'fs';

import * as vscode from 'vscode';

import { TankaEnvironmentsTreeDataProvider, TankaNode } from './explorer';
import { Tanka } from './tanka';
import { parseDiff, persistenceYaml } from './utils';
import { schema } from './constants';

function toggleDisplayProvider() {
	const toggle = vscode.workspace.getConfiguration().get<boolean>('tanka.enable');
	vscode.commands.executeCommand('setContext', 'tankaEnabled', toggle);
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "vscode-tanka" is now active!');

	const registerCommand = (command: string, callback: (...args: any[]) => any, thisArg?: any) =>
		context.subscriptions.push(vscode.commands.registerCommand(command, callback, thisArg));

	const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('tanka');
	context.subscriptions.push(outputChannel);

	const workspacePath =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

	vscode.workspace.onDidChangeConfiguration(
		(event: vscode.ConfigurationChangeEvent) => {
			if (event.affectsConfiguration('tanka.enable')) {
				toggleDisplayProvider();
			}
		},
		{},
		context.subscriptions,
	);

	// create bar for show status that tanka command execute.
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	context.subscriptions.push(statusBarItem);
	const showStatusBar = (text: string, tooltip: string) => {
		statusBarItem.text = text;
		statusBarItem.tooltip = tooltip;
		statusBarItem.show();
	};

	// tanka class for command -> apply, prune, diff, show
	const tanka = new Tanka(workspacePath!, outputChannel);

	// context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((e) => {
	// 	if (e.uri.scheme === schema && fs.existsSync(e.uri.path)) {
	// 		fs.rmSync(e.uri.path);
	// 	}
	// }));

	// create tanka TextDocumentContentProvider
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(schema, {
		provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
			return fs.readFileSync(uri.path, { encoding: 'utf-8' });
		}
	}));

	// create TreeDataProvider to display tanks environment list
	const tankaProvider = new TankaEnvironmentsTreeDataProvider(tanka);
	context.subscriptions.push(vscode.window.registerTreeDataProvider('TankaExplorer', tankaProvider));

	tanka.refreshEnvironments().then(() => toggleDisplayProvider());

	// vscode commands
	registerCommand('tanka.refresh', async () => {
		await tanka.refreshEnvironments();
		tankaProvider.refresh(undefined);
	});

	registerCommand('vscode-tanka.env.show', async (tankaNode: TankaNode) => {
		showStatusBar('$(sync~spin) Tanka Showing...', '');
		const { code, stdout, stderr } = await tanka.show(tankaNode.env);
		statusBarItem.hide();
		if (code === 0) {
			const yamlfilePath = persistenceYaml('show-' + tankaNode.env.metadata.name.replace('/', '_'), stdout);
			const uri = vscode.Uri.file(yamlfilePath).with({ scheme: schema });
			await vscode.window.showTextDocument(uri, { preview: true });
			return;
		}
		outputChannel.appendLine(stderr);
		outputChannel.show();
	});

	registerCommand('vscode-tanka.env.apply', async (tankaNode: TankaNode) => {
		showStatusBar('$(sync~spin) Tanka Applying...', '');
		const { code, stdout, stderr } = await tanka.apply(tankaNode.env);
		statusBarItem.hide();

		if (code === 0) {
			vscode.window.showInformationMessage(stdout);
			return;
		}
		outputChannel.appendLine(stderr);
		outputChannel.show();
	});

	registerCommand('vscode-tanka.env.prune', async (tankaNode: TankaNode) => {
		showStatusBar('$(sync~spin) Tanka Pruning...', '');
		const { code, stdout, stderr } = await tanka.prune(tankaNode.env);
		statusBarItem.hide();

		if (code == 0) {
			outputChannel.appendLine(stdout);
		}
		else {
			outputChannel.appendLine(stderr);
		}
		outputChannel.show();
	});

	registerCommand('vscode-tanka.env.diff', async (tankaNode: TankaNode) => {
		showStatusBar('$(sync~spin) Tanka Diffing...', '');
		const diffCmd = vscode.workspace.getConfiguration('tanka').get<string>('diff.command', 'diff -U 10000');
		process.env.KUBECTL_EXTERNAL_DIFF = diffCmd;
		const { code, stdout, stderr } = await tanka.diff(tankaNode.env);
		statusBarItem.hide();

		// tanka diff return code:
		// 0: no differences
		// 16: differences
		// other: error
		if ([0, 16].includes(code)) {
			if (stdout.length === 0) {
				vscode.window.showInformationMessage("No differences.");
				return;
			}

			outputChannel.appendLine(stdout);

			const envName = tankaNode.env.metadata.name.replace('/', '_');
			const { oldUri, newUri } = parseDiff(envName, stdout);
			await vscode.commands.executeCommand('vscode.diff', oldUri, newUri, 'tanka-diff-' + envName, {
				preview: true,
				viewColumn: vscode.ViewColumn.Active
			});
			return;
		}
		outputChannel.appendLine(stderr);
		outputChannel.show();
	});
}

export function deactivate() { }
