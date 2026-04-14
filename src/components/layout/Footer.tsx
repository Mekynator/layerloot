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

/* ─── Animated footer link ─── */
const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="relative inline-block text-muted-foreground transition-all duration-200 hover:translate-x-0.5 hover:text-primary after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-primary/60 after:transition-all after:duration-300 hover:after:w-full"
  >
    {children}
  </Link>
);

const Footer = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [branding, setBranding] = useState<BrandingSettings>({ logo_text_left: "Layer", logo_text_right: "Loot", logo_image_url: "", logo_link: "/", logo_alt: "LayerLoot" });
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({});
  const [legacyContact, setLegacyContact] = useState<ContactSettings>({});
  const [hasPolicies, setHasPolicies] = useState(false);
  const footerNavLinks = useFooterNavLinks();

  useEffect(() => {
    Promise.all([
      fetchPublishedSettings(["branding", "footer_settings", "contact"]),
      supabase.from("policies").select("id").eq("is_visible", true).limit(1),
    ]).then(([settings, policiesRes]) => {
      if (settings.branding) setBranding((prev) => ({ ...prev, ...(settings.branding as BrandingSettings) }));
      if (settings.footer_settings) setFooterSettings(settings.footer_settings as FooterSettings);
      if (settings.contact) setLegacyContact(settings.contact as ContactSettings);
      setHasPolicies((policiesRes.data?.length ?? 0) > 0);
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

  const logoHeight = Math.max(20, Number(footerSettings.logo_height_px || 28));
  const footerHeight = Number(footerSettings.footer_height_px || 0);

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

  /* Column header – collapsible on mobile */
  const SectionHeader = ({ title, sectionKey }: { title: string; sectionKey: string }) => (
    <button
      className="mb-2 md:mb-3 flex w-full items-center justify-between font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground md:pointer-events-none"
      onClick={() => isMobile && setOpenSections((s) => ({ ...s, [sectionKey]: !s[sectionKey] }))}
    >
      {title}
      <ChevronDown className={`h-3.5 w-3.5 md:hidden transition-transform duration-200 ${openSections[sectionKey] ? "rotate-180" : ""}`} />
    </button>
  );

  const sectionVisible = (key: string) => isMobile ? !!openSections[key] : true;

  return (
    <>
      <GlobalSectionRenderer page="global_footer_top" />

      {/* Separator gradient line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <motion.footer
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.35 }}
        className="relative bg-background/80 backdrop-blur-xl"
        style={footerHeight > 0 ? { minHeight: `${footerHeight}px` } : undefined}
      >
        <div className="container py-5 md:py-8">
          <div className="grid gap-5 grid-cols-1 md:grid-cols-4 lg:grid-cols-5 md:gap-6">
            {/* Brand column */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-1"
            >
              <Link to={branding.logo_link || "/"} className="mb-3 flex items-center gap-2 group">
                {branding.logo_image_url ? (
                  <img src={branding.logo_image_url} alt={logoAlt} style={{ height: `${logoHeight}px` }} className="w-auto object-contain" />
                ) : (
                  <>
                    {footerSettings.show_logo_icon !== false && <img src={logoImg} alt={logoAlt} style={{ height: `${logoHeight}px` }} className="w-auto object-contain" />}
                    {footerSettings.show_logo_text !== false && (
                      <span className="font-display text-lg font-bold uppercase tracking-wider text-foreground">
                        {logoLeft}<span className="gradient-text">{logoRight}</span>
                      </span>
                    )}
                  </>
                )}
              </Link>
              {description && <p className="text-xs leading-relaxed text-muted-foreground/80 max-w-[200px]">{description}</p>}

              {/* Socials inline with brand */}
              {hasSocials && (
                <div className="mt-3 flex items-center gap-2">
                  {socialTitle && <p className="mr-1 text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60">{socialTitle}</p>}
                  {hasInstagram && (
                    <motion.a
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/15 bg-card/20 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                      aria-label={t("footer.instagram", "Instagram")}
                    >
                      <Instagram className="h-3.5 w-3.5" />
                    </motion.a>
                  )}
                  {hasFacebook && (
                    <motion.a
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      href={facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/15 bg-card/20 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                      aria-label={t("footer.facebook", "Facebook")}
                    >
                      <Facebook className="h-3.5 w-3.5" />
                    </motion.a>
                  )}
                </div>
              )}
            </motion.div>

            {/* Quick Links */}
            {footerSettings.show_quick_links !== false && (
              <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.04 }}>
                <SectionHeader title={quickLinksTitle} sectionKey="quickLinks" />
                <ul className={`space-y-1.5 text-xs ${!sectionVisible("quickLinks") ? "hidden" : ""} md:block`}>
                  {footerLinks.map((link) => (
                    <li key={`${link.to}-${link.localizedLabel}`}>
                      <FooterLink to={link.to}>{link.localizedLabel}</FooterLink>
                    </li>
                  ))}
                  {/* Single Policies link instead of listing all */}
                  {footerSettings.show_policies !== false && hasPolicies && (
                    <li>
                      <FooterLink to="/policies">
                        {getLocalizedValue(footerSettings.policies_title, t("footer.policies", "Policies"))}
                      </FooterLink>
                    </li>
                  )}
                </ul>
              </motion.div>
            )}

            {/* Account */}
            {footerSettings.show_account_links !== false && (
              <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}>
                <SectionHeader title={accountTitle} sectionKey="account" />
                <ul className={`space-y-1.5 text-xs ${!sectionVisible("account") ? "hidden" : ""} md:block`}>
                  <li><FooterLink to="/auth">{authLinkLabel}</FooterLink></li>
                  <li><FooterLink to="/account">{accountLinkLabel}</FooterLink></li>
                  <li><FooterLink to="/account/orders">{ordersLinkLabel}</FooterLink></li>
                </ul>
              </motion.div>
            )}

            {/* Contact – compact */}
            {footerSettings.show_contact_block !== false && (hasAnyContact || contactDescription) && (
              <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }} className="md:col-span-1 lg:col-span-2">
                <h4 className="mb-2 md:mb-3 font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground">{contactTitle}</h4>
                {contactDescription && <p className="mb-2 text-xs text-muted-foreground/80">{contactDescription}</p>}

                {hasAnyContact && (
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {contactEmail && (
                      <li className="flex items-center gap-2 transition-colors duration-200 hover:text-primary">
                        <Mail className="h-3 w-3 shrink-0 text-primary/60" />
                        <div className="min-w-0">
                          {emailLabel && <span className="mr-1 text-[9px] uppercase tracking-wider text-muted-foreground/50">{emailLabel}</span>}
                          <a href={`mailto:${contactEmail}`} className="hover:text-primary break-all">{contactEmail}</a>
                        </div>
                      </li>
                    )}
                    {contactPhone && (
                      <li className="flex items-center gap-2">
                        <Phone className="h-3 w-3 shrink-0 text-primary/60" />
                        <div>
                          {phoneLabel && <span className="mr-1 text-[9px] uppercase tracking-wider text-muted-foreground/50">{phoneLabel}</span>}
                          <span>{contactPhone}</span>
                        </div>
                      </li>
                    )}
                    {contactAddress && (
                      <li className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
                        <div>
                          {addressLabel && <span className="mr-1 text-[9px] uppercase tracking-wider text-muted-foreground/50">{addressLabel}</span>}
                          <span>{contactAddress}</span>
                        </div>
                      </li>
                    )}
                  </ul>
                )}
              </motion.div>
            )}
          </div>

          {/* Copyright – tighter */}
          <div className="mt-5 border-t border-border/8 pt-3 text-center text-[10px] text-muted-foreground/50">
            © {new Date().getFullYear()} {logoLeft}{logoRight}. {copyrightText}
          </div>
        </div>
      </motion.footer>

      <GlobalSectionRenderer page="global_footer_bottom" />
    </>
  );
};

export default Footer;
