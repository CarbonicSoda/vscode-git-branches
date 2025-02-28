import { execFile } from "node:child_process";

import { Aux } from "./auxiliary";

export class Branch {
	ref: string;
	name: string;

	constructor(public id: string, public type: "local" | "remote", public isCurrent: boolean) {
		this.ref = `${type === "local" ? "refs/heads/" : "refs/remotes/"}${id}`;
		this.name = id.split("/").at(-1);
	}
}

export class GitRunner {
	constructor(public gitPath: string, public repoPath: string) {}

	async run(command: string, ...args: string[]): Promise<string> {
		return await new Promise((res, rej) => {
			execFile(this.gitPath, [command].concat(args), { cwd: this.repoPath }, (err, stdout) => {
				if (err) return rej(err);
				res(stdout.trim());
			});
		});
	}

	async getBranches(
		type: "local" | "remote" | "all",
		options?: { flags?: string[]; sort?: "Commit Date" | "Alphabetic" },
	): Promise<Branch[]> {
		if (type === "all") {
			const branches = await Aux.async.map(
				["local", "remote"],
				async (type: "local" | "remote") => await this.getBranches(type, options),
			);
			return branches.flat();
		}

		const res = await this.run("branch", `-${type[0]}`, ...(options?.flags ?? []));
		let branches = [];
		for (const line of res.split("\n")) {
			if (line.length === 0 || line.includes("HEAD ")) continue;
			const isCurrent = line.includes("*");
			let ref = line;
			if (isCurrent) ref = line.replace("*", "");
			branches.push(new Branch(ref.trim(), type, isCurrent));
		}

		if (options?.sort) branches.sort((a, b) => a.id.localeCompare(b.id));
		if (options?.sort === "Commit Date") {
			const timestamps: { [branchName: string]: number } = {};
			await Aux.async.map(branches, async ({ id, ref }) => {
				timestamps[id] = Number(await this.run("log", "-1", "--format=%cd", "--date=unix", ref));
			});
			branches.sort((a, b) => timestamps[b.id] - timestamps[a.id]);
		}

		return branches;
	}

	async getLatestHash(branch?: Branch): Promise<string> {
		try {
			return await this.run("rev-parse", branch?.ref || "HEAD");
		} catch {
			return "None";
		}
	}

	async getMergeBaseHash(branch1: Branch, branch2: Branch): Promise<string> {
		try {
			return await this.run("merge-base", branch1.ref, branch2.ref);
		} catch {
			return "None";
		}
	}

	async getBranchDiff(
		branch1: Branch,
		branch2: Branch,
	): Promise<{
		from: string[];
		fromCnt: number;
		to: string[];
		toCnt: number;
		sym: string[];
		symCnt: number;
	}> {
		const resFrom = this.run("rev-list", `${branch1.ref}..${branch2.ref}`);
		const resTo = this.run("rev-list", `${branch2.ref}..${branch1.ref}`);
		const [from, to] = (await Promise.all([resTo, resFrom])).map((res) => {
			let hashes = res.split("\n").filter((hash) => hash.length);
			return hashes.map((hash) => hash.slice(0, 7));
		});
		const sym = from.concat(to);

		return {
			from,
			fromCnt: from.length,
			to,
			toCnt: to.length,
			sym,
			symCnt: sym.length,
		};
	}

	async getUpdatedTime(
		branch?: Branch,
		format: "default" | "relative" | "local" | "iso" | "rfc" = "default",
	): Promise<string> {
		return await this.run("log", "-1", "--format=%cd", `--date=${format}`, branch?.ref ?? "HEAD");
	}

	async switchToBranch(branch: Branch): Promise<void> {
		await this.run("switch", branch.id);
	}
}
