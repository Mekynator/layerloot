import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Image, Gift, Heart, Gamepad2, Swords, Monitor, Upload, Send, Box, Star, CreditCard, Home, Baby, Dog, Palette, Music, Trophy, Flower2, Wrench } from "lucide-react";
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
import Lithophane, { LithophaneSubmitPayload } from "@/components/Lithophane";
import { motion } from "framer-motion";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";
import { ReviewCardSkeleton, SectionCardSkeleton } from "@/components/shared/loading-states";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const ACCEPTED_EXTENSIONS = ".stl,.obj,.3mf";
const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/jpg,image/webp";
const REQUEST_FEE_DKK = 100;
const CUSTOM_ORDER_FILES_BUCKET = "custom-order-files";

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

const cleanupUploadedFiles = async (paths: string[]) => {
  if (paths.length === 0) return;

  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  const { error } = await supabase.storage.from(CUSTOM_ORDER_FILES_BUCKET).remove(uniquePaths);

  if (error) {
    console.error("Failed to clean up temporary custom-order files:", error.message);
  }
};

const readFunctionErrorMessage = async (error: any) => {
  try {
    const context = error?.context;
    if (context && typeof context.text === "function") {
      const body = await context.text();
      if (body) {
        try {
          const parsed = JSON.parse(body);
          return parsed?.error || parsed?.message || body;
        } catch {
          return body;
        }
      }
    }
  } catch {
    // fall through to default message
  }

  return error?.message || "Edge function call failed";
};

