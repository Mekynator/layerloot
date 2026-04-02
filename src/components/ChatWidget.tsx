import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, MapPin, MessageCircle, Send, Trash2, User, X, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useCampaign } from "@/components/campaign/CampaignThemeProvider";
import { useChatSettings } from "@/hooks/use-chat-settings";
type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const STORAGE_KEY = "layerloot-chat-history";
const PROMPT_BUBBLE_DELAY_MS = 8000;
const PROMPT_BUBBLE_REAPPEAR_MS = 120000;

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getPageSuggestions(pathname: string, loggedIn: boolean): string[] {
  if (pathname.startsWith("/products/") || pathname.startsWith("/product/")) {
    return [
      "Compare materials for this item",
      "Show similar but cheaper options",
      "Is this available in a larger size?",
      "How long until delivery?",
    ];
  }
  if (pathname.startsWith("/products")) {
    return ["Show best sellers", "Find gifts under 200 DKK", "What's trending right now?", "Custom print help"];
  }
  if (pathname.startsWith("/cart")) {
    return [
      "How far am I from free shipping?",
      "Recommend one more item",
      "Can I use a coupon?",
      "Is gift wrapping available?",
    ];
  }
  if (pathname.startsWith("/account")) {
    return ["Show my latest order", "How many points do I have?", "When can I redeem rewards?", "Track my order"];
  }
  if (pathname.startsWith("/create")) {
    return ["What materials work best?", "How does pricing work?", "Can I preview before ordering?", "Upload tips"];
  }
  if (pathname === "/") {
    return loggedIn
      ? ["Show my points", "What's new this week?", "Recommend something for me", "Track my order"]
      : ["Show best sellers", "How does custom printing work?", "Shipping information", "Gift ideas"];
  }
  return loggedIn
    ? ["Show my points", "Show my latest order", "Recommended products for me"]
    : ["Show best sellers", "Custom print help", "Shipping information"];
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getCartSnapshot() {
  const raw = localStorage.getItem("layerloot-cart");
  const items = safeJsonParse<any[]>(raw, []);
  const normalized = items.map((item) => ({
    id: item.id ?? item.product_id ?? "",
    name: item.name ?? item.title ?? "Item",
    qty: Number(item.qty ?? item.quantity ?? 1),
    price: Number(item.price ?? 0),
  }));
  const subtotal = normalized.reduce((sum, i) => sum + i.qty * i.price, 0);
  return {
    item_count: normalized.reduce((sum, i) => sum + i.qty, 0),
    total: subtotal,
    items: normalized,
  };
}

function HorizontalSuggestions({ items, onPick }: { items: string[]; onPick: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const moved = useRef(false);

  const startDrag = (clientX: number) => {
    if (!ref.current) return;
    isDown.current = true;
    moved.current = false;
    startX.current = clientX;
    startScrollLeft.current = ref.current.scrollLeft;
  };

  const moveDrag = (clientX: number) => {
    if (!isDown.current || !ref.current) return;
    const delta = clientX - startX.current;
    if (Math.abs(delta) > 6) moved.current = true;
    ref.current.scrollLeft = startScrollLeft.current - delta;
  };

  const endDrag = () => {
    isDown.current = false;
    window.setTimeout(() => {
      moved.current = false;
    }, 0);
  };

  return (
    <div
      ref={ref}
      onMouseDown={(e) => startDrag(e.clientX)}
      onMouseMove={(e) => moveDrag(e.clientX)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
      onTouchEnd={endDrag}
      className="no-scrollbar overflow-x-auto overflow-y-hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div className="flex w-max gap-2 pr-4">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              if (!moved.current) onPick(item);
            }}
            className="whitespace-nowrap rounded-full border bg-background px-3 py-1.5 text-xs text-foreground transition hover:-translate-y-0.5 hover:bg-muted"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-xs [&_pre]:text-xs">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("/")) {
              return (
                <Link to={href} className="text-primary underline">
                  {children}
                </Link>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

async function streamChat({
  messages,
  page,
  cart,
  accessToken,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  page: string;
  cart: any;
  accessToken: string | null;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ messages, page, cart }),
  });

  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => "");
    if (resp.status === 429) {
      onError("I'm getting too many requests right now. Please try again in a moment.");
      return;
    }
    if (resp.status === 402) {
      onError("AI credits are currently exhausted. Please try again later.");
      return;
    }
    onError(text || "Failed to connect");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        // ignore partial leftovers
      }
    }
  }

  onDone();
}

