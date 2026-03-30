import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Palette, Save, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface PromoConfig {
  enabled: boolean;
  title: string;
  message: string;
  button_text: string;
  button_link: string;
  image_url: string;
  dismiss_key: string;
}

interface FooterConfig {
  description: string;
  quick_links_title: string;
  account_title: string;
  contact_title: string;
  copyright_text: string;
  show_quick_links: boolean;
  show_account_links: boolean;
  show_contact_block: boolean;
  show_logo_icon: boolean;
  show_logo_text: boolean;
  logo_height_px: number;
  auth_link_label: string;
  account_link_label: string;
  orders_link_label: string;
}

type ContactConfig = {
  email: string;
  phone: string;
  address: string;
  contact_description: string;
  email_label: string;
  phone_label: string;
  address_label: string;
  instagram_url: string;
  facebook_url: string;
  social_title: string;
  social: {
    instagram: string;
    facebook: string;
    youtube: string;
  };
};

export interface ThemeGalleryImage {
  id: string;
  label: string;
  url: string;
  category?: string;
}

interface ThemeConfig {
  preset: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  card: string;
  card_foreground: string;
  background_image_url: string;
  background_pattern: string;
  background_effect: string;
  enable_motion: boolean;
  image_fit: "cover" | "contain";
  image_opacity: number;
  pattern_opacity: number;
  effect_opacity: number;
  effect_speed: "slow" | "normal" | "fast";
  overlay_tint: string;
  overlay_strength: number;
  available_backgrounds?: ThemeGalleryImage[];
}

const defaultPromo: PromoConfig = {
  enabled: false,
  title: "Welcome!",
  message: "Check out our latest 3D printed items.",
  button_text: "Shop Now",
  button_link: "/products",
  image_url: "",
  dismiss_key: "v1",
};

const defaultFooter: FooterConfig = {
  description: "Premium 3D printing supplies and custom prints for makers, hobbyists, and professionals.",
  quick_links_title: "Quick Links",
  account_title: "Account",
  contact_title: "Contact",
  copyright_text: "All rights reserved.",
  show_quick_links: true,
  show_account_links: true,
  show_contact_block: true,
  show_logo_icon: true,
  show_logo_text: true,
  logo_height_px: 32,
  auth_link_label: "Login / Register",
  account_link_label: "My Account",
  orders_link_label: "Order History",
};

const defaultContact: ContactConfig = {
  email: "",
  phone: "",
  address: "",
  contact_description: "Questions, custom requests, or order help? Reach out anytime.",
  email_label: "Email",
  phone_label: "Phone",
  address_label: "Address",
  instagram_url: "",
  facebook_url: "",
  social_title: "Follow us",
  social: { instagram: "", facebook: "", youtube: "" },
};

