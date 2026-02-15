import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, User, Menu, X, Layers, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/contact", label: "Contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { totalItems } = useCart();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-secondary">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Layers className="h-7 w-7 text-primary" />
          <span className="font-display text-2xl font-bold uppercase tracking-wider text-secondary-foreground">
            Layer<span className="text-primary">Loot</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-display text-sm uppercase tracking-widest transition-colors hover:text-primary ${
                location.pathname === link.to ? "text-primary" : "text-secondary-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative text-secondary-foreground hover:text-primary">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>

          {isAdmin && (
            <Link to="/admin/editor">
              <Button variant="ghost" size="icon" className="text-secondary-foreground hover:text-primary">
                <Shield className="h-5 w-5" />
              </Button>
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-secondary-foreground hover:text-primary">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/account" className="cursor-pointer">My Account</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer"><Shield className="mr-2 h-4 w-4" /> Admin Dashboard</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="icon" className="text-secondary-foreground hover:text-primary">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="text-secondary-foreground hover:text-primary md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-secondary px-4 pb-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block py-3 font-display text-sm uppercase tracking-widest transition-colors hover:text-primary ${
                location.pathname === link.to ? "text-primary" : "text-secondary-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <Link to="/account" onClick={() => setMobileOpen(false)} className="block py-3 font-display text-sm uppercase tracking-widest text-secondary-foreground hover:text-primary">
                My Account
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-3 font-display text-sm uppercase tracking-widest text-secondary-foreground hover:text-primary">
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;
