import { Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, IObsidianSetting, S3ClientSettings, SettingsTab } from 'src/settings';
import { S3Server } from 'src/httpServer';
import { mimeType } from 'src/settings';
import { S3Client } from 'src/s3Client';
import prettyBytes from 'pretty-bytes';
import { buf2hex, generateResourceName, getS3Path, getS3URLs } from 'src/helper';


function allFilesAreValidUploads(files: FileList) {
	if (files.length === 0) return false;
	let checked = true;
	console.log(files);
	for (let i = 0; i < files.length; i += 1) {
		if (files[i].size == 0) {
			new Notice(`Error: File is of 0 size.`);
			checked = false;
		}
		if (!mimeType.includeMIME(files[i].type)) {
			new Notice(`Error: File of type ${files[i].type} is not supported by Obsidian with external links.`);
			checked = false;
		}
	}

	return checked;
}

function isValidSettings(settings: IObsidianSetting) {
	const { clients, port } = settings;
	if (isNaN(parseInt(port))) return false;
	let check = true;
	for (let i = 0; i < clients.length; i++) {
		const { accessKey, secretKey, endPoint, bucketName } = clients[i];
		if (accessKey == '' || secretKey == '' || endPoint == '' || bucketName == '') {
			new Notice(`Please fill in the parameters for ${clients[i].id}`);
			check = false;
		}

	}
	return check;
}

function createClients(clientSettings: S3ClientSettings[]) {
	const s3: S3Client[] = [];
	clientSettings.forEach((c) => {
		s3.push(new S3Client(c.endPoint, c.accessKey, c.secretKey, c.bucketName, c.folderName, c.id));
	});
	return s3;
}

export let settings: IObsidianSetting = DEFAULT_SETTINGS;
export let server: S3Server = new S3Server([], settings.port);
export default class ObsidianS3 extends Plugin {
	pluginName = "Obsidian S3";
	get s3() {
		return server.getClient(settings.activeClient);
	}
	credentialsError(): void {
		new Notice("Please fill out S3 credentials to enable the Obsidian S3 plugin.");
	}
	getActive() {
		const res = settings.clients.find((c) => c.id === settings.activeClient);
		if (res) return res;
		else return settings.clients[0];
	}

	getClientIDs() {
		return settings.clients.map((c) => c.id);
	}

