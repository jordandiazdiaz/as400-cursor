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
exports.CrosshairManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Central manager that owns the lifecycle of the crosshair.
 * Listens for cursor movement and visible range changes, and applies
 * the appropriate decorations.
 *
 * The vertical line is now rendered via a single ::before pseudo-element
 * with `height: 100vh` on the cursor character, so we only need ONE
 * decoration range for the vertical — no per-line loop.
 */
class CrosshairManager {
    configManager;
    decorationProvider;
    decorations = null;
    config;
    disposables = [];
    debounceTimer;
    /** Radius (in characters/lines) for the local cross in local/hybrid modes */
    static LOCAL_RADIUS_CHARS = 3;
    constructor(configManager, decorationProvider) {
        this.configManager = configManager;
        this.decorationProvider = decorationProvider;
        this.config = configManager.getConfig();
        // React to config changes
        this.disposables.push(configManager.onDidChangeConfig((cfg) => {
            this.config = cfg;
            this.rebuildDecorations();
            this.updateAllEditors();
        }));
        // React to cursor movement
        this.disposables.push(vscode.window.onDidChangeTextEditorSelection((e) => {
            this.debouncedUpdate(e.textEditor);
        }));
        // React to visible range changes (scrolling)
        this.disposables.push(vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
            this.debouncedUpdate(e.textEditor);
        }));
        // React to active editor changes
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.updateCrosshair(editor);
            }
        }));
        // React to visible editors change (split views)
        this.disposables.push(vscode.window.onDidChangeVisibleTextEditors(() => {
            this.updateAllEditors();
        }));
        // Initial setup
        if (this.config.enabled) {
            this.rebuildDecorations();
            this.updateAllEditors();
        }
    }
    // ─── Public API ────────────────────────────────────────────────
    enable() {
        this.config = this.configManager.getConfig();
        this.rebuildDecorations();
        this.updateAllEditors();
    }
    disable() {
        this.decorationProvider.clearAllEditors();
    }
    toggle() {
        if (this.config.enabled) {
            this.disable();
        }
        else {
            this.enable();
        }
        return !this.config.enabled;
    }
    cycleMode() {
        const modes = ['full', 'local', 'hybrid'];
        const idx = modes.indexOf(this.config.mode);
        const next = modes[(idx + 1) % modes.length];
        return next;
    }
    // ─── Internal ──────────────────────────────────────────────────
    rebuildDecorations() {
        this.decorations = this.decorationProvider.createDecorations(this.config);
    }
    debouncedUpdate(editor) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.updateCrosshair(editor);
        }, 16);
    }
    updateAllEditors() {
        for (const editor of vscode.window.visibleTextEditors) {
            this.updateCrosshair(editor);
        }
    }
    updateCrosshair(editor) {
        if (!this.config.enabled || !this.decorations) {
            this.decorationProvider.clearDecorations(editor);
            return;
        }
        const selections = this.config.multiCursorSupport
            ? editor.selections
            : [editor.selection];
        switch (this.config.mode) {
            case 'full':
                this.applyFullMode(editor, selections);
                break;
            case 'local':
                this.applyLocalMode(editor, selections);
                break;
            case 'hybrid':
                this.applyHybridMode(editor, selections);
                break;
        }
    }
    // ─── Full mode ─────────────────────────────────────────────────
    // Horizontal: whole line decoration.
    // Vertical: single ::before pseudo-element at cursor char (spans 100vh).
    // Intersection: combined at cursor position.
    applyFullMode(editor, selections) {
        const decs = this.decorations;
        const horizontalRanges = [];
        const intersectionRanges = [];
        for (const sel of selections) {
            const pos = sel.active;
            const line = pos.line;
            const col = pos.character;
            // Horizontal: entire current line
            horizontalRanges.push({
                range: new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER),
            });
            // Intersection — this is the single point that also carries the vertical line
            intersectionRanges.push({
                range: this.singleCharRange(line, col, editor),
            });
        }
        editor.setDecorations(decs.horizontalLine, horizontalRanges);
        // verticalLine not used separately — the intersection decoration already
        // includes the vertical ::before pseudo-element
        editor.setDecorations(decs.verticalLine, []);
        editor.setDecorations(decs.intersection, intersectionRanges);
        editor.setDecorations(decs.horizontalGuide, []);
        editor.setDecorations(decs.verticalGuide, []);
    }
    // ─── Local mode ────────────────────────────────────────────────
    // Only a small horizontal segment around the cursor.
    // The vertical line is still full-height via the pseudo-element but
    // we could optionally clip it (for now it stays full since it looks good).
    applyLocalMode(editor, selections) {
        const decs = this.decorations;
        const horizontalRanges = [];
        const intersectionRanges = [];
        for (const sel of selections) {
            const pos = sel.active;
            const line = pos.line;
            const col = pos.character;
            const rChars = CrosshairManager.LOCAL_RADIUS_CHARS;
            // Horizontal: only a few characters around the cursor
            const hStart = Math.max(0, col - rChars);
            const hEnd = col + rChars + 1;
            horizontalRanges.push({
                range: new vscode.Range(line, hStart, line, hEnd),
            });
            // Intersection with vertical pseudo-element
            intersectionRanges.push({
                range: this.singleCharRange(line, col, editor),
            });
        }
        editor.setDecorations(decs.horizontalLine, horizontalRanges);
        editor.setDecorations(decs.verticalLine, []);
        editor.setDecorations(decs.intersection, intersectionRanges);
        editor.setDecorations(decs.horizontalGuide, []);
        editor.setDecorations(decs.verticalGuide, []);
    }
    // ─── Hybrid mode ──────────────────────────────────────────────
    // Local cross (strong) + full-line guide (faint).
    applyHybridMode(editor, selections) {
        const decs = this.decorations;
        const horizontalRanges = [];
        const intersectionRanges = [];
        const hGuideRanges = [];
        for (const sel of selections) {
            const pos = sel.active;
            const line = pos.line;
            const col = pos.character;
            const rChars = CrosshairManager.LOCAL_RADIUS_CHARS;
            // ── Local horizontal (strong) ──
            const hStart = Math.max(0, col - rChars);
            const hEnd = col + rChars + 1;
            horizontalRanges.push({
                range: new vscode.Range(line, hStart, line, hEnd),
            });
            // ── Horizontal guide (faint, full line) ──
            hGuideRanges.push({
                range: new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER),
            });
            // Intersection with vertical pseudo-element
            intersectionRanges.push({
                range: this.singleCharRange(line, col, editor),
            });
        }
        editor.setDecorations(decs.horizontalGuide, hGuideRanges);
        editor.setDecorations(decs.verticalGuide, []);
        editor.setDecorations(decs.horizontalLine, horizontalRanges);
        editor.setDecorations(decs.verticalLine, []);
        editor.setDecorations(decs.intersection, intersectionRanges);
    }
    // ─── Helpers ───────────────────────────────────────────────────
    /**
     * Returns a Range covering a single character cell.
     */
    singleCharRange(line, col, editor) {
        const docLine = editor.document.lineAt(Math.min(line, editor.document.lineCount - 1));
        const safeCol = Math.min(col, docLine.text.length);
        const endCol = Math.min(safeCol + 1, docLine.text.length + 1);
        return new vscode.Range(line, safeCol, line, endCol);
    }
    dispose() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        for (const d of this.disposables) {
            d.dispose();
        }
        this.decorationProvider.clearAllEditors();
    }
}
exports.CrosshairManager = CrosshairManager;
//# sourceMappingURL=crosshairManager.js.map