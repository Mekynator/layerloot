import { useEffect, useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const Contact = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState({ email: "support@layerloot.lovable.app", phone: "+45 00 00 00 00", address: "Copenhagen, Denmark", social: { instagram: "", facebook: "", youtube: "" } });

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle().then(({ data }) => {
      if (data?.value) setContact(data.value as any);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setLoading(false);
      (e.target as HTMLFormElement).reset();
    }, 800);
  };

  return (
    <div className="py-16">
      <div className="container max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 font-display text-4xl font-bold uppercase text-foreground">Contact Us</h1>
          <p className="mb-12 text-muted-foreground">Have a question or custom order request? Drop us a line.</p>
        </motion.div>

        <div className="grid gap-12 md:grid-cols-2">
          <motion.form initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Your Name" required />
            <Input type="email" placeholder="Your Email" required />
            <Input placeholder="Subject" required />
            <Textarea placeholder="Your Message..." rows={5} required />
            <Button type="submit" disabled={loading} className="w-full font-display uppercase tracking-wider">
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </motion.form>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            <h2 className="font-display text-xl font-semibold uppercase text-foreground">Get in Touch</h2>
            <div className="space-y-4">
              {[
                { icon: Mail, label: "Email", value: contact.email },
                { icon: Phone, label: "Phone", value: contact.phone },
                { icon: MapPin, label: "Location", value: contact.address },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold uppercase text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Social Links */}
            {(contact.social?.instagram || contact.social?.facebook || contact.social?.youtube) && (
              <div className="space-y-2 pt-4">
                <h3 className="font-display text-sm font-semibold uppercase text-foreground">Follow Us</h3>
                <div className="flex gap-3">
                  {contact.social?.instagram && (
                    <a href={contact.social.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">Instagram</a>
                  )}
                  {contact.social?.facebook && (
                    <a href={contact.social.facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">Facebook</a>
                  )}
                  {contact.social?.youtube && (
                    <a href={contact.social.youtube} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">YouTube</a>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
