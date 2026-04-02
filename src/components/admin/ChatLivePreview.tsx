import { useState, useMemo } from "react";
import { Bot, MessageCircle, Send, Sparkles, User, X, Monitor, Smartphone, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ChatConfig } from "@/hooks/use-chat-settings";

/* ─── helpers ─── */
function getStr(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.en ?? Object.values(val)[0] ?? "";
}

const TONE_SAMPLES: Record<string, string> = {
  friendly: "Hey there! 😊 We've got some awesome options for you. Our best sellers include the Galaxy Lamp and the Custom Lithophane — both are super popular! Want me to show you more?",
  professional: "Thank you for your inquiry. Our best-selling products include the Galaxy Lamp and the Custom Lithophane. I'd be happy to provide detailed specifications for any item of interest.",
  playful: "Ooh great question! 🎉 People are LOVING the Galaxy Lamp right now — it's basically magic in a lamp! And the Custom Lithophane? Chef's kiss 👨‍🍳💋 Want the deets?",
  premium: "Excellent taste. Our curated best sellers — the Galaxy Lamp and bespoke Lithophane — represent the pinnacle of 3D craftsmanship. Shall I walk you through the collection?",
  warm: "I'm so glad you asked! Our customers really love the Galaxy Lamp — it creates such a cozy atmosphere. The Custom Lithophane is another favorite, perfect for meaningful gifts. What catches your eye?",
  concise: "Best sellers: Galaxy Lamp, Custom Lithophane, Dragon Figurine. Want details on any?",
};

const PAGE_CONTEXTS: Record<string, { greeting: string; quickReplies: string[] }> = {
  "/": { greeting: "", quickReplies: ["Show best sellers", "Custom print help", "Shipping info", "Gift ideas"] },
  "/products": { greeting: "Browsing our collection? I can help you find the perfect item!", quickReplies: ["Filter by material", "Show trending", "Compare items", "Custom print help"] },
  "/cart": { greeting: "Ready to check out? Let me help you!", quickReplies: ["Free shipping progress?", "Add one more item", "Use a coupon", "Gift wrapping?"] },
  "/account": { greeting: "Welcome to your account! How can I help?", quickReplies: ["My orders", "My points", "Track order", "Rewards"] },
  "/create": { greeting: "Creating something custom? Exciting! I'll guide you.", quickReplies: ["Material tips", "Pricing info", "Upload help", "Preview options"] },
};

/* ─── Launcher icon ─── */
function LauncherIcon({ icon, customUrl, size }: { icon: string; customUrl?: string; size: number }) {
  const iconSize = Math.round(size * 0.42);
  if (icon === "custom" && customUrl) return <img src={customUrl} alt="" className="rounded-full object-cover" style={{ width: iconSize, height: iconSize }} />;
  if (icon === "bot") return <Bot style={{ width: iconSize, height: iconSize }} />;
  if (icon === "sparkle") return <Sparkles style={{ width: iconSize, height: iconSize }} />;
  return <MessageCircle style={{ width: iconSize, height: iconSize }} />;
}