const startRequestFeeCheckout = async (customOrderId: string) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please sign in again to continue with checkout");
  }

  const { data, error } = await supabase.functions.invoke("create-request-fee-checkout", {
    body: { orderId: customOrderId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    const message = await readFunctionErrorMessage(error);
    throw new Error(message || "Failed to start request fee checkout");
  }

  if (!data?.url) {
    throw new Error("Stripe checkout URL was not returned");
  }

  window.location.href = data.url;
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

      if (!error) setReviews(data ?? []);
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
        <div className="grid gap-4 md:grid-cols-3">
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
        </div>
      ) : reviews.length === 0 ? (
        <SectionCardSkeleton lines={2} />
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

const LithophaneOrderSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const userName = getUserDisplayName(user);
  const userEmail = user?.email || "";
  const [submittingLithophane, setSubmittingLithophane] = useState(false);

  const dataUrlToBlob = (dataUrl: string) => {
    const [meta, base64] = dataUrl.split(",");
    const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "application/octet-stream";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  const handleLithophaneSubmit = async (payload: LithophaneSubmitPayload) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to submit a lithophane order.",
        variant: "destructive",
      });
      return;
    }

    if (!payload.sourceDataUrl) {
      toast({
        title: "Missing image",
        description: "Please upload a photo before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingLithophane(true);

    const uploadedPaths: string[] = [];
    let orderCreated = false;

    try {
      const timestamp = Date.now();
      const safeBaseName =
        payload.sourceFileName?.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_") || "lithophane";

      let sourceImageUrl: string | null = null;
      let processedImageUrl: string | null = null;
      let previewImageUrl: string | null = null;

      const sourcePath = `${user.id}/lithophane/${timestamp}-${safeBaseName}-source.png`;
      const processedPath = `${user.id}/lithophane/${timestamp}-${safeBaseName}-processed.png`;
      const previewPath = `${user.id}/lithophane/${timestamp}-${safeBaseName}-preview.png`;

      const { error: sourceUploadError } = await supabase.storage
        .from(CUSTOM_ORDER_FILES_BUCKET)
        .upload(sourcePath, dataUrlToBlob(payload.sourceDataUrl), {
          contentType: "image/png",
          upsert: false,
        });

      if (sourceUploadError) throw sourceUploadError;
      uploadedPaths.push(sourcePath);
      sourceImageUrl = supabase.storage.from(CUSTOM_ORDER_FILES_BUCKET).getPublicUrl(sourcePath).data.publicUrl;

      if (payload.processedDataUrl) {
        const { error: processedUploadError } = await supabase.storage
          .from(CUSTOM_ORDER_FILES_BUCKET)
          .upload(processedPath, dataUrlToBlob(payload.processedDataUrl), {
            contentType: "image/png",
            upsert: false,
          });

        if (processedUploadError) throw processedUploadError;
        uploadedPaths.push(processedPath);
        processedImageUrl = supabase.storage.from(CUSTOM_ORDER_FILES_BUCKET).getPublicUrl(processedPath).data.publicUrl;
      }

      if (payload.previewScreenshotDataUrl) {
        const { error: previewUploadError } = await supabase.storage
          .from(CUSTOM_ORDER_FILES_BUCKET)
          .upload(previewPath, dataUrlToBlob(payload.previewScreenshotDataUrl), {
            contentType: "image/png",
            upsert: false,
          });

        if (previewUploadError) throw previewUploadError;
        uploadedPaths.push(previewPath);
        previewImageUrl = supabase.storage.from(CUSTOM_ORDER_FILES_BUCKET).getPublicUrl(previewPath).data.publicUrl;
      }

      const fullDescription = [
        "Lithophane custom order",
        "",
        `Shape: ${payload.shape}`,
        `Orientation: ${payload.orientation}`,
        `Size: ${payload.widthMm} x ${payload.heightMm} mm`,
        `Thickness: ${payload.minThicknessMm}-${payload.maxThicknessMm} mm`,
        `Border: ${payload.borderMm} mm`,
        `Light enabled: ${payload.lightEnabled ? "Yes" : "No"}`,
        `Light tone: ${payload.lightTone}`,
        `Estimated price: ${payload.estimatedPrice} DKK`,
        `Estimated print time: ${payload.estimatedPrintHours} hrs`,
        "",
        "Customer notes:",
        payload.notes?.trim() || "No extra notes.",
        "",
        "--- Lithophane Config JSON ---",
        JSON.stringify(payload.designJson, null, 2),
      ].join("\n");

      const { error } = await supabase.from("custom_orders" as any).insert({
        user_id: user.id,
        name: userName || "Account User",
        email: userEmail,
        description: fullDescription,
        model_url: sourceImageUrl,
        model_filename: payload.sourceFileName || "lithophane-image.png",
        metadata: {
          order_type: "lithophane",
          source_image_url: sourceImageUrl,
          processed_image_url: processedImageUrl,
          preview_image_url: previewImageUrl,
          estimated_price: payload.estimatedPrice,
          estimated_print_hours: payload.estimatedPrintHours,
          lithophane_config: payload.designJson,
        },
      });

      if (error) throw error;
      orderCreated = true;

      toast({
        title: "Lithophane submitted!",
        description: "Your lithophane design was added to custom orders successfully.",
      });
    } catch (error: any) {
      if (!orderCreated) {
        await cleanupUploadedFiles(uploadedPaths);
      }

      toast({
        title: "Submission failed",
        description: error?.message || "Could not submit lithophane order.",
        variant: "destructive",
      });
    } finally {
      setSubmittingLithophane(false);
    }
  };

  return (
    <div className="space-y-6">
      {!user && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Please{" "}
          <Link to="/auth" className="text-primary hover:underline">
            sign in
          </Link>{" "}
          to submit a lithophane order.
        </div>
      )}

      {user && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Ordering as <span className="font-medium text-foreground">{userName || "Account User"}</span>
          {userEmail ? <> · {userEmail}</> : null}
        </div>
      )}

      <Lithophane
        onSubmitDesign={handleLithophaneSubmit}
        submitLabel={submittingLithophane ? "Submitting..." : "Order Lithophane"}
      />

      <ReviewSection toolType="lithophane" title="Lithophane Reviews" />
    </div>
  );
};

