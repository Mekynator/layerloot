

# Visual Editor Controls UX Overhaul

## Summary
Replace all technical inputs (raw hex, raw URLs, icon name strings, bare number fields) with visual controls: color pickers, sliders, image upload zones, and a searchable icon grid picker. Create 4 reusable control components in a new `controls/` directory, then rewire `SettingsPanel.tsx` to use them everywhere.

## New Files

### 1. `src/components/admin/editor/controls/SliderField.tsx`
- Labeled slider with value display (e.g. "24px", "50%")
- Props: `label`, `value`, `onChange`, `min`, `max`, `step`, `unit` (px/%)
- Shows current value badge next to label
- Optional small numeric input for precision typing

### 2. `src/components/admin/editor/controls/ColorPickerField.tsx`
- Popover trigger showing a color swatch + hex text
- Inside popover: native `<input type="color">` picker, hex text input, opacity slider (optional)
- Row of 8 theme swatches (brand colors from tailwind config + common: white, black, transparent)
- Recently used colors stored in localStorage (last 6)
- Instant `onChange` on every interaction

### 3. `src/components/admin/editor/controls/ImageUploadField.tsx`
- Default state: dashed-border drop zone with upload icon + "Click or drag to upload"
- Uploads to Supabase storage bucket `editor-images` (public)
- After upload: shows thumbnail preview with Replace and Remove buttons
- Falls back to URL input in a collapsible "Advanced" section
- Props: `value` (URL string), `onChange`, `label`

### 4. `src/components/admin/editor/controls/IconPickerField.tsx`
- Button trigger showing current icon preview + name
- Opens a Popover with:
  - Search input at top
  - Grid of ~80+ icons from lucide-react rendered as actual icons
  - Click to select, closes popover
  - Categories: Shopping, Delivery, Security, Social, 3D/Printing, Navigation, Communication, Media, Status, UI
- Expanded icon list (from current 21 to ~80+): add `Clock, CreditCard, DollarSign, MapPin, Phone, Globe, Camera, Image, Video, Play, Pause, Download, Share2, ThumbsUp, Award, Zap, Flame, Lock, Unlock, Eye, EyeOff, Bell, MessageCircle, Send, Search, Filter, Settings, Sliders, BarChart3, PieChart, TrendingUp, Users, UserPlus, User, LogIn, LogOut, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ChevronRight, ChevronDown, ExternalLink, Link, Layers, Grid, List, LayoutGrid, Bookmark, Tag, Calendar, FileText, Folder, Printer, Cpu, Box, Boxes, Cuboid, Cog, Paintbrush, Brush, Palette, Sun, Moon, Cloud, Wifi, Database, Server, Terminal, Code, Rocket, Target, Flag, Trophy, Medal, Crown, Gem, Diamond, Scissors, Ruler, Pencil, Edit, Copy, Clipboard, RefreshCw, RotateCcw, Maximize, Minimize, Move, Grip, Menu, MoreHorizontal, MoreVertical, Info, AlertCircle, AlertTriangle, XCircle, CheckCircle, HelpCircle, CircleDot`

### 5. Storage migration
- Create `editor-images` public bucket via SQL migration
- RLS: authenticated users can upload to their own folder, public read access

## Changes to `SettingsPanel.tsx`

### Content tab replacements
- **Hero `bg_image`**: raw URL input → `ImageUploadField`
- **Hero overlay**: already a slider (keep, but wrap in `SliderField` for consistency)
- **Hero button icons**: `Select` dropdown → `IconPickerField`
- **CTA `bg_image`**: raw URL input → `ImageUploadField`
- **Entry cards icon**: `Select` → `IconPickerField`
- **Entry cards image**: raw URL → `ImageUploadField`
- **Trust badges icon**: `Select` → `IconPickerField`
- **How it works icon**: `Select` → `IconPickerField`
- **Image/carousel items image**: raw URL → `ImageUploadField`
- **Banner background image**: raw URL → `ImageUploadField`
- **Number inputs** (limit, itemsToShow): → `SliderField` with appropriate ranges

### Style tab replacements
- **Background color**: raw input + native color → `ColorPickerField`
- **Text color**: raw input + native color → `ColorPickerField`
- **Background image**: raw URL → `ImageUploadField`
- **All padding/margin sliders**: wrap in `SliderField` for consistent label+value display
- **Border radius**: wrap in `SliderField`
- **Opacity**: wrap in `SliderField` with `%` unit

### Responsive tab
- **Font scale slider**: wrap in `SliderField`
- **Padding override**: wrap in `SliderField`

## Implementation Order
1. Create `editor-images` storage bucket (migration)
2. Build the 4 control components in parallel
3. Rewire SettingsPanel to use new controls throughout
4. Remove `ICON_OPTIONS` constant, replace with expanded list in IconPickerField

## Technical Notes
- All controls are small, self-contained components with no external dependencies beyond existing UI primitives (Popover, Slider, Input, ScrollArea)
- ColorPickerField uses native `<input type="color">` for the gradient picker (no heavy library needed)
- ImageUploadField uses existing `supabase` client for storage uploads
- IconPickerField imports `icons` object from `lucide-react` for dynamic rendering
- No breaking changes to block content schema -- same keys, just better UI to edit them

