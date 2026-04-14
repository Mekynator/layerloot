import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ─── Multilingual text helper ─── */
export type LocalizedText = string | Record<string, string>;

/* ─── Quick Reply ─── */
export interface ChatQuickReply {
  id: string;
  label: LocalizedText;
  message: LocalizedText;
  icon?: string;
  pages?: string[]; // only show on these pages ("*" = all)
  campaignId?: string; // only show during this campaign
  sort_order: number;
}

/* ─── Page Rule ─── */
export interface ChatPageRule {
  page: string; // path pattern e.g. "/products/*"
  enabled: boolean;
  welcomeText?: LocalizedText;
  tone?: string;
  quickReplyIds?: string[];
  focusArea?: string; // e.g. "product_help", "checkout_assist"
}

/* ─── Launcher Config ─── */
export interface ChatLauncherConfig {
  position: "bottom-right" | "bottom-left";
  side: "right" | "left";
  bottomOffset: number;
  size: number;
  icon: "message" | "bot" | "sparkle" | "custom";
  customIconUrl?: string;
  labelText?: LocalizedText;
  showLabel: boolean;
  bgColor?: string;
  iconColor?: string;
  borderColor?: string;
  glowColor?: string;
  shadow: boolean;
  pulseAnimation: boolean;
  showUnreadBadge: boolean;
  tooltipText?: LocalizedText;
  tooltipDelay: number;
  hoverAnimation: "lift" | "scale" | "glow" | "none";
}

/* ─── Window Config ─── */
export interface ChatWindowConfig {
  width: number;
  height: string; // e.g. "52vh"
  borderRadius: number;
  borderColor?: string;
  bgColor?: string;
  opacity: number;
  glassEffect: boolean;
  shadow: string;
  headerBgColor?: string;
  headerTextColor?: string;
  closeButtonStyle: "icon" | "text";
  inputPlaceholder?: LocalizedText;
  sendButtonColor?: string;
  avatarUrl?: string;
  brandName?: LocalizedText;
  showWelcomePanel: boolean;
  emptyStateText?: LocalizedText;
}

/* ─── Bubble Config ─── */
export interface ChatBubbleConfig {
  ai: {
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
    borderRadius: number;
    shadow: boolean;
    showAvatar: boolean;
    showTimestamp: boolean;
  };
  user: {
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
    borderRadius: number;
    shadow: boolean;
    showAvatar: boolean;
    showTimestamp: boolean;
  };
  typingIndicator: "dots" | "pulse" | "wave";
  messageAnimation: "fade" | "slide" | "none";
}

/* ─── Tone & Personality ─── */
export interface ChatToneConfig {
  personality: "friendly" | "professional" | "playful" | "premium" | "warm" | "concise";
  responseLength: "short" | "medium" | "long";
  conversationStyle: "direct" | "conversational";
  assistantMode: "support" | "sales" | "advisor" | "guide";
  useEmoji: boolean;
  persuasiveStyle: "subtle" | "moderate" | "strong";
  upsellIntensity: "none" | "light" | "moderate" | "aggressive";
  formalityLevel: "casual" | "balanced" | "formal";
  ctaStyle: "soft" | "direct" | "urgent";
}

/* ─── Prompt / Training ─── */
export interface ChatPromptConfig {
  brandDescription: string;
  assistantRole: string;
  toneInstructions: string;
  productGuidance: string;
  supportInstructions: string;
  thingsToAvoid: string;
  campaignInstructions: string;
  escalationRules: string;
  fallbackResponse: LocalizedText;
  customSystemPromptSuffix: string;
}

/* ─── Greeting Config ─── */
export interface ChatGreetingConfig {
  defaultGreeting: LocalizedText;
  loggedInGreeting: LocalizedText;
  returningVisitorGreeting: LocalizedText;
  firstTimeVisitorGreeting: LocalizedText;
  businessHoursGreeting?: LocalizedText;
  offHoursGreeting?: LocalizedText;
  campaignGreeting?: LocalizedText;
  promptBubbleTitle?: LocalizedText;
  promptBubbleBody?: LocalizedText;
  promptBubbleDelay: number;
  promptBubbleReappear: number;
}

