import MyPlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";

export class SettingsTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for your S3 cloud storage.' });

		new Setting(containerEl)
			.setName('Endpoint')
			.setDesc('Your S3 API Endpoint')
			.addText(text => text
				.setPlaceholder('https://gateway.storjshare.io')
				.setValue(this.plugin.settings.endPoint)
				.onChange(async (value) => {
					console.log('Endpoint set to: ' + value);
					this.plugin.settings.endPoint = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Access Key')
			.setDesc('Your S3 Access Key')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.accessKey)
				.onChange(async (value) => {
					console.log('Access key set to: ' + value);
					this.plugin.settings.accessKey = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Secret Key')
			.setDesc('Your S3 Secret Key')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.secretKey)
				.onChange(async (value) => {
					console.log('Secret key set to: ' + value);
					this.plugin.settings.secretKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Server Port')
			.addText(text => text
				.setPlaceholder(this.plugin.settings.port)
				.setValue(this.plugin.settings.secretKey)
				.onChange(async (value) => {
					console.log('Secret key set to: ' + value);
					this.plugin.settings.secretKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Bucket Name')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.bucketName)
				.onChange(async (value) => {
					this.plugin.settings.bucketName = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Folder Name')
			.addText(text => text
				.setPlaceholder(this.plugin.settings.port)
				.setValue(this.plugin.settings.folderName)
				.onChange(async (value) => {
					this.plugin.settings.folderName = value;
					await this.plugin.saveSettings();
				}));
	}
}