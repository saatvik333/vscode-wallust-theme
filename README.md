# Matugen Theme

Visual Studio Code theme that syncs with your wallpaper palette in real time using matugen.

<div align="center">

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/haikalllp.matugen-theme?style=flat-square&label=VS+Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=haikalllp.matugen-theme)
[![Open VSX](https://img.shields.io/open-vsx/v/haikalllp/matugen-theme?style=flat-square&label=Open+VSX&logo=eclipse-ide)](https://open-vsx.org/extension/haikalllp/matugen-theme)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/haikalllp.matugen-theme?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=haikalllp.matugen-theme)
[![License](https://img.shields.io/github/license/haikalllp/vscode-matugen-theme?style=flat-square)](https://github.com/haikalllp/vscode-matugen-theme/blob/master/LICENSE)

</div>

## Preview

![image1](https://github.com/user-attachments/assets/c4ba28b4-6e79-4c13-8654-5db53c43653d)
![image2](https://github.com/user-attachments/assets/4505a2ec-dfff-4b65-b8a5-bed2a8207538)
![image3](https://github.com/user-attachments/assets/fc2a92e0-6f57-4c95-8c6b-1c85eac999b3)

## Features

- **Real-time color updates:** Instantly adapts the VS Code theme to your current wallpaper palette
- **Smart caching:** Only regenerates themes when colors actually change (hash-based detection)
- **Reliable sync:** Dual-strategy watching (file watcher + polling fallback) ensures updates are never missed
- **Two theme variants:** Clean borderless look or bordered style for editor panes
- **Automatic light/dark detection:** Theme adapts based on background color luminance
- **Atomic writes:** Theme files are written atomically to prevent corruption
- **Zero configuration:** Works out of the box with sensible defaults

## Requirements

1. **Install [matugen](https://github.com/InioX/matugen):**
   This extension relies on matugen for generating color palettes.

2. **Copy templates:**
   Copy the templates from the [templates](./examples/matugen-templates/) directory to your matugen templates folder.

3. **Configure matugen:**
   Set up matugen to generate the required color files:

   ```toml
   [templates]
   vscode-colors = { src = 'vscode-colors', dst = '~/.cache/matugen/vscode-colors' }
   vscode-colors-json = { src = 'vscode-colors.json', dst = '~/.cache/matugen/vscode-colors.json' }
   ```

4. **Run matugen:**
   Generate colors with `matugen` or let it run automatically with your wallpaper manager.

## How It Works

The extension monitors `~/.cache/matugen/vscode-colors` and `~/.cache/matugen/vscode-colors.json` for changes:

1. **File Watcher:** Primary detection using chokidar with write stabilization
2. **Polling Fallback:** Secondary check every 5 seconds using hash comparison
3. **Hash-based Caching:** Themes only regenerate when the color hash changes
4. **Startup Sync:** Automatically syncs on VS Code startup if themes are outdated

## Extension Commands

| Command                       | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `Matugen Theme: Update Theme` | Force regenerate themes from current colors                |
| `Matugen Theme: Clear Cache`  | Clear the theme cache (forces regeneration on next change) |

## Extension Settings

| Setting                   | Default | Description                                            |
| ------------------------- | ------- | ------------------------------------------------------ |
| `matugenTheme.autoUpdate` | `true`  | Automatically update themes when matugen colors change |

## Theme Variants

- **Matugen:** Clean theme without borders (auto light/dark based on background)
- **Matugen Bordered:** Theme with subtle borders between panels (auto light/dark based on background)

## Troubleshooting

### Theme not updating automatically?

1. Check that matugen is generating files to `~/.cache/matugen/`
2. Verify the `vscode-colors` file contains 16 hex colors
3. Try `Matugen Theme: Clear Cache` then `Matugen Theme: Update Theme`
4. Check the Output panel (View → Output → select "Matugen Theme") for errors

### Colors look wrong?

1. Ensure your matugen templates match the ones in this repo's `examples/matugen-templates/` folder
2. The `vscode-colors.json` file is optional but provides better background/foreground colors
3. Try regenerating with `matugen`

### Extension not activating?

The extension activates after VS Code startup completes. Check:

1. Extension is enabled in the Extensions panel
2. No errors in Help → Toggle Developer Tools → Console

## Technical Details

- **Cache location:** `<extension>/themes/.matugen-theme-cache.json`
- **Debounce delay:** 500ms (prevents rapid regeneration)
- **Polling interval:** 5 seconds (fallback detection)
- **Write stabilization:** 300ms (waits for file writes to complete)

---

## Credits

- Inspired by the excellent work on [Wal Theme](https://github.com/dlasagno/vscode-wal-theme).
