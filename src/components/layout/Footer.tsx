import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Instagram, Facebook } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";
import { useFooterNavLinks } from "@/components/admin/NavLinkEditor";
import GlobalSectionRenderer from "@/components/layout/GlobalSectionRenderer";

type ContactSettings = {
  email?: string;
  phone?: string;
  address?: string;
  contact_description?: string;
  email_label?: string;
  phone_label?: string;
  address_label?: string;
  instagram_url?: string;
  facebook_url?: string;
  social_title?: string;
};

type BrandingSettings = {
  logo_text_left?: string;
  logo_text_right?: string;
  logo_image_url?: string;
  logo_link?: string;
  logo_alt?: string;
};

type FooterSettings = {
  description?: string;
  quick_links_title?: string;
  account_title?: string;
  contact_title?: string;
  copyright_text?: string;
  show_quick_links?: boolean;
  show_account_links?: boolean;
  show_contact_block?: boolean;
  show_logo_icon?: boolean;
  show_logo_text?: boolean;
  logo_height_px?: number;
  auth_link_label?: string;
  account_link_label?: string;
  orders_link_label?: string;
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
        })),
    [footerNavLinks],
  );

  const logoHeight = Math.max(20, Number(footerSettings.logo_height_px || 32));
  const hasInstagram = isValidUrl(contact.instagram_url);
  const hasFacebook = isValidUrl(contact.facebook_url);
  const hasSocials = hasInstagram || hasFacebook;

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
                    alt={branding.logo_alt || "LayerLoot"}
                    style={{ height: `${logoHeight}px` }}
                    className="w-auto object-contain"
                  />
                ) : (
                  <>
                    {footerSettings.show_logo_icon && (
                      <img
                        src={logoImg}
                        alt="LayerLoot"
                        style={{ height: `${logoHeight}px` }}
                        className="w-auto object-contain"
                      />
                    )}
                    {footerSettings.show_logo_text && (
                      <span className="font-display text-xl font-bold uppercase tracking-wider text-secondary-foreground">
                        {branding.logo_text_left || "Layer"}
                        <span className="text-primary">{branding.logo_text_right || "Loot"}</span>
                      </span>
                    )}
                  </>
                )}
              </Link>

              <p className="text-sm text-muted-foreground">
                {footerSettings.description || defaultFooterSettings.description}
              </p>
            </motion.div>

            {footerSettings.show_quick_links && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.04 }}
              >
                <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
                  {footerSettings.quick_links_title || defaultFooterSettings.quick_links_title}
                </h4>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  {footerLinks.map((link) => (
                    <li key={`${link.label}-${link.to}`}>
                      <Link to={link.to} className="transition-all hover:translate-x-1 hover:text-primary">
                        {link.label}
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
                  {footerSettings.account_title || defaultFooterSettings.account_title}
                </h4>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link to="/auth" className="transition-all hover:translate-x-1 hover:text-primary">
                      {footerSettings.auth_link_label || defaultFooterSettings.auth_link_label}
                    </Link>
                  </li>
                  <li>
                    <Link to="/account" className="transition-all hover:translate-x-1 hover:text-primary">
                      {footerSettings.account_link_label || defaultFooterSettings.account_link_label}
                    </Link>
                  </li>
                  <li>
                    <Link to="/account/orders" className="transition-all hover:translate-x-1 hover:text-primary">
                      {footerSettings.orders_link_label || defaultFooterSettings.orders_link_label}
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
                  {footerSettings.contact_title || defaultFooterSettings.contact_title}
                </h4>

                {contact.contact_description && (
                  <p className="mb-4 text-sm text-muted-foreground">{contact.contact_description}</p>
                )}

                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2 transition-colors hover:text-primary">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {contact.email_label || defaultContact.email_label}
                      </p>
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
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {contact.phone_label || defaultContact.phone_label}
                      </p>
                      <p>{contact.phone || defaultContact.phone}</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {contact.address_label || defaultContact.address_label}
                      </p>
                      <p>{contact.address || defaultContact.address}</p>
                    </div>
                  </li>
                </ul>

                {hasSocials && (
                  <div className="mt-5">
                    <p className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {contact.social_title || defaultContact.social_title}
                    </p>

                    <div className="flex items-center gap-3">
                      {hasInstagram && (
                        <motion.a
                          whileHover={{ y: -2, scale: 1.04 }}
                          whileTap={{ scale: 0.98 }}
                          href={contact.instagram_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          aria-label="Instagram"
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
                          aria-label="Facebook"
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
            © {new Date().getFullYear()} {branding.logo_text_left || "Layer"}
            {branding.logo_text_right || "Loot"}.{" "}
            {footerSettings.copyright_text || defaultFooterSettings.copyright_text}
          </div>
        </div>
      </motion.footer>

      <GlobalSectionRenderer page="global_footer_bottom" />
    </>
  );
};

export default Footer;
