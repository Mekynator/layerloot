import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Upload, Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalyticsSafe } from "@/contexts/AnalyticsContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ModelViewer from "@/components/ModelViewer";
import { motion } from "framer-motion";
import { renderBlock } from "@/components/admin/BlockRenderer";
import { usePageBlocks } from "@/hooks/use-page-blocks";
import { useStaticSectionSettings } from "@/hooks/use-static-section-settings";

const ACCEPTED_EXTENSIONS = ".stl,.obj,.3mf";

const SubmitDesign = () => {
  const { user } = useAuth();
  const { track } = useAnalyticsSafe();
  const { toast } = useToast();
  const { data: pageBlocks = [], isLoading: blocksLoading } = usePageBlocks("submit-design");
  const { isVisible } = useStaticSectionSettings("submit-design");

  const [form, setForm] = useState({
    creator_name: "",
    email: "",
    portfolio_url: "",
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["stl", "obj", "3mf"].includes(ext ?? "")) {
      toast({
        title: "Invalid file",
        description: "Please upload an STL, OBJ, or 3MF file.",
        variant: "destructive",
      });
      return;
    }

    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to submit a design.",
        variant: "destructive",
      });
      return;
    }

    if (!file || !form.creator_name.trim() || !form.email.trim() || !form.description.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields and upload a model.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("custom-order-files").upload(path, file);

    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("custom-order-files").getPublicUrl(path);

    const { error } = await supabase.from("creator_submissions").insert({
      user_id: user.id,
      creator_name: form.creator_name.trim(),
      email: form.email.trim(),
      portfolio_url: form.portfolio_url.trim() || null,
      model_url: urlData.publicUrl,
      model_filename: file.name,
      description: form.description.trim(),
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Design submitted!", description: "Our team will review your model." });
    track("design_submitted", { model_filename: file.name });
    setForm({ creator_name: "", email: "", portfolio_url: "", description: "" });
    setFile(null);
    setPreviewUrl(null);
  };

  const topBlocks = pageBlocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement !== "after_submit_design",
  );
  const bottomBlocks = pageBlocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement === "after_submit_design",
  );

  const showForm = isVisible("static_submit_form");

  return (
    <div>
      {!blocksLoading && topBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}

      {showForm && (
        <section className="py-8 lg:py-12">
          <div className="container max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-2 flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <span className="font-display text-sm uppercase tracking-widest text-primary">Creator Program</span>
              </div>

              <h1 className="mb-2 font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
                Submit Your Design
              </h1>

              <p className="mb-8 text-muted-foreground">
                Share your 3D model with us. Approved designs join our Creator Series collection.
              </p>

              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display text-lg uppercase">
                        <Upload className="h-5 w-5 text-primary" /> Upload Model
                      </CardTitle>
                    </CardHeader>

                    <CardContent>
                      <div
                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary"
                        onClick={() => document.getElementById("design-file-input")?.click()}
                      >
                        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">{file ? file.name : "Click to upload"}</p>
                        <p className="text-xs text-muted-foreground">STL, OBJ, 3MF files</p>
                      </div>

                      <input
                        id="design-file-input"
                        type="file"
                        accept={ACCEPTED_EXTENSIONS}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </CardContent>
                  </Card>

                  {previewUrl && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                      <ModelViewer url={previewUrl} className="aspect-square" />
                    </motion.div>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-lg uppercase">
                      <Send className="h-5 w-5 text-primary" /> Creator Details
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    {!user ? (
                      <div className="py-8 text-center">
                        <p className="text-muted-foreground">
                          Please{" "}
                          <Link to="/auth" className="text-primary hover:underline">
                            sign in
                          </Link>{" "}
                          to submit a design.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label>Creator / Studio Name *</Label>
                          <Input
                            value={form.creator_name}
                            onChange={(e) => setForm({ ...form, creator_name: e.target.value })}
                            placeholder="Your name or studio"
                            maxLength={100}
                          />
                        </div>

                        <div>
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="your@email.com"
                            maxLength={255}
                          />
                        </div>

                        <div>
                          <Label>Portfolio URL (optional)</Label>
                          <Input
                            value={form.portfolio_url}
                            onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })}
                            placeholder="https://your-portfolio.com"
                            maxLength={500}
                          />
                        </div>

                        <div>
                          <Label>Description *</Label>
                          <Textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Tell us about your design..."
                            rows={4}
                            maxLength={2000}
                          />
                        </div>

                        <Button
                          onClick={handleSubmit}
                          disabled={submitting || !file}
                          className="w-full font-display uppercase tracking-wider"
                        >
                          {submitting ? "Submitting..." : "Submit Design"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {!blocksLoading && bottomBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}
    </div>
  );
};

export default SubmitDesign;
