/**
 * Matugen Theme Extension
 * 
 * Architecture:
 * 1. Hash-based caching - Only regenerate themes when colors actually change
 * 2. Multi-strategy file watching - Combines chokidar + polling fallback
 * 3. Atomic writes - Prevents partial theme files
 * 4. Smart initialization - Syncs on startup if out of date
 * 5. Graceful degradation - Works even if watching fails
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as chokidar from 'chokidar';
import Color from 'color';
import template from './template';

// ============================================================================
// Types
// ============================================================================



interface CacheState {
    colorsHash: string;
    lastUpdated: number;
    version: string;
}

interface ThemeGenerationResult {
    success: boolean;
    cached: boolean;
    error?: Error;
}

// ============================================================================
// Constants
// ============================================================================

const EXTENSION_VERSION = '1.1.0';
const CACHE_DIR = '.cache/matugen';
const COLORS_FILE = 'vscode-colors';
const COLORS_JSON_FILE = 'vscode-colors.json';
const CACHE_STATE_FILE = '.matugen-theme-cache.json';

const THEMES_DIR = path.join(__dirname, '..', 'themes');
const REQUIRED_COLORS_COUNT = 16;

// Timing constants
const DEBOUNCE_DELAY_MS = 500;
const POLLING_INTERVAL_MS = 5000;
const STARTUP_DELAY_MS = 500;
const WATCHER_STABILITY_MS = 300;

// Paths
const matugenCachePath = path.join(os.homedir(), CACHE_DIR);
const matugenColorsPath = path.join(matugenCachePath, COLORS_FILE);
const matugenColorsJsonPath = path.join(matugenCachePath, COLORS_JSON_FILE);
const cacheStatePath = path.join(THEMES_DIR, CACHE_STATE_FILE);

// ============================================================================
// State Management
// ============================================================================

class ThemeManager {
    private watcher: chokidar.FSWatcher | null = null;
    private pollingInterval: NodeJS.Timeout | null = null;
    private debounceTimer: NodeJS.Timeout | null = null;
    private isGenerating = false;
    private lastKnownHash: string | null = null;
    private context: vscode.ExtensionContext | null = null;
    private statusBarItem: vscode.StatusBarItem | null = null;

    // ========================================================================
    // Lifecycle
    // ========================================================================

    async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.context = context;
        this.createStatusBarItem();

        // Register commands
        context.subscriptions.push(
            vscode.commands.registerCommand('matugenTheme.update', () => this.forceUpdate()),
            vscode.commands.registerCommand('matugenTheme.clearCache', () => this.clearCache())
        );

        // Setup configuration listener
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(event => {
                if (event.affectsConfiguration('matugenTheme')) {
                    this.handleConfigChange();
                }
            })
        );

        // Initial sync after short delay to not block activation
        setTimeout(() => this.performInitialSync(), STARTUP_DELAY_MS);

        // Start watching if auto-update is enabled
        if (this.isAutoUpdateEnabled()) {
            this.startWatching();
        }
    }

    dispose(): void {
        this.stopWatching();
        this.statusBarItem?.dispose();
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    // ========================================================================
    // Status Bar
    // ========================================================================

    private createStatusBarItem(): void {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'matugenTheme.update';
        this.statusBarItem.tooltip = 'Matugen Theme - Click to update';
        this.context?.subscriptions.push(this.statusBarItem);
    }

    private updateStatusBar(state: 'idle' | 'syncing' | 'error' | 'success'): void {
        if (!this.statusBarItem) {
            return;
        }

        switch (state) {
            case 'syncing':
                this.statusBarItem.text = '$(sync~spin) Matugen';
                this.statusBarItem.backgroundColor = undefined;
                this.statusBarItem.show();
                break;
            case 'error':
                this.statusBarItem.text = '$(error) Matugen';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                this.statusBarItem.show();
                setTimeout(() => this.updateStatusBar('idle'), 3000);
                break;
            case 'success':
                this.statusBarItem.text = '$(check) Matugen';
                this.statusBarItem.backgroundColor = undefined;
                this.statusBarItem.show();
                setTimeout(() => this.updateStatusBar('idle'), 2000);
                break;
            case 'idle':
            default:
                this.statusBarItem.hide();
                break;
        }
    }

    // ========================================================================
    // Configuration
    // ========================================================================

    private isAutoUpdateEnabled(): boolean {
        return vscode.workspace.getConfiguration('matugenTheme').get('autoUpdate', true);
    }

    private handleConfigChange(): void {
        const autoUpdate = this.isAutoUpdateEnabled();
        
        if (autoUpdate && !this.watcher) {
            this.startWatching();
            vscode.window.showInformationMessage('Matugen Theme: Auto-update enabled');
        } else if (!autoUpdate && this.watcher) {
            this.stopWatching();
            vscode.window.showInformationMessage('Matugen Theme: Auto-update disabled');
        }
    }

    // ========================================================================
    // File Watching (Multi-Strategy)
    // ========================================================================

    private startWatching(): void {
        this.startFileWatcher();
        this.startPollingFallback();
        console.log('Matugen Theme: Started watching for color changes');
    }

    private stopWatching(): void {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        console.log('Matugen Theme: Stopped watching');
    }

    private startFileWatcher(): void {
        try {
            this.watcher = chokidar.watch([matugenColorsPath, matugenColorsJsonPath], {
                ignoreInitial: true,
                persistent: true,
                usePolling: false,
                awaitWriteFinish: {
                    stabilityThreshold: WATCHER_STABILITY_MS,
                    pollInterval: 100
                },
                ignorePermissionErrors: true,
            });

            this.watcher.on('change', () => this.scheduleUpdate('watcher'));
            this.watcher.on('add', () => this.scheduleUpdate('watcher'));
            this.watcher.on('error', (error) => {
                console.error('Matugen Theme: Watcher error:', error);
                // Don't show error to user, polling fallback will handle it
            });

        } catch (error) {
            console.error('Matugen Theme: Failed to create watcher:', error);
            // Polling fallback will handle updates
        }
    }

    private startPollingFallback(): void {
        // Polling as a fallback mechanism
        // Checks hash periodically in case watcher misses changes
        this.pollingInterval = setInterval(async () => {
            try {
                const currentHash = await this.computeColorsHash();
                if (currentHash && this.lastKnownHash && currentHash !== this.lastKnownHash) {
                    console.log('Matugen Theme: Polling detected change');
                    this.scheduleUpdate('polling');
                }
            } catch {
                // Ignore polling errors silently
            }
        }, POLLING_INTERVAL_MS);
    }

    private scheduleUpdate(source: string): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(async () => {
            this.debounceTimer = null;
            console.log(`Matugen Theme: Update triggered by ${source}`);
            await this.syncThemes(false);
        }, DEBOUNCE_DELAY_MS);
    }

    // ========================================================================
    // Caching
    // ========================================================================

    private async computeColorsHash(): Promise<string | null> {
        try {
            const colorsContent = await fsPromises.readFile(matugenColorsPath, 'utf-8');
            let jsonContent = '';
            
            try {
                jsonContent = await fsPromises.readFile(matugenColorsJsonPath, 'utf-8');
            } catch {
                // colors.json is optional
            }

            const combined = colorsContent + jsonContent;
            return crypto.createHash('md5').update(combined).digest('hex');
        } catch {
            return null;
        }
    }

    private async loadCacheState(): Promise<CacheState | null> {
        try {
            const data = await fsPromises.readFile(cacheStatePath, 'utf-8');
            return JSON.parse(data) as CacheState;
        } catch {
            return null;
        }
    }

    private async saveCacheState(hash: string): Promise<void> {
        const state: CacheState = {
            colorsHash: hash,
            lastUpdated: Date.now(),
            version: EXTENSION_VERSION,
        };

        try {
            await fsPromises.writeFile(cacheStatePath, JSON.stringify(state, null, 2), 'utf-8');
        } catch (error) {
            console.warn('Matugen Theme: Failed to save cache state:', error);
        }
    }

    private async isCacheValid(): Promise<{ valid: boolean; currentHash: string | null }> {
        const currentHash = await this.computeColorsHash();
        
        if (!currentHash) {
            return { valid: false, currentHash: null };
        }

        const cacheState = await this.loadCacheState();
        
        if (!cacheState) {
            return { valid: false, currentHash };
        }

        // Invalidate cache if extension version changed
        if (cacheState.version !== EXTENSION_VERSION) {
            console.log('Matugen Theme: Cache invalidated due to version change');
            return { valid: false, currentHash };
        }

        // Check if hash matches
        const valid = cacheState.colorsHash === currentHash;
        return { valid, currentHash };
    }

    async clearCache(): Promise<void> {
        try {
            await fsPromises.unlink(cacheStatePath);
            this.lastKnownHash = null;
            vscode.window.showInformationMessage('Matugen Theme: Cache cleared');
        } catch {
            // Cache file might not exist
        }
    }

    // ========================================================================
    // Theme Generation
    // ========================================================================

    private async performInitialSync(): Promise<void> {
        // Check if matugen colors exist
        if (!fs.existsSync(matugenColorsPath)) {
            console.log('Matugen Theme: No colors file found, skipping initial sync');
            return;
        }

        // Check cache validity
        const { valid, currentHash } = await this.isCacheValid();
        
        if (valid) {
            console.log('Matugen Theme: Cache is valid, skipping regeneration');
            this.lastKnownHash = currentHash;
            return;
        }

        // Themes need to be regenerated
        console.log('Matugen Theme: Initial sync - regenerating themes');
        await this.syncThemes(false);
    }

    async forceUpdate(): Promise<void> {
        await this.syncThemes(true);
    }

    private async syncThemes(showFeedback: boolean): Promise<ThemeGenerationResult> {
        // Prevent concurrent generation
        if (this.isGenerating) {
            console.log('Matugen Theme: Generation already in progress');
            return { success: false, cached: false };
        }

        this.isGenerating = true;
        this.updateStatusBar('syncing');

        try {
            // Check if we can skip regeneration (unless forced)
            if (!showFeedback) {
                const { valid, currentHash } = await this.isCacheValid();
                if (valid) {
                    console.log('Matugen Theme: Skipping - cache is valid');
                    this.lastKnownHash = currentHash;
                    this.updateStatusBar('idle');
                    return { success: true, cached: true };
                }
            }

            // Load and validate colors
            const colors = await this.loadColors();
            
            // Compute hash for caching
            const currentHash = await this.computeColorsHash();

            // Generate themes atomically
            await this.generateThemesAtomically(colors);

            // Update cache state
            if (currentHash) {
                await this.saveCacheState(currentHash);
                this.lastKnownHash = currentHash;
            }

            this.updateStatusBar('success');
            
            if (showFeedback) {
                vscode.window.showInformationMessage('Matugen Theme: Themes updated successfully!');
            }

            return { success: true, cached: false };

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.updateStatusBar('error');
            
            if (showFeedback) {
                this.showError(err);
            } else {
                console.error('Matugen Theme:', err.message);
            }

            return { success: false, cached: false, error: err };

        } finally {
            this.isGenerating = false;
        }
    }

    private async generateThemesAtomically(colors: Color[]): Promise<void> {
        await this.ensureThemesDirectory();

        // Generate all theme content first
        const themes: Array<{ fileName: string; content: string }> = [
            { fileName: 'matugen.json', content: JSON.stringify(template(colors, false), null, 4) },
            { fileName: 'matugen-bordered.json', content: JSON.stringify(template(colors, true), null, 4) },
        ];

        // Write to temp files first, then rename (atomic operation)
        const writeOperations = themes.map(async ({ fileName, content }) => {
            const finalPath = path.join(THEMES_DIR, fileName);
            const tempPath = `${finalPath}.tmp`;

            try {
                // Write to temp file
                await fsPromises.writeFile(tempPath, content, 'utf-8');
                // Atomic rename
                await fsPromises.rename(tempPath, finalPath);
            } catch (error) {
                // Clean up temp file if it exists
                try {
                    await fsPromises.unlink(tempPath);
                } catch {
                    // Ignore cleanup errors
                }
                throw error;
            }
        });

        await Promise.all(writeOperations);
    }

    private async ensureThemesDirectory(): Promise<void> {
        try {
            await fsPromises.access(THEMES_DIR);
        } catch {
            await fsPromises.mkdir(THEMES_DIR, { recursive: true });
        }
    }

    // ========================================================================
    // Color Loading
    // ========================================================================

    private async loadColors(): Promise<Color[]> {
        const colors = await this.readBaseColors();
        return await this.enhanceWithJsonColors(colors);
    }

    private async readBaseColors(): Promise<Color[]> {
        if (!fs.existsSync(matugenColorsPath)) {
            throw new Error(
                'Matugen colors file not found.\n\n' +
                'Please run matugen to generate a color palette.\n' +
                `Expected: ${matugenColorsPath}\n\n` +
                'See: https://github.com/InioX/matugen'
            );
        }

        const colorsData = await fsPromises.readFile(matugenColorsPath, 'utf-8');
        const colorStrings = colorsData.trim().split(/\s+/).filter(s => s.length > 0);

        if (colorStrings.length < REQUIRED_COLORS_COUNT) {
            throw new Error(
                `Invalid colors file: Found ${colorStrings.length} colors, need ${REQUIRED_COLORS_COUNT}.\n` +
                'Please regenerate with matugen.'
            );
        }

        const colors: Color[] = [];
        for (let i = 0; i < REQUIRED_COLORS_COUNT; i++) {
            try {
                colors.push(Color(colorStrings[i]));
            } catch {
                throw new Error(`Invalid color at position ${i}: "${colorStrings[i]}"`);
            }
        }

        return colors;
    }

    private async enhanceWithJsonColors(colors: Color[]): Promise<Color[]> {
        if (!fs.existsSync(matugenColorsJsonPath)) {
            return colors;
        }

        try {
            const jsonData = await fsPromises.readFile(matugenColorsJsonPath, 'utf-8');
            const parsed = this.parseColorJson(jsonData);

            if (parsed?.special?.background) {
                try {
                    colors[0] = Color(parsed.special.background);
                } catch {
                    console.warn('Matugen Theme: Invalid background in colors.json');
                }
            }

            if (parsed?.special?.foreground) {
                try {
                    colors[7] = Color(parsed.special.foreground);
                } catch {
                    console.warn('Matugen Theme: Invalid foreground in colors.json');
                }
            }
        } catch (error) {
            console.warn('Matugen Theme: Could not parse colors.json:', error);
        }

        return colors;
    }

    private parseColorJson(jsonData: string): any {
        try {
            return JSON.parse(jsonData);
        } catch {
            // Try to fix common issues (unescaped Windows paths)
            try {
                const fixed = jsonData
                    .split('\n')
                    .filter(line => !line.includes('wallpaper') || !line.includes('\\'))
                    .join('\n');
                return JSON.parse(fixed);
            } catch {
                return null;
            }
        }
    }

    // ========================================================================
    // Error Handling
    // ========================================================================

    private showError(error: Error): void {
        const message = error.message.includes('Matugen') || error.message.includes('Invalid')
            ? error.message
            : `Matugen Theme Error: ${error.message}`;

        vscode.window.showErrorMessage(message, 'Documentation', 'Retry').then(selection => {
            if (selection === 'Documentation') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/InioX/matugen'));
            } else if (selection === 'Retry') {
                this.forceUpdate();
            }
        });
    }
}

// ============================================================================
// Extension Entry Points
// ============================================================================

let themeManager: ThemeManager | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    themeManager = new ThemeManager();
    await themeManager.initialize(context);
    console.log('Matugen Theme: Extension activated');
}

export function deactivate(): void {
    themeManager?.dispose();
    themeManager = null;
    console.log('Matugen Theme: Extension deactivated');
}
