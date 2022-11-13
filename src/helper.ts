import { TFile, Vault } from "obsidian";

export function getS3Path(res: string, url: string, folderName: string): string {
	return res.replace(url, folderName);
}

export async function getS3URLs(files: TFile[], vault: Vault, url: string): Promise<string[]> {
	const obsidianIndex: string[] = []
	const circleBracket = new RegExp(`\\(${url}/[^)]*`, 'gm');
	const squareBracket = new RegExp(`\\[${url}/[^\\]]*`, 'gm');
	const quotation = new RegExp(`"${url}/[^"]*`, 'gm');
	for (let i = 0; i < files.length; i++) {
		const content = await vault.read(files[i]);
		if (!content.match(this.url)) continue;

		const circle = circleBracket.exec(content);
		if (circle) obsidianIndex.push(...circle);

		const square = squareBracket.exec(content);
		if (square) obsidianIndex.push(...square);

		const quote = quotation.exec(content);
		if (quote) obsidianIndex.push(...quote);
	}

	return [...new Set(obsidianIndex.map((s) => s.substring(1)))];
}

export function generateResourceName(file: File, parent?: string) {
	return parent ? `${parent}-${Date.now()}-${file.name}` : `${Date.now()}-${file.name}`;
}