const DEFAULT_BACKGROUND_LIBRARY: ThemeGalleryImage[] = [
  {
    id: "default-dark-grid",
    label: "Dark Forge",
    category: "Core",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0c1017"/>
            <stop offset="50%" stop-color="#111827"/>
            <stop offset="100%" stop-color="#1d0f08"/>
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stop-color="#f97316" stop-opacity="0.42"/>
            <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)"/>
        <rect width="1600" height="900" fill="url(#glow)"/>
        <g opacity="0.18" stroke="#ffffff">
          <path d="M0 120H1600"/><path d="M0 240H1600"/><path d="M0 360H1600"/><path d="M0 480H1600"/><path d="M0 600H1600"/><path d="M0 720H1600"/>
          <path d="M160 0V900"/><path d="M320 0V900"/><path d="M480 0V900"/><path d="M640 0V900"/><path d="M800 0V900"/><path d="M960 0V900"/><path d="M1120 0V900"/><path d="M1280 0V900"/><path d="M1440 0V900"/>
        </g>
      </svg>
    `),
  },
  {
    id: "spring-garden",
    label: "Spring Garden",
    category: "Seasonal",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f4fff6"/>
            <stop offset="55%" stop-color="#fef6fb"/>
            <stop offset="100%" stop-color="#fffde8"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)"/>
        <g opacity="0.35">
          <circle cx="180" cy="180" r="130" fill="#ffd6eb"/>
          <circle cx="1380" cy="220" r="170" fill="#d9ffd7"/>
          <circle cx="1180" cy="680" r="180" fill="#fff0a6"/>
          <circle cx="420" cy="700" r="190" fill="#f1d8ff"/>
        </g>
      </svg>
    `),
  },
  {
    id: "summer-sky",
    label: "Summer Sky",
    category: "Seasonal",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8dd8ff"/>
            <stop offset="55%" stop-color="#d8f6ff"/>
            <stop offset="100%" stop-color="#fff2bf"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)"/>
        <circle cx="1260" cy="180" r="72" fill="#fff3a3"/>
        <g fill="#ffffff" opacity="0.78">
          <ellipse cx="280" cy="180" rx="100" ry="35"/>
          <ellipse cx="360" cy="190" rx="75" ry="26"/>
          <ellipse cx="1080" cy="250" rx="110" ry="34"/>
          <ellipse cx="1170" cy="260" rx="80" ry="25"/>
        </g>
      </svg>
    `),
  },
  {
    id: "autumn-forest",
    label: "Autumn Forest",
    category: "Seasonal",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#25140e"/>
            <stop offset="45%" stop-color="#4a2614"/>
            <stop offset="100%" stop-color="#1a110d"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)"/>
        <g opacity="0.5">
          <circle cx="300" cy="180" r="120" fill="#c25c2f"/>
          <circle cx="700" cy="140" r="90" fill="#d9a12c"/>
          <circle cx="1120" cy="240" r="160" fill="#7f2d12"/>
          <circle cx="1360" cy="170" r="100" fill="#a16207"/>
        </g>
      </svg>
    `),
  },
  {
    id: "winter-night",
    label: "Winter Night",
    category: "Seasonal",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#020817"/>
            <stop offset="55%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#16213b"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)"/>
        <g fill="#ffffff" opacity="0.75">
          <circle cx="180" cy="140" r="2.5"/>
          <circle cx="340" cy="280" r="2"/>
          <circle cx="520" cy="180" r="2"/>
          <circle cx="700" cy="320" r="3"/>
          <circle cx="920" cy="150" r="2"/>
          <circle cx="1180" cy="260" r="2.5"/>
          <circle cx="1450" cy="190" r="2"/>
        </g>
      </svg>
    `),
  },
  {
    id: "easter-soft",
    label: "Easter Pastels",
    category: "Festive",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <rect width="1600" height="900" fill="#fffaf2"/>
        <ellipse cx="300" cy="560" rx="85" ry="120" fill="#ffd1dc"/>
        <ellipse cx="520" cy="520" rx="85" ry="120" fill="#d1f7ff"/>
        <ellipse cx="740" cy="570" rx="85" ry="120" fill="#fff1a8"/>
        <ellipse cx="960" cy="530" rx="85" ry="120" fill="#d9ffd1"/>
        <ellipse cx="1180" cy="565" rx="85" ry="120" fill="#efd9ff"/>
      </svg>
    `),
  },
  {
    id: "halloween-moon",
    label: "Halloween Moon",
    category: "Festive",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <rect width="1600" height="900" fill="#100615"/>
        <circle cx="1200" cy="190" r="100" fill="#ffb703" opacity="0.9"/>
        <path d="M0 760 C220 620 380 840 620 720 S1030 840 1280 730 S1500 700 1600 760V900H0Z" fill="#1a0f24"/>
        <path d="M0 790 C220 660 380 870 620 760 S1030 870 1280 760 S1500 730 1600 790V900H0Z" fill="#31111c"/>
        <circle cx="250" cy="250" r="3" fill="#ffffff"/>
        <circle cx="420" cy="120" r="2" fill="#ffffff"/>
        <circle cx="680" cy="230" r="2.5" fill="#ffffff"/>
        <circle cx="950" cy="160" r="2" fill="#ffffff"/>
      </svg>
    `),
  },
  {
    id: "christmas-lights",
    label: "Christmas Lights",
    category: "Festive",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <rect width="1600" height="900" fill="#07180f"/>
        <path d="M0 120 C180 220 300 40 520 140 S900 230 1120 120 S1420 30 1600 130" stroke="#2e4734" stroke-width="6" fill="none"/>
        <g>
          <circle cx="150" cy="150" r="16" fill="#ff4d6d"/>
          <circle cx="310" cy="104" r="16" fill="#ffe066"/>
          <circle cx="470" cy="142" r="16" fill="#80ed99"/>
          <circle cx="680" cy="186" r="16" fill="#4cc9f0"/>
          <circle cx="930" cy="146" r="16" fill="#ffd166"/>
          <circle cx="1190" cy="110" r="16" fill="#ef476f"/>
          <circle cx="1420" cy="104" r="16" fill="#06d6a0"/>
        </g>
      </svg>
    `),
  },
];

