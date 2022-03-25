import { TreeDataProvider, EventEmitter, Event, TreeItemCollapsibleState, TreeItem, MarkdownString } from 'vscode';

import { Tanka, TankaEnvironment } from './tanka';

export class TankaNode extends TreeItem {
    constructor(
        public readonly env: TankaEnvironment
    ) {
        super(env.metadata.name, 0);
    }
    description = this.generateDescription();
    tooltip = new MarkdownString(this.description);

    private generateDescription() {
        return `apiServer: ${this.env.spec.apiServer}, namespace: ${this.env.spec.namespace}`;
    }

    // private generatetooltip() {
    //     return ```````yaml
    //         ${JSON.s}
    //         ```````;
    // }
}

export class TankaEnvironmentsTreeDataProvider implements TreeDataProvider<TankaNode> {
    private _onDidChangeTreeData: EventEmitter<TankaNode | undefined> = new EventEmitter<TankaNode | undefined>();
    readonly onDidChangeTreeData: Event<TankaNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private readonly tanka: Tanka) { }

    public refresh(tn?: TankaNode): void {
        this._onDidChangeTreeData.fire(tn);
    }

    getTreeItem(element: TankaNode): TreeItem {
        return element;
    }

    async getChildren(element?: TankaNode): Promise<TankaNode[]> {
        const envs = await this.tanka.getEnvironments();
        if (element === undefined) {
            return envs.map(env => new TankaNode(env));
        }
        return [];
    }
}
