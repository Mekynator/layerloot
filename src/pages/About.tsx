import { Layers, Printer, Heart, Globe, Zap, Users } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const About = () => {
  return (
    <div>
      {/* Hero */}
      <section className="bg-secondary py-20 lg:py-28">
        <div className="container max-w-3xl text-center">
          <motion.div {...fadeUp}>
            <div className="mb-4 flex items-center justify-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <span className="font-display text-sm uppercase tracking-widest text-primary">Our Story</span>
            </div>
            <h1 className="mb-6 font-display text-4xl font-bold uppercase text-secondary-foreground lg:text-6xl">
              About <span className="text-primary">LayerLoot</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We're a passionate team of makers, designers, and 3D printing enthusiasts. We believe everyone should have access to unique, custom-made objects — printed layer by layer with precision and care.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-24">
        <div className="container max-w-5xl">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold uppercase text-foreground">What Drives Us</h2>
          </motion.div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Printer, title: "Quality First", desc: "Every item is printed, inspected, and finished by hand to meet our standards." },
              { icon: Heart, title: "Made With Care", desc: "We treat every order like our own project — because we're makers too." },
              { icon: Zap, title: "Innovation", desc: "Constantly exploring new materials, techniques, and designs to push boundaries." },
              { icon: Users, title: "Community", desc: "We celebrate creators. Our gallery and Creator Series are built for you." },
              { icon: Globe, title: "Sustainability", desc: "PLA is biodegradable. We minimize waste and recycle failed prints." },
              { icon: Layers, title: "Layer by Layer", desc: "From filament to finished product — every layer is placed with purpose." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:-translate-y-1"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-card-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {[
              { stat: "500+", label: "Products Printed" },
              { stat: "50+", label: "Happy Customers" },
              { stat: "10+", label: "Materials Available" },
              { stat: "24/7", label: "AI Support" },
            ].map(({ stat, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="font-display text-4xl font-black text-primary">{stat}</p>
                <p className="mt-1 font-display text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="container max-w-2xl text-center">
          <h2 className="mb-4 font-display text-3xl font-bold uppercase text-foreground">
            Ready to Create?
          </h2>
          <p className="mb-8 text-muted-foreground">
            Whether you're shopping for something unique, customizing your own design, or uploading a 3D model — we're here to bring your ideas to life.
          </p>
        </div>
      </section>
    </div>
  );
};

export default About;
