import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import {
  Baby,
  Box,
  CheckCircle2,
  CreditCard,
  Dog,
  FileImage,
  Flower2,
  Gamepad2,
  Gift,
  Home,
  Image,
  Loader2,
  Monitor,
  Music,
  Palette,
  Send,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ModelViewer from "@/components/ModelViewer";
import Lithophane, { type LithophaneSubmitPayload } from "@/components/Lithophane";
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
  { value: "pla", label: "PLA", descKey: "create.materialPla" },
  { value: "abs", label: "ABS", descKey: "create.materialAbs" },
  { value: "petg", label: "PETG", descKey: "create.materialPetg" },
  { value: "tpu", label: "TPU", descKey: "create.materialTpu" },
  { value: "resin", label: "Resin", descKey: "create.materialResin" },
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
  { value: "high", label: "High", descKey: "create.qualityHigh" },
  { value: "standard", label: "Standard", descKey: "create.qualityStandard" },
  { value: "moderate", label: "Moderate", descKey: "create.qualityModerate" },
  { value: "low", label: "Low", descKey: "create.qualityLow" },
];

const GIFT_FINDER_ICON_MAP = {
  gamer: Gamepad2,
  fantasy: Swords,
  desk: Monitor,
  personalized: Gift,
  home: Home,
  kids: Baby,
  pets: Dog,
  art: Palette,
  music: Music,
  sports: Trophy,
  garden: Flower2,
  tools: Wrench,
} as const;

type ToolReview = {
  id: string;
  title: string | null;
  comment: string | null;
  rating: number;
  created_at: string;
};

type ProgressState = {
  open: boolean;
  progress: number;
  status: string;
};

type GiftFinderTag = {
  id: string;
  name: string;
  slug: string;
  icon_key: keyof typeof GIFT_FINDER_ICON_MAP | null;
  is_active?: boolean;
};

type GiftFinderProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  is_featured?: boolean;
};

type GiftFinderLink = {
  product_id: string;
  gift_finder_tag_id: string;
};

type CreateTabValue = "custom-print" | "lithophane" | "gift-finder";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const animateProgress = async (
  setState: Dispatch<SetStateAction<ProgressState>>,
  to: number,
  status?: string,
  duration = 350,
) => {
  const steps = Math.max(1, Math.floor(duration / 35));
  const increment = Math.max(0, to);

  setState((prev) => {
    const start = prev.progress;
    const diff = increment - start;
    let currentStep = 0;

    const run = async () => {
      while (currentStep < steps) {
        currentStep += 1;
        const nextValue = start + (diff * currentStep) / steps;
        setState((latest) => ({
          ...latest,
          progress: Math.min(to, Math.max(latest.progress, Number(nextValue.toFixed(0)))),
          status: status ?? latest.status,
          open: true,
        }));
        await sleep(35);
      }
    };

    void run();
    return {
      ...prev,
      open: true,
      status: status ?? prev.status,
    };
  });

  await sleep(duration + 20);
};

const setProgressInstant = (setState: Dispatch<SetStateAction<ProgressState>>, progress: number, status: string) => {
  setState({
    open: true,
    progress,
    status,
  });
};

