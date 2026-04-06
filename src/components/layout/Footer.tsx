import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Instagram, Facebook, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";
import { useFooterNavLinks } from "@/components/admin/NavLinkEditor";
import GlobalSectionRenderer from "@/components/layout/GlobalSectionRenderer";

type LocalizedText = string | Record<string, string>;

type BrandingSettings = {
  logo_text_left?: LocalizedText;
  logo_text_right?: LocalizedText;
  logo_image_url?: string;
  logo_link?: string;
  logo_alt?: LocalizedText;
};

type FooterSettings = {
  description?: LocalizedText;
  quick_links_title?: LocalizedText;
  account_title?: LocalizedText;
  contact_title?: LocalizedText;
  policies_title?: LocalizedText;
  copyright_text?: LocalizedText;
  show_quick_links?: boolean;
  show_account_links?: boolean;
  show_contact_block?: boolean;
  show_policies?: boolean;
  show_logo_icon?: boolean;
  show_logo_text?: boolean;
  logo_height_px?: number;
  footer_height_px?: number;
  auth_link_label?: LocalizedText;
  account_link_label?: LocalizedText;
  orders_link_label?: LocalizedText;
  policy_links?: Array<{ label: LocalizedText; path: string }>;
  // Footer-owned contact fields (source of truth for footer rendering)
  contact_description?: string;
  contact_email_label?: string;
  contact_email?: string;
  contact_phone_label?: string;
  contact_phone?: string;
  contact_address_label?: string;
  contact_address?: string;
  contact_social_title?: string;
  contact_social_instagram?: string;
  contact_social_facebook?: string;
  contact_social_youtube?: string;
};

/**
 * Legacy contact settings — used as fallback if footer-specific contact fields are empty.
 * Once footer contact fields are populated, this is ignored.
 */
type ContactSettings = {
  email?: string;
  phone?: string;
  address?: LocalizedText;
  contact_description?: LocalizedText;
  email_label?: LocalizedText;
  phone_label?: LocalizedText;
  address_label?: LocalizedText;
  social_title?: LocalizedText;
  social?: { instagram?: string; facebook?: string; youtube?: string };
  instagram_url?: string;
  facebook_url?: string;
};

const normalizePath = (value?: string | null) => {
  if (!value) return "/";
  if (value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
};

const isValidUrl = (value?: string | null) => {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; }
};

const getLocalizedValue = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const lang = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase().split("-")[0];
  const map = value as Record<string, string>;
  return map[lang] || map.en || fallback;
};

