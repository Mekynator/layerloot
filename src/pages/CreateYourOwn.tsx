import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Image, Gift, ArrowRight, Sparkles, Heart, Gamepad2, Swords, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

/* ── Lithophane Generator ── */
const LithophaneGenerator = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"daylight" | "backlit">("daylight");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Upload a Photo</Label>
        <div
          className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary"
          onClick={() => document.getElementById("litho-upload")?.click()}
        >
          <Image className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{imageUrl ? "Change photo" : "Click to upload"}</p>
          <p className="text-xs text-muted-foreground">JPG, PNG supported</p>
        </div>
        <input id="litho-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      </div>

      {imageUrl && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === "daylight" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("daylight")}
              className="font-display text-xs uppercase"
            >
              Daylight View
            </Button>
            <Button
              variant={mode === "backlit" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("backlit")}
              className="font-display text-xs uppercase"
            >
              Backlit View
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-border">
            <img
              src={imageUrl}
              alt="Lithophane preview"
              className={`aspect-square w-full object-cover transition-all duration-500 ${
                mode === "daylight"
                  ? "grayscale brightness-110 contrast-75 sepia-[0.2]"
                  : "grayscale-0 brightness-125 contrast-125 saturate-50 [filter:grayscale(1)_brightness(1.3)_contrast(1.4)_invert(1)]"
              }`}
            />
            <div
              className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
                mode === "backlit"
                  ? "bg-gradient-radial from-amber-500/20 via-transparent to-black/40"
                  : "bg-gradient-to-br from-white/10 to-black/10"
              }`}
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "daylight"
              ? "How the lithophane looks in normal light — subtle embossed texture"
              : "How the lithophane glows when backlit — photo becomes visible"}
          </p>

          <Link to="/custom-order">
            <Button className="w-full font-display uppercase tracking-wider">
              Order Lithophane <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
};

/* ── Gift Finder ── */
const GIFT_CATEGORIES = [
  { value: "gamer", label: "Gamer", icon: Gamepad2, tags: ["gaming", "controller", "miniature"] },
  { value: "fantasy", label: "Fantasy Fan", icon: Swords, tags: ["dragon", "fantasy", "miniature", "figurine"] },
  { value: "desk", label: "Desk Decoration", icon: Monitor, tags: ["desk", "organizer", "decoration", "stand"] },
  { value: "personalized", label: "Personalized Gift", icon: Heart, tags: ["custom", "name", "sign", "personalized"] },
];

const GiftFinder = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);

    const searchName = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, images, is_featured")
        .eq("is_active", true)
        .limit(8);

      setProducts(data ?? []);
      setLoading(false);
    };

    searchName();
  }, [selected]);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Who are you shopping for?</p>

      <div className="grid grid-cols-2 gap-3">
        {GIFT_CATEGORIES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setSelected(value)}
            className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
              selected === value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <Icon className="h-6 w-6 text-primary" />
            <span className="font-display text-sm uppercase tracking-wider">{label}</span>
          </button>
        ))}
      </div>

      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Searching...</div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => (
                <Link
                  key={p.id}
                  to={`/products/${p.slug}`}
                  className="group overflow-hidden rounded-lg border border-border transition-all hover:-translate-y-1 hover:border-primary"
                >
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt={p.name} className="aspect-square w-full object-cover" />
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">{p.name}</p>
                    <p className="text-xs font-semibold text-primary">{p.price} kr</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="mb-3 text-muted-foreground">No specific matches yet — try a custom order instead.</p>
              <Link to="/custom-order">
                <Button variant="outline" className="font-display text-xs uppercase tracking-wider">
                  Request a Custom Gift
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

/* ── Main Page ── */
const CreateYourOwn = () => {
  return (
    <div className="py-8 lg:py-12">
      <div className="container max-w-5xl">
        <motion.div {...fadeUp}>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display text-sm uppercase tracking-widest text-primary">Design Studio</span>
          </div>

          <h1 className="mb-2 font-display text-3xl font-bold uppercase text-foreground lg:text-5xl">
            Create Your <span className="text-primary">Own</span>
          </h1>

          <p className="mb-8 max-w-xl text-muted-foreground">
            Use our tools to design custom 3D printed items. Upload a photo for a lithophane or explore gift ideas for
            different interests.
          </p>
        </motion.div>

        <Tabs defaultValue="lithophane" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="lithophane" className="gap-1.5 font-display text-xs uppercase tracking-wider">
              <Image className="h-4 w-4" /> Lithophane
            </TabsTrigger>
            <TabsTrigger value="gift-finder" className="gap-1.5 font-display text-xs uppercase tracking-wider">
              <Gift className="h-4 w-4" /> Gift Finder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lithophane">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg uppercase">
                  <Image className="h-5 w-5 text-primary" /> Lithophane Generator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LithophaneGenerator />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gift-finder">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg uppercase">
                  <Gift className="h-5 w-5 text-primary" /> Gift Finder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GiftFinder />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreateYourOwn;
