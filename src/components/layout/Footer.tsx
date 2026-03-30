import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";
import { useFooterNavLinks } from "@/components/admin/NavLinkEditor";
import GlobalSectionRenderer from "@/components/layout/GlobalSectionRenderer";

type ContactSettings = {
  email?: string;
  phone?: string;
  address?: string;
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

const Footer = () => {
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

  return (
    <>
      <GlobalSectionRenderer page="global_footer_top" />

      <footer className="border-t border-border bg-secondary">
        <div className="container py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
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
                    {footerSettings.show_logo_icon && <img src={logoImg} alt="LayerLoot" style={{ height: `${logoHeight}px` }} className="w-auto object-contain" />}
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
            </div>

            {footerSettings.show_quick_links && (
              <div>
                <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
                  {footerSettings.quick_links_title || defaultFooterSettings.quick_links_title}
                </h4>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  {footerLinks.map((link) => (
                    <li key={`${link.label}-${link.to}`}>
                      <Link to={link.to} className="hover:text-primary">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {footerSettings.show_account_links && (
              <div>
                <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
                  {footerSettings.account_title || defaultFooterSettings.account_title}
                </h4>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link to="/auth" className="hover:text-primary">
                      {footerSettings.auth_link_label || defaultFooterSettings.auth_link_label}
                    </Link>
                  </li>
                  <li>
                    <Link to="/account" className="hover:text-primary">
                      {footerSettings.account_link_label || defaultFooterSettings.account_link_label}
                    </Link>
                  </li>
                  <li>
                    <Link to="/account/orders" className="hover:text-primary">
                      {footerSettings.orders_link_label || defaultFooterSettings.orders_link_label}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {footerSettings.show_contact_block && (
              <div>
                <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
                  {footerSettings.contact_title || defaultFooterSettings.contact_title}
                </h4>

                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <a href={`mailto:${contact.email || defaultContact.email}`} className="hover:text-primary">
                      {contact.email || defaultContact.email}
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    {contact.phone || defaultContact.phone}
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {contact.address || defaultContact.address}
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {branding.logo_text_left || "Layer"}
            {branding.logo_text_right || "Loot"}.{" "}
            {footerSettings.copyright_text || defaultFooterSettings.copyright_text}
          </div>
        </div>
      </footer>

      <GlobalSectionRenderer page="global_footer_bottom" />
    </>
  );
};

export default Footer;