const resetProgress = async (setState: Dispatch<SetStateAction<ProgressState>>) => {
  await sleep(250);
  setState({
    open: false,
    progress: 0,
    status: "",
  });
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
    // noop
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

const UploadProgressOverlay = ({ progress, status }: { progress: number; status: string }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/85 px-5 text-center backdrop-blur-sm"
    >
      <Loader2 className="mb-3 h-7 w-7 animate-spin text-primary" />
      <p className="text-sm font-semibold text-foreground">{status}</p>
      <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut", duration: 0.25 }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{Math.round(progress)}%</p>
    </motion.div>
  </AnimatePresence>
);

const ProcessingDialog = ({ open, progress, status, title }: ProgressState & { title: string }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="py-2">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{status || t("create.workingOnRequest")}</DialogDescription>
          </DialogHeader>

          <div className="mt-5">
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.3 }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{status}</span>
              <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FileStatusCard = ({
  fileName,
  previewUrl,
  alt,
  icon = <CheckCircle2 className="h-4 w-4 text-green-500" />,
}: {
  fileName: string;
  previewUrl?: string | null;
  alt: string;
  icon?: ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 overflow-hidden rounded-xl border border-border bg-card"
    >
      {previewUrl ? (
        <img src={previewUrl} alt={alt} className="h-56 w-full object-cover bg-muted/20" />
      ) : (
        <div className="flex h-28 items-center justify-center bg-muted/20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileImage className="h-4 w-4" />
            {t("create.fileReady")}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
          <p className="text-xs text-muted-foreground">{t("create.ready")}</p>
        </div>
        {icon}
      </div>
    </motion.div>
  );
};

const UploadDropzone = ({
  label,
  sublabel,
  icon,
  onClick,
  dragActive,
  children,
}: {
  label: string;
  sublabel: string;
  icon: ReactNode;
  onClick: () => void;
  dragActive?: boolean;
  children?: ReactNode;
}) => (
  <motion.div
    whileHover={{ y: -2 }}
    className={`relative mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
      dragActive
        ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(249,115,22,0.12)]"
        : "border-border hover:border-primary/70 hover:bg-primary/5"
    }`}
    onClick={onClick}
  >
    <motion.div
      animate={dragActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 1.1, repeat: dragActive ? Infinity : 0 }}
      className="mb-3"
    >
      {icon}
    </motion.div>
    <p className="text-sm font-medium text-foreground">{label}</p>
    <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
    {children}
  </motion.div>
);

const ToolShell = ({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <Card className="overflow-hidden border-border/80 shadow-sm">
    <CardHeader className="border-b border-border/60 bg-muted/20">
      <div className="space-y-2">
        <p className="text-[11px] font-display uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <CardTitle className="font-display text-lg uppercase tracking-wide text-foreground sm:text-xl">
          {title}
        </CardTitle>
        <CardDescription className="max-w-3xl text-sm text-muted-foreground">{description}</CardDescription>
      </div>
    </CardHeader>
    <CardContent className="p-4 sm:p-6">{children}</CardContent>
  </Card>
);

const ReviewSection = ({ title }: { toolType: "custom-print" | "lithophane"; title: string }) => {
  const { t } = useTranslation();
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

      if (!error) setReviews((data as ToolReview[]) ?? []);
      setLoading(false);
    };

    void fetchReviews();
  }, []);

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
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1.4, repeatType: "reverse" }}
        >
          <SectionCardSkeleton lines={3} />
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.06, duration: 0.25 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{review.title || t("create.verifiedCustomer")}</p>
                <div className="flex gap-1">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const LithophaneOrderSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const userName = getUserDisplayName(user);
  const userEmail = user?.email || "";
  const [submittingLithophane, setSubmittingLithophane] = useState(false);
  const [lithophaneProgress, setLithophaneProgress] = useState<ProgressState>({
    open: false,
    progress: 0,
    status: "",
  });

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
        title: t("create.pleaseSignIn"),
        description: t("create.signInToSubmitLithophane"),
        variant: "destructive",
      });
      return;
    }

    if (!payload.sourceDataUrl) {
      toast({
        title: t("create.missingImage"),
        description: t("create.missingImageDesc"),
        variant: "destructive",
      });
      return;
    }

    setSubmittingLithophane(true);
    setProgressInstant(setLithophaneProgress, 6, "Preparing lithophane order...");

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

      await animateProgress(setLithophaneProgress, 24, "Uploading source image...", 320);

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
        await animateProgress(setLithophaneProgress, 48, "Uploading processed image...", 320);

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
        await animateProgress(setLithophaneProgress, 68, "Preparing preview...", 320);

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

      await animateProgress(setLithophaneProgress, 86, "Creating order...", 300);

      const orderPayload = {
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
          cropped_image_url: payload.croppedImageDataUrl ?? null,
          original_source_image_url: payload.originalSourceDataUrl ?? null,
          crop_state: payload.cropState ?? null,
          estimated_price: payload.estimatedPrice,
          estimated_print_hours: payload.estimatedPrintHours,
          lithophane_config: payload.designJson,
        },
      } as any;

      const { error } = await supabase.from("custom_orders").insert(orderPayload);

      if (error) throw error;
      orderCreated = true;

      await animateProgress(setLithophaneProgress, 100, "Lithophane order submitted", 280);

      toast({
        title: t("create.lithophaneSubmitted"),
        description: t("create.lithophaneSubmittedDesc"),
      });
    } catch (error: any) {
      if (!orderCreated) {
        await cleanupUploadedFiles(uploadedPaths);
      }

      toast({
        title: t("create.submissionFailed"),
        description: error?.message || t("create.couldNotSubmit"),
        variant: "destructive",
      });
    } finally {
      setSubmittingLithophane(false);
      await resetProgress(setLithophaneProgress);
    }
  };

  return (
    <div className="space-y-6">
      <ProcessingDialog {...lithophaneProgress} title={t("create.submittingLithophane")} />

      {!user && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Trans i18nKey="create.signInToOrderLithophane">
            Please <Link to="/auth" className="text-primary hover:underline">sign in</Link> to submit a lithophane order.
          </Trans>
        </div>
      )}

      {user && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Trans i18nKey="create.orderingAs" values={{ name: userName || "Account User" }}>
            Ordering as <span className="font-medium text-foreground">{{ name: userName || "Account User" } as any}</span>
          </Trans>
          {userEmail ? <> · {userEmail}</> : null}
        </div>
      )}

      <div className={submittingLithophane ? "pointer-events-none opacity-80" : ""}>
        <Lithophane
          onSubmitDesign={handleLithophaneSubmit}
          submitLabel={submittingLithophane ? t("create.preparing") : t("create.orderLithophane")}
        />
      </div>

      <ReviewSection toolType="lithophane" title={t("create.lithophaneReviews")} />
    </div>
  );
};

