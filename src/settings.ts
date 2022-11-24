import ObsidianS3, { server, settings } from "main";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";

export class MIME {
	mimes: [string, string, string][];
	constructor(s: string) {
		this.mimes = parseRawMIME(s);
		console.log(this.mimes);
	}

	includeMIME(s: string) {
		if (this.mimes.find((v) => v[2] === s)) return true;
		return false;
	}

	includeEXT(s: string) {
		if (this.mimes.find((v) => v[1] === s)) return true;
		return false;
	}

	getMIME(ext: string) {
		const t = this.mimes.find((v) => v[1] === ext);
		if (t) return t[2];
		else return 'text/plain';
	}

	getMethod(type: string) {
		const t = this.mimes.find((v) => v[2] === type);
		if (t) return t[0];
		else return 'text/plain';
	}
}


export function setMime(s: string) {
	mimeType = new MIME(s);
}

function parseRawMIME(s: string) {
	const lines = s.split('\n').map((s) => s.split(','));
	const correct = lines.filter((l) => {
		if (l.length === 3) {
			return true;
		} else return false;
	}).map((v) => v.map((v) => v.trim())) as [string, string, string][];
	return correct;
}


export interface S3ClientSettings {
	accessKey: string;
	secretKey: string;
	endPoint: string;
	folderName: string;
	bucketName: string;
	id: string;
}


export interface IObsidianSetting {
	clients: S3ClientSettings[];
	port: string;
	activeClient: string;
	rawMIME: string;
}

export const DEFAULT_CLIENT: S3ClientSettings = {
	accessKey: "",
	secretKey: "",
	endPoint: "",
	folderName: "obsidian",
	bucketName: "",
	id: "default"
};

export const DEFAULT_SETTINGS: IObsidianSetting = {
	clients: [DEFAULT_CLIENT],
	port: '4998',
	activeClient: 'default',
	rawMIME: `
	img, ico, image/x-icon
	img, png, image/png
	img, jpg, image/jpeg
	img, jpeg, image/jpeg
	img, gif, image/gif
	img, svg, image/svg+xml
	iframe, wav, audio/wav
	iframe, mp3, audio/mp3
	iframe, mp4, video/mp4
	iframe, webm, video/webm
	link, pdf, application/pdf
	link, zip, application/zip
	link, doc, application/doc 

	`
};
export let mimeType = new MIME(DEFAULT_SETTINGS.rawMIME);

export class SettingsTab extends PluginSettingTab {
	plugin: ObsidianS3;

	constructor(app: App, plugin: ObsidianS3) {
		super(app, plugin);
		this.plugin = plugin;
	}



	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for your S3 cloud storage.' });
		containerEl.createEl('h3', { text: 'Server Settings.' });
		this.displayServer(containerEl);

		containerEl.createEl('h3', { text: 'Client Settings.' });
		this.displayClient(containerEl);

		containerEl.createEl('h3', { text: 'Advance settings.' });
		this.displayAdvance(containerEl);

	}

	displayServer(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('Server Port (Default: 4998)')
			.addText(text => text
				.setPlaceholder(settings.port)
				.setValue(settings.port ?? DEFAULT_SETTINGS.port)
				.onChange(async (value) => {
					settings.port = value.trim() ?? DEFAULT_SETTINGS.port;
					await this.plugin.saveSettings();
				}));
	}
	displayClient(containerEl: HTMLElement) {
		new Setting(containerEl).addDropdown((c) => {
			const o: Record<string, string> = {};
			this.plugin.getClientIDs().forEach((i) => {
				o[i] = i;
			});
			c.addOptions(o)
				.setValue(settings.activeClient)
				.onChange(async (v) => {
					settings.activeClient = v;
					await this.plugin.saveSettings();
					this.display();
				});

		}).setName("Active S3 Client");

		new Setting(containerEl)
			.setName('ID')
			.setDesc('S3 Client unique id')
			.addText(text => text
				.setPlaceholder('gateway.storjshare.io')
				.setValue(this.plugin.getActive().id)
				.setDisabled(this.plugin.getActive().id === DEFAULT_CLIENT.id)
				.onChange(async (value) => {
					if (this.plugin.getClientIDs().includes(value)) {
						new Notice(`ID must be unique: ${value}`);
					} else {
						this.plugin.getActive().id = value.trim();
						await this.plugin.saveSettings();
					}
				}));


		new Setting(containerEl)
			.setName('Endpoint')
			.setDesc('Your S3 API Endpoint')
			.addText(text => text
				.setPlaceholder('gateway.storjshare.io')
				.setValue(this.plugin.getActive().endPoint)
				.onChange(async (value) => {
					this.plugin.getActive().endPoint = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Access Key')
			.setDesc('Your S3 Access Key')
			.addText(text => text
				.setValue(this.plugin.getActive().accessKey)
				.onChange(async (value) => {
					this.plugin.getActive().accessKey = value.trim();
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Secret Key')
			.setDesc('Your S3 Secret Key')
			.addText(text => text
				.setValue(this.plugin.getActive().secretKey)
				.onChange(async (value) => {
					this.plugin.getActive().secretKey = value.trim();
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Bucket Name')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.getActive().bucketName)
				.onChange(async (value) => {
					this.plugin.getActive().bucketName = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Folder Name')
			.addText(text => text
				.setPlaceholder(settings.port)
				.setValue(this.plugin.getActive().folderName)
				.onChange(async (value) => {
					this.plugin.getActive().folderName = value.trim();
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Misc.' });
		new Setting(containerEl).addButton((c) => {
			c.setButtonText("Reload")
				.onClick(async () => {
					await this.plugin.saveSettings();
					server.close();
					this.plugin.tryStartService();
					this.display();
				});
		}).setName("Save settings and reload plugin");

		new Setting(containerEl).setName("ADD or REMOVE client.")
			.addButton((c) => {
				c.setButtonText("ADD")
					.onClick(async () => {
						settings.clients.push({
							accessKey: '',
							secretKey: '',
							endPoint: '',
							folderName: 'obsidian',
							bucketName: '',
							id: 'name-me',
						});
						await this.plugin.saveSettings();
						this.display();
					});
			})
			.addButton((c) => {
				c.setButtonText("REMOVE")
					.onClick(async () => {
						const active = this.plugin.getActive();
						if (active.id === DEFAULT_CLIENT.id) {
							return new Notice("Cannot remove default client!");
						}
						settings.clients.remove(this.plugin.getActive());
						await this.plugin.saveSettings();
						this.display();
					});
			});
	}
	displayAdvance(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('Allowed MIME Types:')
			.setDesc('List of supported file types and linking methods.Format: "method(img/iframe/link), .extension, mime/type".\nBy line, empty lines are ignored.')
			.addTextArea((c) => {
				c.inputEl.style.width = '100%';
				c.inputEl.style.minWidth = '200px';
				c.inputEl.style.minHeight = '200px';

				c.setValue(settings.rawMIME).onChange(async (v) => {
					settings.rawMIME = v;
					setMime(v);
					await this.plugin.saveSettings();
				});
			}).nameEl.style.display = 'flex';
	}
}