/* ─── Behavior Config ─── */
export interface ChatBehaviorConfig {
  autoRecommendProducts: boolean;
  includeLinks: boolean;
  includeButtons: boolean;
  askFollowUpQuestions: boolean;
  prioritize: "support" | "selling" | "balanced";
  showTrustMessages: boolean;
  showDeliveryPrompts: boolean;
  showLoyaltyPrompts: boolean;
  showCheckoutEncouragement: boolean;
  abandonedCartReminder: boolean;
  customOrderHelpPrompt: boolean;
  orderTrackingPrompt: boolean;
}

/* ─── Campaign Sync ─── */
export interface ChatCampaignOverrides {
  launcherBgColor?: string;
  launcherGlow?: string;
  launcherIcon?: string;
  windowHeaderColor?: string;
  welcomeMessage?: LocalizedText;
  quickReplyIds?: string[];
  toneOverride?: string;
}

/* ─── Responsive Config ─── */
export interface ChatResponsiveConfig {
  desktop: { position: string; size: number; windowHeight: string };
  mobile: { position: string; size: number; windowHeight: string; minimizedStyle: "fab" | "bar" };
  avoidOverlap?: string[]; // CSS selectors to avoid overlapping
}

/* ─── Analytics-ready flags ─── */
export interface ChatAnalyticsConfig {
  trackOpens: boolean;
  trackQuickReplyClicks: boolean;
  trackProductClicks: boolean;
  trackConversions: boolean;
}

/* ─── Preset Template ─── */
export interface ChatPreset {
  id: string;
  name: string;
  description?: string;
  tone: Partial<ChatToneConfig>;
  behavior: Partial<ChatBehaviorConfig>;
  prompts?: Partial<ChatPromptConfig>;
  icon?: string;
}

/* ─── Self-Optimization Config ─── */
export interface ChatOptimizationConfig {
  enabled: boolean;
  autoAdjustTone: boolean;
  autoAdjustLength: boolean;
  autoAdjustCta: boolean;
  autoAdjustRecommendations: boolean;
  requireApproval: boolean; // admin must approve changes
  optimizationInterval: "daily" | "weekly" | "monthly";
  metrics: {
    trackEngagement: boolean;
    trackConversions: boolean;
    trackBounce: boolean;
    trackFollowUps: boolean;
  };
}

/* ─── Full Chat Config ─── */
export interface ChatConfig {
  enabled: boolean;
  launcher: ChatLauncherConfig;
  window: ChatWindowConfig;
  bubbles: ChatBubbleConfig;
  tone: ChatToneConfig;
  prompts: ChatPromptConfig;
  greetings: ChatGreetingConfig;
  behavior: ChatBehaviorConfig;
  quickReplies: ChatQuickReply[];
  pageRules: ChatPageRule[];
  campaignOverrides: Record<string, ChatCampaignOverrides>;
  responsive: Omit<ChatResponsiveConfig, 'avoidOverlap'> & { avoidOverlap?: string[] };
  analytics: ChatAnalyticsConfig;
  disabledPages: string[];
  enabledLanguages: string[];
  activePreset?: string; // preset id or null for custom
  presets: ChatPreset[];
  optimization: ChatOptimizationConfig;
}

