import http from 'http';
import { ALLOWED_HEADERS } from './constants';
import { Notice } from 'obsidian';
import { S3Client } from './s3Client';
import { mimeType } from './settings';
function parseExt(url: string): string {
	const arr = url.split('.');
	return arr[arr.length - 1];
}

export class S3Server {
	_client: S3Client[];
	port: string;
	server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | undefined;
	get url() {
		return `http://localhost:${this.port}`;
	}
	public getClient(id?: string | null) {
		const res = this._client.find((c) => c.id === id);
		if (res) return res;
		else return this._client[0];
	}
	constructor(client: S3Client[], port: string) {
		this._client = client;
		this.port = port;
	}
	public listen() {
		this.server = http.createServer(this.serverHandler.bind(this));

		new Notice(`Creating S3 server on port: ${this.port}`);
		this.server.listen(this.port);
	}

	serverHandler(req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage> & {
		req: http.IncomingMessage;
	}) {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
		res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
		res.setHeader('Access-Control-Allow-Credentials', 'true');

		if (!req.url) return console.log("ERROR: URL is undefined");
		const url = new URL(`${this.url}${req.url}`);
		const ext = parseExt(url.pathname);
		// S3 object keys don't start with '/', but URL pathnames do.
		// If we pass a leading '/' through to S3, we'll get NoSuchKey.
		const path = decodeURI(url.pathname).replace(/^\/+/, '');
		console.log(`fetching: ${url.toString()}`);
		const client = url.searchParams.get("client");
		const bucket = url.searchParams.get("bucket");

		void (async () => {
			try {
				const result = await this.getClient(client)?.getObject(path, bucket);
				res.setHeader('Content-type', mimeType.getMIME(ext) || 'text/plain');
				result?.pipe(res);
			} catch (e) {
				res.statusCode = 500;
				console.log(`Error getting the file`);
				console.log(e);
				res.end(`Error getting the file`);
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				new Notice(`S3: Unable to fetch ${path} \nIs client(${client}) credentials correct?`);
			}
		})();

	}

	public close() {
		if (this.server) this.server.close();
	}
}