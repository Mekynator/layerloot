import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductMediaLightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;
const DOUBLE_TAP_DELAY = 300;

export default function ProductMediaLightbox({ images, startIndex, onClose }: ProductMediaLightboxProps) {
  const [current, setCurrent] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // Touch tracking refs
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTap = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Reset zoom on image change
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [current]);

  // Close on Escape, navigate on arrow keys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrent((c) => (c - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setCurrent((c) => (c + 1) % images.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, images.length]);

  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      pinchStart.current = { dist: getTouchDist(e.touches), scale };
      return;
    }
    if (e.touches.length === 1) {
      const now = Date.now();
      const touch = e.touches[0];

      // Double tap detection
      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        // Toggle zoom
        if (scale > 1) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        } else {
          setScale(2.5);
        }
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;

      if (scale > 1) {
        // Pan mode
        panStart.current = { x: touch.clientX, y: touch.clientY, tx: translate.x, ty: translate.y };
      } else {
        // Swipe mode
        touchStart.current = { x: touch.clientX, y: touch.clientY, time: now };
      }
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const dist = getTouchDist(e.touches);
      const newScale = Math.min(5, Math.max(1, pinchStart.current.scale * (dist / pinchStart.current.dist)));
      setScale(newScale);
      if (newScale <= 1) setTranslate({ x: 0, y: 0 });
      return;
    }
    if (e.touches.length === 1 && panStart.current && scale > 1) {
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      setTranslate({ x: panStart.current.tx + dx, y: panStart.current.ty + dy });
    }
  }, [scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    pinchStart.current = null;
    panStart.current = null;

    if (scale > 1) return; // No swipe while zoomed

    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) setCurrent((c) => (c + 1) % images.length);
      else setCurrent((c) => (c - 1 + images.length) % images.length);
    }
  }, [scale, images.length]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Prev / Next arrows */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setCurrent((c) => (c + 1) % images.length)}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Close button */}
      <div className="absolute right-3 top-3 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Image */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <img
          src={images[current]}
          alt={`Image ${current + 1}`}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-100"
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
          }}
          draggable={false}
        />
      </div>

      {/* Dots */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-6 pt-3">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === current ? "w-5 bg-white" : "w-1.5 bg-white/40"
              }`}
              aria-label={`Image ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      <div className="absolute left-3 top-3 z-10 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
        {current + 1} / {images.length}
      </div>
    </div>
  );
}
