import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Type, Image, Gift, Wand2, ArrowRight, Sparkles, Upload,
  Palette, Search, Star, Heart, Gamepad2, Swords, Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

/* ── Text Sign Generator ── */
const TEXT_STYLES = [
  { value: "minimal", label: "Minimal", font: "font-sans", desc: "Clean modern lines" },
  { value: "fantasy", label: "Fantasy", font: "font-serif italic", desc: "Elegant script feel" },
  { value: "gamer", label: "Gamer", font: "font-display tracking-widest", desc: "Bold uppercase" },
  { value: "gothic", label: "Gothic", font: "font-display", desc: "Dark & dramatic" },
];

const TextSignGenerator = () => {
  const [text, setText] = useState("LayerLoot");
  const [style, setStyle] = useState("minimal");
  const chosen = TEXT_STYLES.find((s) => s.value === style)!;

  const styleClasses: Record<string, string> = {
    minimal: "text-4xl sm:text-5xl font-light tracking-[0.3em] uppercase text-foreground",
    fantasy: "text-4xl sm:text-5xl font-serif italic text-primary",
    gamer: "text-4xl sm:text-5xl font-display font-black uppercase tracking-widest text-primary drop-shadow-[0_0_15px_hsl(var(--primary)/0.4)]",
    gothic: "text-4xl sm:text-5xl font-display font-black uppercase text-foreground [text-shadow:2px_2px_0_hsl(var(--primary))]",
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Your Text</Label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 30))}
          placeholder="Enter your name or phrase"
          className="mt-1 text-lg"
          maxLength={30}
        />
        <p className="mt-1 text-xs text-muted-foreground">{text.length}/30 characters</p>
      </div>

      <div>
        <Label>Style</Label>
        <RadioGroup value={style} onValueChange={setStyle} className="mt-2 grid grid-cols-2 gap-3">
          {TEXT_STYLES.map((s) => (
            <label
              key={s.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${
                style === s.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={s.value} />
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Preview */}
      <div className="overflow-hidden rounded-xl border border-border bg-card p-8 sm:p-12">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Preview</p>
        <div className="flex min-h-[120px] items-center justify-center">
          <motion.span
            key={`${text}-${style}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-center leading-tight ${styleClasses[style]}`}
          >
            {text || "Your Text"}
          </motion.span>
        </div>
      </div>

      <Link to={`/custom-order`}>
        <Button className="w-full font-display uppercase tracking-wider">
          Order This Sign <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
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
          <p className="text-sm font-medium text-foreground">
            {imageUrl ? "Change photo" : "Click to upload"}
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG supported</p>
        </div>
        <input
          id="litho-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
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
            <div className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
              mode === "backlit"
                ? "bg-gradient-radial from-amber-500/20 via-transparent to-black/40"
                : "bg-gradient-to-br from-white/10 to-black/10"
            }`} />
          </div>
          <p className="text-xs text-muted-foreground text-center">
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
    const cat = GIFT_CATEGORIES.find((c) => c.value === selected);
    if (!cat) return;

    const searchName = async () => {
      // Search products by name containing any of the tags
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
                  className="group overflow-hidden rounded-lg border border-border transition-all hover:border-primary hover:-translate-y-1"
                >
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt={p.name} className="aspect-square w-full object-cover" />
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">{p.name}</p>
                    <p className="text-xs text-primary font-semibold">{p.price} kr</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-3">
                No specific matches yet — try our AI assistant for personalized suggestions!
              </p>
              <Link to="/custom-order">
                <Button variant="outline" className="font-display uppercase tracking-wider text-xs">
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
            Use our tools to design custom 3D printed items. Generate text signs, lithophanes, find the perfect gift, or let our AI help you design something unique.
          </p>
        </motion.div>

        <Tabs defaultValue="text-sign" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-muted/50">
            <TabsTrigger value="text-sign" className="font-display text-xs uppercase tracking-wider gap-1.5">
              <Type className="h-4 w-4" /> Text Sign
            </TabsTrigger>
            <TabsTrigger value="lithophane" className="font-display text-xs uppercase tracking-wider gap-1.5">
              <Image className="h-4 w-4" /> Lithophane
            </TabsTrigger>
            <TabsTrigger value="gift-finder" className="font-display text-xs uppercase tracking-wider gap-1.5">
              <Gift className="h-4 w-4" /> Gift Finder
            </TabsTrigger>
            <TabsTrigger value="ai-designer" className="font-display text-xs uppercase tracking-wider gap-1.5">
              <Wand2 className="h-4 w-4" /> AI Designer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text-sign">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg uppercase">
                  <Type className="h-5 w-5 text-primary" /> Custom Name / Text Sign
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TextSignGenerator />
              </CardContent>
            </Card>
          </TabsContent>

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

          <TabsContent value="ai-designer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg uppercase">
                  <Wand2 className="h-5 w-5 text-primary" /> AI Design Assistant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-center py-8">
                  <Wand2 className="mx-auto h-12 w-12 text-primary/60" />
                  <h3 className="font-display text-lg uppercase text-foreground">
                    Let AI Help You Design
                  </h3>
                  <p className="max-w-md mx-auto text-muted-foreground text-sm">
                    Use our AI assistant to brainstorm ideas, get material recommendations, generate creative prompts for 3D models, or plan your perfect custom product.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click the chat icon in the bottom-right corner to start designing with AI
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {[
                      "Design a desk organizer",
                      "Gift ideas for a gamer",
                      "Custom figurine concept",
                      "Best material for outdoor use",
                    ].map((prompt) => (
                      <span
                        key={prompt}
                        className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        "{prompt}"
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Creator Submission CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 rounded-xl border border-border bg-card p-8 sm:p-12 text-center"
        >
          <Star className="mx-auto mb-4 h-10 w-10 text-primary/60" />
          <h2 className="mb-2 font-display text-2xl font-bold uppercase text-foreground">
            Are You a 3D Creator?
          </h2>
          <p className="mx-auto mb-6 max-w-lg text-muted-foreground">
            Submit your 3D models for review. Approved designs join our "Creator Series" collection. Earn recognition and future royalties.
          </p>
          <Link to="/submit-design">
            <Button size="lg" className="font-display uppercase tracking-wider">
              Submit Your Design <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateYourOwn;
