/**
 * Unified Theme Template with Automatic Light/Dark Detection
 * 
 * Automatically determines if the theme should be light or dark based on
 * the background color's luminance. Uses color science to ensure proper
 * contrast and readability regardless of the source palette.
 * 
 * Color Role Mapping (wallust 16-color palette):
 * - colors[0]: Background
 * - colors[1]: Red/Accent
 * - colors[2]: Green
 * - colors[3]: Yellow/Orange
 * - colors[4]: Blue
 * - colors[5]: Magenta/Purple
 * - colors[6]: Cyan
 * - colors[7]: Foreground
 * - colors[8-15]: Bright variants
 */
import Color from 'color';

// ============================================================================
// Types
// ============================================================================

interface SemanticColors {
    // Base
    bg: Color;
    bgElevated: Color;
    bgHighlight: Color;
    fg: Color;
    fgMuted: Color;
    
    // Accents
    accent: Color;
    accentSecondary: Color;
    
    // Status
    error: Color;
    warning: Color;
    success: Color;
    info: Color;
    
    // Syntax
    keyword: Color;
    string: Color;
    number: Color;
    function: Color;
    type: Color;
    variable: Color;
    comment: Color;
    operator: Color;
    
    // Git
    added: Color;
    modified: Color;
    deleted: Color;
    ignored: Color;
}

interface AlphaValues {
    subtle: string;
    light: string;
    medium: string;
    strong: string;
    heavy: string;
    solid: string;
    muted: string;
    dimmed: string;
    faint: string;
}

// ============================================================================
// Color Science Utilities
// ============================================================================

/**
 * Determines if a color is "light" based on relative luminance.
 * Uses the WCAG luminance formula.
 */
function isLightColor(color: Color): boolean {
    return color.luminosity() > 0.179;
}

/**
 * Ensures a color has sufficient contrast against a background.
 * Adjusts lightness if needed to meet minimum contrast ratio.
 */
function ensureContrast(fg: Color, bg: Color, minContrast = 4.5): Color {
    let adjusted = fg;
    const bgIsLight = isLightColor(bg);
    let iterations = 0;
    const maxIterations = 20;
    
    while (adjusted.contrast(bg) < minContrast && iterations < maxIterations) {
        if (bgIsLight) {
            adjusted = adjusted.darken(0.1);
        } else {
            adjusted = adjusted.lighten(0.1);
        }
        iterations++;
    }
    
    return adjusted;
}

/**
 * Adjusts a color for visibility on the given background.
 * Makes colors darker on light backgrounds, lighter on dark backgrounds.
 */
function adjustForBackground(color: Color, bg: Color): Color {
    const bgIsLight = isLightColor(bg);
    const colorLuminosity = color.luminosity();
    
    if (bgIsLight) {
        // On light backgrounds, ensure colors are dark enough
        if (colorLuminosity > 0.4) {
            return color.darken(0.3).saturate(0.1);
        }
    } else {
        // On dark backgrounds, ensure colors are light enough
        if (colorLuminosity < 0.15) {
            return color.lighten(0.3).saturate(0.1);
        }
    }
    
    return color;
}

/**
 * Creates an elevated background color (for panels, dropdowns, etc.)
 */
function elevateBackground(bg: Color, isLight: boolean): Color {
    return isLight ? bg.darken(0.03) : bg.lighten(0.08);
}

/**
 * Creates a highlighted background color (for selections, hovers, etc.)
 */
function highlightBackground(bg: Color, isLight: boolean): Color {
    return isLight ? bg.darken(0.06) : bg.lighten(0.15);
}

// ============================================================================
// Semantic Color Generation
// ============================================================================

function createSemanticColors(colors: Color[], isDark: boolean): SemanticColors {
    const bg = colors[0];
    
    // Determine foreground - use provided or create contrasting
    let fg = colors[7];
    if (fg.contrast(bg) < 4.5) {
        fg = isDark ? Color('#e0e0e0') : Color('#1a1a1a');
    }
    
    // Create muted foreground
    const fgMuted = isDark 
        ? fg.darken(0.3) 
        : fg.lighten(0.4);
    
    // Adjust all accent colors for the background
    const adjustColor = (c: Color) => ensureContrast(adjustForBackground(c, bg), bg, 4.5);
    
    return {
        // Base colors
        bg,
        bgElevated: elevateBackground(bg, !isDark),
        bgHighlight: highlightBackground(bg, !isDark),
        fg,
        fgMuted,
        
        // Accent colors
        accent: adjustColor(colors[4]),           // Blue
        accentSecondary: adjustColor(colors[6]),  // Cyan
        
        // Status colors (semantic meaning preserved)
        error: adjustColor(colors[1]),            // Red
        warning: adjustColor(colors[3]),          // Yellow/Orange
        success: adjustColor(colors[2]),          // Green
        info: adjustColor(colors[4]),             // Blue
        
        // Syntax colors
        keyword: adjustColor(colors[5]),          // Magenta/Purple
        string: adjustColor(colors[2]),           // Green
        number: adjustColor(colors[3]),           // Orange
        function: adjustColor(colors[4]),         // Blue
        type: adjustColor(colors[6]),             // Cyan
        variable: adjustColor(colors[1]),         // Red
        comment: fgMuted,
        operator: adjustColor(colors[6]),         // Cyan
        
        // Git colors
        added: adjustColor(colors[2]),
        modified: adjustColor(colors[3]),
        deleted: adjustColor(colors[1]),
        ignored: fgMuted,
    };
}

function createAlphaValues(isDark: boolean): AlphaValues {
    // Slightly different alpha values for light vs dark themes
    // Light themes need less opacity for overlays to be visible
    return isDark ? {
        subtle: '15',
        light: '25',
        medium: '40',
        strong: '60',
        heavy: '80',
        solid: 'cc',
        muted: '99',
        dimmed: '77',
        faint: '33',
    } : {
        subtle: '10',
        light: '18',
        medium: '30',
        strong: '50',
        heavy: '70',
        solid: 'cc',
        muted: '99',
        dimmed: '77',
        faint: '22',
    };
}

// ============================================================================
// Main Template Export
// ============================================================================

