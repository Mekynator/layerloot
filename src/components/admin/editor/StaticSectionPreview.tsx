import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StaticSection } from "@/lib/static-page-sections";
import {
  Search, LayoutGrid, Mail, Image, Palette, Wrench, Star,
  Upload, ShoppingCart, User, Package, FileText,
} from "lucide-react";

/**
 * Renders a real-content preview for a static page section.
 * Read-only, no navigation, pointer-events disabled on interactive elements.
 */
const StaticSectionPreview = memo(function StaticSectionPreview({
  section,
}: {
  section: StaticSection;
}) {
  switch (section.previewType) {
    case "products_header":
      return <ProductsHeaderPreview />;
    case "products_grid":
      return <ProductsGridPreview />;
    case "contact_form":
      return <ContactFormPreview />;
    case "gallery_grid":
      return <GalleryPreview />;
    case "create_hero":
      return <CreateHeroPreview />;
    case "create_tools":
      return <CreateToolsPreview />;
    case "creations_gallery":
      return <CreationsPreview />;
    case "submit_form":
      return <SubmitFormPreview />;
    case "cart_view":
      return <CartPreview />;
    case "account_dashboard":
      return <AccountDashboardPreview />;
    case "order_tracking":
      return <OrderTrackingPreview />;
    default:
      return <FallbackPreview section={section} />;
  }
});

export default StaticSectionPreview;

/* ─── Preview Components ─── */

function ProductsHeaderPreview() {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name")
      .order("sort_order")
      .limit(6)
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  return (
    <div className="px-6 py-8 space-y-4">
      <h1 className="font-display text-3xl font-bold uppercase text-foreground">Our Products</h1>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <div className="h-10 w-full rounded-xl border border-border/40 bg-background/50 pl-10 flex items-center text-sm text-muted-foreground">
            Search products...
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">All</span>
          {categories.slice(0, 4).map(c => (
            <span key={c.id} className="rounded-full border border-border/40 bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductsGridPreview() {
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number; images: string[] }>>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price, images")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setProducts((data as any) ?? []));
  }, []);

  return (
    <div className="px-6 py-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.length === 0
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted/30 animate-pulse" />
            ))
          : products.map(p => (
              <div key={p.id} className="group space-y-2">
                <div className="aspect-square overflow-hidden rounded-2xl border border-border/30 bg-card/50">
                  <img
                    src={p.images?.[0] || "/placeholder.svg"}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="px-1">
                  <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs font-semibold text-primary">{p.price} kr</p>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

function ContactFormPreview() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Get In Touch</h1>
        <p className="text-muted-foreground">We'd love to hear from you</p>
      </div>
      <div className="rounded-2xl border border-border/30 bg-card/50 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <div className="h-10 rounded-lg border border-border/40 bg-background/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <div className="h-10 rounded-lg border border-border/40 bg-background/50" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <div className="h-10 rounded-lg border border-border/40 bg-background/50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Message</label>
          <div className="h-32 rounded-lg border border-border/40 bg-background/50" />
        </div>
        <div className="h-10 w-full rounded-lg bg-primary/80" />
      </div>
    </div>
  );
}

function GalleryPreview() {
  const [images, setImages] = useState<Array<{ id: string; image_url: string; product_name: string }>>([]);

  useEffect(() => {
    supabase
      .from("gallery_posts")
      .select("id, image_url, product_name")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(9)
      .then(({ data }) => setImages((data as any) ?? []));
  }, []);

  return (
    <div className="px-6 py-8 space-y-4">
      <h1 className="font-display text-3xl font-bold uppercase text-foreground text-center">Community Gallery</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted/30 animate-pulse" />
            ))
          : images.map(img => (
              <div key={img.id} className="aspect-square overflow-hidden rounded-2xl border border-border/30">
                <img src={img.image_url} alt={img.product_name} className="h-full w-full object-cover" />
              </div>
            ))}
      </div>
    </div>
  );
}

function CreateHeroPreview() {
  return (
    <div className="px-6 py-10 text-center space-y-4">
      <span className="inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
        Create Your Own
      </span>
      <h1 className="font-display text-4xl font-bold uppercase text-foreground">Bring Your Ideas to Life</h1>
      <p className="mx-auto max-w-lg text-muted-foreground">
        Choose from our creation tools below to design, customize, or submit your own 3D printed products.
      </p>
    </div>
  );
}

