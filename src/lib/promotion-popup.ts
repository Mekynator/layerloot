import type {
  PopupCanvasElement,
  PopupDisplayBehavior,
  PopupElementType,
  PopupRecurrenceFrequency,
  PromotionPopupConfig,
  PromotionPopupPreset,
} from "@/types/promotion-popup";

const DAY_MS = 86_400_000;
export const POPUP_STORAGE_PREFIX = "layerloot-promo-popup";

const asObject = (value: unknown): Record<string, any> => (
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {}
);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const baseStyle = () => ({
  color: "#0f172a",
  backgroundColor: "transparent",
  borderColor: "rgba(15, 23, 42, 0.12)",
  borderWidth: 0,
  borderRadius: 14,
  fontSize: 16,
  fontWeight: 500,
  textAlign: "left" as const,
  lineHeight: 1.35,
  letterSpacing: 0,
  textShadow: "none",
  fontFamily: "inherit",
  opacity: 1,
  shadow: "none",
  paddingX: 0,
  paddingY: 0,
  rotation: 0,
});

const defaultStyleByType = (type: PopupElementType) => {
  switch (type) {
    case "badge":
      return {
        ...baseStyle(),
        color: "#111827",
        backgroundColor: "rgba(253, 224, 71, 0.92)",
        fontSize: 11,
        fontWeight: 700,
        textAlign: "center" as const,
        borderRadius: 999,
        paddingX: 12,
        paddingY: 6,
      };
    case "title":
      return {
        ...baseStyle(),
        fontSize: 32,
        fontWeight: 800,
        lineHeight: 1.05,
        color: "#0f172a",
      };
    case "subtitle":
      return {
        ...baseStyle(),
        fontSize: 18,
        fontWeight: 600,
        color: "#4f46e5",
      };
    case "description":
      return {
        ...baseStyle(),
        fontSize: 14,
        color: "#475569",
        lineHeight: 1.5,
      };
    case "button":
      return {
        ...baseStyle(),
        color: "#ffffff",
        backgroundColor: "#111827",
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 700,
        textAlign: "center" as const,
        shadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
        paddingX: 16,
        paddingY: 10,
      };
    case "countdown":
      return {
        ...baseStyle(),
        color: "#0f172a",
        backgroundColor: "rgba(15, 23, 42, 0.06)",
        fontSize: 12,
        fontWeight: 700,
        borderRadius: 12,
        paddingX: 10,
        paddingY: 6,
      };
    case "image":
      return {
        ...baseStyle(),
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        borderRadius: 18,
        borderWidth: 1,
      };
    case "icon":
      return {
        ...baseStyle(),
        fontSize: 28,
        textAlign: "center" as const,
      };
    case "shape":
      return {
        ...baseStyle(),
        backgroundColor: "rgba(99, 102, 241, 0.16)",
        borderRadius: 999,
        opacity: 0.9,
      };
    default:
      return baseStyle();
  }
};

export const createPopupElement = (type: PopupElementType, index = 0): PopupCanvasElement => {
  const defaults: Record<PopupElementType, Partial<PopupCanvasElement>> = {
    badge: {
      name: "Badge",
      content: "Limited drop",
      x: 8,
      y: 8,
      width: 28,
      height: 12,
    },
    title: {
      name: "Title",
      content: "Spring launch event",
      x: 8,
      y: 22,
      width: 56,
      height: 24,
    },
    subtitle: {
      name: "Subtitle",
      content: "Fresh colors · new texture presets",
      x: 8,
      y: 36,
      width: 58,
      height: 12,
    },
    description: {
      name: "Description",
      content: "Build an eye-catching first-visit popup and guide shoppers toward your featured products.",
      x: 8,
      y: 49,
      width: 56,
      height: 20,
    },
    button: {
      name: "Primary Button",
      content: "Shop the collection",
      x: 8,
      y: 76,
      width: 34,
      height: 14,
    },
    countdown: {
      name: "Countdown",
      content: "Ends soon",
      x: 8,
      y: 66,
      width: 42,
      height: 10,
    },
    image: {
      name: "Image",
      content: "",
      x: 64,
      y: 12,
      width: 28,
      height: 42,
    },
    icon: {
      name: "Icon",
      content: "✨",
      x: 86,
      y: 78,
      width: 8,
      height: 10,
    },
    shape: {
      name: "Decorative Shape",
      content: "",
      x: 62,
      y: 62,
      width: 24,
      height: 18,
    },
  };

  const elementDefaults = defaults[type];

  return {
    id: createId(type),
    type,
    name: elementDefaults.name || type,
    content: elementDefaults.content || "",
    visible: true,
    locked: false,
    x: clamp(Number(elementDefaults.x ?? 8) + index * 2, 0, 90),
    y: clamp(Number(elementDefaults.y ?? 8) + index * 2, 0, 90),
    width: clamp(Number(elementDefaults.width ?? 32), 8, 96),
    height: clamp(Number(elementDefaults.height ?? 12), 6, 80),
    zIndex: index + 1,
    style: defaultStyleByType(type),
    action: {
      label: type === "button" ? "Shop now" : "",
      link: "/products",
      target: "internal",
      variant: "default",
      radius: type === "button" ? 999 : 14,
      size: "md",
      icon: type === "button" ? "→" : "",
    },
    animation: {
      entrance: type === "shape" ? "floating" : type === "badge" ? "fade" : "none",
      hover: type === "button" ? "scale" : "none",
      delay: 0,
      duration: 0.35,
      easing: "easeOut",
    },
    asset: {
      url: "",
      fit: "cover",
      position: "center center",
      shape: type === "shape" ? "pill" : "square",
    },
    countdown: {
      endDate: "",
      prefix: "Ends in",
      suffix: "left",
    },
  };
};

