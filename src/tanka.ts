import * as vscode from 'vscode';

import * as cp from "child_process";
import * as path from "path";

export interface ShellResult {
    readonly code: number;
    readonly stdout: string;
    readonly stderr: string;
};

export async function exec(cmd: string) {
    return new Promise<ShellResult>(resolve =>
        cp.exec(cmd, (err, stdout, stderr) =>
            resolve({
                code: err?.code || 0,
                stdout: stdout,
                stderr: stderr
            })
        )
    );
};

export interface TankaEnvironment {
    apiVersion: "tanka.dev/v1alpha1",
    kind: "Environment",
    metadata: {
        name: string
        namespace: string,
        labels: { [label: string]: string }
    },
    spec: {
        apiServer: string,
        namespace: string,
    }
};

export class Tanka {
    private environments: TankaEnvironment[] = [];
    private refreshing = false;

    constructor(private readonly rootPath: string, private readonly outputChannel: vscode.OutputChannel) { }

    async refreshEnvironments() {
        if (this.refreshing === false) {
            this.refreshing = true;
            try {
                this.environments = await this.generateEnvironments();
            } finally {
                this.refreshing = false;
            }
        } else {
            this.outputChannel.appendLine("refresh in progress.");
        }
    }

    public getEnvironments() {
        return this.environments;
    }

    public async diff(env: TankaEnvironment) {
        const args: string[] = ['tk', 'diff', path.join(this.rootPath, env.metadata.namespace), '--name', `${env.metadata.name}`];
        this.outputChannel.appendLine(args.join(' '));
        return await exec(args.join(' '));
    }

    public async apply(env: TankaEnvironment) {
        const args: string[] = ['tk', 'apply', path.join(this.rootPath, env.metadata.namespace), '--name', `${env.metadata.name}`, '--dangerous-auto-approve'];
        this.outputChannel.appendLine(args.join(' '));
        this.outputChannel.show()
        return await exec(args.join(' '));
    }

    public async show(env: TankaEnvironment) {
        const args: string[] = ['tk', 'show', path.join(this.rootPath, env.metadata.namespace), '--name', env.metadata.name, '--dangerous-allow-redirect'];
        this.outputChannel.appendLine(args.join(' '));
        return await exec(args.join(' '));
    }

    private async generateEnvironments() {
        const args: string[] = ['tk', 'env', 'list', this.rootPath, '--json'];
        const { code, stdout, stderr } = await exec(args.join(' '));
        if (code === 0) {
            this.outputChannel.appendLine(stdout);
            return JSON.parse(stdout) as TankaEnvironment[];
        } else {
            this.outputChannel.appendLine(stderr);
            this.outputChannel.show();
            return this.environments;
        }
    }

}