import { TFile, Vault } from "obsidian";

export function getS3Path(res: string, url: string, folderName: string): string {
	return res.replace(url, folderName);
}

export async function getS3URLs(files: TFile[], vault: Vault) {
	const obsidianIndex: string[] = []
	files.map(async (f) => {
		const content = await vault.read(f);
		if (!content.match(this.url)) return;
		// matching markdown ![]() syntax
		const matchLink = content.match(/!\[.*]\((.*)\)/g)?.filter((m) => m.includes(this.url));
		if (matchLink && matchLink.length > 0) {
			obsidianIndex.push(...matchLink.map((m) => {
				const res = /!\[.*]\((.*)\)/.exec(m);
				return res ? decodeURI(res[1]) : '';
			}));
		}
		// matching <iframe src="...">
		const matchIFrame = content.match(/src="([^"]*)"/g)?.filter((m) => m.includes(this.url));
		if (matchIFrame && matchIFrame.length > 0) {
			obsidianIndex.push(...matchIFrame.map((m) => {
				const res = /src="([^"]*)"/.exec(m);
				return res ? decodeURI(res[1]) : '';
			}));
		}
	});
	return obsidianIndex;
}

export function generateResourceName(file: File, parent?: string) {
	return parent ? `${parent}-${Date.now()}-${file.name}` : `${Date.now()}-${file.name}`;
}