export const createDefaultPromotionPopupConfig = (): PromotionPopupConfig => {
  const badge = createPopupElement("badge", 0);
  const title = createPopupElement("title", 1);
  const description = createPopupElement("description", 2);
  const button = createPopupElement("button", 3);
  const shape = createPopupElement("shape", 4);
  const icon = createPopupElement("icon", 5);

  return {
    version: 2,
    enabled: false,
    title: title.content,
    message: description.content,
    button_text: button.action.label,
    button_link: button.action.link,
    image_url: "",
    dismiss_key: "promo-v2",
    metadata: {
      name: "Homepage Promotion Popup",
      analyticsId: "promo-home-hero",
      audience: "all",
      activePresetId: null,
    },
    overlay: {
      color: "#020617",
      opacity: 0.62,
      blur: 8,
      clickOutsideToClose: true,
      closeOnEscape: true,
      modal: true,
      zIndex: 91,
    },
    container: {
      width: 560,
      minHeight: 320,
      borderRadius: 28,
      shadow: "0 32px 80px rgba(15, 23, 42, 0.34)",
      borderColor: "rgba(255, 255, 255, 0.2)",
      borderWidth: 1,
      backgroundColor: "#ffffff",
      backgroundImage: "",
      backgroundSize: "cover",
      backgroundPosition: "center center",
      opacity: 1,
      padding: 24,
      showCloseButton: true,
      closeButtonColor: "#0f172a",
      closeButtonBackground: "rgba(255, 255, 255, 0.86)",
    },
    schedule: {
      active: true,
      startDate: "",
      endDate: "",
      recurrenceEnabled: false,
      recurrence: "none",
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: 1,
      customRule: "",
      homepageOnly: true,
      pageTargets: ["/"],
      priority: 0,
      showDelayMs: 500,
      behavior: "session",
      intervalDays: 7,
      allowDoNotShowAgain: true,
    },
    elements: [shape, badge, title, description, button, icon],
    presets: [],
  };
};

export const DEFAULT_PROMOTION_POPUP_CONFIG = createDefaultPromotionPopupConfig();

export const clonePromotionPopupConfig = (config: PromotionPopupConfig): PromotionPopupConfig => (
  JSON.parse(JSON.stringify(config)) as PromotionPopupConfig
);

const mergeElement = (raw: unknown, index: number): PopupCanvasElement => {
  const data = asObject(raw);
  const type = (typeof data.type === "string" ? data.type : "description") as PopupElementType;
  const base = createPopupElement(type, index);

  return {
    ...base,
    ...data,
    type,
    style: { ...base.style, ...asObject(data.style) },
    action: { ...base.action, ...asObject(data.action) },
    animation: { ...base.animation, ...asObject(data.animation) },
    asset: { ...base.asset, ...asObject(data.asset) },
    countdown: { ...base.countdown, ...asObject(data.countdown) },
    x: clamp(Number(data.x ?? base.x), 0, 96),
    y: clamp(Number(data.y ?? base.y), 0, 96),
    width: clamp(Number(data.width ?? base.width), 6, 100),
    height: clamp(Number(data.height ?? base.height), 6, 90),
    zIndex: Number.isFinite(Number(data.zIndex)) ? Number(data.zIndex) : index + 1,
    visible: data.visible !== false,
    locked: data.locked === true,
  };
};