export default (colors: Color[], bordered: boolean) => {
    // Auto-detect light/dark based on background luminance
    const isDark = !isLightColor(colors[0]);
    const themeType = isDark ? 'dark' : 'light';
    
    // Generate semantic colors adjusted for the background
    const semantic = createSemanticColors(colors, isDark);
    const alpha = createAlphaValues(isDark);
    
    // For button/badge foregrounds, we need a contrasting color
    const contrastFg = isDark ? semantic.bg : Color('#ffffff');

    return {
        'type': themeType,
        'semanticHighlighting': true,
        'semanticTokenColors': {
            'enumMember': { 'foreground': semantic.type.hex() },
            'variable.constant': { 'foreground': semantic.number.hex() },
            'variable.defaultLibrary': { 'foreground': semantic.type.hex() },
        },
        'colors': {
            // ================================================================
            // Base Colors
            // ================================================================
            'focusBorder': semantic.accent.hex() + alpha.dimmed,
            'foreground': semantic.fg.hex(),
            'descriptionForeground': semantic.fg.hex() + alpha.muted,
            'errorForeground': semantic.error.hex(),
            'widget.shadow': isDark ? '#00000066' : '#00000026',
            'selection.background': semantic.accent.hex() + alpha.medium,
            'icon.foreground': semantic.fg.hex(),

            // ================================================================
            // Text Colors
            // ================================================================
            'textBlockQuote.background': semantic.bgElevated.hex(),
            'textBlockQuote.border': semantic.accent.hex() + alpha.medium,
            'textLink.foreground': semantic.accent.hex(),
            'textLink.activeForeground': (isDark ? semantic.accent.lighten(0.2) : semantic.accent.darken(0.1)).hex(),
            'textPreformat.foreground': semantic.string.hex(),
            'textSeparator.foreground': semantic.fgMuted.hex() + alpha.faint,

            // ================================================================
            // Button
            // ================================================================
            'button.background': semantic.accent.hex(),
            'button.foreground': contrastFg.hex(),
            'button.hoverBackground': (isDark ? semantic.accent.lighten(0.1) : semantic.accent.darken(0.1)).hex(),
            'button.secondaryBackground': semantic.bgHighlight.hex(),
            'button.secondaryForeground': semantic.fg.hex(),
            'button.secondaryHoverBackground': (isDark ? semantic.bgHighlight.lighten(0.1) : semantic.bgHighlight.darken(0.05)).hex(),

            // ================================================================
            // Dropdown
            // ================================================================
            'dropdown.background': semantic.bgElevated.hex(),
            'dropdown.foreground': semantic.fg.hex(),
            'dropdown.border': semantic.fgMuted.hex() + alpha.faint,
            'dropdown.listBackground': semantic.bgElevated.hex(),

            // ================================================================
            // Input
            // ================================================================
            'input.background': (isDark ? semantic.bg.darken(0.1) : semantic.bg).hex(),
            'input.foreground': semantic.fg.hex(),
            'input.border': semantic.fgMuted.hex() + alpha.faint,
            'input.placeholderForeground': semantic.fgMuted.hex() + alpha.dimmed,
            'inputOption.activeBorder': semantic.accent.hex(),
            'inputOption.activeBackground': semantic.accent.hex() + alpha.light,
            'inputOption.activeForeground': semantic.fg.hex(),
            'inputValidation.errorBackground': semantic.bg.hex(),
            'inputValidation.errorBorder': semantic.error.hex(),
            'inputValidation.errorForeground': semantic.error.hex(),
            'inputValidation.infoBackground': semantic.bg.hex(),
            'inputValidation.infoBorder': semantic.info.hex(),
            'inputValidation.infoForeground': semantic.info.hex(),
            'inputValidation.warningBackground': semantic.bg.hex(),
            'inputValidation.warningBorder': semantic.warning.hex(),
            'inputValidation.warningForeground': semantic.warning.hex(),

            // ================================================================
            // Scrollbar
            // ================================================================
            'scrollbar.shadow': isDark ? '#00000044' : '#00000015',
            'scrollbarSlider.background': semantic.fgMuted.hex() + alpha.medium,
            'scrollbarSlider.hoverBackground': semantic.fgMuted.hex() + alpha.strong,
            'scrollbarSlider.activeBackground': semantic.fgMuted.hex() + alpha.heavy,

            // ================================================================
            // Badge
            // ================================================================
            'badge.background': semantic.accent.hex(),
            'badge.foreground': contrastFg.hex(),

            // ================================================================
            // Progress Bar
            // ================================================================
            'progressBar.background': semantic.accent.hex(),

            // ================================================================
            // Lists and Trees
            // ================================================================
            'list.activeSelectionBackground': semantic.accent.hex() + alpha.light,
            'list.activeSelectionForeground': semantic.fg.hex(),
            'list.activeSelectionIconForeground': semantic.fg.hex(),
            'list.focusBackground': semantic.accent.hex() + alpha.light,
            'list.focusForeground': semantic.fg.hex(),
            'list.focusHighlightForeground': semantic.accent.hex(),
            'list.focusOutline': semantic.accent.hex() + alpha.medium,
            'list.highlightForeground': semantic.accent.hex(),
            'list.hoverBackground': semantic.bgHighlight.hex(),
            'list.hoverForeground': semantic.fg.hex(),
            'list.inactiveSelectionBackground': semantic.bgHighlight.hex(),
            'list.inactiveSelectionForeground': semantic.fg.hex(),
            'list.invalidItemForeground': semantic.error.hex() + alpha.dimmed,
            'list.warningForeground': semantic.warning.hex(),
            'list.errorForeground': semantic.error.hex(),
            'listFilterWidget.background': semantic.bgElevated.hex(),
            'listFilterWidget.outline': semantic.accent.hex(),
            'listFilterWidget.noMatchesOutline': semantic.error.hex(),
            'tree.indentGuidesStroke': semantic.fgMuted.hex() + alpha.faint,

            // ================================================================
            // Activity Bar
            // ================================================================
            'activityBar.background': (bordered ? semantic.bgElevated : semantic.bg).hex(),
            'activityBar.foreground': semantic.fg.hex(),
            'activityBar.inactiveForeground': semantic.fgMuted.hex(),
            'activityBar.border': bordered ? semantic.fgMuted.hex() + alpha.faint : (bordered ? semantic.bgElevated : semantic.bg).hex(),
            'activityBar.activeBorder': semantic.accent.hex(),
            'activityBarBadge.background': semantic.accent.hex(),
            'activityBarBadge.foreground': contrastFg.hex(),

            // Activity Bar (Top position)
            'activityBarTop.foreground': semantic.fg.hex(),
            'activityBarTop.inactiveForeground': semantic.fgMuted.hex(),
            'activityBarTop.activeForeground': semantic.fg.hex(),
            'activityBarTop.background': (bordered ? semantic.bg : semantic.bgElevated).hex(),
            'activityBarTop.border': bordered ? semantic.fgMuted.hex() + alpha.faint : semantic.bg.hex(),
            'activityBarTop.activeBorder': semantic.accent.hex(),
            'activityBarTopBadge.background': semantic.accent.hex(),
            'activityBarTopBadge.foreground': contrastFg.hex(),

            // Activity Bar (Bottom position)
            'activityBarBottom.foreground': semantic.fg.hex(),
            'activityBarBottom.inactiveForeground': semantic.fgMuted.hex(),
            'activityBarBottom.activeForeground': semantic.fg.hex(),
            'activityBarBottom.background': (bordered ? semantic.bgElevated : semantic.bg).hex(),
            'activityBarBottom.border': bordered ? semantic.fgMuted.hex() + alpha.faint : semantic.bg.hex(),
            'activityBarBottom.activeBorder': semantic.accent.hex(),
            'activityBarBottomBadge.background': semantic.accent.hex(),
            'activityBarBottomBadge.foreground': contrastFg.hex(),

            // ================================================================
            // Sidebar
            // ================================================================
            'sideBar.background': (bordered ? semantic.bg : semantic.bgElevated).hex(),
            'sideBar.foreground': semantic.fg.hex() + alpha.muted,
            'sideBar.border': bordered ? semantic.fgMuted.hex() + alpha.faint : (bordered ? semantic.bg : semantic.bgElevated).hex(),
            'sideBarTitle.foreground': semantic.fg.hex(),
            'sideBarSectionHeader.background': semantic.bg.hex(),
            'sideBarSectionHeader.foreground': semantic.fg.hex(),
            'sideBarSectionHeader.border': semantic.fgMuted.hex() + alpha.faint,

            // ================================================================
            // Minimap
            // ================================================================
            'minimap.background': semantic.bg.hex(),
            'minimap.selectionHighlight': semantic.accent.hex() + alpha.medium,
            'minimap.errorHighlight': semantic.error.hex(),
            'minimap.warningHighlight': semantic.warning.hex(),
            'minimap.findMatchHighlight': semantic.accent.hex() + alpha.strong,
            'minimapSlider.background': semantic.fgMuted.hex() + alpha.subtle,
            'minimapSlider.hoverBackground': semantic.fgMuted.hex() + alpha.light,
            'minimapSlider.activeBackground': semantic.fgMuted.hex() + alpha.medium,
            'minimapGutter.addedBackground': semantic.added.hex(),
            'minimapGutter.modifiedBackground': semantic.modified.hex(),
            'minimapGutter.deletedBackground': semantic.deleted.hex(),

            // ================================================================
            // Editor Groups and Tabs
            // ================================================================
            'editorGroup.border': semantic.fgMuted.hex() + alpha.faint,
            'editorGroup.dropBackground': semantic.accent.hex() + alpha.light,
            'editorGroupHeader.noTabsBackground': semantic.bg.hex(),
            'editorGroupHeader.tabsBackground': (bordered ? semantic.bg : semantic.bgElevated).hex(),
            'editorGroupHeader.tabsBorder': bordered ? semantic.fgMuted.hex() + alpha.faint : (bordered ? semantic.bg : semantic.bgElevated).hex(),
            'tab.activeBackground': semantic.bg.hex(),
            'tab.activeForeground': semantic.fg.hex(),
            'tab.border': bordered ? semantic.fgMuted.hex() + alpha.faint : (bordered ? semantic.bg : semantic.bgElevated).hex(),
            'tab.activeBorder': bordered ? undefined : semantic.accent.hex(),
            'tab.activeBorderTop': bordered ? semantic.accent.hex() : undefined,
            'tab.unfocusedActiveBorder': bordered ? undefined : semantic.fgMuted.hex(),
            'tab.unfocusedActiveBorderTop': bordered ? semantic.fgMuted.hex() : undefined,
            'tab.inactiveBackground': (bordered ? semantic.bg : semantic.bgElevated).hex(),
            'tab.inactiveForeground': semantic.fg.hex() + alpha.dimmed,
            'tab.unfocusedActiveForeground': semantic.fg.hex() + alpha.muted,
            'tab.unfocusedInactiveForeground': semantic.fg.hex() + alpha.dimmed,
            'tab.hoverBackground': semantic.bgHighlight.hex(),
            'tab.hoverForeground': semantic.fg.hex(),

            // ================================================================
            // Editor
            // ================================================================
            'editor.background': semantic.bg.hex(),
            'editor.foreground': semantic.fg.hex(),
            'editorLineNumber.foreground': semantic.fgMuted.hex() + alpha.dimmed,
            'editorLineNumber.activeForeground': semantic.fg.hex(),
            'editorCursor.foreground': semantic.accent.hex(),
            'editorCursor.background': semantic.bg.hex(),

            // Selections
            'editor.selectionBackground': semantic.accent.hex() + alpha.medium,
            'editor.inactiveSelectionBackground': semantic.fgMuted.hex() + alpha.light,
            'editor.selectionHighlightBackground': semantic.accent.hex() + alpha.subtle,
            'editor.selectionHighlightBorder': semantic.accent.hex() + alpha.medium,

            // Word highlights
            'editor.wordHighlightBackground': semantic.fgMuted.hex() + alpha.light,
            'editor.wordHighlightBorder': semantic.fgMuted.hex() + alpha.medium,
            'editor.wordHighlightStrongBackground': semantic.accent.hex() + alpha.light,
            'editor.wordHighlightStrongBorder': semantic.accent.hex() + alpha.medium,

            // Find matches
            'editor.findMatchBackground': semantic.warning.hex() + alpha.medium,
            'editor.findMatchBorder': semantic.warning.hex(),
            'editor.findMatchHighlightBackground': semantic.warning.hex() + alpha.light,
            'editor.findMatchHighlightBorder': semantic.warning.hex() + alpha.medium,
            'editor.findRangeHighlightBackground': semantic.fgMuted.hex() + alpha.subtle,
            'editor.findRangeHighlightBorder': '#00000000',

            // Highlights
            'editor.hoverHighlightBackground': semantic.accent.hex() + alpha.subtle,
            'editor.lineHighlightBackground': semantic.fgMuted.hex() + alpha.subtle,
            'editor.lineHighlightBorder': '#00000000',
            'editor.rangeHighlightBackground': semantic.accent.hex() + alpha.subtle,
            'editor.rangeHighlightBorder': '#00000000',
            'editor.symbolHighlightBackground': semantic.accent.hex() + alpha.light,
            'editor.symbolHighlightBorder': semantic.accent.hex() + alpha.medium,

            // Links
            'editorLink.activeForeground': semantic.accent.hex(),

            // Whitespace
            'editorWhitespace.foreground': semantic.fgMuted.hex() + alpha.faint,

            // Indent guides
            'editorIndentGuide.background1': semantic.fgMuted.hex() + alpha.faint,
            'editorIndentGuide.activeBackground1': semantic.fgMuted.hex() + alpha.medium,

            // Rulers
            'editorRuler.foreground': semantic.fgMuted.hex() + alpha.faint,

            // Code lens
            'editorCodeLens.foreground': semantic.fgMuted.hex() + alpha.dimmed,

            // Lightbulb
            'editorLightBulb.foreground': semantic.warning.hex(),
            'editorLightBulbAutoFix.foreground': semantic.accent.hex(),

            // Bracket matching
            'editorBracketMatch.background': semantic.fgMuted.hex() + alpha.light,
            'editorBracketMatch.border': semantic.fgMuted.hex() + alpha.medium,

            // Bracket pair colorization
            'editorBracketHighlight.foreground1': semantic.warning.hex(),
            'editorBracketHighlight.foreground2': semantic.keyword.hex(),
            'editorBracketHighlight.foreground3': semantic.type.hex(),
            'editorBracketHighlight.foreground4': semantic.string.hex(),
            'editorBracketHighlight.foreground5': semantic.function.hex(),
            'editorBracketHighlight.foreground6': semantic.variable.hex(),
            'editorBracketHighlight.unexpectedBracket.foreground': semantic.error.hex(),

            // Overview ruler
            'editorOverviewRuler.border': semantic.fgMuted.hex() + alpha.faint,
            'editorOverviewRuler.findMatchForeground': semantic.warning.hex() + alpha.strong,
            'editorOverviewRuler.rangeHighlightForeground': semantic.accent.hex() + alpha.medium,
            'editorOverviewRuler.selectionHighlightForeground': semantic.accent.hex() + alpha.medium,
            'editorOverviewRuler.wordHighlightForeground': semantic.fgMuted.hex() + alpha.medium,
            'editorOverviewRuler.wordHighlightStrongForeground': semantic.accent.hex() + alpha.medium,
            'editorOverviewRuler.modifiedForeground': semantic.modified.hex(),
            'editorOverviewRuler.addedForeground': semantic.added.hex(),
            'editorOverviewRuler.deletedForeground': semantic.deleted.hex(),
            'editorOverviewRuler.errorForeground': semantic.error.hex(),
            'editorOverviewRuler.warningForeground': semantic.warning.hex(),
            'editorOverviewRuler.infoForeground': semantic.info.hex(),
            'editorOverviewRuler.bracketMatchForeground': semantic.fgMuted.hex() + alpha.medium,

            // Errors and warnings
            'editorError.foreground': semantic.error.hex(),
            'editorError.border': '#00000000',
            'editorWarning.foreground': semantic.warning.hex(),
            'editorWarning.border': '#00000000',
            'editorInfo.foreground': semantic.info.hex(),
            'editorInfo.border': '#00000000',
            'editorHint.foreground': semantic.success.hex(),
            'editorHint.border': '#00000000',
            'problemsErrorIcon.foreground': semantic.error.hex(),
            'problemsWarningIcon.foreground': semantic.warning.hex(),
            'problemsInfoIcon.foreground': semantic.info.hex(),

            // Gutter
            'editorGutter.background': semantic.bg.hex(),
            'editorGutter.modifiedBackground': semantic.modified.hex(),
            'editorGutter.addedBackground': semantic.added.hex(),
            'editorGutter.deletedBackground': semantic.deleted.hex(),
            'editorGutter.commentRangeForeground': semantic.fgMuted.hex(),
            'editorGutter.foldingControlForeground': semantic.fgMuted.hex(),

            // ================================================================
            // Diff Editor
            // ================================================================
            'diffEditor.insertedTextBackground': semantic.added.hex() + alpha.subtle,
            'diffEditor.insertedTextBorder': '#00000000',
            'diffEditor.removedTextBackground': semantic.deleted.hex() + alpha.subtle,
            'diffEditor.removedTextBorder': '#00000000',
            'diffEditor.border': semantic.fgMuted.hex() + alpha.faint,
            'diffEditor.diagonalFill': semantic.fgMuted.hex() + alpha.faint,
            'diffEditorGutter.insertedLineBackground': semantic.added.hex() + alpha.light,
            'diffEditorGutter.removedLineBackground': semantic.deleted.hex() + alpha.light,
            'diffEditorOverview.insertedForeground': semantic.added.hex(),
            'diffEditorOverview.removedForeground': semantic.deleted.hex(),

            // ================================================================
            // Editor Widget
            // ================================================================
            'editorWidget.background': semantic.bgElevated.hex(),
            'editorWidget.foreground': semantic.fg.hex(),
            'editorWidget.border': semantic.fgMuted.hex() + alpha.faint,
            'editorWidget.resizeBorder': semantic.accent.hex(),

            // Suggest widget
            'editorSuggestWidget.background': semantic.bgElevated.hex(),
            'editorSuggestWidget.border': semantic.fgMuted.hex() + alpha.faint,
            'editorSuggestWidget.foreground': semantic.fg.hex(),
            'editorSuggestWidget.focusHighlightForeground': semantic.accent.hex(),
            'editorSuggestWidget.highlightForeground': semantic.accent.hex(),
            'editorSuggestWidget.selectedBackground': semantic.accent.hex() + alpha.light,
            'editorSuggestWidget.selectedForeground': semantic.fg.hex(),
            'editorSuggestWidget.selectedIconForeground': semantic.fg.hex(),

            // Hover widget
            'editorHoverWidget.background': semantic.bgElevated.hex(),
            'editorHoverWidget.border': semantic.fgMuted.hex() + alpha.faint,
            'editorHoverWidget.foreground': semantic.fg.hex(),
            'editorHoverWidget.highlightForeground': semantic.accent.hex(),
            'editorHoverWidget.statusBarBackground': semantic.bgHighlight.hex(),

            // Debug exception widget
            'debugExceptionWidget.background': semantic.bgElevated.hex(),
            'debugExceptionWidget.border': semantic.error.hex(),

            // Marker navigation
            'editorMarkerNavigation.background': semantic.bgElevated.hex(),
            'editorMarkerNavigationError.background': semantic.error.hex() + alpha.light,
            'editorMarkerNavigationWarning.background': semantic.warning.hex() + alpha.light,
            'editorMarkerNavigationInfo.background': semantic.info.hex() + alpha.light,
            'editorMarkerNavigationError.headerBackground': semantic.error.hex() + alpha.subtle,
            'editorMarkerNavigationWarning.headerBackground': semantic.warning.hex() + alpha.subtle,
            'editorMarkerNavigationInfo.headerBackground': semantic.info.hex() + alpha.subtle,

            // ================================================================
            // Peek View
            // ================================================================
            'peekView.border': semantic.accent.hex(),
            'peekViewEditor.background': (isDark ? semantic.bg.darken(0.1) : semantic.bgElevated).hex(),
            'peekViewEditorGutter.background': (isDark ? semantic.bg.darken(0.1) : semantic.bgElevated).hex(),
            'peekViewEditor.matchHighlightBackground': semantic.warning.hex() + alpha.light,
            'peekViewEditor.matchHighlightBorder': semantic.warning.hex(),
            'peekViewResult.background': semantic.bgElevated.hex(),
            'peekViewResult.fileForeground': semantic.fg.hex(),
            'peekViewResult.lineForeground': semantic.fg.hex() + alpha.muted,
            'peekViewResult.matchHighlightBackground': semantic.warning.hex() + alpha.light,
            'peekViewResult.selectionBackground': semantic.accent.hex() + alpha.light,
            'peekViewResult.selectionForeground': semantic.fg.hex(),
            'peekViewTitle.background': semantic.bgHighlight.hex(),
            'peekViewTitleDescription.foreground': semantic.fg.hex() + alpha.dimmed,
            'peekViewTitleLabel.foreground': semantic.fg.hex(),

            // ================================================================
            // Merge Conflicts
            // ================================================================
            'merge.currentHeaderBackground': semantic.success.hex() + alpha.medium,
            'merge.currentContentBackground': semantic.success.hex() + alpha.subtle,
            'merge.incomingHeaderBackground': semantic.info.hex() + alpha.medium,
            'merge.incomingContentBackground': semantic.info.hex() + alpha.subtle,
            'merge.border': semantic.fgMuted.hex() + alpha.faint,
            'merge.commonContentBackground': semantic.fgMuted.hex() + alpha.subtle,
            'merge.commonHeaderBackground': semantic.fgMuted.hex() + alpha.light,
            'editorOverviewRuler.currentContentForeground': semantic.success.hex(),
            'editorOverviewRuler.incomingContentForeground': semantic.info.hex(),
            'editorOverviewRuler.commonContentForeground': semantic.fgMuted.hex(),

            // ================================================================
            // Panel
            // ================================================================
            'panel.background': semantic.bg.hex(),
            'panel.border': semantic.fgMuted.hex() + alpha.faint,
            'panel.dropBorder': semantic.accent.hex(),
            'panelTitle.activeBorder': semantic.accent.hex(),
            'panelTitle.activeForeground': semantic.fg.hex(),
            'panelTitle.inactiveForeground': semantic.fg.hex() + alpha.dimmed,
            'panelInput.border': semantic.fgMuted.hex() + alpha.faint,
            'panelSection.border': semantic.fgMuted.hex() + alpha.faint,
            'panelSection.dropBackground': semantic.accent.hex() + alpha.light,
            'panelSectionHeader.background': semantic.bgElevated.hex(),
            'panelSectionHeader.foreground': semantic.fg.hex(),
            'panelSectionHeader.border': semantic.fgMuted.hex() + alpha.faint,

            // ================================================================
            // Status Bar
            // ================================================================
            'statusBar.background': semantic.bg.hex(),
            'statusBar.foreground': semantic.fg.hex() + alpha.muted,
            'statusBar.border': bordered ? semantic.fgMuted.hex() + alpha.faint : semantic.bg.hex(),
            'statusBar.debuggingBackground': semantic.warning.hex(),
            'statusBar.debuggingForeground': contrastFg.hex(),
            'statusBar.debuggingBorder': semantic.warning.darken(0.2).hex(),
            'statusBar.noFolderBackground': semantic.bgElevated.hex(),
            'statusBar.noFolderForeground': semantic.fg.hex() + alpha.muted,
            'statusBar.noFolderBorder': semantic.bgElevated.hex(),
            'statusBarItem.activeBackground': semantic.fgMuted.hex() + alpha.light,
            'statusBarItem.hoverBackground': semantic.fgMuted.hex() + alpha.subtle,
            'statusBarItem.prominentBackground': semantic.accent.hex() + alpha.light,
            'statusBarItem.prominentForeground': semantic.fg.hex(),
            'statusBarItem.prominentHoverBackground': semantic.accent.hex() + alpha.medium,
            'statusBarItem.remoteBackground': semantic.accent.hex(),
            'statusBarItem.remoteForeground': contrastFg.hex(),
            'statusBarItem.errorBackground': semantic.error.hex(),
            'statusBarItem.errorForeground': contrastFg.hex(),
            'statusBarItem.warningBackground': semantic.warning.hex(),
            'statusBarItem.warningForeground': contrastFg.hex(),

            // ================================================================
            // Title Bar
            // ================================================================
            'titleBar.activeBackground': semantic.bg.hex(),
            'titleBar.activeForeground': semantic.fg.hex(),
            'titleBar.inactiveBackground': semantic.bg.hex(),
            'titleBar.inactiveForeground': semantic.fg.hex() + alpha.dimmed,
            'titleBar.border': bordered ? semantic.fgMuted.hex() + alpha.faint : semantic.bg.hex(),

            // ================================================================
            // Menu Bar
            // ================================================================
            'menubar.selectionForeground': semantic.fg.hex(),
            'menubar.selectionBackground': semantic.bgHighlight.hex(),
            'menubar.selectionBorder': '#00000000',
            'menu.foreground': semantic.fg.hex(),
            'menu.background': semantic.bgElevated.hex(),
            'menu.selectionForeground': semantic.fg.hex(),
            'menu.selectionBackground': semantic.accent.hex() + alpha.light,
            'menu.selectionBorder': '#00000000',
            'menu.separatorBackground': semantic.fgMuted.hex() + alpha.faint,
            'menu.border': semantic.fgMuted.hex() + alpha.faint,

            // ================================================================
            // Notifications
            // ================================================================
            'notificationCenter.border': semantic.fgMuted.hex() + alpha.faint,
            'notificationCenterHeader.foreground': semantic.fg.hex(),
            'notificationCenterHeader.background': semantic.bgElevated.hex(),
            'notificationToast.border': semantic.fgMuted.hex() + alpha.faint,
            'notifications.foreground': semantic.fg.hex(),
            'notifications.background': semantic.bgElevated.hex(),
            'notifications.border': semantic.fgMuted.hex() + alpha.faint,
            'notificationLink.foreground': semantic.accent.hex(),
            'notificationsErrorIcon.foreground': semantic.error.hex(),
            'notificationsWarningIcon.foreground': semantic.warning.hex(),
            'notificationsInfoIcon.foreground': semantic.info.hex(),

            // ================================================================
            // Extensions
            // ================================================================
            'extensionButton.prominentForeground': contrastFg.hex(),
            'extensionButton.prominentBackground': semantic.accent.hex(),
            'extensionButton.prominentHoverBackground': (isDark ? semantic.accent.lighten(0.1) : semantic.accent.darken(0.1)).hex(),
            'extensionBadge.remoteBackground': semantic.accent.hex(),
            'extensionBadge.remoteForeground': contrastFg.hex(),
            'extensionIcon.starForeground': semantic.warning.hex(),
            'extensionIcon.verifiedForeground': semantic.success.hex(),
            'extensionIcon.preReleaseForeground': semantic.warning.hex(),

            // ================================================================
            // Quick Picker
            // ================================================================
            'pickerGroup.border': semantic.fgMuted.hex() + alpha.faint,
            'pickerGroup.foreground': semantic.accent.hex(),
            'quickInput.background': semantic.bgElevated.hex(),
            'quickInput.foreground': semantic.fg.hex(),
            'quickInputList.focusBackground': semantic.accent.hex() + alpha.light,
            'quickInputList.focusForeground': semantic.fg.hex(),
            'quickInputList.focusIconForeground': semantic.fg.hex(),
            'quickInputTitle.background': semantic.bgHighlight.hex(),

            // ================================================================
            // Keybinding
            // ================================================================
            'keybindingLabel.background': semantic.bgHighlight.hex(),
            'keybindingLabel.foreground': semantic.fg.hex(),
            'keybindingLabel.border': semantic.fgMuted.hex() + alpha.faint,
            'keybindingLabel.bottomBorder': semantic.fgMuted.hex() + alpha.medium,

            // ================================================================
            // Keyboard Shortcut Table
            // ================================================================
            'keybindingTable.headerBackground': semantic.bgElevated.hex(),
            'keybindingTable.rowsBackground': semantic.bg.hex(),

            // ================================================================
            // Debug
            // ================================================================
            'debugToolBar.background': semantic.bgElevated.hex(),
            'debugToolBar.border': semantic.fgMuted.hex() + alpha.faint,
            'debugIcon.breakpointForeground': semantic.error.hex(),
            'debugIcon.breakpointDisabledForeground': semantic.fgMuted.hex(),
            'debugIcon.breakpointUnverifiedForeground': semantic.warning.hex(),
            'debugIcon.breakpointCurrentStackframeForeground': semantic.warning.hex(),
            'debugIcon.breakpointStackframeForeground': semantic.success.hex(),
            'debugIcon.startForeground': semantic.success.hex(),
            'debugIcon.pauseForeground': semantic.warning.hex(),
            'debugIcon.stopForeground': semantic.error.hex(),
            'debugIcon.disconnectForeground': semantic.error.hex(),
            'debugIcon.restartForeground': semantic.success.hex(),
            'debugIcon.stepOverForeground': semantic.accent.hex(),
            'debugIcon.stepIntoForeground': semantic.accent.hex(),
            'debugIcon.stepOutForeground': semantic.accent.hex(),
            'debugIcon.continueForeground': semantic.success.hex(),
            'debugIcon.stepBackForeground': semantic.accent.hex(),
            'debugConsole.infoForeground': semantic.info.hex(),
            'debugConsole.warningForeground': semantic.warning.hex(),
            'debugConsole.errorForeground': semantic.error.hex(),
            'debugConsole.sourceForeground': semantic.fg.hex() + alpha.muted,
            'debugConsoleInputIcon.foreground': semantic.accent.hex(),
            'debugTokenExpression.name': semantic.variable.hex(),
            'debugTokenExpression.value': semantic.string.hex(),
            'debugTokenExpression.string': semantic.string.hex(),
            'debugTokenExpression.boolean': semantic.keyword.hex(),
            'debugTokenExpression.number': semantic.number.hex(),
            'debugTokenExpression.error': semantic.error.hex(),

            // ================================================================
            // Testing
            // ================================================================
            'testing.iconFailed': semantic.error.hex(),
            'testing.iconErrored': semantic.error.hex(),
            'testing.iconPassed': semantic.success.hex(),
            'testing.iconQueued': semantic.fgMuted.hex(),
            'testing.iconUnset': semantic.fgMuted.hex(),
            'testing.iconSkipped': semantic.warning.hex(),
            'testing.runAction': semantic.success.hex(),
            'testing.peekBorder': semantic.error.hex(),
            'testing.peekHeaderBackground': semantic.error.hex() + alpha.subtle,

            // ================================================================
            // Welcome Page
            // ================================================================
            'welcomePage.background': semantic.bg.hex(),
            'welcomePage.tileBackground': semantic.bgElevated.hex(),
            'welcomePage.tileHoverBackground': semantic.bgHighlight.hex(),
            'welcomePage.tileBorder': semantic.fgMuted.hex() + alpha.faint,
            'welcomePage.progress.background': semantic.bgHighlight.hex(),
            'welcomePage.progress.foreground': semantic.accent.hex(),
            'walkThrough.embeddedEditorBackground': semantic.bgElevated.hex(),

            // ================================================================
            // Git Decoration
            // ================================================================
            'gitDecoration.addedResourceForeground': semantic.added.hex(),
            'gitDecoration.modifiedResourceForeground': semantic.modified.hex(),
            'gitDecoration.deletedResourceForeground': semantic.deleted.hex(),
            'gitDecoration.renamedResourceForeground': semantic.info.hex(),
            'gitDecoration.stageModifiedResourceForeground': semantic.modified.hex(),
            'gitDecoration.stageDeletedResourceForeground': semantic.deleted.hex(),
            'gitDecoration.untrackedResourceForeground': semantic.success.hex(),
            'gitDecoration.ignoredResourceForeground': semantic.ignored.hex() + alpha.dimmed,
            'gitDecoration.conflictingResourceForeground': semantic.error.hex(),
            'gitDecoration.submoduleResourceForeground': semantic.info.hex(),

            // ================================================================
            // Settings
            // ================================================================
            'settings.headerForeground': semantic.fg.hex(),
            'settings.modifiedItemIndicator': semantic.accent.hex(),
            'settings.dropdownBackground': semantic.bgElevated.hex(),
            'settings.dropdownForeground': semantic.fg.hex(),
            'settings.dropdownBorder': semantic.fgMuted.hex() + alpha.faint,
            'settings.dropdownListBorder': semantic.fgMuted.hex() + alpha.faint,
            'settings.checkboxBackground': semantic.bgElevated.hex(),
            'settings.checkboxForeground': semantic.fg.hex(),
            'settings.checkboxBorder': semantic.fgMuted.hex() + alpha.faint,
            'settings.textInputBackground': (isDark ? semantic.bg.darken(0.1) : semantic.bg).hex(),
            'settings.textInputForeground': semantic.fg.hex(),
            'settings.textInputBorder': semantic.fgMuted.hex() + alpha.faint,
            'settings.numberInputBackground': (isDark ? semantic.bg.darken(0.1) : semantic.bg).hex(),
            'settings.numberInputForeground': semantic.fg.hex(),
            'settings.numberInputBorder': semantic.fgMuted.hex() + alpha.faint,
            'settings.focusedRowBackground': semantic.bgHighlight.hex(),
            'settings.focusedRowBorder': semantic.accent.hex() + alpha.medium,
            'settings.rowHoverBackground': semantic.bgElevated.hex(),
            'settings.sashBorder': semantic.fgMuted.hex() + alpha.faint,

            // ================================================================
            // Breadcrumbs
            // ================================================================
            'breadcrumb.foreground': semantic.fg.hex() + alpha.dimmed,
            'breadcrumb.background': semantic.bg.hex(),
            'breadcrumb.focusForeground': semantic.fg.hex(),
            'breadcrumb.activeSelectionForeground': semantic.fg.hex(),
            'breadcrumbPicker.background': semantic.bgElevated.hex(),

            // ================================================================
            // Snippets
            // ================================================================
            'editor.snippetTabstopHighlightBackground': semantic.accent.hex() + alpha.subtle,
            'editor.snippetTabstopHighlightBorder': semantic.accent.hex() + alpha.medium,
            'editor.snippetFinalTabstopHighlightBackground': semantic.success.hex() + alpha.subtle,
            'editor.snippetFinalTabstopHighlightBorder': semantic.success.hex() + alpha.medium,

            // ================================================================
            // Symbol Icons
            // ================================================================
            'symbolIcon.arrayForeground': semantic.warning.hex(),
            'symbolIcon.booleanForeground': semantic.keyword.hex(),
            'symbolIcon.classForeground': semantic.type.hex(),
            'symbolIcon.colorForeground': semantic.fg.hex(),
            'symbolIcon.constantForeground': semantic.number.hex(),
            'symbolIcon.constructorForeground': semantic.function.hex(),
            'symbolIcon.enumeratorForeground': semantic.type.hex(),
            'symbolIcon.enumeratorMemberForeground': semantic.type.hex(),
            'symbolIcon.eventForeground': semantic.warning.hex(),
            'symbolIcon.fieldForeground': semantic.variable.hex(),
            'symbolIcon.fileForeground': semantic.fg.hex(),
            'symbolIcon.folderForeground': semantic.warning.hex(),
            'symbolIcon.functionForeground': semantic.function.hex(),
            'symbolIcon.interfaceForeground': semantic.type.hex(),
            'symbolIcon.keyForeground': semantic.variable.hex(),
            'symbolIcon.keywordForeground': semantic.keyword.hex(),
            'symbolIcon.methodForeground': semantic.function.hex(),
            'symbolIcon.moduleForeground': semantic.type.hex(),
            'symbolIcon.namespaceForeground': semantic.type.hex(),
            'symbolIcon.nullForeground': semantic.keyword.hex(),
            'symbolIcon.numberForeground': semantic.number.hex(),
            'symbolIcon.objectForeground': semantic.type.hex(),
            'symbolIcon.operatorForeground': semantic.operator.hex(),
            'symbolIcon.packageForeground': semantic.type.hex(),
            'symbolIcon.propertyForeground': semantic.variable.hex(),
            'symbolIcon.referenceForeground': semantic.variable.hex(),
            'symbolIcon.snippetForeground': semantic.fg.hex(),
            'symbolIcon.stringForeground': semantic.string.hex(),
            'symbolIcon.structForeground': semantic.type.hex(),
            'symbolIcon.textForeground': semantic.fg.hex(),
            'symbolIcon.typeParameterForeground': semantic.type.hex(),
            'symbolIcon.unitForeground': semantic.number.hex(),
            'symbolIcon.variableForeground': semantic.variable.hex(),

            // ================================================================
            // Terminal
            // ================================================================
            'terminal.background': semantic.bg.hex(),
            'terminal.foreground': semantic.fg.hex(),
            'terminal.border': semantic.fgMuted.hex() + alpha.faint,
            'terminal.selectionBackground': semantic.accent.hex() + alpha.medium,
            'terminal.inactiveSelectionBackground': semantic.fgMuted.hex() + alpha.light,
            'terminalCursor.foreground': semantic.accent.hex(),
            'terminalCursor.background': semantic.bg.hex(),
            'terminal.ansiBlack': colors[0].hex(),
            'terminal.ansiRed': colors[1].hex(),
            'terminal.ansiGreen': colors[2].hex(),
            'terminal.ansiYellow': colors[3].hex(),
            'terminal.ansiBlue': colors[4].hex(),
            'terminal.ansiMagenta': colors[5].hex(),
            'terminal.ansiCyan': colors[6].hex(),
            'terminal.ansiWhite': colors[7].hex(),
            'terminal.ansiBrightBlack': colors[8].hex(),
            'terminal.ansiBrightRed': colors[9].hex(),
            'terminal.ansiBrightGreen': colors[10].hex(),
            'terminal.ansiBrightYellow': colors[11].hex(),
            'terminal.ansiBrightBlue': colors[12].hex(),
            'terminal.ansiBrightMagenta': colors[13].hex(),
            'terminal.ansiBrightCyan': colors[14].hex(),
            'terminal.ansiBrightWhite': colors[15].hex(),
        },

        // ====================================================================
        // Token Colors (Syntax Highlighting)
        // ====================================================================
        'tokenColors': [
            // Base
            {
                'settings': {
                    'background': semantic.bg.hex(),
                    'foreground': semantic.fg.hex(),
                }
            },
            // Comments
            {
                'name': 'Comment',
                'scope': ['comment', 'punctuation.definition.comment'],
                'settings': {
                    'foreground': semantic.comment.hex() + alpha.solid,
                    'fontStyle': 'italic',
                }
            },
            // Strings
            {
                'name': 'String',
                'scope': ['string', 'string.quoted', 'string.template'],
                'settings': {
                    'foreground': semantic.string.hex(),
                }
            },
            {
                'name': 'String Escape',
                'scope': ['constant.character.escape', 'string.regexp'],
                'settings': {
                    'foreground': semantic.type.hex(),
                }
            },
            // Numbers and constants
            {
                'name': 'Number',
                'scope': ['constant.numeric'],
                'settings': {
                    'foreground': semantic.number.hex(),
                }
            },
            {
                'name': 'Constant',
                'scope': ['constant', 'constant.language'],
                'settings': {
                    'foreground': semantic.number.hex(),
                }
            },
            {
                'name': 'Built-in constant',
                'scope': ['support.constant'],
                'settings': {
                    'foreground': semantic.number.hex(),
                }
            },
            // Variables
            {
                'name': 'Variable',
                'scope': ['variable', 'variable.other', 'variable.other.readwrite'],
                'settings': {
                    'foreground': semantic.variable.hex(),
                }
            },
            {
                'name': 'Variable Property',
                'scope': ['variable.other.property', 'meta.object-literal.key'],
                'settings': {
                    'foreground': semantic.variable.hex(),
                }
            },
            {
                'name': 'Variable Constant',
                'scope': ['variable.other.constant'],
                'settings': {
                    'foreground': semantic.number.hex(),
                }
            },
            {
                'name': 'Language Variable',
                'scope': ['variable.language'],
                'settings': {
                    'foreground': semantic.variable.hex(),
                    'fontStyle': 'italic',
                }
            },
            {
                'name': 'Parameter',
                'scope': ['variable.parameter'],
                'settings': {
                    'foreground': semantic.variable.hex(),
                    'fontStyle': 'italic',
                }
            },
            // Keywords
            {
                'name': 'Keyword',
                'scope': ['keyword', 'keyword.control'],
                'settings': {
                    'foreground': semantic.keyword.hex(),
                }
            },
            {
                'name': 'Keyword Operator',
                'scope': ['keyword.operator'],
                'settings': {
                    'foreground': semantic.operator.hex(),
                }
            },
            {
                'name': 'Keyword Other Unit',
                'scope': ['keyword.other.unit'],
                'settings': {
                    'foreground': semantic.variable.hex(),
                }
            },
            // Storage
            {
                'name': 'Storage',
                'scope': ['storage', 'storage.type', 'storage.modifier'],
                'settings': {
                    'foreground': semantic.keyword.hex(),
                }
            },
            // Functions
            {
                'name': 'Function',
                'scope': ['entity.name.function', 'meta.function-call'],
                'settings': {
                    'foreground': semantic.function.hex(),
                }
            },
            {
                'name': 'Function Call',
                'scope': ['variable.function', 'support.function'],
                'settings': {
                    'foreground': semantic.function.hex(),
                }
            },
            {
                'name': 'Support Function',
                'scope': ['support.function.builtin'],
                'settings': {
                    'foreground': semantic.type.hex(),
                }
            },
            // Types and Classes
            {
                'name': 'Type',
                'scope': ['entity.name.type', 'entity.name.class', 'entity.name.namespace'],
                'settings': {
                    'foreground': semantic.type.hex(),
                }
            },
            {
                'name': 'Type Primitive',
                'scope': ['support.type.primitive', 'support.type.builtin'],
                'settings': {
                    'foreground': semantic.type.hex(),
                }
            },
            {
                'name': 'Type Parameter',
                'scope': ['entity.name.type.parameter'],
                'settings': {
                    'foreground': semantic.type.hex(),
                    'fontStyle': 'italic',
                }
            },
            {
                'name': 'Support Type',
                'scope': ['support.type', 'support.class'],
                'settings': {
                    'foreground': semantic.type.hex(),
                }
            },
            {
                'name': 'Inherited Class',
                'scope': ['entity.other.inherited-class'],
                'settings': {
                    'foreground': semantic.type.hex(),
                    'fontStyle': 'italic',
                }
            },

            // Punctuation
            {
                'name': 'Punctuation',
                'scope': ['punctuation'],
                'settings': {
                    'foreground': semantic.fg.hex() + alpha.solid,
                }
            },
            {
                'name': 'Punctuation Brackets',
                'scope': ['punctuation.definition.block', 'punctuation.section', 'meta.brace'],
                'settings': {
                    'foreground': semantic.fg.hex(),
                }
            },
            // Tags (HTML/XML/JSX)
            {
                'name': 'Tag',
                'scope': ['entity.name.tag'],
                'settings': {
                    'foreground': semantic.variable.hex(),
                }
            },
            {
                'name': 'Tag Punctuation',
                'scope': ['punctuation.definition.tag'],
                'settings': {
                    'foreground': semantic.fgMuted.hex(),
                }
            },
            {
                'name': 'Tag Attribute',
                'scope': ['entity.other.attribute-name'],
                'settings': {
                    'foreground': semantic.number.hex(),
                    'fontStyle': 'italic',
                }
            },
            {
                'name': 'Tag Attribute ID',
                'scope': ['entity.other.attribute-name.id'],
                'settings': {
                    'foreground': semantic.function.hex(),
                }
            },
            // CSS
            {
                'name': 'CSS Property',
                'scope': ['support.type.property-name.css', 'support.type.vendored.property-name.css'],
                'settings': {
                    'foreground': semantic.type.hex(),
                }
            },
            {
                'name': 'CSS Property Value',
                'scope': ['support.constant.property-value.css', 'support.constant.color.css'],
                'settings': {
                    'foreground': semantic.number.hex(),
                }
            },
            {
                'name': 'CSS Selector',
                'scope': ['entity.name.tag.css', 'entity.other.attribute-name.class.css'],
                'settings': {
                    'foreground': semantic.type.hex(),
                }
            },
            {
                'name': 'CSS Pseudo',
                'scope': ['entity.other.attribute-name.pseudo-class.css', 'entity.other.attribute-name.pseudo-element.css'],
                'settings': {
                    'foreground': semantic.type.hex(),
                    'fontStyle': 'italic',
                }
            },
            // JSON
            {
                'name': 'JSON Key',
                'scope': ['support.type.property-name.json'],
                'settings': {
                    'foreground': semantic.variable.hex(),
                }
            },
            // Decorators
            {
                'name': 'Decorator',
                'scope': ['meta.decorator', 'storage.type.annotation', 'punctuation.decorator'],
                'settings': {
                    'foreground': semantic.number.hex(),
                }
            },
            // Imports
            {
                'name': 'Import',
                'scope': ['keyword.control.import', 'keyword.control.export', 'keyword.control.from'],
                'settings': {
                    'foreground': semantic.keyword.hex(),
                }
            },
            {
                'name': 'Module',
                'scope': ['entity.name.import', 'entity.name.package', 'support.module'],
                'settings': {
                    'foreground': semantic.string.hex(),
                }
            },
            // Markdown
            {
                'name': 'Markdown Heading',
                'scope': ['markup.heading', 'entity.name.section.markdown'],
                'settings': {
                    'foreground': semantic.variable.hex(),
                    'fontStyle': 'bold',
                }
            },
            {
                'name': 'Markdown Bold',
                'scope': ['markup.bold'],
                'settings': {
                    'foreground': semantic.number.hex(),
                    'fontStyle': 'bold',
                }
            },
            {
                'name': 'Markdown Italic',
                'scope': ['markup.italic'],
                'settings': {
                    'foreground': semantic.keyword.hex(),
                    'fontStyle': 'italic',
                }
            },
            {
                'name': 'Markdown Link',
                'scope': ['markup.underline.link', 'string.other.link'],
                'settings': {
                    'foreground': semantic.function.hex(),
                }
            },
            {
                'name': 'Markdown Code',
                'scope': ['markup.inline.raw', 'markup.fenced_code'],
                'settings': {
                    'foreground': semantic.string.hex(),
                }
            },
            {
                'name': 'Markdown Quote',
                'scope': ['markup.quote'],
                'settings': {
                    'foreground': semantic.comment.hex(),
                    'fontStyle': 'italic',
                }
            },
            {
                'name': 'Markdown List',
                'scope': ['markup.list punctuation.definition.list', 'beginning.punctuation.definition.list'],
                'settings': {
                    'foreground': semantic.type.hex(),
                }
            },
            // Diff
            {
                'name': 'Diff Inserted',
                'scope': ['markup.inserted'],
                'settings': {
                    'foreground': semantic.added.hex(),
                }
            },
            {
                'name': 'Diff Deleted',
                'scope': ['markup.deleted'],
                'settings': {
                    'foreground': semantic.deleted.hex(),
                }
            },
            {
                'name': 'Diff Changed',
                'scope': ['markup.changed'],
                'settings': {
                    'foreground': semantic.modified.hex(),
                }
            },
            {
                'name': 'Diff Header',
                'scope': ['meta.diff.header'],
                'settings': {
                    'foreground': semantic.function.hex(),
                }
            },
            // Invalid
            {
                'name': 'Invalid',
                'scope': ['invalid', 'invalid.illegal'],
                'settings': {
                    'foreground': semantic.error.hex(),
                }
            },
            {
                'name': 'Deprecated',
                'scope': ['invalid.deprecated'],
                'settings': {
                    'foreground': semantic.warning.hex(),
                    'fontStyle': 'strikethrough',
                }
            },
            // Language-specific
            {
                'name': 'Python Self',
                'scope': ['variable.parameter.function.language.special.self.python', 'variable.language.special.self.python'],
                'settings': {
                    'foreground': semantic.type.hex(),
                    'fontStyle': 'italic',
                }
            },
            {
                'name': 'Rust Lifetime',
                'scope': ['storage.modifier.lifetime.rust', 'entity.name.lifetime.rust'],
                'settings': {
                    'foreground': semantic.type.hex(),
                    'fontStyle': 'italic',
                }
            },
            {
                'name': 'Go Package',
                'scope': ['entity.name.package.go'],
                'settings': {
                    'foreground': semantic.type.hex(),
                }
            },
            {
                'name': 'Java Annotation',
                'scope': ['storage.type.annotation.java'],
                'settings': {
                    'foreground': semantic.number.hex(),
                }
            },
        ],
    };
};
