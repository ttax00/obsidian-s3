import { TFile, Vault } from "obsidian";

export function getS3Path(res: string, url: string, folderName: string): string {
	return res.replace(url, folderName);
}

export function matchS3URLs(content: string, url: string): string[] | null {
	const reg = new RegExp(`${url}\\/[^"\\]\\)]*`, 'g');
	if (!content.match(this.url)) return null;
	return content.match(reg);
}

export async function getS3URLs(files: TFile[], vault: Vault, url: string): Promise<string[]> {
	const obsidianIndex: string[] = []

	for (let i = 0; i < files.length; i++) {
		const content = await vault.read(files[i]);
		const urls = matchS3URLs(content, url);
		if (urls) {
			obsidianIndex.push(...urls);
		}
	}

	return [...new Set(obsidianIndex)];
}

export function generateResourceName(fileName: string, parent?: string) {
	return parent ? `${parent}-${Date.now()}-${fileName}` : `${Date.now()}-${fileName}`;
}