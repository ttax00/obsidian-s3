import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { SettingsTab } from 'src/settings';
import exp from 'src/httpServer';
import { mimeType } from 'src/constants';
import { S3Client } from 'src/s3Client';
import { generateResourceName, getS3Path, getS3URLs } from 'src/helper';

export interface ObsidianS3Settings {
	accessKey: string;
	secretKey: string;
	endPoint: string;
	folderName: string;
	port: string;
	bucketName: string;
}

const DEFAULT_SETTINGS: ObsidianS3Settings = {
	accessKey: '',
	secretKey: '',
	endPoint: '',
	folderName: 'obsidian',
	port: '4998',
	bucketName: '',
}

function allFilesAreValidUploads(files: FileList) {
	if (files.length === 0) return false;

	for (let i = 0; i < files.length; i += 1) {
		if (!Array.from(mimeType.values()).includes(files[i].type) || files[i].size == 0) {
			new Notice(`File of type ${files[i].type} is not supported by Obsidian with external links.`)
			return false;
		}
	}

	return true;
}

function isValidSettings(settings: ObsidianS3Settings) {
	if (settings.accessKey != '' && settings.secretKey != '' && settings.endPoint != '' && settings.bucketName != '') return true;
	return false;
}

async function uploadFiles(plugin: ObsidianS3, files: FileList) {
	for (let i = 0; i < files.length; i += 1) {
		const file = files[i];

		const fileName = generateResourceName(file, plugin.app.workspace.getActiveFile()?.basename);

		new Notice(`Uploading: ${fileName} ${file.size} bit...`);
		try {
			let progress = 0;
			const handle = window.setInterval(() => new Notice(`Uploading: ${fileName} ${progress}%`), 5000);
			plugin.registerInterval(handle);
			const res = await plugin.s3.upload(file, fileName,
				(prog) => progress = prog,
				() => {
					window.clearInterval(handle);
				});
			console.log(res);
			createResourceLink(plugin, fileName, file);
		}
		catch (e) {
			new Notice(`Error: Unable to upload ${fileName}. Make sure your S3 credentials are correct.`);
			console.log(e);
			return;
		}
	}
}


function createResourceLink(plugin: ObsidianS3, fileName: string, file: File) {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
	if (!view) {
		new Notice('Error: No active view.')
		return
	}
	const { editor } = view;
	if (!editor) {
		new Notice(`Error: no active editor`)
		return
	}
	const url = encodeURI(`${plugin.url}/${fileName}`);

	let newLinkText = `![S3 File](${url})`
	if (file.type.startsWith('video') || file.type.startsWith('audio')) {
		newLinkText = `<iframe src="${url}" alt="${fileName}" style="overflow:hidden;height:400;width:100%" allowfullscreen></iframe>`;
	} else if (file.type === 'text/html') {
		newLinkText = `<iframe src="${url}"></iframe>`
	}

	const cursor = editor.getCursor()
	const line = editor.getLine(cursor.line)
	editor.transaction({
		changes: [
			{
				from: { ...cursor, ch: 0, },
				to: { ...cursor, ch: line.length, },
				text: newLinkText + "\n",
			}
		]
	})
	cursor.line += 1;
	editor.setCursor(cursor);
	new Notice("Link created.");
}

export default class ObsidianS3 extends Plugin {
	settings: ObsidianS3Settings;
	pluginName = "Obsidian S3";
	s3: S3Client;
	server: { listen(): void; close(): void; };
	get url() {
		return `http://localhost:${this.settings.port}/${this.settings.folderName}`
	}

	async onload() {
		console.log(`Loading ${this.pluginName}`);
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));

		this.setupHandlers();
		if (this.tryStartService()) {
			this.addCommand({
				id: 'obsidian-s3-clear-unused',
				name: 'Clear unused s3 resources.',
				callback: this.clearUnusedCallback.bind(this),
			});
		}
	}

	async clearUnusedCallback() {
		const { vault } = this.app;
		const files = vault.getMarkdownFiles();

		new Notice('Indexing resources...');
		let obsidianIndex = await getS3URLs(files, vault, this.url);
		obsidianIndex = obsidianIndex.map((s) => getS3Path(s, this.url, this.settings.folderName))

		new Notice('Indexing S3 objects...');
		const s3Index = await this.s3.listObjects();

		const doDelete = s3Index.filter((i) => !obsidianIndex.includes(i.name));
		if (doDelete.length === 0) {
			new Notice("No object to delete.");
			return;
		}
		console.log(doDelete);


		new Notice(`Found ${doDelete.length} un-used objects, deleting...`);

		for (let i = 0; i < doDelete.length; i++) {
			console.log(`S3: Deleting ${doDelete[i].name}`);
			await this.s3.removeObject(doDelete[i].name);
		}

		new Notice(`Deleted ${doDelete.length} objects`)
	}

	tryStartService(): boolean {
		// Only create clients when settings are valid.
		if (isValidSettings(this.settings)) {
			const { endPoint, accessKey, secretKey, port, bucketName, folderName } = this.settings;

			new Notice(`Creating S3 Client`);
			this.s3 = new S3Client(endPoint, accessKey, secretKey, bucketName, folderName);
			// Spawn http server 
			this.server = exp(this.s3, port);
			this.server.listen();
			return true;
		} else {
			new Notice("Please fill out S3 credentials to enable the Obsidian S3 plugin.");
			return false;
		}
	}

	onunload() {
		this.server.close();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async pasteEventHandler(e: ClipboardEvent, _: Editor, markdownView: MarkdownView) {
		if (!this.s3) {
			new Notice("Please fill out Obsidian S3 settings tab to enable the plugin.")
			return;
		}
		if (!e.clipboardData) return;
		if (e.clipboardData.files.length === 0) return;
		const files = e.clipboardData.files;

		if (!allFilesAreValidUploads(files)) return;
		e.preventDefault();

		await uploadFiles(this, files);
	}
	private async dropEventHandler(e: DragEvent, _: Editor, markdownView: MarkdownView) {
		if (!this.s3) {
			new Notice("Please fill out Obsidian S3 settings tab to enable the plugin.")
			return;
		}
		if (!e.dataTransfer) return;

		if (
			e.dataTransfer.types.length !== 1 ||
			!e.dataTransfer.types.includes("Files")
		) {
			return;
		}

		const { files } = e.dataTransfer;

		if (!allFilesAreValidUploads(files)) return;

		e.preventDefault();
		await uploadFiles(this, files);
	}

	private setupHandlers() {
		this.registerEvent(
			this.app.workspace.on("editor-paste", this.pasteEventHandler.bind(this))
		);
		this.registerEvent(
			this.app.workspace.on("editor-drop", this.dropEventHandler.bind(this))
		);
	}

}

