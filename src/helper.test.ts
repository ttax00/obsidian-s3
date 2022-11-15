import { generateResourceName, getS3Path, matchS3URLs } from './helper'

describe('getS3Path()', () => {
	it.each([
		['1000', 'path/to/file', 'client', 'bucket'],
		['19000', 'path/bla yay/file with space.png', 'hey%20there', 'bucket%20of%20mine'],
		['4000', 'path/to/file (hey).jpg', 'client', 'bucket'],
		['4800', 'path/to/file.k', 'client', 'bucket'],
	])('%p \t %p \t %p \t %p \t should return only the path', (port, path, client, bucket) => {
		expect(getS3Path(`http://localhost:${port}/${path}?client=${client}&bucket=${bucket}`))
			.toBe(`${path}`);
	});
});

describe('matchS3URLs()', () => {
	const domain = 'http://localhost:4998';
	const url = encodeURI(`${domain}/path to/file is/is/NESTED.jpeg?client=hey there&bucket=this is my bucket`);

	it('should match object url.', () => {
		const content = `${url}`;
		expect(matchS3URLs(content, domain)).toStrictEqual([url]);
	});

	it('should not match anything else', () => {
		const content = `hey brother\n#theres an endless road to re-discover\n##References\n- ![](${url})`;
		expect(matchS3URLs(content, domain)).toStrictEqual([url]);
	});

	it('should match exhaustively', () => {
		const content = `![](${url})\n <iframe src="${url}">\n ${url} ${url}\n [${url}]`;
		expect(matchS3URLs(content, domain)).toStrictEqual([url, url, url, url, url]);

	});
});

describe('generateObjectName()', () => {
	it('should generate object name based on file name & parent folder', () => {
		const now = Date.now();
		const res1 = generateResourceName("music.mp3", "obsidian");
		const res2 = generateResourceName("music.mp3");
		expect(res1).toBe(`obsidian-${now}-music.mp3`);
		expect(res2).toBe(`${now}-music.mp3`);
	});
});