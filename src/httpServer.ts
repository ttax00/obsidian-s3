import http from 'http';
import { ALLOWED_HEADERS, mimeType } from './constants';
import { Client } from 'minio';

function parseExt(url: string): string {
	const arr = url.split('.');
	return '.' + arr[arr.length - 1];
}

const setup = (client: Client, bucket: string, port: string) => {
	console.log('Creating middleware server on', port);
	const server = http.createServer(async function (req, res) {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
		res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
		res.setHeader('Access-Control-Allow-Credentials', 'true');

		try {
			if (!req.url) return console.log(`unknown url: ${req.url}`);
			console.log(req.url);
			const ext = parseExt(req.url);
			const objName = decodeURI(req.url)

			client.getObject(bucket, objName, (e, r) => {
				if (e) {
					console.log(e);
				} else {
					res.setHeader('Content-type', mimeType.get(ext) || 'text/plain');
					r.on('data', (d) => res.write(d));
				}
			});
		} catch (e) {
			res.statusCode = 500;
			res.end(`Error getting the file: ${e}.`);
		}
	});

	return {
		listen() {
			server.listen(port);
		},
		close() {
			server.close();
		}
	};
};

export default setup;
export type StaticServer = ReturnType<typeof setup>;