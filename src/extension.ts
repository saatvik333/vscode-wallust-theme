import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as chokidar from 'chokidar';
import * as Color from 'color';
import template from './template';

const wallustCachePath = path.join(os.homedir(), '.cache', 'wallust');
const wallustColorsPath = path.join(wallustCachePath, 'colors');
const wallustColorsJsonPath = path.join(wallustCachePath, 'colors.json');
let autoUpdateWatcher: chokidar.FSWatcher | null = null;

export function activate(context: vscode.ExtensionContext) {

	// Register the update command
	let disposable = vscode.commands.registerCommand('wallustTheme.update', generateColorThemes);
	context.subscriptions.push(disposable);

	// Start the auto update if enabled
	if(vscode.workspace.getConfiguration().get('wallustTheme.autoUpdate')) {
		/*
		 * Update theme at startup
		 * Needed for when wallust palette updates while vscode isn't running.
		 * The timeout is required to overcome a limitation of vscode which
		 * breaks the theme auto-update if updated too early at startup.
		 */
		setTimeout(generateColorThemes, 10000);

		autoUpdateWatcher = autoUpdate();
	}

	// Toggle the auto update in real time when changing the extension configuration
	vscode.workspace.onDidChangeConfiguration(event => {
		if(event.affectsConfiguration('wallustTheme.autoUpdate')) {
			if(vscode.workspace.getConfiguration().get('wallustTheme.autoUpdate')) {
				if(autoUpdateWatcher === null) {
					autoUpdateWatcher = autoUpdate();
				}
			}
			else if(autoUpdateWatcher !== null) {
				autoUpdateWatcher.close();
				autoUpdateWatcher = null;
			}
		}
	});

}

export function deactivate() {

	// Close the watcher if active
	if(autoUpdateWatcher !== null) {
		autoUpdateWatcher.close();
	}
}


/**
 * Generates the theme from the current color palette and overwrites the last one
 */
function generateColorThemes() {
	// Import colors from wallust cache
	let colors: Color[] | undefined;
	try {
		colors = fs.readFileSync(wallustColorsPath)
										 .toString()
										 .split(/\s+/, 16)
			.map(hex => Color(hex));

		if (fs.existsSync(wallustColorsJsonPath)) {
			type WallustJson = {
				special: {
					background: string,
					foreground: string
				}
			};

			let colorsJson: WallustJson;
			const colorsRaw = fs.readFileSync(wallustColorsJsonPath).toString();

			try {
				colorsJson = JSON.parse(colorsRaw);
			} catch {
				// The wallpaper path on Windows can cause JSON.parse errors since the
				// path isn't properly escaped.
				colorsJson = JSON.parse(colorsRaw
					.split('\n')
					.filter((line) => !line.includes('wallpaper'))
					.join('\n'));
			}

			colors[0] = Color(colorsJson?.special?.background);
			colors[7] = Color(colorsJson?.special?.foreground);
		}
	} catch(error) {
		// Not a complete failure if we have colors from the wallust colors file, but failed to load from the colors.json
		if (colors === undefined || colors.length === 0) {
			vscode.window.showErrorMessage('Couldn\'t load colors from wallust cache, be sure to run wallust before updating.');
			return;
		}

		vscode.window.showWarningMessage('Couldn\'t load all colors from wallust cache');
	}

	// Generate the normal theme
	const colorTheme = template(colors, false);
	fs.writeFileSync(path.join(__dirname,'..', 'themes', 'wallust.json'), JSON.stringify(colorTheme, null, 4));

	// Generate the bordered theme
	const colorThemeBordered = template(colors, true);
	fs.writeFileSync(path.join(__dirname,'..', 'themes', 'wallust-bordered.json'), JSON.stringify(colorThemeBordered, null, 4));
}

/**
 * Automatically updates the theme when the color palette changes
 * @returns The watcher for the color palette
 */
function autoUpdate(): chokidar.FSWatcher {
	// Watch for changes in the color palette of wallust
	return chokidar
		.watch(wallustCachePath)
		.on('change', generateColorThemes);
}
