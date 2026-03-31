import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Instagram, Facebook } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";
import { useFooterNavLinks } from "@/components/admin/NavLinkEditor";
import GlobalSectionRenderer from "@/components/layout/GlobalSectionRenderer";

type LocalizedText = string | Record<string, string>;

type ContactSettings = {
  email?: string;
  phone?: string;
  address?: LocalizedText;
  contact_description?: LocalizedText;
  email_label?: LocalizedText;
  phone_label?: LocalizedText;
  address_label?: LocalizedText;
  instagram_url?: string;
  facebook_url?: string;
  social_title?: LocalizedText;
};

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
  copyright_text?: LocalizedText;
  show_quick_links?: boolean;
  show_account_links?: boolean;
  show_contact_block?: boolean;
  show_logo_icon?: boolean;
  show_logo_text?: boolean;
  logo_height_px?: number;
  auth_link_label?: LocalizedText;
  account_link_label?: LocalizedText;
  orders_link_label?: LocalizedText;
};

const defaultContact: ContactSettings = {
  email: "support@layerloot.lovable.app",
  phone: "+45 00 00 00 00",
  address: "Denmark",
  contact_description: "Questions, custom requests, or order help? Reach out anytime.",
  email_label: "Email",
  phone_label: "Phone",
  address_label: "Address",
  instagram_url: "",
  facebook_url: "",
  social_title: "Follow us",
};

