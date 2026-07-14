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
exports.DecorationProvider = void 0;
const vscode = __importStar(require("vscode"));
const configManager_1 = require("./configManager");
class DecorationProvider {
    currentSet = null;
    /**
     * Build a fresh DecorationSet from the current config.
     * Disposes any previously created set.
     */
    createDecorations(config) {
        this.disposeCurrentSet();
        const mainColor = configManager_1.ConfigManager.colorWithOpacity(config.color, config.opacity);
        const guideColor = configManager_1.ConfigManager.colorWithOpacity(config.color, config.guideOpacity);
        const borderStyle = configManager_1.ConfigManager.cssBorderStyle(config.lineStyle);
        const lw = config.lineWidth;
        // --- Horizontal line (full width of the line) ---
        const horizontalLine = vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            borderWidth: `0 0 ${lw}px 0`,
            borderStyle: borderStyle,
            borderColor: mainColor,
            overviewRulerColor: mainColor,
            overviewRulerLane: vscode.OverviewRulerLane.Center,
        });
        // --- Vertical line ---
        // Uses a ::before pseudo-element with absolute positioning and a very tall height
        // so that a SINGLE decoration at the cursor character renders one continuous
        // vertical line spanning the entire visible editor.
        const verticalLine = vscode.window.createTextEditorDecorationType({
            before: {
                contentText: '',
                width: `${lw}px`,
                height: '100vh',
                // position absolute + translate to center vertically around the character
                textDecoration: `none; position: absolute; top: 50%; transform: translateY(-50%); background-color: ${mainColor}; pointer-events: none; z-index: 1;`,
            },
            // The parent character cell must be relative so the absolute ::before works
            textDecoration: `none; position: relative;`,
        });
        // --- Intersection (the character cell where horizontal and vertical meet) ---
        const intersection = vscode.window.createTextEditorDecorationType({
            backgroundColor: configManager_1.ConfigManager.colorWithOpacity(config.color, config.opacity * 0.2),
            // Also add border-bottom to connect with the horizontal line
            borderWidth: `0 0 ${lw}px 0`,
            borderStyle: borderStyle,
            borderColor: mainColor,
            // Add the vertical line through ::before here too
            before: {
                contentText: '',
                width: `${lw}px`,
                height: '100vh',
                textDecoration: `none; position: absolute; top: 50%; transform: translateY(-50%); background-color: ${mainColor}; pointer-events: none; z-index: 1;`,
            },
            textDecoration: `none; position: relative;`,
        });
        // --- Guide lines for hybrid mode ---
        const horizontalGuide = vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            borderWidth: `0 0 ${lw}px 0`,
            borderStyle: 'dotted',
            borderColor: guideColor,
        });
        // Vertical guide in hybrid mode: same pseudo-element approach but with guide color
        const verticalGuide = vscode.window.createTextEditorDecorationType({
            before: {
                contentText: '',
                width: `${lw}px`,
                height: '100vh',
                textDecoration: `none; position: absolute; top: 50%; transform: translateY(-50%); background-color: ${guideColor}; pointer-events: none; z-index: 0;`,
            },
            textDecoration: `none; position: relative;`,
        });
        this.currentSet = {
            horizontalLine,
            verticalLine,
            intersection,
            horizontalGuide,
            verticalGuide,
        };
        return this.currentSet;
    }
    /**
     * Clear all decoration ranges from the given editor without disposing the types.
     */
    clearDecorations(editor) {
        if (!this.currentSet) {
            return;
        }
        const empty = [];
        editor.setDecorations(this.currentSet.horizontalLine, empty);
        editor.setDecorations(this.currentSet.verticalLine, empty);
        editor.setDecorations(this.currentSet.intersection, empty);
        editor.setDecorations(this.currentSet.horizontalGuide, empty);
        editor.setDecorations(this.currentSet.verticalGuide, empty);
    }
    /**
     * Clear decorations from all visible editors.
     */
    clearAllEditors() {
        if (!this.currentSet) {
            return;
        }
        for (const editor of vscode.window.visibleTextEditors) {
            this.clearDecorations(editor);
        }
    }
    getCurrentSet() {
        return this.currentSet;
    }
    disposeCurrentSet() {
        if (this.currentSet) {
            this.currentSet.horizontalLine.dispose();
            this.currentSet.verticalLine.dispose();
            this.currentSet.intersection.dispose();
            this.currentSet.horizontalGuide.dispose();
            this.currentSet.verticalGuide.dispose();
            this.currentSet = null;
        }
    }
    dispose() {
        this.disposeCurrentSet();
    }
}
exports.DecorationProvider = DecorationProvider;
//# sourceMappingURL=decorationProvider.js.map