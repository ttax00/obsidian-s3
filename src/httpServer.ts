import http from 'http';
import { ALLOWED_HEADERS, mimeType } from './constants';
import { Notice } from 'obsidian';
import { S3Client } from './s3Client';
function parseExt(url: string): string {
	const arr = url.split('.');
	return '.' + arr[arr.length - 1];
}

export class S3Server {
	client: S3Client;
	port: string;
	server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;

	constructor(client: S3Client, port: string) {
		this.client = client;
		this.port = port;
	}
	public listen() {
		this.server = http.createServer(async function (req, res) {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
			res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
			res.setHeader('Access-Control-Allow-Credentials', 'true');

			if (!req.url) return new Notice(`unknown url: ${req.url}`);
			const url = new URL(req.url);
			const ext = parseExt(url.pathname);
			const path = decodeURI(url.pathname);

			try {
				console.log(`fetching ${path}`)
				const result = await this.client.getObject(path);
				res.setHeader('Content-type', mimeType.get(ext) || 'text/plain');
				result.pipe(res);
			} catch (e) {
				res.statusCode = 500;
				console.log(`Error getting the file: ${e}`);
				res.end(`Error getting the file: ${e}.`);
				new Notice(`Error: Unable to fetch ${path}`)
			}
		})

		new Notice(`Creating S3 server on port: ${this.port}`);
		this.server.listen(this.port);
	}

	public close() {
		new Notice("Closing S3 server.");
		this.server.close();
	}

	get url() {
		return `http://localhost:${this.port}`
	}

}