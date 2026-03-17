import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Mail, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavLinks } from "@/components/admin/NavLinkEditor";
import GlobalSectionRenderer from "@/components/layout/GlobalSectionRenderer";

type ContactSettings = {
  email?: string;
  phone?: string;
  address?: string;
};

type BrandingSettings = {
  logo_text_left?: string;
  logo_text_right?: string;
};

const defaultContact: ContactSettings = {
  email: "support@layerloot.lovable.app",
  phone: "+45 00 00 00 00",
  address: "Denmark",
};

const Footer = () => {
  const [contact, setContact] = useState<ContactSettings>(defaultContact);
  const [branding, setBranding] = useState<BrandingSettings>({
    logo_text_left: "Layer",
    logo_text_right: "Loot",
  });

  const navLinks = useNavLinks();

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
    ]).then(([contactRes, brandingRes]) => {
      if (contactRes.data?.value) {
        setContact({
          ...defaultContact,
          ...(contactRes.data.value as ContactSettings),
        });
      }

      if (brandingRes.data?.value) {
        setBranding((brandingRes.data.value as BrandingSettings) ?? {});
      }
    });
  }, []);

  const footerLinks = useMemo(() => navLinks.filter((link) => !!link.to && !!link.label).slice(0, 6), [navLinks]);

  return (
    <>
      <GlobalSectionRenderer page="global_footer_top" />

      <footer className="border-t border-border bg-secondary">
        <div className="container py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Link to="/" className="mb-4 flex items-center gap-2">
                <Layers className="h-6 w-6 text-primary" />
                <span className="font-display text-xl font-bold uppercase tracking-wider text-secondary-foreground">
                  {branding.logo_text_left || "Layer"}
                  <span className="text-primary">{branding.logo_text_right || "Loot"}</span>
                </span>
              </Link>

              <p className="text-sm text-muted-foreground">
                Premium 3D printing supplies and custom prints for makers, hobbyists, and professionals.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
                Quick Links
              </h4>

              <ul className="space-y-2 text-sm text-muted-foreground">
                {footerLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
                Account
              </h4>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/auth" className="hover:text-primary">
                    Login / Register
                  </Link>
                </li>
                <li>
                  <Link to="/account" className="hover:text-primary">
                    My Account
                  </Link>
                </li>
                <li>
                  <Link to="/account/orders" className="hover:text-primary">
                    Order History
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
                Contact
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
          </div>

          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {branding.logo_text_left || "Layer"}
            {branding.logo_text_right || "Loot"}. All rights reserved.
          </div>
        </div>
      </footer>

      <GlobalSectionRenderer page="global_footer_bottom" />
    </>
  );
};

export default Footer;