function CreateToolsPreview() {
  const tools = [
    { icon: Palette, title: "Product Configurator", desc: "Customize colors, sizes, and materials" },
    { icon: Image, title: "Lithophane Creator", desc: "Turn photos into 3D printed art" },
    { icon: Upload, title: "Submit Your Design", desc: "Upload your own 3D model" },
  ];
  return (
    <div className="px-6 py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tools.map((t, i) => (
          <div key={i} className="rounded-2xl border border-border/30 bg-card/50 p-6 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <t.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-sm font-bold uppercase text-foreground">{t.title}</h3>
            <p className="text-xs text-muted-foreground">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreationsPreview() {
  return (
    <div className="px-6 py-8 space-y-4">
      <h1 className="font-display text-3xl font-bold uppercase text-foreground text-center">Community Creations</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] rounded-2xl bg-muted/20 border border-border/20 flex items-center justify-center">
            <Star className="h-8 w-8 text-muted-foreground/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SubmitFormPreview() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Submit Your Design</h1>
        <p className="text-muted-foreground">Upload your 3D model and let us bring it to life</p>
      </div>
      <div className="rounded-2xl border border-border/30 bg-card/50 p-6 space-y-4">
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/40 py-12">
          <Upload className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Drag & drop your 3D model here</p>
          <p className="text-xs text-muted-foreground/70">.STL, .OBJ, .3MF supported</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <div className="h-24 rounded-lg border border-border/40 bg-background/50" />
        </div>
        <div className="h-10 w-full rounded-lg bg-primary/80" />
      </div>
    </div>
  );
}

function CartPreview() {
  return (
    <div className="px-6 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold uppercase text-foreground">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-4 rounded-2xl border border-border/30 bg-card/50 p-4">
              <div className="h-20 w-20 shrink-0 rounded-xl bg-muted/30" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-32 rounded bg-muted/30" />
                <div className="h-3 w-20 rounded bg-muted/20" />
                <div className="h-4 w-16 rounded bg-primary/20 mt-2" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/50 p-6 space-y-4 h-fit">
          <h3 className="font-display text-sm font-bold uppercase text-foreground">Order Summary</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>Subtotal</span><span>299 kr</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
            <div className="flex justify-between font-bold text-foreground border-t border-border/30 pt-2"><span>Total</span><span>299 kr</span></div>
          </div>
          <div className="h-10 w-full rounded-lg bg-primary/80" />
        </div>
      </div>
    </div>
  );
}

function AccountDashboardPreview() {
  return (
    <div className="px-6 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold uppercase text-foreground">My Account</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["Recent Orders", "Account Settings", "Rewards & Points"].map((title, i) => (
          <div key={i} className="rounded-2xl border border-border/30 bg-card/50 p-6 space-y-2">
            <User className="h-6 w-6 text-primary/60" />
            <h3 className="font-display text-sm font-bold uppercase text-foreground">{title}</h3>
            <div className="space-y-1.5">
              {[1, 2].map(j => (
                <div key={j} className="h-3 rounded bg-muted/20" style={{ width: `${60 + j * 15}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderTrackingPreview() {
  return (
    <div className="mx-auto max-w-lg px-6 py-10 space-y-6 text-center">
      <h1 className="font-display text-3xl font-bold uppercase text-foreground">Track Your Order</h1>
      <div className="rounded-2xl border border-border/30 bg-card/50 p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Order Number</label>
          <div className="h-10 rounded-lg border border-border/40 bg-background/50" />
        </div>
        <div className="h-10 w-full rounded-lg bg-primary/80" />
      </div>
    </div>
  );
}

function FallbackPreview({ section }: { section: StaticSection }) {
  return (
    <div className="flex items-center justify-center py-16 px-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30">
          <FileText className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="font-display text-sm font-semibold uppercase text-foreground/70">{section.label}</p>
        <p className="text-xs text-muted-foreground">{section.description}</p>
      </div>
    </div>
  );
}
