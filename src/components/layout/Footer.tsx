import { Link } from "react-router-dom";
import { Layers, Mail, MapPin, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-secondary">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="mb-4 flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <span className="font-display text-xl font-bold uppercase tracking-wider text-secondary-foreground">
                Layer<span className="text-primary">Loot</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Premium 3D printing supplies and custom prints for makers, hobbyists, and professionals.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/products" className="hover:text-primary">Products</Link></li>
              <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
              <li><Link to="/cart" className="hover:text-primary">Cart</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
              Account
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-primary">Login / Register</Link></li>
              <li><Link to="/account" className="hover:text-primary">My Account</Link></li>
              <li><Link to="/account/orders" className="hover:text-primary">Order History</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
              Contact
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:support@layerloot.lovable.app" className="hover:text-primary">support@layerloot.lovable.app</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                +1 (555) 123-4567
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Maker District, CA
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} LayerLoot. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