/* ─── Built-in Presets ─── */
export const BUILT_IN_PRESETS: ChatPreset[] = [
  { id: "support", name: "Support Mode", description: "Focused on helping users solve problems", icon: "🛟",
    tone: { personality: "warm", assistantMode: "support", responseLength: "medium", ctaStyle: "soft", upsellIntensity: "none", persuasiveStyle: "subtle" },
    behavior: { prioritize: "support", autoRecommendProducts: false, showCheckoutEncouragement: false, askFollowUpQuestions: true } },
  { id: "sales", name: "Sales Mode", description: "Maximize conversions and upsells", icon: "💰",
    tone: { personality: "friendly", assistantMode: "sales", responseLength: "medium", ctaStyle: "direct", upsellIntensity: "moderate", persuasiveStyle: "moderate" },
    behavior: { prioritize: "selling", autoRecommendProducts: true, showCheckoutEncouragement: true, showLoyaltyPrompts: true } },
  { id: "advisor", name: "Product Advisor", description: "Expert guidance on products and materials", icon: "🧑‍🔬",
    tone: { personality: "professional", assistantMode: "advisor", responseLength: "long", ctaStyle: "soft", upsellIntensity: "light" },
    behavior: { prioritize: "balanced", autoRecommendProducts: true, askFollowUpQuestions: true } },
  { id: "custom_orders", name: "Custom Orders Assistant", description: "Guide users through custom print process", icon: "🎨",
    tone: { personality: "warm", assistantMode: "guide", responseLength: "long", ctaStyle: "soft", upsellIntensity: "none" },
    behavior: { prioritize: "support", customOrderHelpPrompt: true, autoRecommendProducts: false },
    prompts: { productGuidance: "Focus on explaining the custom order process, materials, file requirements, and pricing." } },
  { id: "rewards", name: "Rewards Assistant", description: "Help with loyalty points and vouchers", icon: "🏆",
    tone: { personality: "playful", assistantMode: "guide", responseLength: "short", ctaStyle: "direct", upsellIntensity: "light" },
    behavior: { prioritize: "balanced", showLoyaltyPrompts: true, autoRecommendProducts: false } },
  { id: "campaign", name: "Campaign Mode", description: "Promote active campaigns and offers", icon: "📢",
    tone: { personality: "friendly", assistantMode: "sales", responseLength: "short", ctaStyle: "urgent", upsellIntensity: "moderate", persuasiveStyle: "strong" },
    behavior: { prioritize: "selling", autoRecommendProducts: true, showCheckoutEncouragement: true } },
  { id: "premium", name: "Premium Brand Voice", description: "Refined luxury brand experience", icon: "✨",
    tone: { personality: "premium", assistantMode: "advisor", responseLength: "medium", formalityLevel: "formal", ctaStyle: "soft", upsellIntensity: "light", useEmoji: false },
    behavior: { prioritize: "balanced", showTrustMessages: true } },
  { id: "minimal", name: "Minimal Mode", description: "Short, direct answers only", icon: "⚡",
    tone: { personality: "concise", assistantMode: "support", responseLength: "short", ctaStyle: "soft", upsellIntensity: "none", useEmoji: false, conversationStyle: "direct" },
    behavior: { prioritize: "support", autoRecommendProducts: false, askFollowUpQuestions: false } },
];

