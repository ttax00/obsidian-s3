import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { Client } from 'minio';
import { SettingsTab } from 'src/settings';
import exp from 'src/httpServer';
import { mimeType } from 'src/constants';
import internal from 'stream';
import toIt from 'blob-to-it'
import { URL } from 'url';

interface ObsidianS3Settings {
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
	const { bucketName, folderName } = plugin.settings;

	for (let i = 0; i < files.length; i += 1) {
		const file = files[i];
		const fileName = generateResourceName(plugin, file);
		const name = folderName + '/' + fileName;
		console.log(`Uploading: ${name}...`);

		new Notice(`Uploading: ${name} ${file.size} bit...`);
		try {
			const readable = internal.Readable.from(toIt(file));
			let progress = 0;
			readable.on('data', (chunk) => {
				progress += chunk.length;
			})

			const handle = window.setInterval(() => new Notice(`Uploading: ${name} ${Math.round(progress / file.size * 100)}%`), 5000);
			plugin.registerInterval(handle);
			readable.on('close', () => {
				window.clearInterval(handle);
				new Notice('Creating link...');
			})
			await plugin.client.putObject(bucketName, name, readable, file.size);
			createResourceLink(plugin, fileName, file);
		}
		catch (e) {
			new Notice(`Error: Unable to upload ${fileName}. Make sure your S3 credentials are correct.`);
			console.log(e);
			return;
		}
	}
}

function generateResourceName(plugin: ObsidianS3, file: File) {
	const activeFile = plugin.app.workspace.getActiveFile();
	if (activeFile) {
		return `${activeFile.basename}-${Date.now()}-${file.name}`
	} else {
		return `${Date.now()}-${file.name}`
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
	if (file.type.startsWith('video')) {
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
	client: Client;
	server: { listen(): void; close(): void; };
	get url() {
		return `http://localhost:${this.settings.port}/${this.settings.folderName}`
	}

	async onload() {
		console.log(`Loading ${this.pluginName}`);
		await this.loadSettings();


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsTab(this.app, this));
		this.setupHandlers();

		this.tryStartService();
	}

	tryStartService() {
		let { endPoint } = this.settings;
		const { accessKey, secretKey, port, bucketName } = this.settings;
		if (endPoint.startsWith('https://') || endPoint.startsWith('http://')) {
			const url = new URL(endPoint);
			endPoint = url.hostname;
		}

		// Only create clients when settings are valid.
		if (isValidSettings(this.settings)) {
			new Notice(`Creating S3 Client`);
			this.client = new Client({
				endPoint,
				useSSL: true,
				accessKey,
				secretKey
			});

			// Spawn http server 
			this.server = exp(this.client, bucketName, port);
			this.server.listen();

		} else {
			new Notice("Please fill out Obsidian S3 settings tab to enable the plugin.");
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
		if (!this.client) {
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
		if (!this.client) {
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

