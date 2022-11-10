export const ALLOWED_HEADERS =
	'Access-Control-Allow-Headers, Origin, Authorization,Accept,x-client-id, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, hypothesis-client-version';

export const mimeType = new Map([
	['.html', 'text/html'],
	// ['.js', 'text/javascript'],
	['.ico', 'image/x-icon'],
	['.css', 'text/css'],
	['.png', 'image/png'],
	['.jpg', 'image/jpeg'],
	['.gif', 'image/gif'],
	['.svg', 'image/svg+xml'],
	['.wav', 'audio/wav'],
	['.mp3', 'audio/mpeg'],
	['.mp4', 'video/mp4'],
	// ['.json', 'application/json'],
	// ['.pdf', 'application/pdf'],
	// ['.zip', 'application/zip'],
	// ['.doc', 'application/msword'],
	// ['.eot', 'application/vnd.ms-fontobject'],
	['.ttf', 'application/x-font-ttf'],
]);
