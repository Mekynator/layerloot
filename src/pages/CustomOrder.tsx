import { useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Send, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ModelViewer from "@/components/ModelViewer";
import { motion } from "framer-motion";

const ACCEPTED_EXTENSIONS = ".stl,.obj,.3mf";

const CustomOrder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["stl", "obj", "3mf"].includes(ext ?? "")) {
      toast({ title: "Invalid file", description: "Please upload an STL, OBJ, or 3MF file.", variant: "destructive" });
      return;
    }
    setFile(f);
    // Create local URL for preview
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to sign in to submit a custom order.", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Missing file", description: "Please upload a 3D model file.", variant: "destructive" });
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.description.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    // Upload file
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("custom-order-files").upload(path, file);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("custom-order-files").getPublicUrl(path);

    // Create order
    const { error } = await supabase.from("custom_orders").insert({
      user_id: user.id,
      name: form.name.trim(),
      email: form.email.trim(),
      description: form.description.trim(),
      model_url: urlData.publicUrl,
      model_filename: file.name,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order submitted!", description: "We'll review your 3D model and get back to you." });
      setForm({ name: "", email: "", description: "" });
      setFile(null);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
            Custom 3D Print Order
          </h1>
          <p className="mb-8 text-muted-foreground">
            Upload your 3D model file (STL, OBJ, or 3MF) and we'll create a custom piece for you.
          </p>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Upload & Preview */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-lg uppercase">
                    <Box className="h-5 w-5 text-primary" /> Upload 3D Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div
                      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary"
                      onClick={() => document.getElementById("model-file-input")?.click()}
                    >
                      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        {file ? file.name : "Click to upload"}
                      </p>
                      <p className="text-xs text-muted-foreground">STL, OBJ, 3MF files supported</p>
                    </div>
                    <input
                      id="model-file-input"
                      type="file"
                      accept={ACCEPTED_EXTENSIONS}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>

              {previewUrl && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <ModelViewer url={previewUrl} className="aspect-square" />
                </motion.div>
              )}
            </div>

            {/* Order Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg uppercase">
                  <Send className="h-5 w-5 text-primary" /> Order Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="py-8 text-center">
                    <p className="mb-4 text-muted-foreground">
                      Please <Link to="/auth" className="text-primary hover:underline">sign in</Link> to submit a custom order.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Your Name</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Describe your custom order: material preferences, size, color, quantity..."
                        rows={5}
                      />
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !file}
                      className="w-full font-display uppercase tracking-wider"
                    >
                      {submitting ? "Submitting..." : "Submit Custom Order"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CustomOrder;
