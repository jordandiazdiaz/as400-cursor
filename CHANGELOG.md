# Changelog

## 1.0.3

- Fix: the README preview image now loads on the Marketplace page (it used a relative path pointing at a non-existent repository). It now references an absolute URL in the published GitHub repository.

## 1.0.2

- Faster startup: the extension now activates during launch (instead of after) and draws the crosshair before applying theme/color writes, so the green-screen look appears almost immediately.
- Reloads no longer re-write color customizations that are already applied, removing a brief flicker. Visual result is unchanged.

## 1.0.1

- Fix: the crosshair cursor now turns on automatically at startup when enabled (no longer requires pressing the toggle key first).

## 1.0.0

- Initial Marketplace release.
- AS/400 Green Screen (5250) color theme.
- Configurable crosshair cursor (full / local / hybrid modes, line style, opacity, blink, multi-cursor).
- Commands and keybinding (`Ctrl/Cmd+Alt+X`) to toggle the crosshair.
