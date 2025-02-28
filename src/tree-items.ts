import { TreeItem, TreeItemCollapsibleState } from "vscode";

import { Branch } from "./utils/git-runner";

export namespace TreeItems {
	export const SEP_ITEM = new TreeItem("", TreeItemCollapsibleState.None);

	export class BranchItem extends TreeItem {
		children: (BranchItem | TreeItem)[] = [];

		type: "local" | "remote";
		fullyMerged: boolean;
		latestHash: string;
		mergeBaseHash: string;
		branchDiff: {
			from: string[];
			fromCnt: number;
			to: string[];
			toCnt: number;
			sym: string[];
			symCnt: number;
		};

		get latestHashShort(): string {
			return this.latestHash.slice(0, 7);
		}
		get mergeBaseHashShort(): string {
			return this.mergeBaseHash.slice(0, 7);
		}

		constructor(public branch: Branch, expand: "expand" | "collapse" | "none", public parent?: BranchItem) {
			const state = {
				expand: TreeItemCollapsibleState.Expanded,
				collapse: TreeItemCollapsibleState.Collapsed,
				none: TreeItemCollapsibleState.None,
			}[expand];
			super(branch.id, state);
			this.type = branch.type;
			this.contextValue = this.type === "local" ? "LocalBranch" : "RemoteBranch";
		}
	}

	export class CommitItem extends TreeItem {
		contextValue: string;

		constructor(public hash: string, public parent?: BranchItem) {
			super({
				label: hash.slice(0, 7),
				highlights: hash === "None" ? [] : [[0, 7]],
			});
			this.contextValue = hash === "None" ? "None" : "Commit";
		}
	}
}