/* ─── Typing indicator ─── */
function TypingIndicator({ style }: { style: string }) {
  if (style === "pulse") return <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />;
  if (style === "wave") return (
    <span className="flex gap-0.5">{[0, 1, 2].map(i => <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}</span>
  );
  return (
    <span className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}</span>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
interface ChatLivePreviewProps {
  config: ChatConfig;
}

export default function ChatLivePreview({ config }: ChatLivePreviewProps) {
  const [previewState, setPreviewState] = useState<"closed" | "open">("open");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [pageContext, setPageContext] = useState("/");
  const [showTyping, setShowTyping] = useState(false);
  const [simInput, setSimInput] = useState("");
  const [simMessages, setSimMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [simUserLoggedIn, setSimUserLoggedIn] = useState(false);

  const isMobile = device === "mobile";
  const launcherSize = isMobile ? config.responsive.mobile.size : config.responsive.desktop.size;
  const windowHeight = isMobile ? 320 : 420;
  const windowWidth = isMobile ? 280 : Math.min(config.window.width, 380);

  const greeting = useMemo(() => {
    const ctx = PAGE_CONTEXTS[pageContext];
    if (ctx?.greeting) return ctx.greeting;
    if (simUserLoggedIn) return getStr(config.greetings.loggedInGreeting);
    return getStr(config.greetings.defaultGreeting);
  }, [config.greetings, pageContext, simUserLoggedIn]);

  const quickReplies = useMemo(() => {
    const ctx = PAGE_CONTEXTS[pageContext];
    if (ctx) return ctx.quickReplies;
    return config.quickReplies.map(q => getStr(q.label));
  }, [config.quickReplies, pageContext]);

  const toneSample = TONE_SAMPLES[config.tone.personality] || TONE_SAMPLES.friendly;

  const headerBg = config.window.headerBgColor || undefined;

  const handleSimSend = (text?: string) => {
    const msg = (text ?? simInput).trim();
    if (!msg) return;
    setSimMessages(prev => [...prev, { role: "user", content: msg }]);
    setSimInput("");
    setShowTyping(true);
    setTimeout(() => {
      setShowTyping(false);
      setSimMessages(prev => [...prev, { role: "assistant", content: toneSample }]);
    }, 1500);
  };

  const allMessages = useMemo(() => {
    const base: { role: "user" | "assistant"; content: string }[] = [
      { role: "assistant", content: greeting || "Hi! How can I help you today? 😊" },
    ];
    return [...base, ...simMessages];
  }, [greeting, simMessages]);

  return (
    <div className="space-y-3">
      {/* Preview controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border/30 p-0.5">
          <Button variant={previewState === "closed" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setPreviewState("closed")}>Closed</Button>
          <Button variant={previewState === "open" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setPreviewState("open")}>Open</Button>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border/30 p-0.5">
          <Button variant={device === "desktop" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setDevice("desktop")}><Monitor className="h-3 w-3" /></Button>
          <Button variant={device === "mobile" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setDevice("mobile")}><Smartphone className="h-3 w-3" /></Button>
        </div>
      </div>

      {/* Context controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={pageContext} onValueChange={v => { setPageContext(v); setSimMessages([]); }}>
          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="/">Homepage</SelectItem>
            <SelectItem value="/products">Products</SelectItem>
            <SelectItem value="/cart">Cart</SelectItem>
            <SelectItem value="/account">Account</SelectItem>
            <SelectItem value="/create">Custom Order</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Switch checked={simUserLoggedIn} onCheckedChange={v => { setSimUserLoggedIn(v); setSimMessages([]); }} className="scale-75" />
          <Label className="text-[10px] text-muted-foreground">Logged in</Label>
        </div>
      </div>

      {/* Preview area */}
      <div
        className="relative overflow-hidden rounded-xl border border-border/40 bg-background/50"
        style={{
          minHeight: previewState === "open" ? windowHeight + 60 : 120,
          background: "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 16px 16px",
        }}
      >
        {/* Closed / Launcher preview */}
        {previewState === "closed" && (
          <div className="flex flex-col items-end justify-end p-4 gap-3" style={{ minHeight: 120 }}>
            {/* Tooltip */}
            {getStr(config.launcher.tooltipText) && (
              <div className="rounded-lg border border-border/30 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm shadow-sm max-w-[200px]">
                {getStr(config.launcher.tooltipText)}
              </div>
            )}

            {/* Prompt bubble */}
            {getStr(config.greetings.promptBubbleTitle) && (
              <div className="max-w-[220px] rounded-2xl border border-border/30 bg-card/70 px-3 py-2 shadow-md backdrop-blur-xl">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-0.5">
                  <Wand2 className="h-3 w-3 text-primary" />
                  {getStr(config.greetings.promptBubbleTitle)}
                </div>
                <p className="text-[10px] text-muted-foreground">{getStr(config.greetings.promptBubbleBody)}</p>
              </div>
            )}

            {/* Launcher button */}
            <button
              onClick={() => setPreviewState("open")}
              className="relative flex items-center justify-center rounded-full text-primary-foreground shadow-xl transition-transform hover:scale-105"
                style={{
                  width: launcherSize,
                  height: launcherSize,
                  backgroundColor: config.launcher.bgColor || "hsl(var(--primary))",
                  color: config.launcher.iconColor || undefined,
                  borderColor: config.launcher.borderColor || undefined,
                  borderWidth: config.launcher.borderColor ? 2 : 0,
                  boxShadow: config.launcher.shadow
                    ? config.launcher.glowColor
                      ? `0 8px 30px ${config.launcher.glowColor}40`
                      : "0 8px 30px hsl(var(--primary) / 0.35)"
                    : "none",
                  animation: config.launcher.pulseAnimation ? "pulse 2s infinite" : undefined,
                }}
            >
              <LauncherIcon icon={config.launcher.icon} customUrl={config.launcher.customIconUrl} size={launcherSize} />
              {config.launcher.showUnreadBadge && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background text-[8px] font-bold text-primary shadow">✦</span>
              )}
            </button>
            {config.launcher.showLabel && getStr(config.launcher.labelText) && (
              <span className="text-[10px] text-muted-foreground">{getStr(config.launcher.labelText)}</span>
            )}
          </div>
        )}

        {/* Open / Window preview */}
        {previewState === "open" && (
          <div className="flex items-end justify-end p-3">
            <div
              className="flex flex-col overflow-hidden border border-border/30 shadow-xl"
              style={{
                width: windowWidth,
                height: windowHeight,
                borderRadius: config.window.borderRadius,
                backgroundColor: config.window.bgColor || "hsl(var(--card))",
                opacity: config.window.opacity / 100,
                backdropFilter: config.window.glassEffect ? "blur(24px)" : undefined,
                boxShadow: config.window.shadow || "0 24px 80px hsl(217 91% 60% / 0.15)",
                borderColor: (config.window as any).borderColor || undefined,
                borderWidth: (config.window as any).borderColor ? 1 : undefined,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between border-b border-border/20 px-3 py-2 shrink-0"
                style={{
                  background: headerBg || "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                }}
              >
                <div className="flex items-center gap-2">
                  {config.window.avatarUrl ? (
                    <img src={config.window.avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <Bot className="h-4 w-4" style={{ color: (config.window as any).headerTextColor || "hsl(var(--primary-foreground))" }} />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: (config.window as any).headerTextColor || "hsl(var(--primary-foreground))" }}>
                    {getStr(config.window.brandName) || "Assistant"}
                  </span>
                </div>
                <button onClick={() => setPreviewState("closed")} style={{ color: (config.window as any).headerTextColor ? `${(config.window as any).headerTextColor}B3` : undefined }} className="text-primary-foreground/70 hover:text-primary-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Quick replies bar */}
              <div className="border-b border-border/20 bg-muted/30 px-2 py-1.5 shrink-0">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {quickReplies.slice(0, 4).map(qr => (
                    <button
                      key={qr}
                      onClick={() => handleSimSend(qr)}
                      className="whitespace-nowrap rounded-full border border-border/40 bg-background px-2 py-0.5 text-[10px] text-foreground hover:bg-muted transition shrink-0"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "thin" }}>
                {allMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-1.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {((msg.role === "assistant" && config.bubbles.ai.showAvatar) || (msg.role === "user" && config.bubbles.user.showAvatar)) && (
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {msg.role === "user" ? <User className="h-2.5 w-2.5" /> : <Bot className="h-2.5 w-2.5" />}
                      </div>
                    )}
                    <div
                      className="max-w-[80%] px-2.5 py-1.5 text-[11px] leading-relaxed"
                      style={{
                        borderRadius: msg.role === "user" ? config.bubbles.user.borderRadius : config.bubbles.ai.borderRadius,
                        backgroundColor: msg.role === "user"
                          ? config.bubbles.user.bgColor || "hsl(var(--primary))"
                          : config.bubbles.ai.bgColor || "hsl(var(--muted))",
                        color: msg.role === "user"
                          ? config.bubbles.user.textColor || "hsl(var(--primary-foreground))"
                          : config.bubbles.ai.textColor || "hsl(var(--foreground))",
                        borderColor: msg.role === "user"
                          ? config.bubbles.user.borderColor || undefined
                          : config.bubbles.ai.borderColor || undefined,
                        borderWidth: (msg.role === "user" ? config.bubbles.user.borderColor : config.bubbles.ai.borderColor) ? 1 : 0,
                        boxShadow: (msg.role === "user" ? config.bubbles.user.shadow : config.bubbles.ai.shadow) ? "0 2px 8px hsl(0 0% 0% / 0.1)" : undefined,
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {showTyping && (
                  <div className="flex gap-1.5">
                    {config.bubbles.ai.showAvatar && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Bot className="h-2.5 w-2.5" />
                      </div>
                    )}
                    <div className="rounded-xl bg-muted px-3 py-2">
                      <TypingIndicator style={config.bubbles.typingIndicator} />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={e => { e.preventDefault(); handleSimSend(); }}
                className="flex items-center gap-1.5 border-t border-border/20 bg-card/50 px-2.5 py-2 shrink-0"
              >
                <input
                  value={simInput}
                  onChange={e => setSimInput(e.target.value)}
                  placeholder={getStr(config.window.inputPlaceholder) || "Ask me anything..."}
                  className="flex-1 bg-muted rounded-full px-2.5 py-1 text-[11px] text-foreground border-none outline-none"
                />
                <button
                  type="submit"
                  disabled={!simInput.trim()}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 shrink-0"
                  style={{ backgroundColor: config.window.sendButtonColor || undefined }}
                >
                  <Send className="h-3 w-3" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Tone preview */}
      <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Tone Preview — {config.tone.personality}</p>
        <p className="text-[11px] text-foreground leading-relaxed">{toneSample}</p>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px]">{pageContext}</Badge>
        <Badge variant="outline" className="text-[9px]">{simUserLoggedIn ? "Logged in" : "Guest"}</Badge>
        <Badge variant="outline" className="text-[9px]">{device}</Badge>
        <Badge variant="outline" className="text-[9px]">{config.tone.personality}</Badge>
        {!config.enabled && <Badge variant="destructive" className="text-[9px]">Disabled</Badge>}
      </div>
    </div>
  );
}