const defaultTheme: ThemeConfig = {
  preset: "default",
  primary: "24 95% 53%",
  secondary: "220 15% 16%",
  accent: "24 95% 53%",
  background: "220 20% 10%",
  foreground: "0 0% 95%",
  muted: "220 15% 20%",
  border: "220 15% 22%",
  card: "220 15% 14%",
  card_foreground: "0 0% 95%",
  background_image_url: DEFAULT_BACKGROUND_LIBRARY[0].url,
  background_pattern: "grid",
  background_effect: "none",
  enable_motion: true,
  image_fit: "cover",
  image_opacity: 0.28,
  pattern_opacity: 0.28,
  effect_opacity: 0.7,
  effect_speed: "normal",
  overlay_tint: "220 20% 10%",
  overlay_strength: 0.35,
  available_backgrounds: DEFAULT_BACKGROUND_LIBRARY,
};

const SEASONAL_PRESETS: Record<string, Partial<ThemeConfig> & { label: string; imageId?: string }> = {
  default: {
    label: "Default (Dark Industrial)",
    primary: "24 95% 53%",
    secondary: "220 15% 16%",
    accent: "24 95% 53%",
    background: "220 20% 10%",
    foreground: "0 0% 95%",
    muted: "220 15% 20%",
    border: "220 15% 22%",
    card: "220 15% 14%",
    card_foreground: "0 0% 95%",
    background_pattern: "grid",
    background_effect: "none",
    imageId: "default-dark-grid",
  },
  spring: {
    label: "🌸 Spring Bloom",
    primary: "142 60% 45%",
    secondary: "142 20% 92%",
    accent: "330 70% 60%",
    background: "90 30% 96%",
    foreground: "142 30% 15%",
    muted: "142 15% 90%",
    border: "142 20% 85%",
    card: "0 0% 100%",
    card_foreground: "142 30% 15%",
    background_pattern: "dots",
    background_effect: "petals",
    overlay_tint: "120 35% 97%",
    overlay_strength: 0.14,
    imageId: "spring-garden",
  },
  summer: {
    label: "☀️ Summer Vibes",
    primary: "35 95% 55%",
    secondary: "200 60% 92%",
    accent: "190 80% 45%",
    background: "45 40% 97%",
    foreground: "35 40% 12%",
    muted: "35 20% 90%",
    border: "35 20% 85%",
    card: "0 0% 100%",
    card_foreground: "35 40% 12%",
    background_pattern: "waves",
    background_effect: "shimmer",
    overlay_tint: "45 90% 95%",
    overlay_strength: 0.15,
    imageId: "summer-sky",
  },
  autumn: {
    label: "🍂 Autumn Warmth",
    primary: "15 80% 50%",
    secondary: "30 25% 18%",
    accent: "40 85% 55%",
    background: "25 25% 10%",
    foreground: "35 30% 90%",
    muted: "25 20% 18%",
    border: "25 20% 25%",
    card: "25 20% 14%",
    card_foreground: "35 30% 90%",
    background_pattern: "grain",
    background_effect: "falling-leaves",
    overlay_tint: "22 35% 10%",
    overlay_strength: 0.25,
    imageId: "autumn-forest",
  },
  winter: {
    label: "❄️ Winter Frost",
    primary: "210 70% 55%",
    secondary: "210 25% 15%",
    accent: "195 80% 65%",
    background: "215 30% 8%",
    foreground: "210 20% 95%",
    muted: "210 20% 18%",
    border: "210 20% 25%",
    card: "210 25% 12%",
    card_foreground: "210 20% 95%",
    background_pattern: "snowflakes",
    background_effect: "snow",
    overlay_tint: "215 30% 8%",
    overlay_strength: 0.22,
    imageId: "winter-night",
  },
  easter: {
    label: "🐣 Easter",
    primary: "334 78% 68%",
    secondary: "84 62% 92%",
    accent: "48 95% 62%",
    background: "42 100% 97%",
    foreground: "315 25% 20%",
    muted: "330 40% 94%",
    border: "42 55% 86%",
    card: "0 0% 100%",
    card_foreground: "315 25% 20%",
    background_pattern: "confetti",
    background_effect: "petals",
    overlay_tint: "42 100% 97%",
    overlay_strength: 0.1,
    imageId: "easter-soft",
  },
  halloween: {
    label: "🎃 Halloween",
    primary: "28 100% 56%",
    secondary: "270 24% 16%",
    accent: "45 100% 58%",
    background: "280 30% 7%",
    foreground: "35 30% 94%",
    muted: "278 20% 16%",
    border: "278 20% 24%",
    card: "278 20% 12%",
    card_foreground: "35 30% 94%",
    background_pattern: "spiderweb",
    background_effect: "bats",
    overlay_tint: "280 30% 7%",
    overlay_strength: 0.25,
    imageId: "halloween-moon",
  },
  christmas: {
    label: "🎄 Christmas",
    primary: "0 72% 56%",
    secondary: "145 45% 18%",
    accent: "48 92% 60%",
    background: "145 55% 8%",
    foreground: "45 40% 96%",
    muted: "145 20% 16%",
    border: "145 20% 24%",
    card: "145 24% 12%",
    card_foreground: "45 40% 96%",
    background_pattern: "stars",
    background_effect: "twinkle",
    overlay_tint: "145 55% 8%",
    overlay_strength: 0.2,
    imageId: "christmas-lights",
  },
};