export const syncPromotionPopupSummary = (config: PromotionPopupConfig): PromotionPopupConfig => {
  const next = clonePromotionPopupConfig(config);
  const ordered = [...next.elements].sort((a, b) => a.zIndex - b.zIndex).map((element, index) => mergeElement(element, index));
  next.elements = ordered;

  const titleElement = ordered.find((element) => element.type === "title" && element.visible) ?? ordered.find((element) => element.type === "title");
  const descriptionElement = ordered.find((element) => element.type === "description" && element.visible) ?? ordered.find((element) => element.type === "description");
  const buttonElement = ordered.find((element) => element.type === "button" && element.visible) ?? ordered.find((element) => element.type === "button");
  const imageElement = ordered.find((element) => element.type === "image" && element.visible && element.asset.url) ?? ordered.find((element) => element.type === "image" && element.asset.url);

  next.title = titleElement?.content?.trim() || next.title || DEFAULT_PROMOTION_POPUP_CONFIG.title;
  next.message = descriptionElement?.content?.trim() || next.message || DEFAULT_PROMOTION_POPUP_CONFIG.message;
  next.button_text = buttonElement?.action.label?.trim() || buttonElement?.content?.trim() || next.button_text || DEFAULT_PROMOTION_POPUP_CONFIG.button_text;
  next.button_link = buttonElement?.action.link?.trim() || next.button_link || DEFAULT_PROMOTION_POPUP_CONFIG.button_link;
  next.image_url = imageElement?.asset.url?.trim() || next.image_url || "";
  next.dismiss_key = next.dismiss_key?.trim() || next.metadata.analyticsId || DEFAULT_PROMOTION_POPUP_CONFIG.dismiss_key;
  next.metadata.name = next.metadata.name?.trim() || next.title || "Promotion Popup";
  next.metadata.analyticsId = next.metadata.analyticsId?.trim() || next.dismiss_key;
  next.schedule.interval = Math.max(1, Number(next.schedule.interval) || 1);
  next.schedule.intervalDays = Math.max(1, Number(next.schedule.intervalDays) || 1);
  next.schedule.priority = Number(next.schedule.priority) || 0;
  next.schedule.showDelayMs = Math.max(0, Number(next.schedule.showDelayMs) || 0);

  return next;
};

export const normalizePromotionPopupConfig = (raw: unknown): PromotionPopupConfig => {
  const defaults = createDefaultPromotionPopupConfig();
  const source = asObject(raw);
  const merged: PromotionPopupConfig = {
    ...defaults,
    ...source,
    metadata: { ...defaults.metadata, ...asObject(source.metadata) },
    overlay: { ...defaults.overlay, ...asObject(source.overlay) },
    container: { ...defaults.container, ...asObject(source.container) },
    schedule: { ...defaults.schedule, ...asObject(source.schedule) },
    elements: Array.isArray(source.elements) && source.elements.length > 0
      ? source.elements.map((element, index) => mergeElement(element, index))
      : defaults.elements.map((element, index) => mergeElement(element, index)),
    presets: Array.isArray(source.presets)
      ? source.presets.map((preset, index) => normalizePromotionPopupPreset(preset, index))
      : [],
  };

  if (source.title && !merged.elements.some((element) => element.type === "title")) {
    merged.elements.push({ ...createPopupElement("title", merged.elements.length), content: String(source.title) });
  }
  if ((source.message || source.description) && !merged.elements.some((element) => element.type === "description")) {
    merged.elements.push({ ...createPopupElement("description", merged.elements.length), content: String(source.message ?? source.description) });
  }
  if ((source.button_text || source.button_link) && !merged.elements.some((element) => element.type === "button")) {
    const button = createPopupElement("button", merged.elements.length);
    button.action.label = String(source.button_text ?? button.action.label);
    button.action.link = String(source.button_link ?? button.action.link);
    button.content = button.action.label;
    merged.elements.push(button);
  }
  if (source.image_url && !merged.elements.some((element) => element.type === "image" && element.asset.url)) {
    const image = createPopupElement("image", merged.elements.length);
    image.asset.url = String(source.image_url);
    merged.elements.push(image);
  }

  return syncPromotionPopupSummary(merged);
};

const normalizePromotionPopupPreset = (raw: unknown, index: number): PromotionPopupPreset => {
  const source = asObject(raw);
  const base = createDefaultPromotionPopupConfig();
  const presetConfig = normalizePromotionPopupConfig({ ...base, ...asObject(source.config), presets: [] });

  return {
    id: typeof source.id === "string" ? source.id : createId(`preset-${index}`),
    name: typeof source.name === "string" && source.name.trim() ? source.name : `Preset ${index + 1}`,
    isFavorite: source.isFavorite === true,
    isDefault: source.isDefault === true,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : new Date().toISOString(),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString(),
    config: { ...presetConfig, presets: [] },
  };
};

export const getPromotionPopupStorageKeys = (config: PromotionPopupConfig) => {
  const key = (config.dismiss_key || config.metadata.analyticsId || "default").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  return {
    session: `${POPUP_STORAGE_PREFIX}:${key}:session`,
    seenAt: `${POPUP_STORAGE_PREFIX}:${key}:seen-at`,
    forever: `${POPUP_STORAGE_PREFIX}:${key}:forever`,
    firstVisit: `${POPUP_STORAGE_PREFIX}:${key}:first-visit`,
  };
};

