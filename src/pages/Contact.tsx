import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
        <h1 className="mb-2 font-display text-4xl font-bold uppercase text-foreground">Contact Us</h1>
        <p className="mb-12 text-muted-foreground">Have a question or custom order request? Drop us a line.</p>

        <div className="grid gap-12 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Your Name" required />
            <Input type="email" placeholder="Your Email" required />
            <Input placeholder="Subject" required />
            <Textarea placeholder="Your Message..." rows={5} required />
            <Button type="submit" disabled={loading} className="w-full font-display uppercase tracking-wider">
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </form>

          <div className="space-y-6">
            <h2 className="font-display text-xl font-semibold uppercase text-foreground">Get in Touch</h2>
            <div className="space-y-4">
              {[
                { icon: Mail, label: "Email", value: "hello@layerloot.com" },
                { icon: Phone, label: "Phone", value: "+1 (555) 123-4567" },
                { icon: MapPin, label: "Location", value: "Maker District, California" },
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
