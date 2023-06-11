import { TFile, Vault } from "obsidian";

export function getS3Path(res: string | URL): string {
	if (typeof res === 'string') {
		res = new URL(encodeURI(res));
	}
	return decodeURI(res.pathname).slice(1);
}

export function matchS3URLs(content: string, url: string): string[] | null {
	const reg = new RegExp(`${url}\\/[^"\\]\\)\\s]*`, 'g');
	if (!content.match(url)) return null;
	return content.match(reg);
}

export async function getS3URLs(files: TFile[], vault: Vault, url: string): Promise<string[]> {
	const obsidianIndex: string[] = [];

	for (let i = 0; i < files.length; i++) {
		const content = await vault.read(files[i]);
		const urls = matchS3URLs(content, url);
		if (urls) {
			obsidianIndex.push(...urls);
		}
	}

	return [...new Set(obsidianIndex)];
}

export function generateResourceName(fileName: string, parent?: string, hash?: string) {
	return `${parent ? parent + '-' : ''}${fileName}-${hash ?? Date.now()}`;
}

export function buf2hex(buffer: ArrayBuffer) {
	return [...new Uint8Array(buffer)]
		.map(x => x.toString(16).padStart(2, '0'))
		.join('');
}