const defaultFooterSettings: FooterSettings = {
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

const normalizePath = (value?: string | null) => {
  if (!value) return "/";
  if (value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
};

const isValidUrl = (value?: string | null) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
  const [contact, setContact] = useState<ContactSettings>(defaultContact);
  const [branding, setBranding] = useState<BrandingSettings>({
    logo_text_left: "Layer",
    logo_text_right: "Loot",
    logo_image_url: "",
    logo_link: "/",
    logo_alt: "LayerLoot",
  });
  const [footerSettings, setFooterSettings] = useState<FooterSettings>(defaultFooterSettings);

  const footerNavLinks = useFooterNavLinks();

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "footer_settings").maybeSingle(),
    ]).then(([contactRes, brandingRes, footerRes]) => {
      if (contactRes.data?.value) {
        setContact({
          ...defaultContact,
          ...(contactRes.data.value as ContactSettings),
        });
      }

      if (brandingRes.data?.value) {
        setBranding((prev) => ({
          ...prev,
          ...(brandingRes.data.value as BrandingSettings),
        }));
      }

      if (footerRes.data?.value) {
        setFooterSettings({
          ...defaultFooterSettings,
          ...(footerRes.data.value as FooterSettings),
        });
      }
    });
  }, []);

  const footerLinks = useMemo(
    () =>
      footerNavLinks
        .filter((link) => !!link.to && !!link.label)
        .slice(0, 8)
        .map((link) => ({
          ...link,
          to: normalizePath(link.to),
          localizedLabel: getLocalizedValue(link.label, typeof link.label === "string" ? link.label : ""),
        })),
    [footerNavLinks, i18n.resolvedLanguage, i18n.language],
  );

  const logoHeight = Math.max(20, Number(footerSettings.logo_height_px || 32));
  const hasInstagram = isValidUrl(contact.instagram_url);
  const hasFacebook = isValidUrl(contact.facebook_url);
  const hasSocials = hasInstagram || hasFacebook;

  const logoAlt = getLocalizedValue(branding.logo_alt, "LayerLoot");
  const logoLeft = getLocalizedValue(branding.logo_text_left, "Layer");
  const logoRight = getLocalizedValue(branding.logo_text_right, "Loot");

  const description = getLocalizedValue(
    footerSettings.description,
    t("footer.description", "Premium 3D printing supplies and custom prints for makers, hobbyists, and professionals."),
  );

  const quickLinksTitle = getLocalizedValue(footerSettings.quick_links_title, t("footer.quickLinks", "Quick Links"));
  const accountTitle = getLocalizedValue(footerSettings.account_title, t("footer.account", "Account"));
  const contactTitle = getLocalizedValue(footerSettings.contact_title, t("footer.contact", "Contact"));
  const authLinkLabel = getLocalizedValue(
    footerSettings.auth_link_label,
    t("footer.loginRegister", "Login / Register"),
  );
  const accountLinkLabel = getLocalizedValue(footerSettings.account_link_label, t("footer.myAccount", "My Account"));
  const ordersLinkLabel = getLocalizedValue(
    footerSettings.orders_link_label,
    t("footer.orderHistory", "Order History"),
  );
  const contactDescription = getLocalizedValue(
    contact.contact_description,
    t("footer.contactDescription", "Questions, custom requests, or order help? Reach out anytime."),
  );
  const emailLabel = getLocalizedValue(contact.email_label, t("footer.email", "Email"));
  const phoneLabel = getLocalizedValue(contact.phone_label, t("footer.phone", "Phone"));
  const addressLabel = getLocalizedValue(contact.address_label, t("footer.address", "Address"));
  const socialTitle = getLocalizedValue(contact.social_title, t("footer.followUs", "Follow us"));
  const addressText = getLocalizedValue(contact.address, "Denmark");
  const copyrightText = getLocalizedValue(
    footerSettings.copyright_text,
    t("footer.allRightsReserved", "All rights reserved."),
  );

  return (
    <>
      <GlobalSectionRenderer page="global_footer_top" />

      <motion.footer
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.08 }}
        transition={{ duration: 0.4 }}
        className="border-t border-border bg-secondary"
      >
        <div className="container py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Link to={branding.logo_link || "/"} className="mb-4 flex items-center gap-2">
                {branding.logo_image_url ? (
                  <img
                    src={branding.logo_image_url}
                    alt={logoAlt}
                    style={{ height: `${logoHeight}px` }}
                    className="w-auto object-contain"
                  />
                ) : (
                  <>
                    {footerSettings.show_logo_icon && (
                      <img
                        src={logoImg}
                        alt={logoAlt}
                        style={{ height: `${logoHeight}px` }}
                        className="w-auto object-contain"
                      />
                    )}
                    {footerSettings.show_logo_text && (
                      <span className="font-display text-xl font-bold uppercase tracking-wider text-secondary-foreground">
                        {logoLeft}
                        <span className="text-primary">{logoRight}</span>
                      </span>
                    )}
                  </>
                )}
              </Link>

              <p className="text-sm text-muted-foreground">{description}</p>
            </motion.div>

            {footerSettings.show_quick_links && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.04 }}
              >
                <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
                  {quickLinksTitle}
                </h4>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  {footerLinks.map((link) => (
                    <li key={`${link.to}-${link.localizedLabel}`}>
                      <Link to={link.to} className="transition-all hover:translate-x-1 hover:text-primary">
                        {link.localizedLabel}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {footerSettings.show_account_links && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 }}
              >
                <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
                  {accountTitle}
                </h4>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link to="/auth" className="transition-all hover:translate-x-1 hover:text-primary">
                      {authLinkLabel}
                    </Link>
                  </li>
                  <li>
                    <Link to="/account" className="transition-all hover:translate-x-1 hover:text-primary">
                      {accountLinkLabel}
                    </Link>
                  </li>
                  <li>
                    <Link to="/account/orders" className="transition-all hover:translate-x-1 hover:text-primary">
                      {ordersLinkLabel}
                    </Link>
                  </li>
                </ul>
              </motion.div>
            )}

            {footerSettings.show_contact_block && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.12 }}
              >
                <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
                  {contactTitle}
                </h4>

                {contactDescription && <p className="mb-4 text-sm text-muted-foreground">{contactDescription}</p>}

                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2 transition-colors hover:text-primary">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{emailLabel}</p>
                      <a
                        href={`mailto:${contact.email || defaultContact.email}`}
                        className="hover:text-primary break-all"
                      >
                        {contact.email || defaultContact.email}
                      </a>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{phoneLabel}</p>
                      <p>{contact.phone || defaultContact.phone}</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{addressLabel}</p>
                      <p>{addressText}</p>
                    </div>
                  </li>
                </ul>

                {hasSocials && (
                  <div className="mt-5">
                    <p className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">{socialTitle}</p>

                    <div className="flex items-center gap-3">
                      {hasInstagram && (
                        <motion.a
                          whileHover={{ y: -2, scale: 1.04 }}
                          whileTap={{ scale: 0.98 }}
                          href={contact.instagram_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          aria-label={t("footer.instagram", "Instagram")}
                        >
                          <Instagram className="h-4 w-4" />
                        </motion.a>
                      )}

                      {hasFacebook && (
                        <motion.a
                          whileHover={{ y: -2, scale: 1.04 }}
                          whileTap={{ scale: 0.98 }}
                          href={contact.facebook_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          aria-label={t("footer.facebook", "Facebook")}
                        >
                          <Facebook className="h-4 w-4" />
                        </motion.a>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {logoLeft}
            {logoRight}. {copyrightText}
          </div>
        </div>
      </motion.footer>

      <GlobalSectionRenderer page="global_footer_bottom" />
    </>
  );
};

export default Footer;
