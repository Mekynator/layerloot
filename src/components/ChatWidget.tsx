import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bot, MapPin, MessageCircle, Send, Sparkles, Trash2, User, X, Wand2 } from "lucide-react";
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

type ChatQuickItem = {
  label: string;
  message: string;
  icon?: string;
};

// Using ParsedChatProduct from chatPostprocess

import { formatPrice } from "@/lib/currency";
import { useNavigate } from "react-router-dom";
import { parseChatProducts, stripProductBlocks, sanitizeContent, type ParsedChatProduct } from "@/lib/chatPostprocess";
import { useCart } from "@/contexts/CartContext";
import { useRecentlyViewedProducts } from "@/hooks/use-recently-viewed";
import { getSavedProducts } from "@/lib/savedItems";

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
      "How quickly can this be delivered?",
      "Is there a gift version of this?",
      "Can I personalise this product?",
      "Show me similar alternatives",
    ];
  }
  if (pathname.startsWith("/products")) {
    return ["Show best sellers", "Find the perfect gift", "What's trending right now?", "Help me customise a print"];
  }
  if (pathname.startsWith("/cart")) {
    return [
      "Help me reach free shipping",
      "I'm ready to checkout",
      "Can I add a discount code?",
      "Recommend one more item",
    ];
  }
  if (pathname.startsWith("/account")) {
    return ["Show my latest order", "How many points do I have?", "When can I redeem rewards?", "Track my order"];
  }
  if (pathname.startsWith("/create-your-own")) {
    return ["What materials work best?", "How does pricing work?", "Can I preview before ordering?", "Upload tips"];
  }
  if (pathname === "/") {
    return loggedIn
      ? ["What's new since my last visit?", "Recommend something for me", "Find a gift", "How many points do I have?"]
      : ["Show best sellers", "How does custom printing work?", "Find the perfect gift", "Shipping information"];
  }
  return loggedIn
    ? ["Show my points", "Show my latest order", "Recommend something for me"]
    : ["Show best sellers", "Custom print help", "Shipping information"];
}

