import { useCallback, useRef } from "react";

/**
 * Hook that creates a material-design ripple effect on click.
 * Returns a ref to attach to the container and an onPointerDown handler.
 */
export function useRipple<T extends HTMLElement = HTMLElement>() {
  const containerRef = useRef<T>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;

    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement("span");
    ripple.className = "ripple-effect";
    ripple.style.cssText = `
      position: absolute;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: hsl(217 91% 60% / 0.15);
      transform: scale(0);
      pointer-events: none;
      animation: ripple-expand 0.5s ease-out forwards;
    `;

    el.style.position = el.style.position || "relative";
    el.style.overflow = "hidden";
    el.appendChild(ripple);

    ripple.addEventListener("animationend", () => ripple.remove());
  }, []);

  return { containerRef, onPointerDown };
}
