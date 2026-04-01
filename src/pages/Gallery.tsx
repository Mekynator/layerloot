import { useState, useEffect } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";

const Gallery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("common");

  const [posts, setPosts] = useState<any[]>([]);
  const [pageBlocks, setPageBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_name: "", comment: "" });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      const [postsRes, blocksRes] = await Promise.all([
        supabase
          .from("gallery_posts")
          .select("*")
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("site_blocks").select("*").eq("page", "gallery").eq("is_active", true).order("sort_order"),
      ]);

      if (!mounted) return;

      setPosts(postsRes.data ?? []);
      setPageBlocks((blocksRes.data as SiteBlock[]) ?? []);
      setLoading(false);
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (!user || !file || !form.product_name.trim()) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("gallery-images").upload(path, file);

    if (upErr) {
      toast({ title: t("gallery.uploadFailed"), description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("gallery-images").getPublicUrl(path);

    const { error } = await supabase.from("gallery_posts").insert({
      user_id: user.id,
      image_url: urlData.publicUrl,
      product_name: form.product_name.trim(),
      comment: form.comment.trim() || null,
    });

    setUploading(false);

    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: t("gallery.photoSubmitted"), description: t("gallery.photoApproval") });
    setForm({ product_name: "", comment: "" });
    setFile(null);
    setOpen(false);
  };

  const topBlocks = pageBlocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement !== "after_gallery",
  );
  const bottomBlocks = pageBlocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement === "after_gallery",
  );

  return (
    <div>
      {topBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}

      <section className="py-8 lg:py-12">
        <div className="container max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <span className="font-display text-sm uppercase tracking-widest text-primary">
                  {t("gallery.community")}
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold uppercase text-foreground lg:text-5xl">
                {t("gallery.title")}
              </h1>
              <p className="mt-2 max-w-lg text-muted-foreground">{t("gallery.subtitle")}</p>
            </div>

            {user && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="font-display uppercase tracking-wider">
                    <Upload className="mr-2 h-4 w-4" /> {t("gallery.sharePrint")}
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display uppercase">{t("gallery.sharePrint")}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>{t("gallery.photo")}</Label>
                      <div
                        className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary"
                        onClick={() => document.getElementById("gallery-upload")?.click()}
                      >
                        <Camera className="mb-1 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-foreground">
                          {file ? file.name : t("gallery.clickToUpload")}
                        </p>
                      </div>

                      <input
                        id="gallery-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                    </div>

                    <div>
                      <Label>{t("gallery.productName")}</Label>
                      <Input
                        value={form.product_name}
                        onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                        placeholder={t("gallery.productPlaceholder")}
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <Label>{t("gallery.commentOptional")}</Label>
                      <Textarea
                        value={form.comment}
                        onChange={(e) => setForm({ ...form, comment: e.target.value })}
                        placeholder={t("gallery.commentPlaceholder")}
                        rows={3}
                        maxLength={500}
                      />
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={uploading || !file || !form.product_name.trim()}
                      className="w-full font-display uppercase tracking-wider"
                    >
                      {uploading ? t("gallery.uploading") : t("gallery.submit")}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">{t("gallery.reviewNotice")}</p>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </motion.div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={post.image_url}
                      alt={post.product_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-card-foreground">
                      {post.product_name}
                    </h3>
                    {post.comment && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.comment}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Camera className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="mb-2 font-display text-lg uppercase text-foreground">{t("gallery.noPhotos")}</h3>
              <p className="text-muted-foreground">{t("gallery.beFirst")}</p>
            </div>
          )}
        </div>
      </section>

      {bottomBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}
    </div>
  );
};

export default Gallery;
