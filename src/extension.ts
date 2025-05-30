import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as chokidar from 'chokidar';
import * as Color from 'color';
import template from './template';

// Constants
const CACHE_DIR = '.cache/wallust';
const COLORS_FILE = 'colors';
const COLORS_JSON_FILE = 'colors.json';
const THEMES_DIR = path.join(__dirname, '..', 'themes');

const wallustCachePath = path.join(os.homedir(), CACHE_DIR);
const wallustColorsPath = path.join(wallustCachePath, COLORS_FILE);
const wallustColorsJsonPath = path.join(wallustCachePath, COLORS_JSON_FILE);

let autoUpdateWatcher: chokidar.FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
const debounceDelay = 300; // ms

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('wallustTheme.update', generateColorThemes)
    );

    initializeAutoUpdate();
    setupConfigurationListener();
}

export function deactivate() {
    autoUpdateWatcher?.close();
    if (debounceTimer) clearTimeout(debounceTimer);
}

function initializeAutoUpdate() {
    if (vscode.workspace.getConfiguration().get('wallustTheme.autoUpdate')) {
        setTimeout(generateColorThemes, 10000);
        autoUpdateWatcher = createAutoUpdateWatcher();
    }
}

function setupConfigurationListener() {
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('wallustTheme.autoUpdate')) {
            handleAutoUpdateConfigChange();
        }
    });
}

function handleAutoUpdateConfigChange() {
    const shouldEnable = vscode.workspace.getConfiguration().get('wallustTheme.autoUpdate');

    if (shouldEnable && !autoUpdateWatcher) {
        autoUpdateWatcher = createAutoUpdateWatcher();
    } else if (!shouldEnable && autoUpdateWatcher) {
        autoUpdateWatcher.close();
        autoUpdateWatcher = null;
    }
}

function createAutoUpdateWatcher(): chokidar.FSWatcher {
    // Watch only specific files instead of entire directory
    return chokidar.watch([wallustColorsPath, wallustColorsJsonPath], {
        ignoreInitial: true,
        persistent: true,
        usePolling: false,
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100
        }
    }).on('change', debouncedGenerateColorThemes);
}

function debouncedGenerateColorThemes() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        generateColorThemes();
        debounceTimer = null;
    }, debounceDelay);
}

function generateColorThemes() {
    try {
        const colors = loadColors();
        writeThemeFiles(colors);
    } catch (error) {
        if (error instanceof Error) {
            handleGenerationError(error);
        } else {
            handleGenerationError(new Error(String(error)));
        }
    }
}

function loadColors(): Color[] {
    const colors = readBaseColors();
    return colorsJsonExists() ? enhanceWithJsonColors(colors) : colors;
}

function readBaseColors(): Color[] {
    if (!fs.existsSync(wallustColorsPath)) {
        throw new Error('Wallust colors file not found. Run wallust first.');
    }

    const colorsData = fs.readFileSync(wallustColorsPath, 'utf-8');
    return colorsData.split(/\s+/, 16).map(hex => Color(hex));
}

function colorsJsonExists(): boolean {
    return fs.existsSync(wallustColorsJsonPath);
}

function enhanceWithJsonColors(colors: Color[]): Color[] {
    try {
        const jsonData = fs.readFileSync(wallustColorsJsonPath, 'utf-8');
        const parsedData = parseColorJson(jsonData);

        if (parsedData?.special?.background) {
            colors[0] = Color(parsedData.special.background);
        }
        if (parsedData?.special?.foreground) {
            colors[7] = Color(parsedData.special.foreground);
        }
    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        vscode.window.showWarningMessage(
            `Could not process colors.json: ${message}`
        );
    }
    return colors;
}

function parseColorJson(jsonData: string): any {
    try {
        return JSON.parse(jsonData);
    } catch {
        // Fallback for Windows path escaping issues
        return JSON.parse(
            jsonData.split('\n')
                .filter(line => !line.includes('wallpaper'))
                .join('\n')
        );
    }
}

function writeThemeFiles(colors: Color[]) {
    ensureThemesDirectoryExists();

    const writeTheme = (fileName: string, bordered: boolean) => {
        const themePath = path.join(THEMES_DIR, fileName);
        const themeContent = JSON.stringify(template(colors, bordered), null, 4);
        fs.writeFile(themePath, themeContent, handleWriteError);
    };

    writeTheme('wallust.json', false);
    writeTheme('wallust-bordered.json', true);
}

function handleWriteError(err: NodeJS.ErrnoException | null) {
    if (err) {
        vscode.window.showErrorMessage(
            `Failed to write theme file: ${err.message}`
        );
    }
}

function ensureThemesDirectoryExists() {
    if (!fs.existsSync(THEMES_DIR)) {
        fs.mkdirSync(THEMES_DIR, { recursive: true });
    }
}

function handleGenerationError(error: Error) {
    vscode.window.showErrorMessage(
        error.message.startsWith('Wallust colors')
            ? error.message
            : `Theme generation failed: ${error.message}`
    );
}