const GIFT_CATEGORIES = [
  { value: "gamer", label: "Gamer", icon: Gamepad2 },
  { value: "fantasy", label: "Fantasy Fan", icon: Swords },
  { value: "desk", label: "Desk Decoration", icon: Monitor },
  { value: "personalized", label: "Personalized Gift", icon: Heart },
  { value: "home", label: "Home & Living", icon: Home },
  { value: "kids", label: "Kids & Baby", icon: Baby },
  { value: "pets", label: "Pet Lovers", icon: Dog },
  { value: "art", label: "Art & Creative", icon: Palette },
  { value: "music", label: "Music Fan", icon: Music },
  { value: "sports", label: "Sports & Trophy", icon: Trophy },
  { value: "garden", label: "Garden & Nature", icon: Flower2 },
  { value: "tools", label: "Tools & Gadgets", icon: Wrench },
];

const GiftFinder = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("id, name, slug").then(({ data }) => {
      setCategories(data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);

    const matchedCategory = categories.find((c) => c.slug === selected);
    if (!matchedCategory) {
      setProducts([]);
      setLoading(false);
      return;
    }

    supabase
      .from("products")
      .select("id, name, slug, price, images, is_featured")
      .eq("is_active", true)
      .eq("category_id", matchedCategory.id)
      .limit(8)
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, [selected, categories]);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Who are you shopping for?</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceImagePreviewUrl, setReferenceImagePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (referenceImagePreviewUrl) URL.revokeObjectURL(referenceImagePreviewUrl);
    };
  }, [previewUrl, referenceImagePreviewUrl]);

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
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedImage = e.target.files?.[0];
    if (!selectedImage) return;

    if (!selectedImage.type.startsWith("image/")) {
      toast({
        title: "Invalid image",
        description: "Please upload a PNG, JPG, or WEBP image.",
        variant: "destructive",
      });
      return;
    }

    setReferenceImage(selectedImage);
    setReferenceImagePreviewUrl(URL.createObjectURL(selectedImage));
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

    if (!file && !referenceImage) {
      toast({
        title: "Missing file",
        description: "Please upload either a 3D model or a reference image.",
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

    const uploadedPaths: string[] = [];
    let orderCreated = false;

    try {
      let modelUrl: string | null = null;
      let modelFilename: string | null = null;
      let referenceImageUrl: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const modelPath = `${user.id}/${Date.now()}-model.${ext}`;

        const { error: uploadError } = await supabase.storage.from(CUSTOM_ORDER_FILES_BUCKET).upload(modelPath, file);
        if (uploadError) throw uploadError;
        uploadedPaths.push(modelPath);

        const { data: modelUrlData } = supabase.storage.from(CUSTOM_ORDER_FILES_BUCKET).getPublicUrl(modelPath);
        modelUrl = modelUrlData.publicUrl;
        modelFilename = file.name;
      }

      if (referenceImage) {
        const imageExt = referenceImage.name.split(".").pop();
        const imagePath = `${user.id}/${Date.now()}-reference.${imageExt}`;

        const { error: imageUploadError } = await supabase.storage
          .from(CUSTOM_ORDER_FILES_BUCKET)
          .upload(imagePath, referenceImage);

        if (imageUploadError) throw imageUploadError;
        uploadedPaths.push(imagePath);

        const { data: imageUrlData } = supabase.storage.from(CUSTOM_ORDER_FILES_BUCKET).getPublicUrl(imagePath);
        referenceImageUrl = imageUrlData.publicUrl;
      }

      const fullDescription = [
        form.description.trim(),
        "",
        "--- Options ---",
        `Material: ${MATERIALS.find((m) => m.value === form.material)?.label ?? form.material}`,
        `Color: ${COLORS.find((c) => c.value === form.color)?.label ?? form.color}`,
        `Quality: ${QUALITIES.find((q) => q.value === form.quality)?.label ?? form.quality}`,
        `Quantity: ${form.quantity}`,
        `Scale: ${form.size_scale}%`,
        `3D Model Attached: ${modelUrl ? "Yes" : "No"}`,
        `Reference Image Attached: ${referenceImageUrl ? "Yes" : "No"}`,
        ...(referenceImageUrl ? [`Reference Image URL: ${referenceImageUrl}`] : []),
      ].join("\n");

      const { data: insertedOrder, error } = await supabase
        .from("custom_orders")
        .insert({
          user_id: user.id,
          name: userName || "Account User",
          email: userEmail,
          description: fullDescription,
          model_url: modelUrl || referenceImageUrl,
          model_filename: modelFilename || referenceImage?.name || "reference-image",
          status: "awaiting_request_fee",
          request_fee_amount: REQUEST_FEE_DKK,
          request_fee_status: "unpaid",
          payment_status: "unpaid",
          metadata: {
            order_type: "custom-print",
            reference_image_url: referenceImageUrl,
            reference_image_filename: referenceImage?.name ?? null,
            uploaded_model_url: modelUrl,
            uploaded_model_filename: modelFilename,
          },
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!insertedOrder?.id) throw new Error("Order was created but ID was not returned");
      orderCreated = true;

      await startRequestFeeCheckout(insertedOrder.id);
    } catch (error: any) {
      if (!orderCreated) {
        await cleanupUploadedFiles(uploadedPaths);
      }

      toast({
        title: "Error",
        description: error?.message || "Could not start custom order payment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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

          <div>
            <Label>Add Reference Picture</Label>
            <div
              className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary"
              onClick={() => document.getElementById("custom-reference-image-upload")?.click()}
            >
              <Image className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {referenceImage ? referenceImage.name : "Click to upload reference image"}
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, JPEG, WEBP supported</p>
            </div>
            <input
              id="custom-reference-image-upload"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              onChange={handleReferenceImageChange}
              className="hidden"
            />

            {referenceImagePreviewUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                <img
                  src={referenceImagePreviewUrl}
                  alt="Reference preview"
                  className="h-72 w-full object-contain bg-muted/20"
                />
              </div>
            )}
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
            disabled={submitting || (!file && !referenceImage) || !user}
            className="w-full font-display uppercase tracking-wider"
          >
            {submitting ? "Preparing Payment..." : `Pay ${REQUEST_FEE_DKK} kr & Submit Custom Order`}
          </Button>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <CreditCard className="h-4 w-4" />
              Request fee required before submission
            </div>
            A <span className="font-semibold">{REQUEST_FEE_DKK} kr custom request fee</span> is charged before the order
            is submitted. After successful payment, your custom request is created and sent to the admin team for
            review. This amount will later be{" "}
            <span className="font-semibold">deducted from the final quoted price</span>.
          </div>
        </div>
      </div>

      <ReviewSection toolType="custom-print" title="Custom 3D Print Reviews" />
    </div>
  );
};

const CreateYourOwn = () => {
  const [pageBlocks, setPageBlocks] = useState<SiteBlock[]>([]);

  useEffect(() => {
    supabase
      .from("site_blocks")
      .select("*")
      .eq("page", "create-your-own")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setPageBlocks((data as SiteBlock[]) ?? []));
  }, []);

  const topBlocks = pageBlocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement !== "after_create_your_own",
  );
  const bottomBlocks = pageBlocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement === "after_create_your_own",
  );

  return (
    <div>
      {topBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}

      <section className="py-8 lg:py-12">
        <div className="container max-w-5xl">
          <motion.div {...fadeUp}>
            <h1 className="mb-2 font-display text-3xl font-bold uppercase text-foreground lg:text-5xl">
              Create Your <span className="text-primary">Own</span>
            </h1>

            <p className="mb-8 max-w-2xl text-muted-foreground">
              Use our tools to create custom 3D printed products. Upload a photo for a lithophane, explore gift ideas,
              or submit a custom 3D print order directly from this page.
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
                  <LithophaneOrderSection />
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
      </section>

      {bottomBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}
    </div>
  );
};

export default CreateYourOwn;