const PATTERN_OPTIONS = [
  { value: "none", label: "None" },
  { value: "dots", label: "Dots" },
  { value: "grid", label: "Grid" },
  { value: "waves", label: "Waves" },
  { value: "grain", label: "Grain / Noise" },
  { value: "snowflakes", label: "Snowflakes" },
  { value: "diagonal", label: "Diagonal Lines" },
  { value: "hex", label: "Hex" },
  { value: "confetti", label: "Confetti" },
  { value: "stars", label: "Stars" },
  { value: "spiderweb", label: "Spiderweb" },
  { value: "hearts", label: "Hearts" },
];

const EFFECT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "particles", label: "Floating Particles" },
  { value: "shimmer", label: "Shimmer / Glow" },
  { value: "snow", label: "Snowfall" },
  { value: "falling-leaves", label: "Falling Leaves" },
  { value: "fireflies", label: "Fireflies" },
  { value: "petals", label: "Petals" },
  { value: "twinkle", label: "Twinkle Lights" },
  { value: "aurora", label: "Aurora Sweep" },
  { value: "bats", label: "Night Bats" },
];

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const normalizeTheme = (value?: Partial<ThemeConfig> | null): ThemeConfig => ({
  ...defaultTheme,
  ...(value ?? {}),
  available_backgrounds:
    value?.available_backgrounds && value.available_backgrounds.length > 0
      ? value.available_backgrounds
      : DEFAULT_BACKGROUND_LIBRARY,
});

