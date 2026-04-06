import { useEffect, useState } from "react";
import { Mail, MapPin, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  email: "",
  phone: "",
  address: "",
  social: { instagram: "", facebook: "", youtube: "" },
};

const Contact = () => {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [contact, setContact] = useState<ContactSettings>(defaultContact);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("contact-send", {
        body: { name, email, subject, message },
      });

      if (error) throw error;

      // Send auto-reply confirmation email
      const ticketNumber = `TK-${Date.now().toString(36).toUpperCase()}`;
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-auto-reply",
          recipientEmail: email,
          idempotencyKey: `contact-reply-${ticketNumber}`,
          templateData: { name, ticketNumber, ticketSubject: subject, ticketMessage: message, replyTimeEstimate: "1-2 business days" },
        },
      });

      toast({
        title: t("contact.messageSent"),
        description: t("contact.messageSentDesc"),
      });

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error("Contact form error:", err);
      toast({
        title: t("common.error"),
        description: t("contact.messageFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

      {/* Contact form – functional core, always rendered */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <div className="grid gap-12 md:grid-cols-2">
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("contact.yourName")} required />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t("contact.yourEmail")} required />
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("contact.subject")} required />
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("contact.yourMessage")} rows={5} required />

              <Button type="submit" disabled={loading} className="w-full font-display uppercase tracking-wider">
                <Send className="mr-2 h-4 w-4" />
                {loading ? t("contact.sending") : t("contact.sendMessage")}
              </Button>
            </motion.form>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="font-display text-xl font-semibold uppercase text-foreground">{t("contact.getInTouch")}</h2>

              <div className="space-y-4">
                {[
                  { icon: Mail, label: t("contact.emailLabel"), value: contact.email },
                  { icon: MapPin, label: t("contact.locationLabel"), value: contact.address },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/60 backdrop-blur-md shadow-[0_4px_16px_-4px_hsl(225_44%_4%/0.3)]">
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
                  <h3 className="font-display text-sm font-semibold uppercase text-foreground">{t("contact.followUs")}</h3>
                  <div className="flex gap-3">
                    {contact.social?.instagram && (
                      <a href={contact.social.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">
                        Instagram
                      </a>
                    )}
                    {contact.social?.facebook && (
                      <a href={contact.social.facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">
                        Facebook
                      </a>
                    )}
                    {contact.social?.youtube && (
                      <a href={contact.social.youtube} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">
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
