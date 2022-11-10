import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { Client } from 'minio';
import { SettingsTab } from 'src/settings';
import exp from 'src/httpServer';
import { mimeType } from 'src/constants';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	accessKey: string;
	secretKey: string;
	endPoint: string;
	folderName: string;
	port: string;
	bucketName: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
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
		if (!Array.from(mimeType.values()).includes(files[i].type)) return false;
	}

	return true;
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	client: Client;
	server: { listen(): void; close(): void; };
	get url() {
		return `http://localhost:${this.settings.port}/${this.settings.folderName}`
	}

	async onload() {
		console.log("Loading Obsidian Storj");
		await this.loadSettings();
		console.log("obsidian storj loaded with settings:");
		console.log(this.settings);
		const { endPoint, accessKey, secretKey, port, bucketName } = this.settings;

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsTab(this.app, this));

		// Create s3 client.
		this.client = new Client({
			endPoint,
			useSSL: true,
			accessKey,
			secretKey
		});

		// Spawn http server 
		this.server = exp(this.client, bucketName, port);
		this.server.listen();

		this.setupHandlers();
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

	private async uploadFiles(files: FileList) {
		const { bucketName, folderName } = this.settings;

		for (let i = 0; i < files.length; i += 1) {
			const file = files[i];
			try {
				const buf = Buffer.from(await file.arrayBuffer());
				const name = folderName + '/' + file.name;
				console.log(buf);
				console.log(name);


				this.client.putObject(bucketName, name, buf, (e, r) => {
					if (e) {
						console.log(e);
					} else {
						this.createResourceLink(file.name);
						console.log(r);
					}
				});
			}
			catch (e) {
				console.log(e);
				return;
			}
		}

	}
	getActiveFile() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		const file = view?.file
		return file
	}

	private createResourceLink(resourceName: string) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		if (!view) {
			new Notice('Error: No active view.')
			return
		}
		const { editor } = view;
		if (!editor) {
			new Notice(`Error: no active editor`)
			return
		}

		const newLinkText = `![S3 File](${this.url}/${resourceName})`

		const cursor = editor.getCursor()
		const line = editor.getLine(cursor.line)
		// console.log('editor context', cursor, )
		editor.transaction({
			changes: [
				{
					from: { ...cursor, ch: 0 },
					to: { ...cursor, ch: line.length },
					text: newLinkText,
				}
			]
		})
	}

	private async pasteEventHandler(e: ClipboardEvent, _: Editor, markdownView: MarkdownView) {
		if (!this.client) {
			return;
		}
		if (!e.clipboardData) return;
		if (e.clipboardData.files.length === 0) return;
		const files = e.clipboardData.files;

		console.log(files);
		if (!allFilesAreValidUploads(files)) return;
		e.preventDefault();
		console.log('boo');

		await this.uploadFiles(files);
	}
	private async dropEventHandler() {

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