	async onload(): Promise<void> {
		console.log(`Loading ${this.pluginName}`);
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));

		this.setupHandlers();
		if (this.tryStartService()) {
			this.addCommand({
				id: 's3-clear-unused',
				name: 'Clear unused s3 objects.',
				callback: this.clearUnusedCallback.bind(this),
			});

			this.addCommand({
				id: 's3-get-obsidian-size',
				name: 'Get usage statistics.',
				callback: async () => {
					new Notice("Indexing...");
					const ids = this.getClientIDs();
					for (let i = 0; i < ids.length; i++) {
						const s3 = server.getClient(ids[i]);
						new Notice(`[${ids[i]} client]\nObsidian usage: ${prettyBytes(await s3.getBucketSize())}\nAll usage: ${prettyBytes(await s3.getBucketSize(true))}`);
					}
				},
			});

		} else {
			this.credentialsError();
			return;
		}
	}

	async clearUnusedCallback() {
		const { vault } = this.app;
		const files = vault.getMarkdownFiles();

		new Notice('Indexing resources...');
		const obsidianUrls = (await getS3URLs(files, vault, server.url)).map((u) => new URL(u));

		const ids = this.getClientIDs();
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			new Notice(`[${id}] Indexing S3 objects...`);
			const filter = obsidianUrls.filter((u) => u.searchParams.get("client") === id).map((u) => getS3Path(u));

			const s3 = server.getClient(id);
			const s3Index = await s3.listObjects();
			const doDelete = s3Index.filter(
				(i): i is typeof i & { name: string } => !!i.name && !filter.includes(i.name)
			);
			if (doDelete.length === 0) {
				new Notice(`[${id}] No object to delete.`);
				continue;
			}
			new Notice(`[${id}] Found ${doDelete.length} un-used objects, deleting...`);
			for (let y = 0; y < doDelete.length; y++) {
				console.log(`[${id}] S3: Deleting ${doDelete[y].name}`);
				await s3.removeObject(doDelete[y].name);
			}
			new Notice(`[${id}] Deleted ${doDelete.length} objects.`);
			new Notice(`[${id}] Current bucket size ${prettyBytes(await s3.getBucketSize())}`);
		}

	}

	tryStartService(): boolean {
		if (isValidSettings(settings)) {
			new Notice(`Creating S3 Clients`);
			server = new S3Server(createClients(settings.clients), settings.port);
			server.listen();
			return true;
		} else {
			return false;
		}
	}

	onunload() {
		server.close();
	}

	async loadSettings() {
		settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as IObsidianSetting);
	}

	async saveSettings() {
		await this.saveData(settings);
	}

	private pasteEventHandler(e: ClipboardEvent, _: Editor, markdownView: MarkdownView | MarkdownFileInfo) {
		if (!this.s3) return this.credentialsError();
		if (!e.clipboardData) return;
		const files = e.clipboardData.files;

		if (!allFilesAreValidUploads(files)) return;
		e.preventDefault();

		this.uploadFiles(files);
	}
	private dropEventHandler(e: DragEvent, _: Editor, markdownView: MarkdownView | MarkdownFileInfo) {
		if (!this.s3) return this.credentialsError();
		if (!e.dataTransfer) return;
		if (!e.dataTransfer.types.length || !e.dataTransfer.types.includes("Files")) return;

		const { files } = e.dataTransfer;

		if (!allFilesAreValidUploads(files)) return;

		e.preventDefault();
		this.uploadFiles(files);
	}

	private setupHandlers() {
		this.registerEvent(
			this.app.workspace.on("editor-paste", this.pasteEventHandler.bind(this))
		);
		this.registerEvent(
			this.app.workspace.on("editor-drop", this.dropEventHandler.bind(this))
		);
	}

	public writeLine(newLine: string) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return new Notice('Error: No active view.');

		const { editor } = view;
		if (!editor) return new Notice(`Error: no active editor`);


		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		editor.transaction({
			changes: [
				{
					from: { ...cursor, ch: 0, },
					to: { ...cursor, ch: line.length, },
					text: newLine + "\n",
				}
			]
		});
		cursor.line += 1;
		editor.setCursor(cursor);
	}

	private uploadFiles(files: FileList) {
		for (let i = 0; i < files.length; i += 1) {
			const file = files[i];
			const baseName = this.app.workspace.getActiveFile()?.basename;
			const reader = new FileReader();
			const callback = (file: File, fileName: string) => { void this.uploadFile(file, fileName); };
			reader.readAsArrayBuffer(file);
			reader.onloadend = async function (ev) {
				const hashBuf = await crypto.subtle.digest("SHA-1", reader.result as ArrayBuffer);
				const hash = buf2hex(hashBuf);
				const fileName = generateResourceName(file.name, baseName, hash);
				callback(file, fileName);
			};
		}
	}

	private async uploadFile(file: File, fileName: string) {
		new Notice(`Uploading: ${fileName} ${prettyBytes(file.size)} ...`);
		try {
			const s3 = this.s3;
			let progress = 0;
			const handle = window.setInterval(() => new Notice(`Uploading: ${fileName} ${progress}%`), 5000);
			this.registerInterval(handle);
			await s3.upload(file, fileName,
				(prog) => progress = prog,
				() => window.clearInterval(handle));

			const url = s3.createObjURL(server.url, fileName);

			let linkTxt = `![S3 File](${url})`;
			const method = mimeType.getMethod(file.type);
			if (method === 'iframe') {
				linkTxt = `<iframe src="${url}" alt="${fileName}" style="overflow:hidden;height:400;width:100%" allowfullscreen></iframe>`;
			} else if (method === 'link') {
				linkTxt = `${url}`;
			}

			this.writeLine(linkTxt);
		}
		catch (e) {
			new Notice(`Error: Unable to upload ${fileName}. Make sure your S3 credentials are correct.`);
			return console.log(e);
		}

	}
}

