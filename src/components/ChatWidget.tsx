import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Gift,
  Link as LinkIcon,
  MapPin,
  MessageCircle,
  Send,
  ShoppingBag,
  TicketPercent,
  Trash2,
  User,
  X,
  Wand2,
  PackageSearch,
  Clock3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type ChatLink = {
  label: string;
  url: string;
  description?: string;
};

type ChatProduct = {
  id: string;
  name: string;
  price: number;
  image?: string;
  image_url?: string;
  url: string;
  slug?: string;
};

type ChatOrder = {
  orderNumber: string;
  status: string;
  total: number;
  createdAt?: string;
  url?: string;
};

type ChatCoupon = {
  code: string;
  description?: string;
  discountText?: string;
  expiresAt?: string;
};

type PointActivity = {
  id: string;
  points: number;
  reason?: string | null;
  created_at?: string;
};

type ChatContext = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    last_sign_in_at?: string | null;
  };
  cart?: {
    total?: number;
    item_count?: number;
    free_shipping_gap?: number;
    qualifies_for_free_shipping?: boolean;
  };
  points?: {
    balance?: number;
    earned_total?: number;
    spent_total?: number;
    updated_at?: string | null;
    recent_activity?: PointActivity[];
  };
  last_order?: {
    id?: string;
    status?: string;
    total?: number;
    created_at?: string;
  } | null;
  recent_orders?: Array<{
    id?: string;
    status?: string;
    total?: number;
    created_at?: string;
  }>;
  last_viewed_product?: {
    id?: string;
    name?: string;
    slug?: string;
    price?: number;
    image_url?: string;
    viewed_at?: string;
  } | null;
  recommended_products?: ChatProduct[];
  current_page?: string | null;
};

type ChatPayload = {
  text?: string;
  suggestions?: string[];
  links?: ChatLink[];
  products?: ChatProduct[];
  orders?: ChatOrder[];
  coupons?: ChatCoupon[];
  points?: number | null;
  pointSummary?: {
    earnedTotal?: number;
    spentTotal?: number;
  };
  activity?: PointActivity[];
  cart?: {
    total?: number;
    item_count?: number;
    free_shipping_gap?: number;
    qualifies_for_free_shipping?: boolean;
  };
  context?: ChatContext;
  status?: string;
};

