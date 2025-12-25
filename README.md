# Wallust Theme

Visual Studio Code theme that syncs with your wallpaper palette in real time using wallust.

<div align="center">

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/saatvik333.wallust-theme?style=flat-square&label=VS+Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=saatvik333.wallust-theme)
[![Open VSX](https://img.shields.io/open-vsx/v/saatvik333/wallust-theme?style=flat-square&label=Open+VSX&logo=eclipse-ide)](https://open-vsx.org/extension/saatvik333/wallust-theme)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/saatvik333.wallust-theme?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=saatvik333.wallust-theme)
[![License](https://img.shields.io/github/license/saatvik333/vscode-wallust-theme?style=flat-square)](https://github.com/saatvik333/vscode-wallust-theme/blob/master/LICENSE)

</div>

## Preview

![image1](https://github.com/user-attachments/assets/d2654042-4139-4da9-87b0-821dea7f63a9)

![image2](https://github.com/user-attachments/assets/b2639a65-d5dc-45a7-bf1e-9999da9483cb)

![image3](https://github.com/user-attachments/assets/ed947a01-7b10-4ca6-8b5b-12b93ff6e05d)

## Features

- **Real-time color updates:** Instantly adapts the VS Code theme to your current wallpaper palette
- **Smart caching:** Only regenerates themes when colors actually change (hash-based detection)
- **Reliable sync:** Dual-strategy watching (file watcher + polling fallback) ensures updates are never missed
- **Two theme variants:** Clean borderless look or bordered style for editor panes
- **Automatic light/dark detection:** Theme adapts based on background color luminance
- **Atomic writes:** Theme files are written atomically to prevent corruption
- **Zero configuration:** Works out of the box with sensible defaults

## Requirements

1. **Install [wallust](https://codeberg.org/explosion-mental/wallust):**
   This extension relies on wallust for generating color palettes.

2. **Copy templates:**
   Copy the templates from the [templates](./examples/wallust-templates/) directory to your wallust templates folder.

3. **Configure `wallust.toml`:**
   Add these entries to generate the required color files:

   ```toml
   [templates]
   vscode = { src = 'vscode.json', dst = '~/.cache/wallust/colors.json' }
   vscode2 = { src = 'vscode', dst = '~/.cache/wallust/colors' }
   ```

4. **Run wallust:**
   Generate colors with `wallust run <image>` or let it run automatically with your wallpaper manager.

## How It Works

The extension monitors `~/.cache/wallust/colors` and `~/.cache/wallust/colors.json` for changes:

1. **File Watcher:** Primary detection using chokidar with write stabilization
2. **Polling Fallback:** Secondary check every 5 seconds using hash comparison
3. **Hash-based Caching:** Themes only regenerate when the color hash changes
4. **Startup Sync:** Automatically syncs on VS Code startup if themes are outdated

## Extension Commands

| Command                       | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `Wallust Theme: Update Theme` | Force regenerate themes from current colors                |
| `Wallust Theme: Clear Cache`  | Clear the theme cache (forces regeneration on next change) |

## Extension Settings

| Setting                   | Default | Description                                            |
| ------------------------- | ------- | ------------------------------------------------------ |
| `wallustTheme.autoUpdate` | `true`  | Automatically update themes when wallust colors change |

## Theme Variants

- **Wallust:** Clean theme without borders (auto light/dark based on background)
- **Wallust Bordered:** Theme with subtle borders between panels (auto light/dark based on background)

## Troubleshooting

### Theme not updating automatically?

1. Check that wallust is generating files to `~/.cache/wallust/`
2. Verify the `colors` file contains 16 hex colors
3. Try `Wallust Theme: Clear Cache` then `Wallust Theme: Update Theme`
4. Check the Output panel (View → Output → select "Wallust Theme") for errors

### Colors look wrong?

1. Ensure your wallust templates match the ones in this repo's `examples/wallust-templates/` folder
2. The `colors.json` file is optional but provides better background/foreground colors
3. Try regenerating with `wallust run <your-wallpaper>`

### Extension not activating?

The extension activates after VS Code startup completes. Check:

1. Extension is enabled in the Extensions panel
2. No errors in Help → Toggle Developer Tools → Console

## Technical Details

- **Cache location:** `<extension>/themes/.wallust-theme-cache.json`
- **Debounce delay:** 500ms (prevents rapid regeneration)
- **Polling interval:** 5 seconds (fallback detection)
- **Write stabilization:** 300ms (waits for file writes to complete)

---

## Credits

- Inspired by the excellent work on [Wal Theme](https://github.com/dlasagno/vscode-wal-theme).
