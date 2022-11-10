import { Editor, MarkdownView, Plugin } from 'obsidian';
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
		if (Array.from(mimeType.values()).includes(files[i].type)) return false;
	}

	return true;
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	client: Client;
	server: { listen(): void; close(): void; };

	async onload() {
		console.log("Loading Obsidian Storj");
		await this.loadSettings();
		console.log("obsidian storj loaded with settings:");
		console.log(this.settings);
		const { endPoint, accessKey, secretKey, port, bucketName, folderName } = this.settings;

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
		this.server = exp(this.client, bucketName, folderName, port);
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

	private async uploadFile(file: File) {
		const { bucketName, folderName } = this.settings;
		console.log(file);
		const buf = Buffer.from(await file.arrayBuffer());
		const name = folderName + '/' + file.name;
		console.log(buf);
		console.log(name);


		this.client.putObject(bucketName, name, buf, (e, r) => {
			if (e) {
				console.log(e);
			} else {
				console.log(r);
			}
		});
	}

	private pasteEventHandler = async (e: ClipboardEvent, _: Editor, markdownView: MarkdownView) => {
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

		for (let i = 0; i < files.length; i += 1) {
			try {
				await this.uploadFile(files[i]);
			}
			catch (e) {
				console.log(e);
				return;
			}
		}
	}
	private async dropEventHandler() {

	}

	private setupHandlers() {
		this.registerEvent(
			this.app.workspace.on("editor-paste", this.pasteEventHandler)
		);
		this.registerEvent(
			this.app.workspace.on("editor-drop", this.dropEventHandler.bind(this))
		);
	}

}

