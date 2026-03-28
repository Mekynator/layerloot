import { useEffect, useState } from "react";
import { Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstagramMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
};

type InstagramAutoFeedBlockProps = {
  title?: string;
  subtitle?: string;
  instagramUsername?: string;
  itemsToShow?: number;
  layout?: "slider" | "grid";
  autoplay?: boolean;
  showCaptions?: boolean;
  showProfileButton?: boolean;
  intervalMs?: number;
  functionName?: string;
};

export default function InstagramAutoFeedBlock({
  title = "Follow us on Instagram",
  subtitle = "Latest posts and reels",
  instagramUsername = "",
  itemsToShow = 10,
  layout = "slider",
  autoplay = true,
  showCaptions = false,
  showProfileButton = true,
  intervalMs = 3000,
  functionName = "instagram-feed",
}: InstagramAutoFeedBlockProps) {
  const [items, setItems] = useState<InstagramMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);

  const username = String(instagramUsername).trim().replace(/^@/, "");
  const profileUrl = username ? `https://www.instagram.com/${username}` : "https://www.instagram.com";

  useEffect(() => {
    let mounted = true;

    const loadFeed = async () => {
      if (!username) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}?username=${encodeURIComponent(username)}&limit=${itemsToShow}`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
          headers.apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Instagram feed request failed: ${res.status}`);

        const data = await res.json();
        if (!mounted) return;

        setItems(Array.isArray(data?.items) ? data.items.slice(0, itemsToShow) : []);
        setCurrent(0);
      } catch (error) {
        console.error("Failed to load Instagram feed", error);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadFeed();

    return () => {
      mounted = false;
    };
  }, [functionName, itemsToShow, username]);

  useEffect(() => {
    if (!autoplay || layout !== "slider" || items.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, Math.max(1500, intervalMs || 3000));
    return () => window.clearInterval(timer);
  }, [autoplay, intervalMs, items.length, layout]);

  if (!username) return null;

  const activeItem = items[current];

  return (
    <section className="rounded-3xl border bg-card/70 p-5 shadow-sm backdrop-blur md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {showProfileButton && (
          <Button asChild>
            <a href={profileUrl} target="_blank" rel="noreferrer">
              <Instagram className="mr-2 h-4 w-4" />@{username}
            </a>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading Instagram feed...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No Instagram posts found.</div>
      ) : layout === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const imageSrc = item.media_type === "VIDEO" ? item.thumbnail_url || item.media_url : item.media_url;
            return (
              <a
                key={item.id}
                href={item.permalink || profileUrl}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-2xl border bg-background transition hover:shadow-md"
              >
                {imageSrc ? (
                  <img src={imageSrc} alt={item.caption || "Instagram post"} className="aspect-square w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-muted text-sm text-muted-foreground">No image</div>
                )}
                {showCaptions && item.caption && <div className="line-clamp-3 p-3 text-sm text-muted-foreground">{item.caption}</div>}
              </a>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border bg-background">
            {activeItem && (
              <a href={activeItem.permalink || profileUrl} target="_blank" rel="noreferrer">
                <img
                  src={activeItem.media_type === "VIDEO" ? activeItem.thumbnail_url || activeItem.media_url : activeItem.media_url}
                  alt={activeItem.caption || "Instagram post"}
                  className="aspect-square w-full object-cover"
                />
              </a>
            )}
          </div>

          {showCaptions && activeItem?.caption && <p className="text-sm text-muted-foreground">{activeItem.caption}</p>}

          {items.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setCurrent(index)}
                  className={`h-2.5 w-2.5 rounded-full ${index === current ? "bg-primary" : "bg-muted"}`}
                  aria-label={`Go to Instagram item ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
