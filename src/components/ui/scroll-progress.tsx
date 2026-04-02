import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Thin scroll-progress bar fixed at the top of the viewport. */
const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (prefersReduced) return null;

  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left"
      style={{
        scaleX: progress,
        background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
        boxShadow: "0 0 8px hsl(var(--primary) / 0.4)",
      }}
    />
  );
};

export default ScrollProgress;
