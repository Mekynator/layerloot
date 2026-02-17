import { useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Send, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ModelViewer from "@/components/ModelViewer";
import { motion } from "framer-motion";

const ACCEPTED_EXTENSIONS = ".stl,.obj,.3mf";

const MATERIALS = [
  { value: "pla", label: "PLA", desc: "Standard, biodegradable" },
  { value: "abs", label: "ABS", desc: "Strong, heat-resistant" },
  { value: "petg", label: "PETG", desc: "Durable, flexible" },
  { value: "tpu", label: "TPU", desc: "Flexible, rubber-like" },
  { value: "resin", label: "Resin", desc: "High detail, smooth" },
  { value: "nylon", label: "Nylon", desc: "Strong, lightweight" },
  { value: "other", label: "Other", desc: "Specify in description" },
];

const COLORS = [
  { value: "white", label: "White", hex: "#ffffff" },
  { value: "black", label: "Black", hex: "#1a1a1a" },
  { value: "red", label: "Red", hex: "#ef4444" },
  { value: "blue", label: "Blue", hex: "#3b82f6" },
  { value: "green", label: "Green", hex: "#22c55e" },
  { value: "yellow", label: "Yellow", hex: "#eab308" },
  { value: "orange", label: "Orange", hex: "#f97316" },
  { value: "gray", label: "Gray", hex: "#6b7280" },
  { value: "custom", label: "Custom", hex: null },
];

const QUALITIES = [
  { value: "draft", label: "Draft", desc: "0.3mm – Fast, lower detail" },
  { value: "standard", label: "Standard", desc: "0.2mm – Balanced" },
  { value: "high", label: "High", desc: "0.2mm – Fine detail" },
  { value: "ultra", label: "Ultra", desc: "0.1mm – Maximum detail" },
];

const CustomOrder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    description: "",
    material: "pla",
    color: "white",
    custom_color: "",
    quality: "standard",
    quantity: 1,
    size_scale: "100",
  });
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
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("custom-order-files").upload(path, file);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("custom-order-files").getPublicUrl(path);

    const fullDescription = [
      form.description.trim(),
      `\n--- Options ---`,
      `Material: ${MATERIALS.find(m => m.value === form.material)?.label ?? form.material}`,
      `Color: ${form.color === "custom" ? form.custom_color : COLORS.find(c => c.value === form.color)?.label ?? form.color}`,
      `Quality: ${QUALITIES.find(q => q.value === form.quality)?.label ?? form.quality}`,
      `Quantity: ${form.quantity}`,
      `Scale: ${form.size_scale}%`,
    ].join("\n");

    const { error } = await supabase.from("custom_orders").insert({
      user_id: user.id,
      name: form.name.trim(),
      email: form.email.trim(),
      description: fullDescription,
      model_url: urlData.publicUrl,
      model_filename: file.name,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order submitted!", description: "We'll review your 3D model and get back to you." });
      setForm({ name: "", email: "", description: "", material: "pla", color: "white", custom_color: "", quality: "standard", quantity: 1, size_scale: "100" });
      setFile(null);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
            Custom 3D Print Order
          </h1>
          <p className="mb-8 text-muted-foreground">
            Upload your 3D model file (STL, OBJ, or 3MF) and configure your print options.
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
                </CardContent>
              </Card>

              {previewUrl && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <ModelViewer url={previewUrl} className="aspect-square" />
                </motion.div>
              )}
            </div>

            {/* Order Form */}
            <div className="space-y-4">
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Your Name *</Label>
                          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
                        </div>
                        <div>
                          <Label>Email *</Label>
                          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
                        </div>
                      </div>

                      {/* Material */}
                      <div>
                        <Label>Material</Label>
                        <Select value={form.material} onValueChange={(v) => setForm({ ...form, material: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MATERIALS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                <span className="font-medium">{m.label}</span>
                                <span className="ml-2 text-xs text-muted-foreground">– {m.desc}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Color */}
                      <div>
                        <Label>Color</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {COLORS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setForm({ ...form, color: c.value })}
                              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                                form.color === c.value
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border text-muted-foreground hover:border-primary"
                              }`}
                            >
                              {c.hex && (
                                <span
                                  className="inline-block h-3 w-3 rounded-full border border-border"
                                  style={{ backgroundColor: c.hex }}
                                />
                              )}
                              {c.label}
                            </button>
                          ))}
                        </div>
                        {form.color === "custom" && (
                          <Input
                            className="mt-2"
                            placeholder="Specify your color (e.g. Pantone 485 C)"
                            value={form.custom_color}
                            onChange={(e) => setForm({ ...form, custom_color: e.target.value })}
                          />
                        )}
                      </div>

                      {/* Quality */}
                      <div>
                        <Label>Print Quality</Label>
                        <RadioGroup value={form.quality} onValueChange={(v) => setForm({ ...form, quality: v })} className="mt-1 grid grid-cols-2 gap-2">
                          {QUALITIES.map((q) => (
                            <label
                              key={q.value}
                              className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 transition-all ${
                                form.quality === q.value ? "border-primary bg-primary/10" : "border-border hover:border-primary"
                              }`}
                            >
                              <RadioGroupItem value={q.value} />
                              <div>
                                <p className="text-sm font-medium text-foreground">{q.label}</p>
                                <p className="text-xs text-muted-foreground">{q.desc}</p>
                              </div>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>

                      {/* Quantity & Scale */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min={1}
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
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

                      {/* Description */}
                      <div>
                        <Label>Additional Details *</Label>
                        <Textarea
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="Any special requirements, notes, or preferences..."
                          rows={4}
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
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CustomOrder;
