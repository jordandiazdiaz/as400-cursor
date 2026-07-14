"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const configManager_1 = require("./configManager");
const decorationProvider_1 = require("./decorationProvider");
const crosshairManager_1 = require("./crosshairManager");
const statusBar_1 = require("./statusBar");
let configManager;
let decorationProvider;
let crosshairManager;
let statusBarManager;
function activate(context) {
    // ─── Bootstrap ──────────────────────────────────────────────
    configManager = new configManager_1.ConfigManager();
    decorationProvider = new decorationProvider_1.DecorationProvider();
    crosshairManager = new crosshairManager_1.CrosshairManager(configManager, decorationProvider);
    statusBarManager = new statusBar_1.StatusBarManager();
    // Initial status bar update
    const initialConfig = configManager.getConfig();
    statusBarManager.update(initialConfig);
    // Keep status bar in sync with config changes
    context.subscriptions.push(configManager.onDidChangeConfig((cfg) => {
        statusBarManager.update(cfg);
    }));
    // ─── Commands ───────────────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand('as400Cursor.toggle', async () => {
        const cfg = configManager.getConfig();
        const newState = !cfg.enabled;
        await configManager.setEnabled(newState);
        if (newState) {
            crosshairManager.enable();
            await applyAS400Theme();
        }
        else {
            crosshairManager.disable();
            await revertAS400Theme();
        }
        vscode.window.setStatusBarMessage(`AS/400 Crosshair ${newState ? 'enabled' : 'disabled'}`, 2000);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('as400Cursor.enable', async () => {
        await configManager.setEnabled(true);
        crosshairManager.enable();
        await applyAS400Theme();
        vscode.window.setStatusBarMessage('AS/400 Crosshair enabled', 2000);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('as400Cursor.disable', async () => {
        await configManager.setEnabled(false);
        crosshairManager.disable();
        await revertAS400Theme();
        vscode.window.setStatusBarMessage('AS/400 Crosshair disabled', 2000);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('as400Cursor.cycleMode', async () => {
        const nextMode = crosshairManager.cycleMode();
        await configManager.setMode(nextMode);
        vscode.window.setStatusBarMessage(`AS/400 Crosshair mode: ${nextMode}`, 2000);
    }));
    // ─── React to fullAS400Mode config changes ─────────────────
    context.subscriptions.push(configManager.onDidChangeConfig(async (cfg) => {
        if (cfg.fullAS400Mode) {
            await applyAS400Theme();
        }
        else {
            await revertAS400Theme();
        }
    }));
    // ─── Apply on first activation ─────────────────────────────
    // Draw the crosshair FIRST so it appears instantly, before the
    // (slower) configuration writes below refresh the workbench UI.
    if (initialConfig.enabled) {
        crosshairManager.enable();
    }
    // Then apply theme + colors + font. applyAS400Theme() skips any
    // write whose result is already in place, so this is a no-op on
    // reloads and only does real work on first install.
    if (initialConfig.enabled || initialConfig.fullAS400Mode) {
        applyAS400Theme();
    }
    // ─── Register disposables ──────────────────────────────────
    context.subscriptions.push(configManager, decorationProvider, crosshairManager, statusBarManager);
}
/**
 * Apply the full AS/400 green-screen look:
 * 1. Set the color theme to our bundled "AS/400 Green Screen (5250)"
 * 2. Apply workbench color overrides (green on black)
 * 3. Set monospace font (IBM Plex Mono / Courier New)
 */
async function applyAS400Theme() {
    // 1. Activate our bundled color theme
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    const currentTheme = workbenchConfig.get('colorTheme');
    if (currentTheme !== 'AS/400 Green Screen (5250)') {
        await workbenchConfig.update('colorTheme', 'AS/400 Green Screen (5250)', vscode.ConfigurationTarget.Global);
    }
    // 2. Apply additional color overrides to ensure full green-screen experience
    const currentCustomizations = workbenchConfig.get('colorCustomizations') || {};
    const as400Colors = {
        'editor.background': '#000000',
        'editor.foreground': '#00FF00',
        'editorCursor.foreground': '#00FF00',
        'editor.selectionBackground': '#005500',
        'editor.lineHighlightBackground': '#001100',
        'terminal.background': '#000000',
        'terminal.foreground': '#00FF00',
        'editorLineNumber.foreground': '#007700',
        'editorLineNumber.activeForeground': '#00FF00',
        'sideBar.background': '#000000',
        'sideBar.foreground': '#00CC00',
        'activityBar.background': '#000000',
        'activityBar.foreground': '#00FF00',
        'statusBar.background': '#001a00',
        'statusBar.foreground': '#00FF00',
        'titleBar.activeBackground': '#000000',
        'titleBar.activeForeground': '#00FF00',
    };
    // Only write when our overrides are not already in place, so reloads
    // don't trigger a redundant colorCustomizations update (and its flicker).
    if (currentCustomizations['__as400_applied'] !== 'true') {
        const merged = {
            ...currentCustomizations,
            ...as400Colors,
            '__as400_applied': 'true',
        };
        await workbenchConfig.update('colorCustomizations', merged, vscode.ConfigurationTarget.Global);
    }
    // 3. Set monospace font
    const editorConfig = vscode.workspace.getConfiguration('editor');
    const currentFont = editorConfig.get('fontFamily') || '';
    if (!currentFont.includes('IBM Plex Mono')) {
        // Save original font so we can restore it later
        await editorConfig.update('fontFamily', `'IBM Plex Mono', 'Courier New', 'Lucida Console', monospace`, vscode.ConfigurationTarget.Global);
    }
}
/**
 * Revert the AS/400 theme overrides, restoring the user's previous look.
 */
async function revertAS400Theme() {
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    const currentCustomizations = workbenchConfig.get('colorCustomizations') || {};
    // Only revert if we applied it
    if (!currentCustomizations['__as400_applied']) {
        return;
    }
    // Remove our color overrides
    const as400Keys = [
        'editor.background',
        'editor.foreground',
        'editorCursor.foreground',
        'editor.selectionBackground',
        'editor.lineHighlightBackground',
        'terminal.background',
        'terminal.foreground',
        'editorLineNumber.foreground',
        'editorLineNumber.activeForeground',
        'sideBar.background',
        'sideBar.foreground',
        'activityBar.background',
        'activityBar.foreground',
        'statusBar.background',
        'statusBar.foreground',
        'titleBar.activeBackground',
        'titleBar.activeForeground',
        '__as400_applied',
    ];
    const cleaned = { ...currentCustomizations };
    for (const key of as400Keys) {
        delete cleaned[key];
    }
    await workbenchConfig.update('colorCustomizations', Object.keys(cleaned).length > 0 ? cleaned : undefined, vscode.ConfigurationTarget.Global);
    // Revert to default VS Code dark theme
    await workbenchConfig.update('colorTheme', 'Default Dark Modern', vscode.ConfigurationTarget.Global);
}
function deactivate() {
    // All disposables registered via context.subscriptions are auto-disposed.
}
//# sourceMappingURL=extension.js.map