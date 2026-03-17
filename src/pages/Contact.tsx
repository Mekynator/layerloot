import { useEffect, useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";

type ContactSettings = {
  email: string;
  phone: string;
  address: string;
  social?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
  };
};

const defaultContact: ContactSettings = {
  email: "support@layerloot.lovable.app",
  phone: "+45 00 00 00 00",
  address: "Copenhagen, Denmark",
  social: { instagram: "", facebook: "", youtube: "" },
};

const Contact = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [contact, setContact] = useState<ContactSettings>(defaultContact);

  useEffect(() => {
    let mounted = true;

    const fetchPageData = async () => {
      const [settingsRes, blocksRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
        supabase.from("site_blocks").select("*").eq("page", "contact").eq("is_active", true).order("sort_order"),
      ]);

      if (!mounted) return;

      if (settingsRes.data?.value) {
        setContact(settingsRes.data.value as ContactSettings);
      }

      setBlocks((blocksRes.data as SiteBlock[]) ?? []);
      setPageLoading(false);
    };

    fetchPageData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      toast({
        title: "Message sent!",
        description: "We'll get back to you soon.",
      });
      setLoading(false);
      (e.target as HTMLFormElement).reset();
    }, 800);
  };

  const beforeFormBlocks = blocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement !== "after_contact",
  );
  const afterFormBlocks = blocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement === "after_contact",
  );

  return (
    <div>
      {pageLoading ? (
        <div className="flex min-h-[25vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        beforeFormBlocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)
      )}

      <section className="py-16">
        <div className="container max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 font-display text-4xl font-bold uppercase text-foreground">Contact Us</h1>
            <p className="mb-12 text-muted-foreground">Have a question or custom order request? Drop us a line.</p>
          </motion.div>

          <div className="grid gap-12 md:grid-cols-2">
            <motion.form
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <Input placeholder="Your Name" required />
              <Input type="email" placeholder="Your Email" required />
              <Input placeholder="Subject" required />
              <Textarea placeholder="Your Message..." rows={5} required />
              <Button type="submit" disabled={loading} className="w-full font-display uppercase tracking-wider">
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
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

              {(contact.social?.instagram || contact.social?.facebook || contact.social?.youtube) && (
                <div className="space-y-2 pt-4">
                  <h3 className="font-display text-sm font-semibold uppercase text-foreground">Follow Us</h3>
                  <div className="flex gap-3">
                    {contact.social?.instagram && (
                      <a
                        href={contact.social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        Instagram
                      </a>
                    )}
                    {contact.social?.facebook && (
                      <a
                        href={contact.social.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        Facebook
                      </a>
                    )}
                    {contact.social?.youtube && (
                      <a
                        href={contact.social.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        YouTube
                      </a>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {!pageLoading && afterFormBlocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}
    </div>
  );
};

export default Contact;
