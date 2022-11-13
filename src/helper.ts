import { TFile, Vault } from "obsidian";

export function getS3Path(res: string, url: string, folderName: string): string {
	return res.replace(url, folderName);
}

export async function getS3URLs(files: TFile[], vault: Vault, url: string): Promise<string[]> {
	const obsidianIndex: string[] = []
	const circleBracket = new RegExp(`${url}\\/[^"\\]\\)]*`, 'g');

	for (let i = 0; i < files.length; i++) {
		const content = await vault.read(files[i]);
		if (!content.match(this.url)) continue;

		const circle = content.match(circleBracket);
		if (circle) {
			obsidianIndex.push(...circle);
			console.log(circle);
		}
	}

	return [...new Set(obsidianIndex)];
}

export function generateResourceName(file: File, parent?: string) {
	return parent ? `${parent}-${Date.now()}-${file.name}` : `${Date.now()}-${file.name}`;
}