/* ─── Defaults ─── */
export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  enabled: true,
  launcher: {
    position: "bottom-right",
    side: "right",
    bottomOffset: 24,
    size: 56,
    icon: "message",
    showLabel: false,
    shadow: true,
    pulseAnimation: false,
    showUnreadBadge: true,
    tooltipDelay: 8000,
    hoverAnimation: "lift",
  },
  window: {
    width: 430,
    height: "52vh",
    borderRadius: 24,
    opacity: 100,
    glassEffect: true,
    shadow: "0 24px 80px hsl(217 91% 60% / 0.15)",
    closeButtonStyle: "icon",
    showWelcomePanel: true,
    brandName: "LayerLoot Assistant",
  },
  bubbles: {
    ai: { borderRadius: 16, shadow: false, showAvatar: true, showTimestamp: false },
    user: { borderRadius: 16, shadow: false, showAvatar: true, showTimestamp: false },
    typingIndicator: "dots",
    messageAnimation: "fade",
  },
  tone: {
    personality: "friendly",
    responseLength: "short",
    conversationStyle: "conversational",
    assistantMode: "advisor",
    useEmoji: true,
    persuasiveStyle: "subtle",
    upsellIntensity: "light",
    formalityLevel: "casual",
    ctaStyle: "soft",
  },
  prompts: {
    brandDescription: "LayerLoot is a premium 3D printing e-commerce store specializing in custom and catalog prints.",
    assistantRole: "You are LayerLoot's AI assistant — a friendly, knowledgeable helper for products, custom prints, shipping, loyalty points, and orders.",
    toneInstructions: "Be helpful, warm, and concise. Guide users naturally without being pushy.",
    productGuidance: "Recommend products from the catalog when relevant. Explain materials (PLA, PETG, Resin, TPU) when asked.",
    supportInstructions: "Help users with orders, tracking, returns, and account questions. Provide links to relevant pages.",
    thingsToAvoid: "Don't make up information. Don't share internal data. Don't promise specific delivery dates.",
    campaignInstructions: "",
    escalationRules: "If the user needs human help, suggest contacting support via the Contact page.",
    fallbackResponse: { en: "I'm not sure about that. Would you like me to connect you with our support team?", da: "Jeg er ikke sikker på det. Skal jeg forbinde dig med vores supportteam?" },
    customSystemPromptSuffix: "",
  },
  greetings: {
    defaultGreeting: { en: "Hi! I'm LayerLoot's assistant. I can help with products, custom prints, shipping, points, and your orders. Ask me anything! 😊", da: "Hej! Jeg er LayerLoots assistent. Jeg kan hjælpe med produkter, specialprint, forsendelse, point og dine ordrer. Spørg mig om hvad som helst! 😊" },
    loggedInGreeting: { en: "Welcome back! I can help with your orders, points, cart progress, products, and custom prints.", da: "Velkommen tilbage! Jeg kan hjælpe med dine ordrer, point, indkøbskurv, produkter og specialprint." },
    returningVisitorGreeting: { en: "Good to see you again! How can I help today?", da: "Godt at se dig igen! Hvordan kan jeg hjælpe i dag?" },
    firstTimeVisitorGreeting: { en: "Welcome to LayerLoot! I'm your shopping assistant. Feel free to ask about our products or custom prints.", da: "Velkommen til LayerLoot! Jeg er din shoppingassistent. Spørg gerne om vores produkter eller specialprint." },
    promptBubbleTitle: { en: "Need help choosing?", da: "Brug for hjælp til at vælge?" },
    promptBubbleBody: { en: "Ask about your points, latest order, free shipping, custom prints, or gift ideas.", da: "Spørg om dine point, seneste ordre, gratis fragt, specialprint eller gaveideer." },
    promptBubbleDelay: 8000,
    promptBubbleReappear: 120000,
  },
  behavior: {
    autoRecommendProducts: true,
    includeLinks: true,
    includeButtons: false,
    askFollowUpQuestions: true,
    prioritize: "balanced",
    showTrustMessages: true,
    showDeliveryPrompts: true,
    showLoyaltyPrompts: true,
    showCheckoutEncouragement: true,
    abandonedCartReminder: false,
    customOrderHelpPrompt: true,
    orderTrackingPrompt: true,
  },
  quickReplies: [
    { id: "1", label: "Show best sellers", message: "Show best sellers", sort_order: 0 },
    { id: "2", label: "How does custom printing work?", message: "How does custom printing work?", sort_order: 1 },
    { id: "3", label: "Shipping information", message: "Shipping information", sort_order: 2 },
    { id: "4", label: "Gift ideas", message: "Gift ideas", sort_order: 3 },
  ],
  pageRules: [
    { page: "/products/*", enabled: true, focusArea: "product_help" },
    { page: "/cart", enabled: true, focusArea: "checkout_assist" },
    { page: "/account", enabled: true, focusArea: "account_support" },
    { page: "/create-your-own*", enabled: true, focusArea: "custom_order_help" },
  ],
  campaignOverrides: {},
  responsive: {
    desktop: { position: "bottom-right", size: 56, windowHeight: "52vh" },
    mobile: { position: "bottom-right", size: 48, windowHeight: "70vh", minimizedStyle: "fab" },
  },
  analytics: {
    trackOpens: true,
    trackQuickReplyClicks: true,
    trackProductClicks: true,
    trackConversions: false,
  },
  disabledPages: [],
  enabledLanguages: ["en", "da", "de", "es", "ro"],
  activePreset: undefined,
  presets: [],
  optimization: {
    enabled: false,
    autoAdjustTone: false,
    autoAdjustLength: false,
    autoAdjustCta: false,
    autoAdjustRecommendations: false,
    requireApproval: true,
    optimizationInterval: "weekly",
    metrics: {
      trackEngagement: true,
      trackConversions: true,
      trackBounce: true,
      trackFollowUps: true,
    },
  },
};

// ─── Legacy-compatible settings alias ───
export type ChatSettings = ChatConfig;

export function useChatSettings() {
  const [settings, setSettings] = useState<ChatConfig>(DEFAULT_CHAT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "chat_widget")
          .maybeSingle();
        if (data?.value && typeof data.value === "object") {
          setSettings(prev => deepMerge(prev, data.value as any));
        }
      } catch { /* keep defaults */ }
      setLoading(false);
    };
    load();
  }, []);

  return { settings, loading };
}

/* ─── Deep merge helper ─── */
function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && typeof (target as any)[key] === "object" && !Array.isArray((target as any)[key])) {
      (result as any)[key] = deepMerge((target as any)[key], source[key]);
    } else if (source[key] !== undefined) {
      (result as any)[key] = source[key];
    }
  }
  return result;
}
