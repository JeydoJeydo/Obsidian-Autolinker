import { EditorSelection, StateField } from "@codemirror/state";
import { BlockList } from "net";
import { App, Editor, editorEditorField, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile } from "obsidian";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	databaseName: string;
	databaseLocation: string;
	lastWord: string;
	dictionary: string[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	databaseName: "default",
	databaseLocation: "/",
	lastWord: "",
	dictionary: [],
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "database-autolinker",
			name: "Check for functionality",
			callback: () => {
				this.checkDatabaseFunctionality();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerDomEvent(document, "keypress", (evt: KeyboardEvent) => {
			// only check database when a whole word is written
			if (evt.code == "Space") {
				if (this.checkForDatabase()) {
					if (this.buildDictionary()) {
						this.replaceByLinkToDictionaryEntry();
					}
				}
			} else {
			}
		});
	}

	onunload() {}

	checkDatabaseFunctionality() {
		if (this.checkForDatabase) {
			new Notice("Database is found");
		} else {
			new Notice("ERROR while findind database");
		}
		if (this.checkForDatabase()) {
			new Notice("Entrys are found");
		} else {
			new Notice("ERROR while finding entrys");
		}
	}

	checkForDatabase(): boolean {
		const files = this.app.vault.getMarkdownFiles();
		console.log("database name:", this.settings.databaseName);

		for (let i = 0; i < files.length; i++) {
			let fileNameAfterPath = files[i].path;
			if (fileNameAfterPath.substring(fileNameAfterPath.lastIndexOf("/") + 1) == this.settings.databaseName + ".md") {
				console.log("location of database:", files[i].path);
				this.settings.databaseLocation = files[i].path;
				return true;
			}
		}
		return false;
	}

	async buildDictionary() {
		const { vault } = this.app;
		const databaseLocation = vault.getAbstractFileByPath(this.settings.databaseLocation);
		vault
			.cachedRead(databaseLocation)
			.then((result) => {
				let dic: string[];
				dic = result.match(/#.*$/gm);
				for (let i in dic) {
					dic[i] = dic[i].substring(2);
				}
				if (dic.length > 0) {
					// Dictionary has more than one entry
					this.settings.dictionary = dic;
					// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
					// const statusBarItemEl = this.addStatusBarItem();
					// statusBarItemEl.setText(`${dic.length} dictionary entrys`);
					return true;
				} else {
					// Dictionary is empty
					return false;
				}
			})
			.catch((err) => {
				console.log(err);
			});
	}

	replaceByLinkToDictionaryEntry() {
		let pulledDictionary = this.settings.dictionary;
		console.log("Dictionary:", pulledDictionary);
		let spacePos = { line: -1, ch: -1 };
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			const cursor = view.editor.getCursor();
			spacePos.line = cursor.line;
			spacePos.ch = cursor.ch;
			view.editor.setSelection({ line: spacePos.line, ch: 0 }, spacePos);
			let lWord: string;
			lWord = view.editor.getSelection().split(" ").splice(-1)[0];
			console.log("last word:", lWord, "cursor pos:", spacePos);
			let test = pulledDictionary.findIndex((elem) => {
				if (lWord.includes(elem)) {
					return true;
				}
			});
			if (test !== -1) {
				// Word is in dictionary
				view.editor.setSelection(
					{
						line: spacePos.line,
						ch: spacePos.ch - lWord.length,
					},
					spacePos
				);
				view.editor.replaceSelection(`[[${this.settings.databaseName}#${pulledDictionary[test]}|${lWord}]]`);
			} else {
				console.log("no word to replace");
				view.editor.setCursor(spacePos);
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Database Linker Settings" });

		new Setting(containerEl)
			.setName("Database Path")
			.setDesc("Example: 'database - everything'")
			.addText((text) =>
				text
					.setPlaceholder("Enter your database name")
					.setValue(this.plugin.settings.databaseName)
					.onChange(async (value) => {
						console.log("Databasepath: " + value);
						this.plugin.settings.databaseName = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
