import http from 'http';
import { ALLOWED_HEADERS, mimeType } from './constants';
import { Client } from 'minio';
import { Notice } from 'obsidian';

function parseExt(url: string): string {
	const arr = url.split('.');
	return '.' + arr[arr.length - 1];
}

const setup = (client: Client, bucket: string, port: string) => {
	const server = http.createServer(async function (req, res) {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
		res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
		res.setHeader('Access-Control-Allow-Credentials', 'true');

		if (!req.url) return new Notice(`unknown url: ${req.url}`);
		const ext = parseExt(req.url);
		const objName = decodeURI(req.url);

		try {
			console.log(`fetching object: ${objName}`);
			const result = await client.getObject(bucket, objName);
			res.setHeader('Content-type', mimeType.get(ext) || 'text/plain');
			result.pipe(res);
		} catch (e) {
			res.statusCode = 500;
			console.log(`Error getting the file: ${e}`);
			res.end(`Error getting the file: ${e}.`);
			new Notice(`Error: Unable to fetch ${objName}`)
		}
	});

	return {
		listen() {
			new Notice(`Creating S3 server on port: ${port}`);

			server.listen(port);
		},
		close() {
			new Notice("Closing S3 server.")
			server.close();
		}
	};
};

export default setup;
export type StaticServer = ReturnType<typeof setup>;