export interface PopupDismissalSnapshot {
  sessionSeen?: string | null;
  localSeenAt?: string | null;
  permanentHidden?: string | null;
  firstVisitSeen?: string | null;
}

export const shouldBlockPopupByDismissal = (
  config: PromotionPopupConfig,
  snapshot: PopupDismissalSnapshot,
  nowMs = Date.now(),
) => {
  if (snapshot.permanentHidden) return true;

  const behavior = (config.schedule.behavior || "session") as PopupDisplayBehavior;
  const seenAt = Number(snapshot.localSeenAt || 0);

  switch (behavior) {
    case "always":
      return false;
    case "day":
      return Number.isFinite(seenAt) && seenAt > 0 ? nowMs - seenAt < DAY_MS : false;
    case "interval":
      return Number.isFinite(seenAt) && seenAt > 0 ? nowMs - seenAt < Math.max(1, config.schedule.intervalDays || 1) * DAY_MS : false;
    case "first-visit":
      return Boolean(snapshot.firstVisitSeen || snapshot.localSeenAt);
    case "session":
    default:
      return Boolean(snapshot.sessionSeen);
  }
};

const parseDate = (value?: string, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

const diffDays = (start: Date, end: Date) => Math.floor((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / DAY_MS);
const diffWeeks = (start: Date, end: Date) => Math.floor(diffDays(start, end) / 7);
const diffMonths = (start: Date, end: Date) => (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

export const isPromotionPopupScheduled = (config: PromotionPopupConfig, now = new Date()) => {
  if (!config.enabled || !config.schedule.active) return false;

  const startDate = parseDate(config.schedule.startDate);
  const endDate = parseDate(config.schedule.endDate, true);

  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;

  if (!config.schedule.recurrenceEnabled || config.schedule.recurrence === "none") {
    return true;
  }

  const interval = Math.max(1, Number(config.schedule.interval) || 1);
  const anchor = startDate ?? now;
  const recurrence = config.schedule.recurrence as PopupRecurrenceFrequency;

  switch (recurrence) {
    case "daily":
      return diffDays(anchor, now) % interval === 0;
    case "weekly": {
      const activeDays = config.schedule.daysOfWeek.length > 0 ? config.schedule.daysOfWeek : [anchor.getDay()];
      return activeDays.includes(now.getDay()) && diffWeeks(anchor, now) % interval === 0;
    }
    case "monthly": {
      const activeDay = config.schedule.dayOfMonth || anchor.getDate();
      return now.getDate() === activeDay && diffMonths(anchor, now) % interval === 0;
    }
    case "custom": {
      const rule = config.schedule.customRule.trim().toLowerCase();
      if (!rule) return true;
      if (rule.includes("weekday")) return now.getDay() >= 1 && now.getDay() <= 5;
      if (rule.includes("weekend")) return now.getDay() === 0 || now.getDay() === 6;
      return true;
    }
    default:
      return true;
  }
};

export const shouldRenderPromotionPopup = (
  config: PromotionPopupConfig,
  pathname: string,
  now = new Date(),
) => {
  const targets = Array.isArray(config.schedule.pageTargets) ? config.schedule.pageTargets.filter(Boolean) : [];
  if (config.schedule.homepageOnly && pathname !== "/") return false;
  if (!config.schedule.homepageOnly && targets.length > 0 && !targets.includes(pathname)) return false;
  return isPromotionPopupScheduled(config, now);
};

export const readPromotionPopupDismissal = (config: PromotionPopupConfig): PopupDismissalSnapshot => {
  if (typeof window === "undefined") return {};

  try {
    const keys = getPromotionPopupStorageKeys(config);
    return {
      sessionSeen: window.sessionStorage.getItem(keys.session),
      localSeenAt: window.localStorage.getItem(keys.seenAt),
      permanentHidden: window.localStorage.getItem(keys.forever),
      firstVisitSeen: window.localStorage.getItem(keys.firstVisit),
    };
  } catch {
    return {};
  }
};

export const persistPromotionPopupDismissal = (
  config: PromotionPopupConfig,
  options?: { permanent?: boolean; nowMs?: number },
) => {
  if (typeof window === "undefined") return;

  try {
    const keys = getPromotionPopupStorageKeys(config);
    const nowMs = options?.nowMs ?? Date.now();

    window.sessionStorage.setItem(keys.session, String(nowMs));
    window.localStorage.setItem(keys.seenAt, String(nowMs));

    if (config.schedule.behavior === "first-visit") {
      window.localStorage.setItem(keys.firstVisit, String(nowMs));
    }
    if (options?.permanent) {
      window.localStorage.setItem(keys.forever, "1");
    }
  } catch {
    // Ignore storage access errors and fail open.
  }
};