function isBuyingIntent(text: string) {
  return /(ready to (?:buy|checkout)|checkout|check out|buy now|order now|purchase|i(?:'|’)ll take it|add (?:it|this|one) to cart|go to cart|complete (?:my )?order)/i.test(text);
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getLocalizedStr(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const rec = val as Record<string, string>;
    return rec.en ?? rec.da ?? Object.values(rec)[0] ?? "";
  }
  return "";
}

function ChatLauncherIcon({ icon, customUrl, iconSize }: { icon: string; customUrl?: string; iconSize: number }) {
  if (icon === "custom" && customUrl) return <img src={customUrl} alt="" className="h-full w-full rounded-full object-contain p-1" />;
  if (icon === "bot") return <Bot style={{ width: iconSize, height: iconSize }} />;
  if (icon === "sparkle") return <Sparkles style={{ width: iconSize, height: iconSize }} />;
  return <MessageCircle style={{ width: iconSize, height: iconSize }} />;
}

function ChatTypingIndicator({ style }: { style?: string }) {
  if (style === "pulse") return (
    <span className="flex gap-1"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" /></span>
  );
  if (style === "wave") return (
    <span className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="inline-block h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}</span>
  );
  return (
    <span className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="inline-block h-2 w-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}</span>
  );
}

function getCartSnapshot() {  const raw = localStorage.getItem("layerloot-cart");
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

// parseChatProducts, stripProductBlocks and sanitizeContent are implemented in src/lib/chatPostprocess.ts

export function ChatProductCard({ product }: { product: ParsedChatProduct }) {
  const { addItem } = useCart();
  const isInternal = product.productUrl?.startsWith("/") ?? false;
  const ctaClass =
    "mt-1.5 inline-flex items-center gap-1 self-start rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-95";
  const ctaContent = (
    <>
      View <ArrowRight className="h-3 w-3" />
    </>
  );

  const handleAddToCart = () => {
    try {
      const price = typeof product.priceValue === "number" ? product.priceValue : parseFloat(String((product.price || "").replace(/[^0-9.,]/g, "").replace(/,/g, "."))) || 0;
      addItem({ id: product.id ?? product.slug ?? product.name, name: product.name, price, image: product.imageUrl, slug: product.slug });
      trackChatEvent("add_to_cart_from_chat", { product: product.id ?? product.slug ?? product.name }, window.location.pathname, null);
    } catch (e) {
      // keep UI stable
    }
  };

  return (
    <div className="flex gap-3 rounded-xl border border-border/30 bg-background/70 p-2.5 backdrop-blur-sm">
      {product.imageUrl && (
        <div className="h-[62px] w-[62px] shrink-0 overflow-hidden rounded-lg bg-muted">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-xs font-semibold leading-snug text-foreground">{product.name}</p>
        {product.benefit && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{product.benefit}</p>
        )}
        {product.price && (
          <p className="mt-0.5 text-[11px] font-medium text-primary">{product.price}</p>
        )}
        <div className="mt-2 flex gap-2">
          {product.productUrl && (isInternal ? (
            <Link to={product.productUrl} className={ctaClass}>{ctaContent}</Link>
          ) : (
            <a href={product.productUrl} target="_blank" rel="noopener noreferrer" className={ctaClass}>{ctaContent}</a>
          ))}
          <button type="button" onClick={handleAddToCart} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold text-foreground hover:bg-muted">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function HorizontalSuggestions({ items, onPick }: { items: ChatQuickItem[]; onPick: (message: string) => void }) {
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
            key={item.label}
            type="button"
            onClick={() => {
              if (!moved.current) onPick(item.message);
            }}
            className="whitespace-nowrap rounded-full border bg-background px-3 py-1.5 text-xs text-foreground transition hover:-translate-y-0.5 hover:bg-muted"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  const products = useMemo(() => parseChatProducts(content), [content]);
  const textContent = products.length > 0 ? stripProductBlocks(content) : content;
  return (
    <div className="space-y-2.5">
      {textContent && (
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
            {textContent}
          </ReactMarkdown>
        </div>
      )}
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

const SESSION_ID_KEY = "layerloot-chat-session-id";

function getChatSessionId() {
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) { id = uid(); sessionStorage.setItem(SESSION_ID_KEY, id); }
  return id;
}

function trackChatEvent(eventType: string, eventData: any = {}, page?: string, userId?: string | null) {
  const sessionId = getChatSessionId();
  supabase.from("chat_analytics_events").insert({
    session_id: sessionId,
    event_type: eventType,
    event_data: eventData,
    page: page || window.location.pathname,
    user_id: userId || null,
  } as any).then(() => {});
}

function saveConversation(messages: Msg[], page: string, userId: string | null, outcome = "unknown") {
  const sessionId = getChatSessionId();
  const payload = {
    session_id: sessionId,
    user_id: userId,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    page,
    language: navigator.language?.slice(0, 2) || "en",
    message_count: messages.length,
    outcome,
    metadata: { cart: getCartSnapshot() },
  };
  supabase.from("chat_conversations").upsert(payload as any, { onConflict: "session_id" }).then(() => {});
}

const ChatWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);
  const promptBubbleTimerRef = useRef<number | null>(null);
  const { campaign } = useCampaign();
  const { settings: chatSettings, loading: chatSettingsLoading } = useChatSettings();

  const posClass = chatSettings.launcher.position === "bottom-left" ? "left-4 sm:left-6" : "right-4 sm:right-6";
  const headerBg = campaign?.chat_overrides?.headerColor
    ? `hsl(${campaign.chat_overrides.headerColor})`
    : chatSettings.window.headerBgColor || undefined;

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

  // Map assistant message id => suggested products (rendered as cards)
  const [assistantProductMap, setAssistantProductMap] = useState<Record<string, ParsedChatProduct[]>>({});
  // Map assistant message id => action buttons (label + route or handler)
  const [assistantActionMap, setAssistantActionMap] = useState<Record<string, { label: string; to?: string; action?: () => void }[]>>({});
  const { recentProducts } = useRecentlyViewedProducts();

  const starterSuggestions = useMemo((): ChatQuickItem[] => {
    const adminReplies = chatSettings.quickReplies ?? [];
    if (adminReplies.length > 0) {
      // Check if a page rule specifies which quick replies to show
      const matchedRule = (chatSettings.pageRules ?? []).find((r) => {
        if (!r.enabled) return false;
        const pattern = r.page.replace(/\*/g, ".*");
        return new RegExp(`^${pattern}$`).test(location.pathname);
      });
      if (matchedRule?.quickReplyIds?.length) {
        const pinned = adminReplies
          .filter((r) => matchedRule.quickReplyIds!.includes(r.id))
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((r) => ({
            label: getLocalizedStr(r.label),
            message: getLocalizedStr(r.message) || getLocalizedStr(r.label),
            icon: r.icon,
          }));
        if (pinned.length > 0) return pinned;
      }
      // Show global quick replies (no page restriction)
      const global = adminReplies
        .filter((r) => !r.pages?.length)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((r) => ({
          label: getLocalizedStr(r.label),
          message: getLocalizedStr(r.message) || getLocalizedStr(r.label),
          icon: r.icon,
        }));
      if (global.length > 0) return global;
    }
    return getPageSuggestions(location.pathname, !!userId).map((s) => ({ label: s, message: s }));
  }, [location.pathname, userId, chatSettings.quickReplies, chatSettings.pageRules]);

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

  // Once settings load from DB, update the initial greeting if the chat is in pristine state
  const settingsAppliedRef = useRef(false);
  useEffect(() => {
    if (chatSettingsLoading || settingsAppliedRef.current) return;
    settingsAppliedRef.current = true;
    const adminGreeting = getLocalizedStr(chatSettings.greetings.defaultGreeting);
    if (!adminGreeting) return;
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].role !== "assistant") return prev;
      return [{ ...prev[0], content: adminGreeting }];
    });
  }, [chatSettingsLoading, chatSettings.greetings.defaultGreeting]);

  useEffect(() => {
    if (promptBubbleTimerRef.current) {
      window.clearTimeout(promptBubbleTimerRef.current);
      promptBubbleTimerRef.current = null;
    }

    if (open) {
      setShowPromptBubble(false);
      return;
    }

    const bubbleDelay = chatSettings.greetings.promptBubbleDelay ?? PROMPT_BUBBLE_DELAY_MS;
    const bubbleReappear = chatSettings.greetings.promptBubbleReappear ?? PROMPT_BUBBLE_REAPPEAR_MS;
    const delay = promptBubbleDismissed ? bubbleReappear : bubbleDelay;

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
  }, [open, location.pathname, promptBubbleDismissed, chatSettings.greetings.promptBubbleDelay, chatSettings.greetings.promptBubbleReappear]);

  const dismissPromptBubble = () => {
    setShowPromptBubble(false);
    setPromptBubbleDismissed(true);
  };

  const openChat = () => {
    setOpen(true);
    setShowPromptBubble(false);
    setPromptBubbleDismissed(false);
    trackChatEvent("open", {}, location.pathname, userId);
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
    trackChatEvent(forcedText ? "quick_reply_click" : "message", { text }, location.pathname, userId);

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

      // After streaming completes, post-process the assistant message
      await processAssistantMessage(assistantMsgId, assistantSoFar, location.pathname, cart, text);
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

  async function processAssistantMessage(messageId: string, content: string, page: string, cart: any, userIntentText = "") {
    if (!content) return;

    const readyToBuy = isBuyingIntent(userIntentText) || (page.startsWith("/cart") && Number(cart?.item_count || 0) > 0);

    // 1) Remove raw internal routes and markdown links that point to internal paths
    const routeRegex = /(?:\[[^\]]+\]\((\/[^)]+)\))|((?:\/[a-zA-Z0-9_\-\/\?=&%]+))/g;
    const foundRoutes = new Set<string>();
    const sanitized = content.replace(routeRegex, (match, p1, p2) => {
      const route = p1 || p2;
      if (route) foundRoutes.add(route);
      // Replace with nothing to avoid showing raw routes in chat text
      return "";
    }).trim();

    // Update the assistant message content to sanitized version
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: sanitized } : m)));

    // 2) Parse any explicit product blocks present in original content
    const parsed = parseChatProducts(content);
    if (parsed.length > 0) {
      // Validate parsed products against the real product catalog if possible
      const validated: ParsedChatProduct[] = [];
      for (const p of parsed) {
        try {
          // If productUrl contains a product slug, prefer resolving that to a live product
          let resolved: any = null;
          if (p.productUrl && p.productUrl.startsWith("/products/")) {
            const slug = p.productUrl.replace(/^\/products\//, "");
            const { data } = await supabase.from("products").select("id,slug,name,price,images,is_active,published").eq("slug", slug).maybeSingle();
            if (data && (data as any).is_active && (data as any).published) resolved = data;
          }

          if (!resolved && p.name) {
            // try to match by name as a last resort (case-insensitive)
            const { data } = await supabase.from("products").select("id,slug,name,price,images,is_active,published").ilike("name", `%${p.name}%`).limit(1);
            if (data && data[0] && (data[0] as any).is_active && (data[0] as any).published) resolved = data[0];
          }

          if (resolved) {
            validated.push({
              id: (resolved as any).id,
              slug: (resolved as any).slug,
              name: (resolved as any).name,
              benefit: (resolved as any).short_description ?? p.benefit,
              price: formatPrice(Number((resolved as any).price ?? 0)),
              priceValue: Number((resolved as any).price ?? 0),
              imageUrl: ((resolved as any).images && (resolved as any).images[0]) || p.imageUrl,
              productUrl: `/products/${(resolved as any).slug}`,
            });
          }
        } catch (e) {
          // ignore and skip invalid entries
        }
      }

      if (validated.length > 0) {
        const limited = validated.slice(0, readyToBuy ? 2 : 3);
        setAssistantProductMap((s) => ({ ...s, [messageId]: limited }));

        if (readyToBuy) {
          const topPick = limited[0];
          setAssistantActionMap((s) => ({
            ...s,
            [messageId]: [
              topPick
                ? {
                    label: "Add top pick to cart",
                    action: () => {
                      const price = Number(topPick.priceValue ?? 0);
                      addItem(
                        {
                          id: topPick.id ?? topPick.slug ?? topPick.name,
                          name: topPick.name,
                          price,
                          image: topPick.imageUrl,
                          slug: topPick.slug,
                        },
                        { source: "chat_widget" },
                      );
                      trackChatEvent("add_to_cart_from_chat", { product: topPick.id ?? topPick.slug ?? topPick.name }, window.location.pathname, userId);
                    },
                  }
                : { label: "Browse Products", to: "/products" },
              { label: "Go to checkout", to: "/cart" },
              { label: "Keep browsing", to: "/products" },
            ].slice(0, 3),
          }));
        }
      } else {
        // no valid resolved products; fall through to other handlers (do not show fictional items)
      }
      return;
    }

    // 3) If no explicit products, but routes include category or user intent, query Supabase for 1-3 real products
    // Map known route patterns to friendly category slug
    let categorySlug: string | null = null;
    foundRoutes.forEach((r) => {
      const m = /category=([^&]+)/.exec(r);
      if (m) categorySlug = decodeURIComponent(m[1]);
      if (!categorySlug && /^\/products\//.test(r)) {
        // maybe a product path - ignore: we won't expose raw path
      }
    });

    // Determine if message implies a product intent
    const intentKeywords = /(recommend|best sellers|best-selling|show (?:products|items)|suggest|looking for|find|gifts|paint by numbers|figurine|figure|miniature)/i;
    const hasProductIntent = intentKeywords.test(content);

    const viewedIntent = /recently viewed|based on what you viewed|based on what you saw|based on your views/i.test(content);
    const savedIntent = /saved items|saved for later|from your saved|your saved items/i.test(content);

    if (!hasProductIntent && !categorySlug && !viewedIntent && !savedIntent) {
      // no product intent detected — but still offer navigation buttons if routes exist
      if (foundRoutes.size > 0) {
        const actions: { label: string; to?: string; action?: () => void }[] = [];
        for (const r of Array.from(foundRoutes)) {
          try {
            const cat = /category=([^&]+)/.exec(r);
            if (cat) {
              // verify category has active products
              const slug = decodeURIComponent(cat[1]);
              const { data: catCount } = await (supabase.from("products") as any).select("id").ilike("category_slugs", `%${slug}%`).eq("is_active", true).eq("published", true).limit(1);
              if (catCount && catCount.length > 0) {
                actions.push({ label: `View all ${titleCase(slug)}`, to: `/products?category=${cat[1]}` });
              }
              continue;
            }

            if (r.startsWith("/create")) {
              actions.push({ label: "Create Your Own", to: "/create-your-own" });
              continue;
            }

            if (r.startsWith("/products")) {
              actions.push({ label: "Browse Products", to: "/products" });
              continue;
            }
          } catch {
            // ignore invalid routes
          }
        }

        if (actions.length > 0) setAssistantActionMap((s) => ({ ...s, [messageId]: actions }));
      }
      return;
    }

    // Build query
    try {
      // If user asked for viewed/saved based recommendations, prefer those sources
      if (viewedIntent && recentProducts && recentProducts.length > 0) {
        const ids = recentProducts.map((r) => r.id).slice(0, 3);
        const { data } = await (supabase.from("products") as any).select("id,name,slug,images,price,short_description").in("id", ids).eq("is_active", true).eq("published", true).limit(3);
        if (data && data.length > 0) {
          const items: ParsedChatProduct[] = data.map((p: any) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            benefit: p.short_description ?? undefined,
            price: formatPrice(Number(p.price ?? 0)),
            priceValue: Number(p.price ?? 0),
            imageUrl: (p.images && p.images[0]) || undefined,
            productUrl: `/products/${p.slug}`,
          }));
          setAssistantProductMap((s) => ({ ...s, [messageId]: items }));
          setAssistantActionMap((s) => ({ ...s, [messageId]: [{ label: "Browse Products", to: "/products" }] }));
          return;
        }
      }

      if (savedIntent && userId) {
        try {
          const savedResp = await getSavedProducts(userId);
          const savedIds = (savedResp.data ?? []).map((r: any) => r.product_id).slice(0, 6);
          if (savedIds.length > 0) {
            const { data } = await (supabase.from("products") as any).select("id,name,slug,images,price,short_description").in("id", savedIds).eq("is_active", true).eq("published", true).limit(3);
            if (data && data.length > 0) {
              const items: ParsedChatProduct[] = data.map((p: any) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                benefit: p.short_description ?? undefined,
                price: formatPrice(Number(p.price ?? 0)),
                priceValue: Number(p.price ?? 0),
                imageUrl: (p.images && p.images[0]) || undefined,
                productUrl: `/products/${p.slug}`,
              }));
              setAssistantProductMap((s) => ({ ...s, [messageId]: items }));
              setAssistantActionMap((s) => ({ ...s, [messageId]: [{ label: "Browse Saved", to: "/account/saved" }, { label: "Browse Products", to: "/products" }] }));
              return;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      let query: any = (supabase.from("products") as any).select("id,name,slug,images,price,short_description").eq("is_active", true).eq("published", true).limit(3);
      if (categorySlug) {
        // try filter by category slug if a relation exists
        // only recommend the category if it contains active products
        try {
          const { data: catCount } = await (supabase.from("products") as any).select("id").ilike("category_slugs", `%${categorySlug}%`).eq("is_active", true).eq("published", true).limit(1);
          if (!catCount || catCount.length === 0) {
            // empty category — do not recommend
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: (m.content ? m.content + "\n\n" : "") + `We don't have active products in that category right now.` } : m)));
            setAssistantActionMap((s) => ({ ...s, [messageId]: [{ label: "Browse Products", to: "/products" }, { label: "Create Your Own", to: "/create-your-own" }] }));
            return;
          }
        } catch (e) {
          // ignore and continue
        }
        query = query.ilike("category_slugs", `%${categorySlug}%`).limit(3);
      }
      const { data } = await query;
      const products = (data ?? []).slice(0, 3);
      if (products.length > 0) {
        const items: ParsedChatProduct[] = products.slice(0, readyToBuy ? 2 : 3).map((p: any) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          benefit: p.short_description ?? undefined,
          price: formatPrice(Number(p.price ?? 0)),
          priceValue: Number(p.price ?? 0),
          imageUrl: (p.images && p.images[0]) || undefined,
          productUrl: `/products/${p.slug}`,
        }));
        setAssistantProductMap((s) => ({ ...s, [messageId]: items }));
        // contextual quick actions (product-first)
        const actions: { label: string; to?: string; action?: () => void }[] = [];

        if (readyToBuy) {
          const topPick = items[0];
          if (topPick) {
            actions.push({
              label: "Add top pick to cart",
              action: () => {
                const price = Number(topPick.priceValue ?? 0);
                addItem(
                  {
                    id: topPick.id ?? topPick.slug ?? topPick.name,
                    name: topPick.name,
                    price,
                    image: topPick.imageUrl,
                    slug: topPick.slug,
                  },
                  { source: "chat_widget" },
                );
                trackChatEvent("add_to_cart_from_chat", { product: topPick.id ?? topPick.slug ?? topPick.name }, window.location.pathname, userId);
              },
            });
          }
          actions.push({ label: "Go to checkout", to: "/cart" });
          actions.push({ label: "Keep browsing", to: categorySlug ? `/products?category=${categorySlug}` : "/products" });
        } else {
          if (categorySlug) actions.push({ label: `View all ${titleCase(categorySlug)}`, to: `/products?category=${categorySlug}` });
          actions.push({ label: "Browse Products", to: "/products" });
          actions.push({ label: "Show cheaper options", action: () => send("Show cheaper options for these items") });
          actions.push({ label: "Show similar items", action: () => send("Show similar items") });
          actions.push({ label: "Add cheapest to cart", action: () => {
            try {
              const cheapest = items.reduce((acc, it) => (acc == null || (it.priceValue ?? 0) < (acc.priceValue ?? 0) ? it : acc), undefined as ParsedChatProduct | undefined);
              if (cheapest) {
                const price = Number(cheapest.priceValue ?? 0);
                addItem(
                  {
                    id: cheapest.id ?? cheapest.slug ?? cheapest.name,
                    name: cheapest.name,
                    price,
                    image: cheapest.imageUrl,
                    slug: cheapest.slug,
                  },
                  { source: "chat_widget" },
                );
                trackChatEvent("add_to_cart_from_chat", { product: cheapest.id ?? cheapest.slug ?? cheapest.name }, window.location.pathname, userId);
              }
            } catch {
              // keep UI stable
            }
          }});
          actions.push({ label: "Go to cart", to: "/cart" });
        }

        setAssistantActionMap((s) => ({ ...s, [messageId]: actions.slice(0, 3) }));
        return;
      }
    } catch (err) {
      // ignore supabase query failures — keep UI stable
      console.error("Product fetch failed:", err);
    }

    // 4) Fallback: honest message and action buttons
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: (m.content ? m.content + "\n\n" : "") + "I couldn't find matching products right now. You can browse all products or create your own." } : m)));
    setAssistantActionMap((s) => ({ ...s, [messageId]: [{ label: "Browse Products", to: "/products" }, { label: "Create Your Own", to: "/create-your-own" }] }));
  }

  function titleCase(slug: string) {
    return slug.replace(/[-_]/g, " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  function mapRouteToAction(route: string) {
    try {
      if (route.startsWith("/create")) return { label: "Create Your Own", to: "/create-your-own" };
      const cat = /category=([^&]+)/.exec(route);
      if (cat) return { label: `View all ${titleCase(decodeURIComponent(cat[1]))}`, to: `/products?category=${cat[1]}` };
      if (route.startsWith("/products")) return { label: "Browse Products", to: "/products" };
    } catch {
      return null;
    }
    return null;
  }

  const clearChat = () => {
    const loggedInGreeting = getLocalizedStr(chatSettings.greetings.loggedInGreeting);
    const defaultGreeting = getLocalizedStr(chatSettings.greetings.defaultGreeting);
    const content = userId
      ? loggedInGreeting || "Welcome back! I can help with your orders, points, cart progress, products, and custom prints."
      : defaultGreeting || "Hi! I'm LayerLoot's assistant. I can help you find products, explain shipping, and guide custom print requests.";
    const reset: Msg[] = [{ id: uid(), role: "assistant", content }];
    setMessages(reset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
  };

  // Respect admin enable/disable toggle — only after settings have loaded
  if (!chatSettingsLoading && !chatSettings.enabled) return null;

  const launcherSize = chatSettings.launcher.size ?? 56;
  const launcherIconSize = Math.round(launcherSize * 0.48);
  const launcherShadow = chatSettings.launcher.shadow
    ? chatSettings.launcher.glowColor
      ? `0 8px 30px ${chatSettings.launcher.glowColor}40`
      : "0 12px 40px hsl(var(--primary) / 0.35)"
    : "0 4px 20px hsl(0 0% 0% / 0.2)";

  const aiBubbleStyle: React.CSSProperties = {
    borderRadius: chatSettings.bubbles.ai.borderRadius ?? 16,
    backgroundColor: chatSettings.bubbles.ai.bgColor || undefined,
    color: chatSettings.bubbles.ai.textColor || undefined,
    ...(chatSettings.bubbles.ai.borderColor ? { borderColor: chatSettings.bubbles.ai.borderColor, borderWidth: 1 } : {}),
    ...(chatSettings.bubbles.ai.shadow ? { boxShadow: "0 2px 8px hsl(0 0% 0% / 0.1)" } : {}),
  };
  const userBubbleStyle: React.CSSProperties = {
    borderRadius: chatSettings.bubbles.user.borderRadius ?? 16,
    backgroundColor: chatSettings.bubbles.user.bgColor || undefined,
    color: chatSettings.bubbles.user.textColor || undefined,
    ...(chatSettings.bubbles.user.borderColor ? { borderColor: chatSettings.bubbles.user.borderColor, borderWidth: 1 } : {}),
    ...(chatSettings.bubbles.user.shadow ? { boxShadow: "0 2px 8px hsl(0 0% 0% / 0.1)" } : {}),
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
            className={`fixed bottom-24 ${posClass} z-50 max-w-[260px] rounded-2xl border border-border/30 bg-card/70 px-4 py-3 text-left shadow-[0_16px_48px_hsl(217_91%_60%/0.12)] backdrop-blur-xl`}
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
                {getLocalizedStr(chatSettings.greetings.promptBubbleTitle) || "Need help choosing?"}
              </div>
              <div className="text-xs text-muted-foreground">
                {getLocalizedStr(chatSettings.greetings.promptBubbleBody) || "Ask about your points, latest order, free shipping, custom prints, or gift ideas."}
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
            <button
              type="button"
              onClick={openChat}
              aria-label="Open chat"
              className="relative bg-primary text-primary-foreground transition-all"
              style={{
                width: launcherSize,
                height: launcherSize,
                borderRadius: "50%",
                backgroundColor: chatSettings.launcher.bgColor || undefined,
                color: chatSettings.launcher.iconColor || undefined,
                boxShadow: launcherShadow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
              }}
            >
              <ChatLauncherIcon
                icon={chatSettings.launcher.icon ?? "message"}
                customUrl={chatSettings.launcher.customIconUrl}
                iconSize={launcherIconSize}
              />
              {chatSettings.launcher.showUnreadBadge !== false && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background text-[9px] font-bold text-primary shadow">
                  ✦
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            className={`fixed bottom-4 ${posClass} z-50 flex h-[46vh] min-h-[380px] w-[calc(100vw-2rem)] max-w-[430px] flex-col overflow-hidden border border-border/30 ${chatSettings.window.glassEffect !== false ? "bg-card/70 backdrop-blur-2xl" : "bg-card"} sm:h-[52vh]`}
            style={{
              borderRadius: chatSettings.window.borderRadius ?? 24,
              ...(chatSettings.window.bgColor ? { backgroundColor: chatSettings.window.bgColor } : {}),
              boxShadow: chatSettings.window.shadow ?? "0 24px 80px hsl(217 91% 60% / 0.15)",
              ...(chatSettings.window.borderColor ? { borderColor: chatSettings.window.borderColor } : {}),
            }}
          >
            <div
              className="flex items-center justify-between border-b border-border/20 px-4 py-2.5"
              style={{
                background: headerBg || undefined,
                backgroundImage: !headerBg ? "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.8))" : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                {chatSettings.window.avatarUrl ? (
                  <img src={chatSettings.window.avatarUrl} alt="" className="h-7 w-7 rounded-full bg-background/15 object-contain p-0.5" />
                ) : (
                  <Bot className="h-5 w-5 text-primary-foreground" />
                )}
                <div
                  className="font-display text-sm font-bold uppercase tracking-wider text-primary-foreground"
                  style={chatSettings.window.headerTextColor ? { color: chatSettings.window.headerTextColor } : undefined}
                >
                  {getLocalizedStr(chatSettings.window.brandName) || "LayerLoot Assistant"}
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
                  onClick={() => { setOpen(false); trackChatEvent("close", {}, location.pathname, userId); saveConversation(messages, location.pathname, userId); }}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {starterSuggestions.length > 0 && (
              <div className="border-b border-border/20 bg-muted/30 backdrop-blur-sm px-3 py-2.5">
                <HorizontalSuggestions items={starterSuggestions} onPick={send} />
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {((msg.role === "user" && chatSettings.bubbles.user.showAvatar !== false) ||
                    (msg.role === "assistant" && chatSettings.bubbles.ai.showAvatar !== false)) && (
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="h-3.5 w-3.5" />
                      ) : chatSettings.window.avatarUrl ? (
                        <img src={chatSettings.window.avatarUrl} alt="" className="h-full w-full rounded-full object-contain p-0.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                    style={msg.role === "user" ? userBubbleStyle : aiBubbleStyle}
                  >
                    {msg.role === "assistant" && !msg.content && loading ? (
                      <ChatTypingIndicator style={chatSettings.bubbles.typingIndicator} />
                    ) : msg.role === "assistant" ? (
                      <>
                        <MarkdownMessage content={msg.content} />
                        {assistantProductMap[msg.id] && (
                          <div className="mt-2 space-y-2">
                            {assistantProductMap[msg.id].map((p, i) => (
                              <ChatProductCard key={i} product={p as any} />
                            ))}
                          </div>
                        )}
                        {assistantActionMap[msg.id] && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {assistantActionMap[msg.id].map((a, i) => (
                              a.to ? (
                                <Button key={i} size="sm" variant="outline" asChild>
                                  <Link to={a.to!}>{a.label}</Link>
                                </Button>
                              ) : (
                                <Button key={i} size="sm" variant="outline" onClick={a.action}>{a.label}</Button>
                              )
                            ))}
                          </div>
                        )}
                      </>
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
                placeholder={getLocalizedStr(chatSettings.window.inputPlaceholder) || "Ask me anything..."}
                className="flex-1 rounded-full border-border bg-muted text-sm"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full transition-transform hover:scale-105"
                style={chatSettings.window.sendButtonColor ? { backgroundColor: chatSettings.window.sendButtonColor } : undefined}
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
