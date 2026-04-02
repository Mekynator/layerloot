

# Fix AI Chat Live Preview Color Binding

## Problem
The `ChatLivePreview` component wraps all config color values in `hsl(...)` — e.g. `hsl(${config.window.bgColor})`. But the `ColorPickerField` produces raw hex colors like `#3b82f6`. This creates invalid CSS values like `hsl(#3b82f6)`, causing every color change to fail silently in the preview.

Additionally, several visual properties (border colors, border widths, window border, header text color, send button color on the input area) are not mapped to the preview at all.

## Solution
Rewrite `ChatLivePreview.tsx` to use color values directly (no `hsl()` wrapper), and add missing style bindings for all appearance properties.

## Changes

### File: `src/components/admin/ChatLivePreview.tsx`

1. **Fix all color bindings** — Replace every instance of `` `hsl(${colorValue})` `` with just the raw `colorValue`. There are ~15 occurrences across launcher bg/icon/border/glow, window bg/header/border, bubble bg/text/border, and send button. Each one needs the `hsl()` wrapper removed. Fallbacks like `"hsl(var(--primary))"` remain unchanged since those are valid CSS custom properties.

2. **Add missing window border** — The window container currently ignores `config.window.borderColor`. Add `borderColor` and conditional `borderWidth` to the window's style object.

3. **Add header text color** — The header currently hardcodes `text-primary-foreground`. Apply `config.window.headerTextColor` when set.

4. **Add bubble border color rendering** — Bubble borders exist in style but `borderWidth` is only set when `borderColor` exists. Verify this works with hex values after the hsl fix.

5. **Add send button color** — Already partially mapped at line 316, just needs the `hsl()` wrapper removed.

6. **Add input area styling** — Apply input placeholder color from config if available.

### Summary of the fix pattern

Every line like:
```
backgroundColor: config.launcher.bgColor ? `hsl(${config.launcher.bgColor})` : "hsl(var(--primary))"
```
Becomes:
```
backgroundColor: config.launcher.bgColor || "hsl(var(--primary))"
```

This is a single-file change (~30 line edits) in `ChatLivePreview.tsx`. No other files need modification — the admin editor and config types are already correct.

