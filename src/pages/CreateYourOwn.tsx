import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Image,
  Gift,
  ArrowRight,
  Sparkles,
  Heart,
  Gamepad2,
  Swords,
  Monitor,
  Upload,
  Send,
  Box,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ModelViewer from "@/components/ModelViewer";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const ACCEPTED_EXTENSIONS = ".stl,.obj,.3mf";

const MATERIALS = [
  { value: "pla", label: "PLA", desc: "Standard, biodegradable" },
  { value: "abs", label: "ABS", desc: "Strong, heat-resistant" },
  { value: "petg", label: "PETG", desc: "Durable, flexible" },
  { value: "tpu", label: "TPU", desc: "Flexible, rubber-like" },
  { value: "resin", label: "Resin", desc: "High detail, smooth" },
];

const COLORS = [
  { value: "white", label: "White", hex: "#f5f5f5" },
  { value: "black", label: "Black", hex: "#1a1a1a" },
  { value: "red", label: "Red", hex: "#ef4444" },
  { value: "blue", label: "Blue", hex: "#3b82f6" },
  { value: "green", label: "Green", hex: "#22c55e" },
  { value: "yellow", label: "Yellow", hex: "#eab308" },
  { value: "orange", label: "Orange", hex: "#f97316" },
  { value: "gray", label: "Gray", hex: "#6b7280" },
];

const QUALITIES = [
  { value: "high", label: "High", desc: "0.2mm – Fine detail" },
  { value: "standard", label: "Standard", desc: "0.4mm – Balanced" },
  { value: "moderate", label: "Moderate", desc: "0.6mm – Faster print" },
  { value: "low", label: "Low", desc: "0.8mm – Lowest detail" },
];

type ToolReview = {
  id: string;
  title: string | null;
  comment: string | null;
  rating: number;
  created_at: string;
};

const getUserDisplayName = (user: any) => {
  if (!user) return "";
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.first_name ||
    ""
  );
};

const ReviewSection = ({ toolType, title }: { toolType: "custom-print" | "lithophane"; title: string }) => {
  const [reviews, setReviews] = useState<ToolReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("product_reviews")
        .select("id, title, comment, rating, created_at")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error) {
        setReviews(data ?? []);
      }

      setLoading(false);
    };

    fetchReviews();
  }, [toolType]);

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-bold uppercase text-foreground">{title}</h3>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">No reviews yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{review.title || "Verified Customer"}</p>
                <div className="flex gap-1">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Lithophane Generator ── */