const GiftFinder = () => {
  const { t } = useTranslation();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tags, setTags] = useState<GiftFinderTag[]>([]);
  const [products, setProducts] = useState<(GiftFinderProduct & { matchScore: number })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      const { data, error } = await supabase
        .from("gift_finder_tags")
        .select("id, name, slug, icon_key, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Failed to fetch Gift Finder tags:", error.message);
        setTags([]);
        return;
      }

      setTags((data as GiftFinderTag[]) ?? []);
    };

    void fetchTags();
  }, []);

  useEffect(() => {
    const fetchMatches = async () => {
      if (selectedTagIds.length === 0) {
        setProducts([]);
        return;
      }

      setLoading(true);

      const { data: links, error: linkError } = await supabase
        .from("product_gift_finder_tags")
        .select("product_id, gift_finder_tag_id")
        .in("gift_finder_tag_id", selectedTagIds);

      if (linkError || !links?.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const scoreMap = new Map<string, number>();

      for (const row of (links as GiftFinderLink[]) ?? []) {
        scoreMap.set(row.product_id, (scoreMap.get(row.product_id) ?? 0) + 1);
      }

      const productIds = Array.from(scoreMap.keys());

      const { data: productRows, error: productError } = await supabase
        .from("products")
        .select("id, name, slug, price, images, is_featured")
        .eq("is_active", true)
        .in("id", productIds);

      if (productError || !productRows?.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const rankedProducts = ((productRows as GiftFinderProduct[]) ?? [])
        .map((product) => ({
          ...product,
          matchScore: scoreMap.get(product.id) ?? 0,
        }))
        .sort((a, b) => {
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
          if (Boolean(b.is_featured) !== Boolean(a.is_featured)) {
            return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
          }
          return a.name.localeCompare(b.name);
        });

      setProducts(rankedProducts);
      setLoading(false);
    };

    void fetchMatches();
  }, [selectedTagIds]);

  const selectedTags = useMemo(() => tags.filter((tag) => selectedTagIds.includes(tag.id)), [selectedTagIds, tags]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const clearTags = () => setSelectedTagIds([]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("create.giftPickVibes")}</p>
          <p className="text-xs text-muted-foreground">{t("create.giftSmartMatching")}</p>
        </div>

        {selectedTagIds.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={clearTags}>
            <X className="mr-2 h-4 w-4" />
            {t("create.clearSelection")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tags.map((tag, index) => {
          const Icon = GIFT_FINDER_ICON_MAP[tag.icon_key ?? "personalized"] ?? Gift;
          const isSelected = selectedTagIds.includes(tag.id);

          return (
            <motion.button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-foreground shadow-[0_0_24px_rgba(249,115,22,0.12)]"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <Icon className="h-6 w-6 text-primary" />
              <div className="min-w-0">
                <span className="block font-display text-sm uppercase tracking-wider">{tag.name}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {tag.name}
            </div>
          ))}
        </div>
      ) : null}

      {selectedTagIds.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">{t("create.searching")}</div>
          ) : products.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("create.bestMatchesFirst")}</p>

              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    className="group overflow-hidden rounded-xl border border-border transition-all hover:-translate-y-1 hover:border-primary"
                  >
                    {product.images?.[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}

                    <div className="space-y-1 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                          {product.name}
                        </p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          {product.matchScore} {product.matchScore === 1 ? t("create.match") : t("create.matches")}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-primary">{product.price} kr</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="mb-3 text-muted-foreground">{t("create.noMatchYet")}</p>
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
  const { t } = useTranslation();

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
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const [modelProgress, setModelProgress] = useState<ProgressState>({
    open: false,
    progress: 0,
    status: "",
  });
  const [referenceProgress, setReferenceProgress] = useState<ProgressState>({
    open: false,
    progress: 0,
    status: "",
  });
  const [submitProgress, setSubmitProgress] = useState<ProgressState>({
    open: false,
    progress: 0,
    status: "",
  });

  const [modelDragActive, setModelDragActive] = useState(false);
  const [referenceDragActive, setReferenceDragActive] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (referenceImagePreviewUrl) URL.revokeObjectURL(referenceImagePreviewUrl);
    };
  }, [previewUrl, referenceImagePreviewUrl]);

  const selectedColorHex = COLORS.find((c) => c.value === form.color)?.hex || "#f5f5f5";
  const uploadBusy = modelProgress.open || referenceProgress.open;
  const submitDisabled = submitting || uploadBusy || (!file && !referenceImage) || !user;

  const processModelFile = async (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["stl", "obj", "3mf"].includes(ext ?? "")) {
      toast({
        title: t("create.invalidFile"),
        description: t("create.invalidFileDesc"),
        variant: "destructive",
      });
      return;
    }

    setProgressInstant(setModelProgress, 8, "Reading 3D model...");
    await animateProgress(setModelProgress, 34, "Checking file...", 280);
    await animateProgress(setModelProgress, 72, "Preparing 3D preview...", 420);

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setPreviewUrl(nextPreviewUrl);

    await animateProgress(setModelProgress, 100, "Model ready", 220);
    await resetProgress(setModelProgress);
  };

  const processReferenceImage = async (selectedImage: File) => {
    if (!selectedImage.type.startsWith("image/")) {
      toast({
        title: t("create.invalidImage"),
        description: t("create.invalidImageDesc"),
        variant: "destructive",
      });
      return;
    }

    setProgressInstant(setReferenceProgress, 10, "Reading image...");
    await animateProgress(setReferenceProgress, 38, "Optimizing preview...", 280);
    await animateProgress(setReferenceProgress, 80, "Preparing image...", 360);

    if (referenceImagePreviewUrl) URL.revokeObjectURL(referenceImagePreviewUrl);

    const nextPreviewUrl = URL.createObjectURL(selectedImage);
    setReferenceImage(selectedImage);
    setReferenceImagePreviewUrl(nextPreviewUrl);

    await animateProgress(setReferenceProgress, 100, "Image ready", 220);
    await resetProgress(setReferenceProgress);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processModelFile(selectedFile);
    e.target.value = "";
  };

  const handleReferenceImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedImage = e.target.files?.[0];
    if (!selectedImage) return;
    await processReferenceImage(selectedImage);
    e.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>, type: "model" | "reference") => {
    event.preventDefault();

    if (type === "model") setModelDragActive(false);
    if (type === "reference") setReferenceDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (type === "model") {
      await processModelFile(droppedFile);
      return;
    }

    await processReferenceImage(droppedFile);
  };

  const openPaymentDialog = () => {
    if (!user) {
      toast({
        title: t("create.pleaseSignIn"),
        description: t("create.signInToSubmit"),
        variant: "destructive",
      });
      return;
    }

    if (!file && !referenceImage) {
      toast({
        title: t("create.missingFile"),
        description: t("create.missingFileDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!form.description.trim()) {
      toast({
        title: t("create.missingFields"),
        description: t("create.missingFieldsDesc"),
        variant: "destructive",
      });
      return;
    }

    setPaymentDialogOpen(true);
  };

  const handleSubmit = async () => {
    setPaymentDialogOpen(false);
    setSubmitting(true);
    setProgressInstant(setSubmitProgress, 6, "Preparing custom order...");

    const uploadedPaths: string[] = [];
    let orderCreated = false;

    try {
      let modelUrl: string | null = null;
      let modelFilename: string | null = null;
      let referenceImageUrl: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const modelPath = `${user!.id}/${Date.now()}-model.${ext}`;

        await animateProgress(setSubmitProgress, 24, "Uploading 3D model...", 320);

        const { error: uploadError } = await supabase.storage.from(CUSTOM_ORDER_FILES_BUCKET).upload(modelPath, file);
        if (uploadError) throw uploadError;
        uploadedPaths.push(modelPath);

        const { data: modelUrlData } = supabase.storage.from(CUSTOM_ORDER_FILES_BUCKET).getPublicUrl(modelPath);
        modelUrl = modelUrlData.publicUrl;
        modelFilename = file.name;
      }

      if (referenceImage) {
        const imageExt = referenceImage.name.split(".").pop();
        const imagePath = `${user!.id}/${Date.now()}-reference.${imageExt}`;

        await animateProgress(setSubmitProgress, 52, "Uploading reference image...", 320);

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

      await animateProgress(setSubmitProgress, 80, "Creating custom order...", 280);

      const { data: insertedOrder, error } = await supabase
        .from("custom_orders")
        .insert({
          user_id: user!.id,
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

      await animateProgress(setSubmitProgress, 94, "Redirecting to payment...", 260);
      await startRequestFeeCheckout(insertedOrder.id);
    } catch (error: any) {
      if (!orderCreated) {
        await cleanupUploadedFiles(uploadedPaths);
      }

      toast({
        title: t("create.error"),
        description: error?.message || t("create.couldNotStartPayment"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      await resetProgress(setSubmitProgress);
    }
  };

  return (
    <div className="space-y-6">
      <ProcessingDialog {...submitProgress} title={t("create.submittingCustomOrder")} />

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {t("create.requestFeeTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("create.requestFeeDesc", { amount: REQUEST_FEE_DKK })}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            <Trans i18nKey="create.requestFeeNote">
              After successful payment, your custom request is created and sent to the admin team for review. This amount will later be <span className="font-semibold">deducted from the final quoted price</span>.
            </Trans>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting || uploadBusy}>
              {submitting ? t("create.preparing") : t("create.continueToPayment")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!user && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Trans i18nKey="create.signInToOrder">
            Please <Link to="/auth" className="text-primary hover:underline">sign in</Link> to submit a custom 3D print order.
          </Trans>
        </div>
      )}

      {user && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Trans i18nKey="create.orderingAs" values={{ name: userName || "Account User" }}>
            Ordering as <span className="font-medium text-foreground">{{ name: userName || "Account User" } as any}</span>
          </Trans>
          {userEmail ? <> · {userEmail}</> : null}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label>{t("create.upload3DModel")}</Label>

            <div
              className="relative"
              onDragOver={(e) => {
                e.preventDefault();
                setModelDragActive(true);
              }}
              onDragLeave={() => setModelDragActive(false)}
              onDrop={(e) => void handleDrop(e, "model")}
            >
              <UploadDropzone
                label={file ? file.name : t("create.clickToUpload")}
                sublabel={t("create.modelFilesSupported")}
                icon={<Upload className="h-8 w-8 text-muted-foreground" />}
                dragActive={modelDragActive}
                onClick={() => document.getElementById("custom-model-upload")?.click()}
              />

              {modelProgress.open && (
                <UploadProgressOverlay progress={modelProgress.progress} status={modelProgress.status} />
              )}
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
            <Label>{t("create.addReferencePicture")}</Label>

            <div
              className="relative"
              onDragOver={(e) => {
                e.preventDefault();
                setReferenceDragActive(true);
              }}
              onDragLeave={() => setReferenceDragActive(false)}
              onDrop={(e) => void handleDrop(e, "reference")}
            >
              <UploadDropzone
                label={referenceImage ? referenceImage.name : t("create.clickToUploadReference")}
                sublabel={t("create.referenceFilesSupported")}
                icon={<Image className="h-8 w-8 text-muted-foreground" />}
                dragActive={referenceDragActive}
                onClick={() => document.getElementById("custom-reference-image-upload")?.click()}
              />

              {referenceProgress.open && (
                <UploadProgressOverlay progress={referenceProgress.progress} status={referenceProgress.status} />
              )}
            </div>

            <input
              id="custom-reference-image-upload"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              onChange={handleReferenceImageChange}
              className="hidden"
            />

            {referenceImage && (
              <FileStatusCard
                fileName={referenceImage.name}
                previewUrl={referenceImagePreviewUrl}
                alt={t("create.referencePreview")}
              />
            )}
          </div>

          {file && !previewUrl && <FileStatusCard fileName={file.name} alt="3D model file" />}

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

              {file && <FileStatusCard fileName={file.name} alt="3D model preview" />}

              <p className="mt-2 text-xs text-muted-foreground">
                {t("create.previewColorNote")}
              </p>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label>{t("create.material")}</Label>
            <Select value={form.material} onValueChange={(value) => setForm({ ...form, material: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIALS.map((material) => (
                  <SelectItem key={material.value} value={material.value}>
                    <span className="font-medium">{material.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">– {t(material.descKey)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("create.color")}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((color, index) => (
                <motion.button
                  key={color.value}
                  type="button"
                  onClick={() => setForm({ ...form, color: color.value })}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    form.color === color.value
                      ? "border-primary bg-primary/10 text-foreground shadow-[0_0_20px_rgba(249,115,22,0.14)]"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <Label>{t("create.printQuality")}</Label>
            <RadioGroup
              value={form.quality}
              onValueChange={(value) => setForm({ ...form, quality: value })}
              className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {QUALITIES.map((quality, index) => (
                <motion.label
                  key={quality.value}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ y: -2 }}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-all ${
                    form.quality === quality.value
                      ? "border-primary bg-primary/10 shadow-[0_0_22px_rgba(249,115,22,0.12)]"
                      : "border-border hover:border-primary"
                  }`}
                >
                  <RadioGroupItem value={quality.value} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{quality.label}</p>
                    <p className="text-xs text-muted-foreground">{t(quality.descKey)}</p>
                  </div>
                </motion.label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("create.quantity")}</Label>
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
              <Label>{t("create.scale")}</Label>
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
            onClick={openPaymentDialog}
            disabled={submitDisabled}
            className="w-full font-display uppercase tracking-wider"
          >
            {submitting ? "Preparing..." : "Submit custom order"}
          </Button>
        </div>
      </div>

      <ReviewSection toolType="custom-print" title="Custom 3D Print Reviews" />
    </div>
  );
};

const CreateYourOwn = () => {
  const [pageBlocks, setPageBlocks] = useState<SiteBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CreateTabValue>("custom-print");

  useEffect(() => {
    const fetchBlocks = async () => {
      setBlocksLoading(true);

      const { data } = await supabase
        .from("site_blocks")
        .select("*")
        .eq("page", "create-your-own")
        .eq("is_active", true)
        .order("sort_order");

      setPageBlocks((data as SiteBlock[]) ?? []);
      setBlocksLoading(false);
    };

    void fetchBlocks();
  }, []);

  const { topBlocks, bottomBlocks } = useMemo(() => {
    const top: SiteBlock[] = [];
    const bottom: SiteBlock[] = [];

    for (const block of pageBlocks) {
      const placement = (block.content as Record<string, unknown> | null)?.placement;
      if (placement === "after_create_your_own") bottom.push(block);
      else top.push(block);
    }

    return { topBlocks: top, bottomBlocks: bottom };
  }, [pageBlocks]);

  return (
    <div>
      {!blocksLoading && topBlocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}

      <section className="py-8 lg:py-12">
        <div className="container max-w-6xl">
          <motion.div {...fadeUp} className="mb-8">
            <h1 className="mb-2 font-display text-3xl font-bold uppercase text-foreground lg:text-5xl">
              Create Your <span className="text-primary">Own</span>
            </h1>

            <p className="max-w-2xl text-muted-foreground">
              Upload, customize, preview, and submit. Use custom print for 3D models, lithophane for photo lamps, or
              gift finder for quick inspiration.
            </p>
          </motion.div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as CreateTabValue)}
            className="space-y-6"
          >
            <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl bg-muted/50 p-2 sm:grid-cols-3">
              <TabsTrigger
                value="custom-print"
                className="gap-1.5 rounded-xl font-display text-xs uppercase tracking-wider"
              >
                <Box className="h-4 w-4" /> Custom 3D Print
              </TabsTrigger>

              <TabsTrigger
                value="lithophane"
                className="gap-1.5 rounded-xl font-display text-xs uppercase tracking-wider"
              >
                <Image className="h-4 w-4" /> Lithophane
              </TabsTrigger>

              <TabsTrigger
                value="gift-finder"
                className="gap-1.5 rounded-xl font-display text-xs uppercase tracking-wider"
              >
                <Gift className="h-4 w-4" /> Gift Finder
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
              >
                {activeTab === "custom-print" && (
                  <ToolShell
                    eyebrow="Custom print"
                    title="Custom 3D Print Order"
                    description="Upload your 3D file or a reference image, choose material and print quality, then continue to the request fee checkout."
                  >
                    <CustomPrintOrder />
                  </ToolShell>
                )}

                {activeTab === "lithophane" && (
                  <ToolShell
                    eyebrow="Lithophane"
                    title="Photo to lithophane"
                    description="Upload your image, crop it, preview the lamp style in 3D, and send the configuration directly as a custom order."
                  >
                    <LithophaneOrderSection />
                  </ToolShell>
                )}

                {activeTab === "gift-finder" && (
                  <ToolShell
                    eyebrow="Gift finder"
                    title="Find the best match"
                    description="Choose one or more vibes and get the strongest product matches first."
                  >
                    <GiftFinder />
                  </ToolShell>
                )}
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </div>
      </section>

      {!blocksLoading && bottomBlocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}
    </div>
  );
};

export default CreateYourOwn;