const ChatWidget = () => {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const promptBubbleTimerRef = useRef<number | null>(null);
  const { campaign } = useCampaign();
  const { settings: chatSettings } = useChatSettings();

  const posClass = chatSettings.position === "bottom-left" ? "left-4 sm:left-6" : "right-4 sm:right-6";
  const headerBg = campaign?.chat_overrides?.headerColor
    ? `hsl(${campaign.chat_overrides.headerColor})`
    : chatSettings.headerColor
    ? `hsl(${chatSettings.headerColor})`
    : undefined;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [showPromptBubble, setShowPromptBubble] = useState(false);
  const [promptBubbleDismissed, setPromptBubbleDismissed] = useState(false);

  const [messages, setMessages] = useState<Msg[]>(() => {
    const saved = safeJsonParse<Msg[] | null>(localStorage.getItem(STORAGE_KEY), null);
    if (saved?.length) return saved;

    return [
      {
        id: uid(),
        role: "assistant",
        content:
          "Hi! I'm LayerLoot's assistant. I can help with products, custom prints, shipping, points, and your orders. Ask me anything! 😊",
      },
    ];
  });

  const starterSuggestions = useMemo(
    () => getPageSuggestions(location.pathname, !!userId),
    [location.pathname, userId],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (promptBubbleTimerRef.current) {
      window.clearTimeout(promptBubbleTimerRef.current);
      promptBubbleTimerRef.current = null;
    }

    if (open) {
      setShowPromptBubble(false);
      return;
    }

    const delay = promptBubbleDismissed ? PROMPT_BUBBLE_REAPPEAR_MS : PROMPT_BUBBLE_DELAY_MS;

    promptBubbleTimerRef.current = window.setTimeout(() => {
      setShowPromptBubble(true);
      setPromptBubbleDismissed(false);
    }, delay);

    return () => {
      if (promptBubbleTimerRef.current) {
        window.clearTimeout(promptBubbleTimerRef.current);
        promptBubbleTimerRef.current = null;
      }
    };
  }, [open, location.pathname, promptBubbleDismissed]);

  const dismissPromptBubble = () => {
    setShowPromptBubble(false);
    setPromptBubbleDismissed(true);
  };

  const openChat = () => {
    setOpen(true);
    setShowPromptBubble(false);
    setPromptBubbleDismissed(false);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
    );
  };

  const send = async (forcedText?: string) => {
    const text = (forcedText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Msg = { id: uid(), role: "user", content: text };
    const assistantMsgId = uid();
    const nextMessages = [...messages, userMsg];

    setMessages([...nextMessages, { id: assistantMsgId, role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    setShowPromptBubble(false);

    let assistantSoFar = "";

    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      const currentContent = assistantSoFar;

      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, content: currentContent } : m)));
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;
      const cart = getCartSnapshot();

      await streamChat({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        page: location.pathname,
        cart,
        accessToken,
        onDelta: upsertAssistant,
        onDone: () => setLoading(false),
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: err || "Sorry, something went wrong. Please try again." } : m,
            ),
          );
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, content: "Sorry, I'm having trouble connecting. Please try again." } : m,
        ),
      );
      setLoading(false);
    }
  };

  const clearChat = () => {
    const reset: Msg[] = [
      {
        id: uid(),
        role: "assistant",
        content: userId
          ? "Welcome back! I can help with your orders, points, cart progress, products, and custom prints."
          : "Hi! I'm LayerLoot's assistant. I can help you find products, explain shipping, and guide custom print requests.",
      },
    ];

    setMessages(reset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
  };

  return (
    <>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none;}`}</style>

      <AnimatePresence>
        {!open && showPromptBubble && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="fixed bottom-24 right-6 z-50 max-w-[260px] rounded-2xl border border-border/30 bg-card/70 px-4 py-3 text-left shadow-[0_16px_48px_hsl(217_91%_60%/0.12)] backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={dismissPromptBubble}
              aria-label="Close help popup"
              className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <button type="button" onClick={openChat} className="block w-full text-left">
              <div className="mb-1 flex items-center gap-2 pr-6 text-sm font-medium text-foreground">
                <Wand2 className="h-4 w-4 text-primary" />
                Need help choosing?
              </div>
              <div className="text-xs text-muted-foreground">
                Ask about your points, latest order, free shipping, custom prints, or gift ideas.
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            whileHover={{ y: -4, scale: 1.04 }}
            className={`fixed bottom-6 ${posClass} z-50`}
          >
            <Button onClick={openChat} size="lg" className="relative h-14 w-14 rounded-full shadow-2xl">
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background text-[9px] font-bold text-primary shadow">
                ✦
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            className={`fixed bottom-4 ${posClass} z-50 flex h-[46vh] min-h-[380px] w-[calc(100vw-2rem)] max-w-[430px] flex-col overflow-hidden rounded-3xl border border-border/30 bg-card/70 shadow-[0_24px_80px_hsl(217_91%_60%/0.15)] backdrop-blur-2xl sm:h-[52vh]`}
          >
            <div
              className="flex items-center justify-between border-b border-border/20 px-4 py-2.5"
              style={{
                background: headerBg || undefined,
                backgroundImage: !headerBg ? "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.8))" : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                {chatSettings.avatarUrl ? (
                  <img src={chatSettings.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <Bot className="h-5 w-5 text-primary-foreground" />
                )}
                <div className="font-display text-sm font-bold uppercase tracking-wider text-primary-foreground">
                  {chatSettings.brandName || "LayerLoot Assistant"}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!geo && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
                    onClick={requestLocation}
                    title="Share location for delivery help"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
                  onClick={clearChat}
                  title="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
                  onClick={() => setOpen(false)}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="border-b border-border/20 bg-muted/30 backdrop-blur-sm px-3 py-2.5">
              <HorizontalSuggestions items={starterSuggestions} onPick={send} />
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" && !msg.content && loading ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                        Thinking...
                      </div>
                    ) : msg.role === "assistant" ? (
                      <MarkdownMessage content={msg.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t border-border/20 bg-card/50 backdrop-blur-xl px-4 py-3"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 rounded-full border-border bg-muted text-sm"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full transition-transform hover:scale-105"
                disabled={loading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
