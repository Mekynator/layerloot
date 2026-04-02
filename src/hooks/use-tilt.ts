import { useCallback, useRef } from "react";

/**
 * Subtle 3D tilt effect on mouse move.
 * Attach ref + handlers to a card/tile element.
 */
export function useTilt<T extends HTMLElement = HTMLElement>(intensity = 6) {
  const ref = useRef<T>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      el.style.transform = `perspective(800px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) translateY(-4px)`;
      el.style.transition = "transform 0.1s ease-out";
    },
    [intensity]
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.transition = "transform 0.4s ease-out";
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
