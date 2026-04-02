

# Unified AI Chat Admin Page

## Problem
Chat management is split across two hidden pages (`/admin/chat-settings` and `/admin/chat-analytics`) with no prominent sidebar entry. The user wants a single, dedicated "AI Chat" page as a first-class admin section.

## Solution
Create a new unified `AdminChat.tsx` page at `/admin/chat` that combines both existing pages into one tabbed interface. Add it to the admin sidebar as a visible top-level item.

## Architecture

```text
/admin/chat (new unified page)
├─ Overview tab (new — summary + quick actions)
├─ UI / Appearance tab (from AdminChatSettings)
├─ Behavior / Tone tab (from AdminChatSettings)
├─ Context Rules tab (from AdminChatSettings)
├─ Quick Replies tab (from AdminChatSettings)
├─ Training / Prompt tab (merged: AdminChatSettings prompts + AdminChatAnalytics knowledge base)
├─ Campaign Sync tab (from AdminChatSettings)
├─ Analytics tab (from AdminChatAnalytics dashboard)
├─ Conversation Logs tab (from AdminChatAnalytics conversations)
└─ Sandbox / Testing tab (from AdminChatAnalytics sandbox)
```

## Implementation Steps

### Step 1: Create `src/pages/admin/AdminChat.tsx`
- New page that imports and composes tab content from the existing two pages
- Refactor `AdminChatSettings` and `AdminChatAnalytics` to export their tab content as standalone components (or extract inline)
- Add a new **Overview tab** with: enabled/disabled status, current tone summary, active welcome message, quick stat tiles (total chats, conversions from analytics events), and shortcut buttons to jump to other tabs
- Wrap everything in `AdminLayout` with a single `Tabs` component containing all 10 tabs

### Step 2: Update sidebar (`AdminLayout.tsx`)
- Add `{ id: "chat", to: "/admin/chat", label: "AI Chat", icon: "MessageCircle", visible: true, permission: "settings.view" }` to the **Tools** group (or a new group)
- Import `MessageCircle` from lucide-react and add to `ICON_MAP`
- Optionally remove or keep the old `chat-analytics` entry (keep as redirect)

### Step 3: Update routes (`App.tsx`)
- Add route: `/admin/chat` → `<AdminRoute requiredPermission="settings.view"><AdminChat /></AdminRoute>`
- Keep old routes (`/admin/chat-settings`, `/admin/chat-analytics`) as redirects to `/admin/chat` for backward compatibility

### Step 4: Refactor existing pages into composable tab components
- Extract each tab's content from `AdminChatSettings.tsx` into exportable components (e.g., `ChatGeneralTab`, `ChatLauncherTab`, `ChatToneTab`, etc.) — or more practically, keep both files and import them as sub-sections within the unified page
- The simplest approach: the new `AdminChat.tsx` renders the settings tabs (general, launcher, window, bubbles, tone, prompts, greetings, behavior, quickreplies, pages, responsive) reorganized into the requested structure, plus the analytics tabs (dashboard, conversations, knowledge base, health, sandbox)

### Step 5: Add Overview tab (new content)
- Chat enabled/disabled toggle
- Current tone/personality display
- Active welcome message preview
- Quick stats from `chat_analytics_events` (opens, interactions, conversions in last 7 days)
- Shortcut action buttons: Edit UI, Test Chat, Open Analytics, Edit Prompts (each switches to the relevant tab)

## Files to Create/Modify
| File | Action |
|------|--------|
| `src/pages/admin/AdminChat.tsx` | New — unified page |
| `src/components/admin/AdminLayout.tsx` | Add sidebar entry + MessageCircle icon |
| `src/App.tsx` | Add route + redirects |

## Technical Notes
- Shared state: the settings tabs share one `ChatConfig` state with a single Save button; analytics tabs fetch independently
- The page will be large but each tab renders lazily (only active tab content mounts)
- No database changes needed — all tables already exist

