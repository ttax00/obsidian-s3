import http from 'http';
import { ALLOWED_HEADERS, mimeType } from './constants';
import { Notice } from 'obsidian';
import { S3Client } from './s3Client';
function parseExt(url: string): string {
	const arr = url.split('.');
	return '.' + arr[arr.length - 1];
}
export class S3Server {
	_client: S3Client[];
	port: string;
	server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
	get url() {
		return `http://localhost:${this.port}`
	}
	public getClient(id?: string | null) {
		const res = this._client.find((c) => c.id === id);
		if (res) return res;
		else return this._client[0]
	}

	constructor(client: S3Client, port: string) {
		this._client = [client];
		this.port = port;
	}
	public listen() {
		this.server = http.createServer(this.test.bind(this))

		new Notice(`Creating S3 server on port: ${this.port}`);
		this.server.listen(this.port);
	}

	async test(req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage> & {
		req: http.IncomingMessage;
	}) {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
		res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
		res.setHeader('Access-Control-Allow-Credentials', 'true');

		if (!req.url) return new Notice(`unknown url: ${req.url}`);
		const url = new URL(`${this.url}${req.url}`);
		const ext = parseExt(url.pathname);
		const path = decodeURI(url.pathname);
		console.log(`fetching: ${url.toString()}`);


		try {
			const result = await this.getClient(url.searchParams.get("client"))?.getObject(path, url.searchParams.get("bucket"));
			res.setHeader('Content-type', mimeType.get(ext) || 'text/plain');
			result?.pipe(res);
		} catch (e) {
			res.statusCode = 500;
			console.log(`Error getting the file: ${e}`);
			res.end(`Error getting the file: ${e}.`);
			new Notice(`S3: Unable to fetch ${url.toString()}`)
		}
	}

	public close() {
		new Notice("Closing S3 server.");
		this.server.close();
	}



}