const normalizeContact = (value?: Partial<ContactConfig> | null): ContactConfig => ({
  ...defaultContact,
  ...(value ?? {}),
  social: {
    ...defaultContact.social,
    ...(value?.social ?? {}),
  },
  instagram_url: value?.instagram_url ?? value?.social?.instagram ?? defaultContact.instagram_url,
  facebook_url: value?.facebook_url ?? value?.social?.facebook ?? defaultContact.facebook_url,
});

const AdminSettings = () => {
  const { toast } = useToast();
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [contact, setContact] = useState<ContactConfig>(defaultContact);
  const [store, setStore] = useState({ name: "LayerLoot", currency: "DKK", currency_symbol: "kr" });
  const [promo, setPromo] = useState<PromoConfig>(defaultPromo);
  const [footer, setFooter] = useState<FooterConfig>(defaultFooter);
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [saving, setSaving] = useState(false);
  const galleryImages = useMemo(
    () => (theme.available_backgrounds?.length ? theme.available_backgrounds : DEFAULT_BACKGROUND_LIBRARY),
    [theme.available_backgrounds],
  );

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*");
      if (data) {
        data.forEach((s: any) => {
          if (s.key === "contact") setContact(normalizeContact(s.value as any));
          if (s.key === "store") setStore(s.value as any);
          if (s.key === "promotion_popup") setPromo({ ...defaultPromo, ...(s.value as any) });
          if (s.key === "footer_settings") setFooter({ ...defaultFooter, ...(s.value as any) });
          if (s.key === "theme") setTheme(normalizeTheme(s.value as any));
        });
      }
    };
    fetch();
  }, []);

  const upsertSetting = async (key: string, value: any) => {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: value as any })
        .eq("key", key);
    } else {
      await supabase.from("site_settings").insert({ key, value: value as any });
    }
  };

  const save = async () => {
    setSaving(true);

    const normalizedContactForSave = {
      ...contact,
      social: {
        ...contact.social,
        instagram: contact.instagram_url,
        facebook: contact.facebook_url,
      },
    };

    await Promise.all([
      upsertSetting("contact", normalizedContactForSave),
      upsertSetting("store", store),
      upsertSetting("promotion_popup", promo),
      upsertSetting("footer_settings", footer),
      upsertSetting("theme", theme),
    ]);
    setSaving(false);
    toast({ title: "Settings saved!" });
  };

  const applyPreset = (presetKey: string) => {
    const preset = SEASONAL_PRESETS[presetKey];
    if (!preset) return;

    const presetImage = preset.imageId
      ? (galleryImages.find((img) => img.id === preset.imageId)?.url ?? theme.background_image_url)
      : theme.background_image_url;

    setTheme((prev) => ({
      ...prev,
      preset: presetKey,
      primary: preset.primary ?? prev.primary,
      secondary: preset.secondary ?? prev.secondary,
      accent: preset.accent ?? prev.accent,
      background: preset.background ?? prev.background,
      foreground: preset.foreground ?? prev.foreground,
      muted: preset.muted ?? prev.muted,
      border: preset.border ?? prev.border,
      card: preset.card ?? prev.card,
      card_foreground: preset.card_foreground ?? prev.card_foreground,
      background_pattern: preset.background_pattern ?? prev.background_pattern,
      background_effect: preset.background_effect ?? prev.background_effect,
      overlay_tint: preset.overlay_tint ?? prev.overlay_tint,
      overlay_strength: preset.overlay_strength ?? prev.overlay_strength,
      background_image_url: presetImage,
    }));
  };

  const onUploadBackground = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file." });
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const id = `upload-${Date.now()}`;
    const newImage: ThemeGalleryImage = {
      id,
      label: file.name.replace(/\.[^/.]+$/, ""),
      category: "Uploads",
      url: dataUrl,
    };

    setTheme((prev) => ({
      ...prev,
      background_image_url: dataUrl,
      available_backgrounds: [newImage, ...(prev.available_backgrounds ?? DEFAULT_BACKGROUND_LIBRARY)],
    }));

    toast({ title: "Background uploaded", description: "Image added to the theme gallery." });
  };

  const removeUploadedImage = (id: string) => {
    setTheme((prev) => {
      const remaining = (prev.available_backgrounds ?? DEFAULT_BACKGROUND_LIBRARY).filter((img) => img.id !== id);
      const fallbackUrl = remaining[0]?.url ?? "";
      return {
        ...prev,
        available_backgrounds: remaining.length ? remaining : DEFAULT_BACKGROUND_LIBRARY,
        background_image_url:
          prev.background_image_url === galleryImages.find((img) => img.id === id)?.url
            ? fallbackUrl
            : prev.background_image_url,
      };
    });
  };

  const groupedImages = galleryImages.reduce<Record<string, ThemeGalleryImage[]>>((acc, img) => {
    const key = img.category || "Other";
    acc[key] = [...(acc[key] ?? []), img];
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Settings</h1>
        <Button onClick={save} disabled={saving} className="font-display uppercase tracking-wider">
          <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={contact.address}
                    onChange={(e) => setContact({ ...contact, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact Description</Label>
                  <Textarea
                    value={contact.contact_description}
                    onChange={(e) => setContact({ ...contact, contact_description: e.target.value })}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Social Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Instagram URL</Label>
                  <Input
                    value={contact.instagram_url}
                    onChange={(e) =>
                      setContact({
                        ...contact,
                        instagram_url: e.target.value,
                        social: { ...contact.social, instagram: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Facebook URL</Label>
                  <Input
                    value={contact.facebook_url}
                    onChange={(e) =>
                      setContact({
                        ...contact,
                        facebook_url: e.target.value,
                        social: { ...contact.social, facebook: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>YouTube URL</Label>
                  <Input
                    value={contact.social?.youtube ?? ""}
                    onChange={(e) => setContact({ ...contact, social: { ...contact.social, youtube: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Social Section Title</Label>
                  <Input
                    value={contact.social_title}
                    onChange={(e) => setContact({ ...contact, social_title: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Store Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Store Name</Label>
                  <Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={store.currency} onChange={(e) => setStore({ ...store, currency: e.target.value })} />
                </div>
                <div>
                  <Label>Currency Symbol</Label>
                  <Input
                    value={store.currency_symbol}
                    onChange={(e) => setStore({ ...store, currency_symbol: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Promotion Popup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch checked={promo.enabled} onCheckedChange={(v) => setPromo({ ...promo, enabled: v })} />
                  <Label>Enable promotion popup</Label>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={promo.title} onChange={(e) => setPromo({ ...promo, title: e.target.value })} />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={promo.message}
                    onChange={(e) => setPromo({ ...promo, message: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Button Text</Label>
                    <Input
                      value={promo.button_text}
                      onChange={(e) => setPromo({ ...promo, button_text: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Button Link</Label>
                    <Input
                      value={promo.button_link}
                      onChange={(e) => setPromo({ ...promo, button_link: e.target.value })}
                      placeholder="/products"
                    />
                  </div>
                </div>
                <div>
                  <Label>Image URL (optional)</Label>
                  <Input
                    value={promo.image_url}
                    onChange={(e) => setPromo({ ...promo, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Dismiss Key (change to re-show popup)</Label>
                  <Input
                    value={promo.dismiss_key}
                    onChange={(e) => setPromo({ ...promo, dismiss_key: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="footer" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Footer Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={footer.description}
                    onChange={(e) => setFooter({ ...footer, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Copyright Text</Label>
                  <Input
                    value={footer.copyright_text}
                    onChange={(e) => setFooter({ ...footer, copyright_text: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Logo Height (px)</Label>
                    <Input
                      type="number"
                      value={footer.logo_height_px}
                      onChange={(e) => setFooter({ ...footer, logo_height_px: parseInt(e.target.value, 10) || 32 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Section Visibility</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={footer.show_logo_icon}
                    onCheckedChange={(v) => setFooter({ ...footer, show_logo_icon: v })}
                  />
                  <Label>Show Logo Icon</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={footer.show_logo_text}
                    onCheckedChange={(v) => setFooter({ ...footer, show_logo_text: v })}
                  />
                  <Label>Show Logo Text</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={footer.show_quick_links}
                    onCheckedChange={(v) => setFooter({ ...footer, show_quick_links: v })}
                  />
                  <Label>Show Quick Links</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={footer.show_account_links}
                    onCheckedChange={(v) => setFooter({ ...footer, show_account_links: v })}
                  />
                  <Label>Show Account Links</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={footer.show_contact_block}
                    onCheckedChange={(v) => setFooter({ ...footer, show_contact_block: v })}
                  />
                  <Label>Show Contact Block</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Section Titles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Quick Links Title</Label>
                  <Input
                    value={footer.quick_links_title}
                    onChange={(e) => setFooter({ ...footer, quick_links_title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Account Title</Label>
                  <Input
                    value={footer.account_title}
                    onChange={(e) => setFooter({ ...footer, account_title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact Title</Label>
                  <Input
                    value={footer.contact_title}
                    onChange={(e) => setFooter({ ...footer, contact_title: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Account Link Labels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Auth Link Label</Label>
                  <Input
                    value={footer.auth_link_label}
                    onChange={(e) => setFooter({ ...footer, auth_link_label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Account Link Label</Label>
                  <Input
                    value={footer.account_link_label}
                    onChange={(e) => setFooter({ ...footer, account_link_label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Orders Link Label</Label>
                  <Input
                    value={footer.orders_link_label}
                    onChange={(e) => setFooter({ ...footer, orders_link_label: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-display uppercase">Footer Contact Labels & Socials</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Email Label</Label>
                  <Input
                    value={contact.email_label}
                    onChange={(e) => setContact({ ...contact, email_label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone Label</Label>
                  <Input
                    value={contact.phone_label}
                    onChange={(e) => setContact({ ...contact, phone_label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Address Label</Label>
                  <Input
                    value={contact.address_label}
                    onChange={(e) => setContact({ ...contact, address_label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Social Title</Label>
                  <Input
                    value={contact.social_title}
                    onChange={(e) => setContact({ ...contact, social_title: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Contact Description</Label>
                  <Textarea
                    value={contact.contact_description}
                    onChange={(e) => setContact({ ...contact, contact_description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Instagram URL</Label>
                  <Input
                    value={contact.instagram_url}
                    onChange={(e) =>
                      setContact({
                        ...contact,
                        instagram_url: e.target.value,
                        social: { ...contact.social, instagram: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Facebook URL</Label>
                  <Input
                    value={contact.facebook_url}
                    onChange={(e) =>
                      setContact({
                        ...contact,
                        facebook_url: e.target.value,
                        social: { ...contact.social, facebook: e.target.value },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display uppercase">Seasonal Presets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                {Object.entries(SEASONAL_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      theme.preset === key
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-display text-sm font-semibold uppercase text-foreground">{preset.label}</p>
                    <div className="mt-2 flex gap-1">
                      {[preset.primary, preset.accent, preset.background].filter(Boolean).map((color, i) => (
                        <div
                          key={i}
                          className="h-4 w-4 rounded-full border border-border"
                          style={{ backgroundColor: `hsl(${color})` }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Core Colors (HSL)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    ["primary", "Primary"],
                    ["secondary", "Secondary"],
                    ["accent", "Accent"],
                    ["background", "Background"],
                    ["foreground", "Foreground"],
                    ["muted", "Muted"],
                    ["border", "Border"],
                    ["card", "Card"],
                    ["card_foreground", "Card Foreground"],
                  ] as [keyof ThemeConfig, string][]
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 shrink-0 rounded-lg border border-border"
                      style={{ backgroundColor: `hsl(${theme[key]})` }}
                    />
                    <div className="flex-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={theme[key] as string}
                        onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                        placeholder="H S% L%"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Background & Effects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Background Image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={theme.background_image_url}
                      onChange={(e) => setTheme({ ...theme, background_image_url: e.target.value })}
                      placeholder="https://... or uploaded image"
                    />
                    <Button type="button" variant="outline" onClick={() => uploadRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                  <input
                    ref={uploadRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUploadBackground(e.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Background Pattern</Label>
                    <Select
                      value={theme.background_pattern}
                      onValueChange={(v) => setTheme({ ...theme, background_pattern: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PATTERN_OPTIONS.map((pattern) => (
                          <SelectItem key={pattern.value} value={pattern.value}>
                            {pattern.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Background Effect</Label>
                    <Select
                      value={theme.background_effect}
                      onValueChange={(v) => setTheme({ ...theme, background_effect: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EFFECT_OPTIONS.map((effect) => (
                          <SelectItem key={effect.value} value={effect.value}>
                            {effect.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Image Fit</Label>
                    <Select
                      value={theme.image_fit}
                      onValueChange={(v: "cover" | "contain") => setTheme({ ...theme, image_fit: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="contain">Contain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Effect Speed</Label>
                    <Select
                      value={theme.effect_speed}
                      onValueChange={(v: "slow" | "normal" | "fast") => setTheme({ ...theme, effect_speed: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Slow</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Image Opacity</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={theme.image_opacity}
                      onChange={(e) => setTheme({ ...theme, image_opacity: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Pattern Opacity</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={theme.pattern_opacity}
                      onChange={(e) => setTheme({ ...theme, pattern_opacity: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Effect Opacity</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={theme.effect_opacity}
                      onChange={(e) => setTheme({ ...theme, effect_opacity: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Overlay Strength</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={theme.overlay_strength}
                      onChange={(e) => setTheme({ ...theme, overlay_strength: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Overlay Tint (HSL)</Label>
                  <Input
                    value={theme.overlay_tint}
                    onChange={(e) => setTheme({ ...theme, overlay_tint: e.target.value })}
                    placeholder="220 20% 10%"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={theme.enable_motion}
                    onCheckedChange={(v) => setTheme({ ...theme, enable_motion: v })}
                  />
                  <Label>Enable Motion & Animations</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-display uppercase">Background Library</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupedImages).map(([group, images]) => (
                <div key={group} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Palette className="h-4 w-4" />
                    {group}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {images.map((image) => {
                      const isSelected = theme.background_image_url === image.url;
                      const isUpload = image.category === "Uploads";

                      return (
                        <div
                          key={image.id}
                          className={`overflow-hidden rounded-2xl border ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                        >
                          <button
                            type="button"
                            onClick={() => setTheme({ ...theme, background_image_url: image.url })}
                            className="block w-full text-left"
                          >
                            <div
                              className="h-36 w-full bg-cover bg-center"
                              style={{ backgroundImage: `url("${image.url}")` }}
                            />
                            <div className="flex items-center justify-between gap-2 p-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{image.label}</p>
                                <p className="text-xs text-muted-foreground">{image.category}</p>
                              </div>
                              {isSelected && <Sparkles className="h-4 w-4 text-primary" />}
                            </div>
                          </button>

                          {isUpload && (
                            <div className="border-t border-border px-3 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => removeUploadedImage(image.id)}
                              >
                                Remove upload
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => uploadRef.current?.click()}
                      className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
                    >
                      <ImagePlus className="mb-3 h-8 w-8 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Upload your own image</p>
                      <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP, SVG</p>
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;
