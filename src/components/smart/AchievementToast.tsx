import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ShoppingBag, Star, Repeat, Sparkles } from "lucide-react";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: "trophy" | "bag" | "star" | "repeat" | "sparkles";
};

const ACHIEVEMENTS_KEY = "layerloot_achievements";
const SHOWN_KEY = "layerloot_achievements_shown";

function getIcon(icon: Achievement["icon"]) {
  switch (icon) {
    case "trophy": return <Trophy className="h-5 w-5" />;
    case "bag": return <ShoppingBag className="h-5 w-5" />;
    case "star": return <Star className="h-5 w-5" />;
    case "repeat": return <Repeat className="h-5 w-5" />;
    case "sparkles": return <Sparkles className="h-5 w-5" />;
  }
}

export function useAchievements() {
  const [queue, setQueue] = useState<Achievement[]>([]);

  const unlock = (achievement: Achievement) => {
    try {
      const shown = JSON.parse(localStorage.getItem(SHOWN_KEY) || "[]") as string[];
      if (shown.includes(achievement.id)) return;
      shown.push(achievement.id);
      localStorage.setItem(SHOWN_KEY, JSON.stringify(shown));
      setQueue((prev) => [...prev, achievement]);
    } catch { /* ignore */ }
  };

  const dismiss = () => {
    setQueue((prev) => prev.slice(1));
  };

  return { currentAchievement: queue[0] ?? null, unlock, dismiss };
}

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export default function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  useEffect(() => {
    if (!achievement) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [achievement, onDismiss]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          onClick={onDismiss}
          className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 cursor-pointer"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-card/90 px-5 py-3 shadow-[0_16px_48px_hsl(217_91%_60%/0.2)] backdrop-blur-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {getIcon(achievement.icon)}
            </div>
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {achievement.title}
              </p>
              <p className="text-xs text-muted-foreground">{achievement.description}</p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-primary"
            >
              ✨
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
