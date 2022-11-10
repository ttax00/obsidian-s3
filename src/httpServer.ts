import http from 'http';
import { ALLOWED_HEADERS, mimeType } from './constants';
import { Client } from 'minio';

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

		try {
			if (!req.url) return console.log(`unknown url: ${req.url}`);
			const ext = parseExt(req.url);
			const objName = decodeURI(req.url)
			console.log(`fetching object: ${objName}`);

			const result = await client.getObject(bucket, objName);
			res.setHeader('Content-type', mimeType.get(ext) || 'text/plain');
			result.pipe(res);
		} catch (e) {
			res.statusCode = 500;
			console.log(`Error getting the file: ${e}`);
			res.end(`Error getting the file: ${e}.`);
		}
	});

	return {
		listen() {
			console.log(`Obsidian S3: Creating middleware server on port: ${port}`);

			server.listen(port);
		},
		close() {
			console.log("Obsidian S3: Closing middleware server.")
			server.close();
		}
	};
};

export default setup;
export type StaticServer = ReturnType<typeof setup>;