const LithophaneGenerator = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"daylight" | "backlit">("daylight");
  const [lightTone, setLightTone] = useState<"warm" | "neutral" | "cool">("warm");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [sceneType, setSceneType] = useState<"table" | "wall">("table");
  const [sceneRotation, setSceneRotation] = useState(0);
  const [glowStrength, setGlowStrength] = useState(70);
  const [frameColor, setFrameColor] = useState<"black" | "walnut" | "white">("black");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const previewAspect = orientation === "portrait" ? "aspect-[3/4]" : "aspect-[4/3]";

  const toneGlow =
    lightTone === "warm"
      ? "rgba(255, 198, 120, 0.55)"
      : lightTone === "cool"
        ? "rgba(170, 215, 255, 0.50)"
        : "rgba(255,255,255,0.45)";

  const toneOverlayClass =
    lightTone === "warm"
      ? "from-amber-300/35 via-orange-200/10 to-black/35"
      : lightTone === "cool"
        ? "from-sky-200/35 via-blue-100/10 to-black/35"
        : "from-white/30 via-white/10 to-black/35";

  const frameClass =
    frameColor === "black"
      ? "border-neutral-900 bg-neutral-800"
      : frameColor === "walnut"
        ? "border-[#5f4128] bg-[#7a5434]"
        : "border-neutral-200 bg-neutral-100";

  const imageFilterClass =
    mode === "daylight"
      ? "grayscale brightness-110 contrast-75 sepia-[0.18]"
      : "grayscale brightness-[1.45] contrast-[1.45] invert";

  const wallBackgroundStyle: React.CSSProperties = {
    backgroundColor: "#6b4f3f",
    backgroundImage: `
      linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.08)),
      linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px),
      linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)
    `,
    backgroundSize: "100% 100%, 56px 28px, 56px 28px",
    backgroundPosition: "0 0, 0 0, 0 0",
  };

  const tableBackgroundStyle: React.CSSProperties = {
    background: `
      linear-gradient(to bottom, #d9d2c8 0%, #d9d2c8 62%, #6a4a35 62%, #8a6145 100%)
    `,
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

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="mb-2 block">View Mode</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "daylight" ? "default" : "outline"}
              onClick={() => setMode("daylight")}
              className="font-display text-xs uppercase"
            >
              Daylight
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "backlit" ? "default" : "outline"}
              onClick={() => setMode("backlit")}
              className="font-display text-xs uppercase"
            >
              Backlit
            </Button>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Orientation</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={orientation === "portrait" ? "default" : "outline"}
              onClick={() => setOrientation("portrait")}
              className="font-display text-xs uppercase"
            >
              Portrait
            </Button>
            <Button
              type="button"
              size="sm"
              variant={orientation === "landscape" ? "default" : "outline"}
              onClick={() => setOrientation("landscape")}
              className="font-display text-xs uppercase"
            >
              Landscape
            </Button>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Light Tone</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={lightTone === "warm" ? "default" : "outline"}
              onClick={() => setLightTone("warm")}
              className="font-display text-xs uppercase"
            >
              Warm
            </Button>
            <Button
              type="button"
              size="sm"
              variant={lightTone === "neutral" ? "default" : "outline"}
              onClick={() => setLightTone("neutral")}
              className="font-display text-xs uppercase"
            >
              Neutral
            </Button>
            <Button
              type="button"
              size="sm"
              variant={lightTone === "cool" ? "default" : "outline"}
              onClick={() => setLightTone("cool")}
              className="font-display text-xs uppercase"
            >
              Cool
            </Button>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Background Scene</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={sceneType === "table" ? "default" : "outline"}
              onClick={() => setSceneType("table")}
              className="font-display text-xs uppercase"
            >
              Table
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sceneType === "wall" ? "default" : "outline"}
              onClick={() => setSceneType("wall")}
              className="font-display text-xs uppercase"
            >
              Brick Wall
            </Button>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Frame Color</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={frameColor === "black" ? "default" : "outline"}
              onClick={() => setFrameColor("black")}
              className="font-display text-xs uppercase"
            >
              Black
            </Button>
            <Button
              type="button"
              size="sm"
              variant={frameColor === "walnut" ? "default" : "outline"}
              onClick={() => setFrameColor("walnut")}
              className="font-display text-xs uppercase"
            >
              Walnut
            </Button>
            <Button
              type="button"
              size="sm"
              variant={frameColor === "white" ? "default" : "outline"}
              onClick={() => setFrameColor("white")}
              className="font-display text-xs uppercase"
            >
              White
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Scene Rotation</Label>
            <span className="text-xs text-muted-foreground">{sceneRotation}°</span>
          </div>
          <Input
            type="range"
            min={-90}
            max={90}
            step={1}
            value={sceneRotation}
            onChange={(e) => setSceneRotation(Number(e.target.value))}
            className="cursor-pointer"
          />
        </div>
      </div>

      {mode === "backlit" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Backlight Intensity</Label>
            <span className="text-xs text-muted-foreground">{glowStrength}%</span>
          </div>
          <Input
            type="range"
            min={20}
            max={100}
            step={1}
            value={glowStrength}
            onChange={(e) => setGlowStrength(Number(e.target.value))}
            className="cursor-pointer"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          Best with high-contrast photos
        </span>
        <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          Framed display preview
        </span>
        <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          Interactive lamp and scene angle
        </span>
      </div>

      {imageUrl && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-muted to-background p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[760px] overflow-hidden rounded-xl" style={{ perspective: "1400px" }}>
              <div
                className="relative h-[460px] w-full transition-transform duration-500 ease-out"
                style={{
                  transformStyle: "preserve-3d",
                  transform: `rotateY(${sceneRotation}deg)`,
                }}
              >
                {/* Background scene */}
                <div
                  className="absolute inset-0 rounded-xl"
                  style={sceneType === "wall" ? wallBackgroundStyle : tableBackgroundStyle}
                />

                {/* Wall/table lighting mood */}
                <div className="absolute inset-0 rounded-xl bg-black/10" />

                {/* Framed lithophane */}
                <div
                  className={`absolute left-1/2 top-1/2 transition-all duration-500 ${
                    sceneType === "wall" ? "-translate-x-1/2 -translate-y-1/2" : "-translate-x-1/2 -translate-y-[60%]"
                  }`}
                  style={{
                    transformStyle: "preserve-3d",
                    transform: sceneType === "wall" ? `translateZ(12px)` : `translateZ(12px) rotateX(0deg)`,
                  }}
                >
                  {/* Backlight glow */}
                  {mode === "backlit" && (
                    <div
                      className="absolute left-1/2 top-1/2 -z-10 rounded-full blur-3xl transition-all duration-500"
                      style={{
                        width: orientation === "portrait" ? "240px" : "300px",
                        height: orientation === "portrait" ? "300px" : "230px",
                        transform: "translate(-50%, -50%)",
                        background: toneGlow,
                        opacity: glowStrength / 100,
                      }}
                    />
                  )}

                  {/* Lamp source */}
                  {mode === "backlit" && (
                    <div
                      className={`absolute transition-all duration-500 ${
                        sceneType === "wall" ? "left-1/2 top-1/2 -z-20" : "left-1/2 top-1/2 -z-20"
                      }`}
                      style={{
                        width: orientation === "portrait" ? "200px" : "260px",
                        height: orientation === "portrait" ? "260px" : "190px",
                        transform: "translate(-50%, -50%)",
                        background: `radial-gradient(circle, ${toneGlow} 0%, transparent 70%)`,
                        opacity: glowStrength / 100,
                        filter: "blur(18px)",
                      }}
                    />
                  )}

                  {/* Frame */}
                  <div className={`relative overflow-hidden rounded-lg border-[12px] shadow-2xl ${frameClass}`}>
                    <div className={`${previewAspect} w-[250px] sm:w-[320px] overflow-hidden bg-card`}>
                      <img
                        src={imageUrl}
                        alt="Lithophane preview"
                        className={`h-full w-full object-cover transition-all duration-500 ${imageFilterClass}`}
                      />
                      <div
                        className={`pointer-events-none absolute inset-0 bg-gradient-radial transition-all duration-500 ${
                          mode === "backlit" ? toneOverlayClass : "from-white/10 via-transparent to-black/10"
                        }`}
                        style={{
                          opacity: mode === "backlit" ? glowStrength / 100 : 0.28,
                        }}
                      />
                    </div>
                  </div>

                  {/* Table support shadow */}
                  {sceneType === "table" && (
                    <div className="absolute inset-x-[12%] bottom-[-20px] h-6 rounded-full bg-black/25 blur-md" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Dragging scene angle is simulated as a horizontal showcase preview. Light color and brightness are
            illustrative and may differ from the real lamp, frame, and print material.
          </p>

          <Button className="w-full font-display uppercase tracking-wider">
            Order Lithophane <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      )}

      <ReviewSection toolType="lithophane" title="Lithophane Reviews" />
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

    const searchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, images, is_featured")
        .eq("is_active", true)
        .limit(8);

      setProducts(data ?? []);
      setLoading(false);
    };

    searchProducts();
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
              <p className="mb-3 text-muted-foreground">No specific matches yet — request a custom 3D print instead.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

/* ── Custom 3D Print Order ── */
const CustomPrintOrder = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const userName = getUserDisplayName(user);
  const userEmail = user?.email || "";

  const [form, setForm] = useState({
    description: "",
    material: "pla",
    color: "white",
    quality: "standard",
    quantity: 1,
    size_scale: "100",
  });

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  const selectedColorHex = COLORS.find((c) => c.value === form.color)?.hex || "#f5f5f5";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["stl", "obj", "3mf"].includes(ext ?? "")) {
      toast({
        title: "Invalid file",
        description: "Please upload an STL, OBJ, or 3MF file.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to submit a custom order.",
        variant: "destructive",
      });
      return;
    }

    if (!file) {
      toast({
        title: "Missing file",
        description: "Please upload a 3D model file.",
        variant: "destructive",
      });
      return;
    }

    if (!form.description.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in the additional details field.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("custom-order-files").upload(path, file);

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("custom-order-files").getPublicUrl(path);

    const fullDescription = [
      form.description.trim(),
      "",
      "--- Options ---",
      `Material: ${MATERIALS.find((m) => m.value === form.material)?.label ?? form.material}`,
      `Color: ${COLORS.find((c) => c.value === form.color)?.label ?? form.color}`,
      `Quality: ${QUALITIES.find((q) => q.value === form.quality)?.label ?? form.quality}`,
      `Quantity: ${form.quantity}`,
      `Scale: ${form.size_scale}%`,
    ].join("\n");

    const { error } = await supabase.from("custom_orders").insert({
      user_id: user.id,
      name: userName || "Account User",
      email: userEmail,
      description: fullDescription,
      model_url: urlData.publicUrl,
      model_filename: file.name,
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Order submitted!",
      description: "We'll review your 3D model and get back to you.",
    });

    setForm({
      description: "",
      material: "pla",
      color: "white",
      quality: "standard",
      quantity: 1,
      size_scale: "100",
    });
    setFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-6">
      {!user && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Please{" "}
          <Link to="/auth" className="text-primary hover:underline">
            sign in
          </Link>{" "}
          to submit a custom 3D print order.
        </div>
      )}

      {user && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Ordering as <span className="font-medium text-foreground">{userName || "Account User"}</span>
          {userEmail ? <> · {userEmail}</> : null}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label>Upload 3D Model</Label>
            <div
              className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary"
              onClick={() => document.getElementById("custom-model-upload")?.click()}
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{file ? file.name : "Click to upload"}</p>
              <p className="text-xs text-muted-foreground">STL, OBJ, 3MF files supported</p>
            </div>
            <input
              id="custom-model-upload"
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {previewUrl && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="overflow-hidden rounded-xl border border-border">
                <ModelViewer
                  url={previewUrl}
                  fileName={file?.name}
                  className="aspect-square"
                  selectedColor={selectedColorHex}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The colors may vary from real 3D printed colors and light sources.
              </p>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label>Material</Label>
            <Select value={form.material} onValueChange={(value) => setForm({ ...form, material: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIALS.map((material) => (
                  <SelectItem key={material.value} value={material.value}>
                    <span className="font-medium">{material.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">– {material.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Color</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setForm({ ...form, color: color.value })}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                    form.color === color.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Print Quality</Label>
            <RadioGroup
              value={form.quality}
              onValueChange={(value) => setForm({ ...form, quality: value })}
              className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {QUALITIES.map((quality) => (
                <label
                  key={quality.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 transition-all ${
                    form.quality === quality.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary"
                  }`}
                >
                  <RadioGroupItem value={quality.value} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{quality.label}</p>
                    <p className="text-xs text-muted-foreground">{quality.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
              />
            </div>

            <div>
              <Label>Scale (%)</Label>
              <Input
                type="number"
                min={10}
                max={1000}
                value={form.size_scale}
                onChange={(e) => setForm({ ...form, size_scale: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Additional Details *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Any special requirements, notes, or preferences..."
              rows={5}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !file || !user}
            className="w-full font-display uppercase tracking-wider"
          >
            {submitting ? "Submitting..." : "Submit Custom Order"}
          </Button>
        </div>
      </div>

      <ReviewSection toolType="custom-print" title="Custom 3D Print Reviews" />
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

          <p className="mb-8 max-w-2xl text-muted-foreground">
            Use our tools to create custom 3D printed products. Upload a photo for a lithophane, explore gift ideas, or
            submit a custom 3D print order directly from this page.
          </p>
        </motion.div>

        <Tabs defaultValue="custom-print" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 gap-2 bg-muted/50 sm:grid-cols-3">
            <TabsTrigger value="custom-print" className="gap-1.5 font-display text-xs uppercase tracking-wider">
              <Box className="h-4 w-4" /> Custom 3D Print
            </TabsTrigger>

            <TabsTrigger value="lithophane" className="gap-1.5 font-display text-xs uppercase tracking-wider">
              <Image className="h-4 w-4" /> Lithophane
            </TabsTrigger>

            <TabsTrigger value="gift-finder" className="gap-1.5 font-display text-xs uppercase tracking-wider">
              <Gift className="h-4 w-4" /> Gift Finder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="custom-print">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg uppercase">
                  <Send className="h-5 w-5 text-primary" /> Custom 3D Print Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CustomPrintOrder />
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
        </Tabs>
      </div>
    </div>
  );
};

export default CreateYourOwn;