type Msg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  payload?: ChatPayload;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const STORAGE_KEY = "layerloot-chat-history";
const LAST_VIEWED_KEY = "layerloot-last-viewed-product";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(value?: number) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getPageSuggestions(pathname: string, loggedIn: boolean): string[] {
  if (pathname.startsWith("/products/") || pathname.startsWith("/product/")) {
    return ["Show similar items", "How long is delivery?", "Is this available painted?"];
  }
  if (pathname.startsWith("/products") || pathname.startsWith("/shop")) {
    return ["Show best sellers", "Find gifts under 200 DKK", "Custom print help"];
  }
  if (pathname.startsWith("/cart")) {
    return ["How far am I from free shipping?", "Can I use a coupon?", "Recommend one more item"];
  }
  if (pathname.startsWith("/account")) {
    return ["Show my latest order", "How many points do I have?", "Recommended products for me"];
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

function getLastViewedProductSnapshot() {
  return safeJsonParse<Record<string, unknown> | null>(localStorage.getItem(LAST_VIEWED_KEY), null);
}

function DraggableSuggestions({ items, onPick }: { items: string[]; onPick: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    startScrollLeft.current = ref.current.scrollLeft;
    ref.current.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !ref.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 4) moved.current = true;
    ref.current.scrollLeft = startScrollLeft.current - dx;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    ref.current?.releasePointerCapture?.(e.pointerId);
  };

  const onPointerLeave = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
      className="no-scrollbar overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing select-none"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div className="flex w-max gap-2 pr-4">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              if (moved.current) return;
              onPick(item);
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

function AssistantExtras({
  payload,
  onSuggestionClick,
}: {
  payload?: ChatPayload;
  onSuggestionClick: (text: string) => void;
}) {
  if (!payload) return null;

  const context = payload.context;

  return (
    <div className="mt-3 space-y-3">
      {context?.user?.name ? (
        <div className="rounded-xl border bg-background/70 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <User className="h-4 w-4" />
            Welcome back
          </div>
          <div className="mt-1 text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{context.user.name}</span>
            {context.user.last_sign_in_at ? (
              <>
                {" "}
                · last login <span className="text-foreground">{formatDate(context.user.last_sign_in_at)}</span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {typeof payload.points === "number" && (
        <div className="rounded-xl border bg-background/70 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Gift className="h-4 w-4" />
            Loyalty points
          </div>
          <div className="mt-1 text-muted-foreground">
            You currently have <span className="font-semibold text-foreground">{payload.points}</span> points.
          </div>
          {payload.pointSummary ? (
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border px-2 py-1">
                Earned: <span className="font-medium text-foreground">{payload.pointSummary.earnedTotal ?? 0}</span>
              </div>
              <div className="rounded-lg border px-2 py-1">
                Spent: <span className="font-medium text-foreground">{payload.pointSummary.spentTotal ?? 0}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {payload.cart ? (
        <div className="rounded-xl border bg-background/70 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <ShoppingBag className="h-4 w-4" />
            Cart status
          </div>
          <div className="mt-1 text-muted-foreground">
            {payload.cart.item_count ?? 0} item(s) · {formatPrice(payload.cart.total ?? 0)}
          </div>
          <div className="mt-1 text-muted-foreground">
            {payload.cart.qualifies_for_free_shipping
              ? "You already qualify for free shipping."
              : `You are ${formatPrice(payload.cart.free_shipping_gap ?? 0)} away from free shipping.`}
          </div>
        </div>
      ) : null}

      {context?.last_viewed_product?.name ? (
        <Link
          to={context.last_viewed_product.slug ? `/product/${context.last_viewed_product.slug}` : "/shop"}
          className="block rounded-xl border bg-background/70 p-3 transition hover:bg-background"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock3 className="h-4 w-4" />
            Continue browsing
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Last viewed: {context.last_viewed_product.name}</div>
        </Link>
      ) : null}

      {payload.links?.length ? (
        <div className="space-y-2">
          {payload.links.map((link, i) => (
            <Link
              key={`${link.url}-${i}`}
              to={link.url}
              className="block rounded-xl border bg-background/70 p-3 transition hover:bg-background"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <LinkIcon className="h-4 w-4" />
                {link.label}
              </div>
              {link.description ? <div className="mt-1 text-xs text-muted-foreground">{link.description}</div> : null}
            </Link>
          ))}
        </div>
      ) : null}

      {payload.products?.length ? (
        <div className="space-y-2">
          {payload.products.map((product) => {
            const image = product.image ?? product.image_url;
            return (
              <Link
                key={product.id}
                to={product.url}
                className="flex items-center gap-3 rounded-xl border bg-background/70 p-3 transition hover:bg-background"
              >
                {image ? (
                  <img src={image} alt={product.name} className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
                    <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{formatPrice(product.price)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {payload.orders?.length ? (
        <div className="space-y-2">
          {payload.orders.map((order, i) => (
            <div key={`${order.orderNumber}-${i}`} className="rounded-xl border bg-background/70 p-3 text-xs">
              <div className="font-medium">Order #{order.orderNumber}</div>
              <div className="mt-1 text-muted-foreground">
                Status: <span className="font-medium text-foreground">{order.status}</span>
              </div>
              <div className="text-muted-foreground">Total: {formatPrice(order.total)}</div>
              {order.createdAt ? (
                <div className="text-muted-foreground">Placed: {formatDate(order.createdAt)}</div>
              ) : null}
              {order.url ? (
                <Link to={order.url} className="mt-2 inline-flex text-primary hover:underline">
                  Open order
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {payload.activity?.length ? (
        <div className="rounded-xl border bg-background/70 p-3 text-xs">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Gift className="h-4 w-4" />
            Recent points activity
          </div>
          <div className="space-y-2">
            {payload.activity.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border px-2 py-1.5">
                <div className="min-w-0">
                  <div className="truncate text-foreground">{item.reason || "Points update"}</div>
                  <div className="text-muted-foreground">{formatDate(item.created_at)}</div>
                </div>
                <div className={`shrink-0 font-medium ${item.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {item.points >= 0 ? `+${item.points}` : item.points}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {payload.coupons?.length ? (
        <div className="space-y-2">
          {payload.coupons.map((coupon, i) => (
            <div key={`${coupon.code}-${i}`} className="rounded-xl border bg-background/70 p-3 text-xs">
              <div className="flex items-center gap-2 font-medium">
                <TicketPercent className="h-4 w-4" />
                {coupon.code}
              </div>
              {coupon.discountText ? <div className="mt-1 text-muted-foreground">{coupon.discountText}</div> : null}
              {coupon.description ? <div className="text-muted-foreground">{coupon.description}</div> : null}
              {coupon.expiresAt ? (
                <div className="text-muted-foreground">Expires: {formatDate(coupon.expiresAt)}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {payload.suggestions?.length ? (
        <DraggableSuggestions items={payload.suggestions} onPick={onSuggestionClick} />
      ) : null}
    </div>
  );
}

const ChatWidget = () => {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [showPromptBubble, setShowPromptBubble] = useState(false);

  const [messages, setMessages] = useState<Msg[]>(() => {
    const saved = safeJsonParse<Msg[] | null>(localStorage.getItem(STORAGE_KEY), null);
    if (saved?.length) return saved;

    return [
      {
        id: uid(),
        role: "assistant",
        content:
          "Hi! I’m LayerLoot’s assistant. I can help with products, custom prints, shipping, points, and your orders.",
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
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (open) {
      setShowPromptBubble(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowPromptBubble(true);
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [open, location.pathname]);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
    );
  };

  const send = async (forcedText?: string) => {
    const text = (forcedText ?? input).trim();
    if (!text || loading) return;

    setShowPromptBubble(false);

    const userMsg: Msg = {
      id: uid(),
      role: "user",
      content: text,
    };

    const assistantMsgId = uid();
    const nextMessages = [...messages, userMsg];

    setMessages([
      ...nextMessages,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        payload: { status: "Thinking..." },
      },
    ]);
    setInput("");
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;
      const cart = getCartSnapshot();
      const lastViewedProduct = getLastViewedProductSnapshot();

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          page: location.pathname,
          cart,
          lastViewedProduct,
          geo,
          locale: {
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            currency: "DKK",
          },
          context: {
            page: {
              path: location.pathname,
              url: window.location.href,
              title: document.title,
            },
            cart,
            user: {
              loggedIn: !!userId,
              id: userId,
              email: userEmail,
            },
            geo,
            locale: {
              language: navigator.language,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              currency: "DKK",
            },
            lastViewedProduct,
          },
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(errText || "Failed to connect");
      }

      const contentType = resp.headers.get("content-type") || "";

      const updateAssistant = (partial: Partial<Msg>) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  ...partial,
                  payload: {
                    ...(m.payload ?? {}),
                    ...(partial.payload ?? {}),
                  },
                }
              : m,
          ),
        );
      };

      if (contentType.includes("application/json")) {
        const json = await resp.json();
        const payload = json.payload ?? {};
        updateAssistant({
          content: payload.text || "I can chat, but I couldn’t access your account details right now.",
          payload: {
            ...payload,
            status: undefined,
          },
        });
      } else {
        updateAssistant({
          content: "I can chat, but I couldn’t access your account details right now.",
          payload: { status: undefined },
        });
      }
    } catch (error) {
      console.error("Chat widget request failed:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: "Sorry, I’m having trouble connecting right now. Please try again, or use the contact page.",
                payload: {
                  ...(m.payload ?? {}),
                  status: undefined,
                },
              }
            : m,
        ),
      );
    } finally {
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
          : "Hi! I’m LayerLoot’s assistant. I can help you find products, explain shipping, and guide custom print requests.",
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
          <motion.button
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            onClick={() => {
              setOpen(true);
              setShowPromptBubble(false);
            }}
            className="fixed bottom-24 right-6 z-50 max-w-[260px] rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-xl"
          >
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
              <Wand2 className="h-4 w-4 text-primary" />
              Need help choosing?
            </div>
            <div className="text-xs text-muted-foreground">
              Ask about your points, latest order, free shipping, custom prints, or gift ideas.
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            whileHover={{ y: -4, scale: 1.04 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => {
                setOpen(true);
                setShowPromptBubble(false);
              }}
              size="lg"
              className="relative h-14 w-14 rounded-full shadow-2xl"
            >
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
            className="fixed bottom-4 right-4 z-50 flex h-[46vh] min-h-[380px] w-[calc(100vw-2rem)] max-w-[430px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl sm:h-[52vh]"
          >
            <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary-foreground" />
                <div className="font-display text-sm font-bold uppercase tracking-wider text-primary-foreground">
                  LayerLoot Assistant
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

            <div className="border-b border-border bg-muted/40 px-3 py-2.5">
              <DraggableSuggestions items={starterSuggestions} onPick={send} />

              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                  <Gift className="h-3 w-3" />
                  Points
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                  <TicketPercent className="h-3 w-3" />
                  Coupons
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                  <PackageSearch className="h-3 w-3" />
                  Orders
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                  <ShoppingBag className="h-3 w-3" />
                  Cart help
                </span>
              </div>
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
                    {msg.payload?.status && !msg.content ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                        {msg.payload.status}
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                    {msg.role === "assistant" && <AssistantExtras payload={msg.payload} onSuggestionClick={send} />}
                  </div>
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t border-border bg-card px-4 py-3"
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
