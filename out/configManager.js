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
exports.ConfigManager = void 0;
const vscode = __importStar(require("vscode"));
const SECTION = 'as400Cursor';
class ConfigManager {
    _onDidChangeConfig = new vscode.EventEmitter();
    onDidChangeConfig = this._onDidChangeConfig.event;
    disposable;
    constructor() {
        this.disposable = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(SECTION)) {
                this._onDidChangeConfig.fire(this.getConfig());
            }
        });
    }
    getConfig() {
        const cfg = vscode.workspace.getConfiguration(SECTION);
        return {
            enabled: cfg.get('enabled', false),
            color: cfg.get('color', '#00FF00'),
            lineWidth: cfg.get('lineWidth', 1),
            opacity: cfg.get('opacity', 0.8),
            mode: cfg.get('mode', 'full'),
            lineStyle: cfg.get('lineStyle', 'solid'),
            verticalExtent: cfg.get('verticalExtent', 'viewport'),
            horizontalExtent: cfg.get('horizontalExtent', 'line'),
            fullAS400Mode: cfg.get('fullAS400Mode', false),
            blinkEffect: cfg.get('blinkEffect', false),
            multiCursorSupport: cfg.get('multiCursorSupport', true),
            guideOpacity: cfg.get('guideOpacity', 0.25),
        };
    }
    async setEnabled(value) {
        await vscode.workspace
            .getConfiguration(SECTION)
            .update('enabled', value, vscode.ConfigurationTarget.Global);
    }
    async setMode(mode) {
        await vscode.workspace
            .getConfiguration(SECTION)
            .update('mode', mode, vscode.ConfigurationTarget.Global);
    }
    async setFullAS400Mode(value) {
        await vscode.workspace
            .getConfiguration(SECTION)
            .update('fullAS400Mode', value, vscode.ConfigurationTarget.Global);
    }
    /**
     * Convert a hex color + opacity into an rgba() string.
     */
    static colorWithOpacity(hex, opacity) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    /**
     * Map our lineStyle enum to a CSS border-style value.
     */
    static cssBorderStyle(style) {
        switch (style) {
            case 'dotted':
                return 'dotted';
            case 'dashed':
                return 'dashed';
            case 'solid':
            default:
                return 'solid';
        }
    }
    dispose() {
        this._onDidChangeConfig.dispose();
        this.disposable.dispose();
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=configManager.js.map