const Footer = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [branding, setBranding] = useState<BrandingSettings>({ logo_text_left: "Layer", logo_text_right: "Loot", logo_image_url: "", logo_link: "/", logo_alt: "LayerLoot" });
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({});
  const [legacyContact, setLegacyContact] = useState<ContactSettings>({});
  const [dynamicPolicies, setDynamicPolicies] = useState<Array<{ title: string; slug: string }>>([]);
  const footerNavLinks = useFooterNavLinks();

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "footer_settings").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
      supabase.from("policies").select("title, slug").eq("is_visible", true).order("sort_order", { ascending: true }),
    ]).then(([brandingRes, footerRes, contactRes, policiesRes]) => {
      if (brandingRes.data?.value) setBranding((prev) => ({ ...prev, ...(brandingRes.data.value as BrandingSettings) }));
      if (footerRes.data?.value) setFooterSettings(footerRes.data.value as FooterSettings);
      if (contactRes.data?.value) setLegacyContact(contactRes.data.value as ContactSettings);
      if (policiesRes.data) setDynamicPolicies(policiesRes.data);
    });
  }, []);

  const footerLinks = useMemo(
    () => footerNavLinks.filter((link) => !!link.to && !!link.label).slice(0, 8).map((link) => ({
      ...link,
      to: normalizePath(link.to),
      localizedLabel: getLocalizedValue(link.label, typeof link.label === "string" ? link.label : ""),
    })),
    [footerNavLinks, i18n.resolvedLanguage, i18n.language],
  );

  const logoHeight = Math.max(20, Number(footerSettings.logo_height_px || 32));
  const footerHeight = Number(footerSettings.footer_height_px || 0);

  // Resolve contact values: footer-specific fields take priority, then legacy contact, then empty (hide)
  const contactEmail = footerSettings.contact_email || getLocalizedValue(legacyContact.email) || "";
  const contactPhone = footerSettings.contact_phone || getLocalizedValue(legacyContact.phone) || "";
  const contactAddress = footerSettings.contact_address || getLocalizedValue(legacyContact.address) || "";
  const contactDescription = footerSettings.contact_description || getLocalizedValue(legacyContact.contact_description) || "";
  const emailLabel = footerSettings.contact_email_label || getLocalizedValue(legacyContact.email_label) || "";
  const phoneLabel = footerSettings.contact_phone_label || getLocalizedValue(legacyContact.phone_label) || "";
  const addressLabel = footerSettings.contact_address_label || getLocalizedValue(legacyContact.address_label) || "";
  const socialTitle = footerSettings.contact_social_title || getLocalizedValue(legacyContact.social_title) || "";

  const instagramUrl = footerSettings.contact_social_instagram || legacyContact.social?.instagram || legacyContact.instagram_url || "";
  const facebookUrl = footerSettings.contact_social_facebook || legacyContact.social?.facebook || legacyContact.facebook_url || "";

  const hasInstagram = isValidUrl(instagramUrl);
  const hasFacebook = isValidUrl(facebookUrl);
  const hasSocials = hasInstagram || hasFacebook;

  const logoAlt = getLocalizedValue(branding.logo_alt, "LayerLoot");
  const logoLeft = getLocalizedValue(branding.logo_text_left, "Layer");
  const logoRight = getLocalizedValue(branding.logo_text_right, "Loot");
  const description = getLocalizedValue(footerSettings.description, "");
  const quickLinksTitle = getLocalizedValue(footerSettings.quick_links_title, t("footer.quickLinks", "Quick Links"));
  const accountTitle = getLocalizedValue(footerSettings.account_title, t("footer.account", "Account"));
  const contactTitle = getLocalizedValue(footerSettings.contact_title, t("footer.contact", "Contact"));
  const authLinkLabel = getLocalizedValue(footerSettings.auth_link_label, t("footer.loginRegister", "Login / Register"));
  const accountLinkLabel = getLocalizedValue(footerSettings.account_link_label, t("footer.myAccount", "My Account"));
  const ordersLinkLabel = getLocalizedValue(footerSettings.orders_link_label, t("footer.orderHistory", "Order History"));
  const copyrightText = getLocalizedValue(footerSettings.copyright_text, t("footer.allRightsReserved", "All rights reserved."));

  const hasAnyContact = contactEmail || contactPhone || contactAddress;

  return (
    <>
      <GlobalSectionRenderer page="global_footer_top" />

      <motion.footer
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.08 }}
        transition={{ duration: 0.4 }}
        className="relative border-t border-border/10 bg-background/80 backdrop-blur-xl"
        style={footerHeight > 0 ? { minHeight: `${footerHeight}px` } : undefined}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="container py-8 md:py-16">
          <div className="grid gap-8 grid-cols-1 md:grid-cols-3 lg:grid-cols-5 md:gap-10">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="col-span-2 md:col-span-1">
              <Link to={branding.logo_link || "/"} className="mb-5 flex items-center gap-2.5 group">
                {branding.logo_image_url ? (
                  <img src={branding.logo_image_url} alt={logoAlt} style={{ height: `${logoHeight}px` }} className="w-auto object-contain" />
                ) : (
                  <>
                    {footerSettings.show_logo_icon !== false && <img src={logoImg} alt={logoAlt} style={{ height: `${logoHeight}px` }} className="w-auto object-contain" />}
                    {footerSettings.show_logo_text !== false && (
                      <span className="font-display text-xl font-bold uppercase tracking-wider text-foreground">
                        {logoLeft}<span className="gradient-text">{logoRight}</span>
                      </span>
                    )}
                  </>
                )}
              </Link>
              {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
            </motion.div>

            {footerSettings.show_quick_links !== false && (
              <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.04 }}>
                <button
                  className="mb-3 md:mb-5 flex w-full items-center justify-between font-display text-xs font-semibold uppercase tracking-[0.2em] text-foreground md:pointer-events-none"
                  onClick={() => isMobile && setOpenSections((s) => ({ ...s, quickLinks: !s.quickLinks }))}
                >
                  {quickLinksTitle}
                  <ChevronDown className={`h-4 w-4 md:hidden transition-transform ${openSections.quickLinks ? "rotate-180" : ""}`} />
                </button>
                <ul className={`space-y-2.5 text-sm text-muted-foreground ${isMobile && !openSections.quickLinks ? "hidden" : ""} md:block`}>
                  {footerLinks.map((link) => (
                    <li key={`${link.to}-${link.localizedLabel}`}>
                      <Link to={link.to} className="transition-all duration-200 hover:translate-x-1 hover:text-primary">{link.localizedLabel}</Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {footerSettings.show_account_links !== false && (
              <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }}>
                <button
                  className="mb-3 md:mb-5 flex w-full items-center justify-between font-display text-xs font-semibold uppercase tracking-[0.2em] text-foreground md:pointer-events-none"
                  onClick={() => isMobile && setOpenSections((s) => ({ ...s, account: !s.account }))}
                >
                  {accountTitle}
                  <ChevronDown className={`h-4 w-4 md:hidden transition-transform ${openSections.account ? "rotate-180" : ""}`} />
                </button>
                <ul className={`space-y-2.5 text-sm text-muted-foreground ${isMobile && !openSections.account ? "hidden" : ""} md:block`}>
                  <li><Link to="/auth" className="transition-all duration-200 hover:translate-x-1 hover:text-primary">{authLinkLabel}</Link></li>
                  <li><Link to="/account" className="transition-all duration-200 hover:translate-x-1 hover:text-primary">{accountLinkLabel}</Link></li>
                  <li><Link to="/account/orders" className="transition-all duration-200 hover:translate-x-1 hover:text-primary">{ordersLinkLabel}</Link></li>
                </ul>
              </motion.div>
            )}

            {footerSettings.show_policies !== false && (
              <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.10 }}>
                <button
                  className="mb-3 md:mb-5 flex w-full items-center justify-between font-display text-xs font-semibold uppercase tracking-[0.2em] text-foreground md:pointer-events-none"
                  onClick={() => isMobile && setOpenSections((s) => ({ ...s, policies: !s.policies }))}
                >
                  {getLocalizedValue(footerSettings.policies_title, t("footer.policies", "Policies"))}
                  <ChevronDown className={`h-4 w-4 md:hidden transition-transform ${openSections.policies ? "rotate-180" : ""}`} />
                </button>
                <ul className={`space-y-2.5 text-sm text-muted-foreground ${isMobile && !openSections.policies ? "hidden" : ""} md:block`}>
                  {(footerSettings.policy_links ?? []).map((link) => (
                    <li key={link.path}>
                      <Link to={link.path} className="transition-all duration-200 hover:translate-x-1 hover:text-primary">
                        {getLocalizedValue(link.label, typeof link.label === "string" ? link.label : "")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {footerSettings.show_contact_block !== false && (hasAnyContact || contactDescription || hasSocials) && (
              <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.12 }}>
                <h4 className="mb-5 font-display text-xs font-semibold uppercase tracking-[0.2em] text-foreground">{contactTitle}</h4>
                {contactDescription && <p className="mb-4 text-sm text-muted-foreground">{contactDescription}</p>}

                {hasAnyContact && (
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {contactEmail && (
                      <li className="flex items-start gap-2.5 transition-colors hover:text-primary">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                        <div className="min-w-0">
                          {emailLabel && <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">{emailLabel}</p>}
                          <a href={`mailto:${contactEmail}`} className="hover:text-primary break-all">{contactEmail}</a>
                        </div>
                      </li>
                    )}
                    {contactPhone && (
                      <li className="flex items-start gap-2.5">
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                        <div>
                          {phoneLabel && <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">{phoneLabel}</p>}
                          <p>{contactPhone}</p>
                        </div>
                      </li>
                    )}
                    {contactAddress && (
                      <li className="flex items-start gap-2.5">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                        <div>
                          {addressLabel && <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">{addressLabel}</p>}
                          <p>{contactAddress}</p>
                        </div>
                      </li>
                    )}
                  </ul>
                )}

                {hasSocials && (
                  <div className="mt-6">
                    {socialTitle && <p className="mb-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">{socialTitle}</p>}
                    <div className="flex items-center gap-3">
                      {hasInstagram && (
                        <motion.a whileTap={{ scale: 0.98 }} href={instagramUrl} target="_blank" rel="noreferrer"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/20 bg-card/30 text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:shadow-[0_0_20px_hsl(217_91%_60%/0.15)]"
                          aria-label={t("footer.instagram", "Instagram")}>
                          <Instagram className="h-4 w-4" />
                        </motion.a>
                      )}
                      {hasFacebook && (
                        <motion.a whileTap={{ scale: 0.98 }} href={facebookUrl} target="_blank" rel="noreferrer"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/20 bg-card/30 text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:shadow-[0_0_20px_hsl(217_91%_60%/0.15)]"
                          aria-label={t("footer.facebook", "Facebook")}>
                          <Facebook className="h-4 w-4" />
                        </motion.a>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <div className="mt-12 border-t border-border/10 pt-6 text-center text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} {logoLeft}{logoRight}. {copyrightText}
          </div>
        </div>
      </motion.footer>

      <GlobalSectionRenderer page="global_footer_bottom" />
    </>
  );
};

export default Footer;
