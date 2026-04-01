import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Truck, Shield, Star, ShoppingBag, Palette, Upload, Package, HelpCircle, Gift, Heart,
  Sparkles, BadgeCheck, Printer, Box, Mail, ExternalLink, CheckCircle2, Gem, Wrench, Home,
  Instagram, Clock, CreditCard, DollarSign, MapPin, Phone, Globe, Camera, Image, Video,
  Play, Pause, Download, Share2, ThumbsUp, Award, Zap, Flame, Lock, Unlock, Eye, EyeOff,
  Bell, MessageCircle, Send, Search, Filter, Settings, Sliders, BarChart3, PieChart,
  TrendingUp, Users, UserPlus, User, LogIn, LogOut, ArrowRight, ArrowLeft, ArrowUp,
  ArrowDown, ChevronRight, ChevronDown, Link, Layers, Grid, List, LayoutGrid, Bookmark,
  Tag, Calendar, FileText, Folder, Cpu, Cog, Paintbrush, Sun, Moon, Cloud, Wifi,
  Database, Server, Terminal, Code, Rocket, Target, Flag, Trophy, Medal, Crown, Diamond,
  Scissors, Ruler, Pencil, Edit, Copy, Clipboard, RefreshCw, RotateCcw, Maximize,
  Minimize, Move, Grip, Menu, MoreHorizontal, MoreVertical, Info, AlertCircle,
  AlertTriangle, XCircle, CheckCircle, CircleDot, type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Truck, Shield, Star, ShoppingBag, Palette, Upload, Package, HelpCircle, Gift, Heart,
  Sparkles, BadgeCheck, Printer, Box, Mail, ExternalLink, CheckCircle2, Gem, Wrench, Home,
  Instagram, Clock, CreditCard, DollarSign, MapPin, Phone, Globe, Camera, Image, Video,
  Play, Pause, Download, Share2, ThumbsUp, Award, Zap, Flame, Lock, Unlock, Eye, EyeOff,
  Bell, MessageCircle, Send, Search, Filter, Settings, Sliders, BarChart3, PieChart,
  TrendingUp, Users, UserPlus, User, LogIn, LogOut, ArrowRight, ArrowLeft, ArrowUp,
  ArrowDown, ChevronRight, ChevronDown, Link, Layers, Grid, List, LayoutGrid, Bookmark,
  Tag, Calendar, FileText, Folder, Cpu, Cog, Paintbrush, Sun, Moon, Cloud, Wifi,
  Database, Server, Terminal, Code, Rocket, Target, Flag, Trophy, Medal, Crown, Diamond,
  Scissors, Ruler, Pencil, Edit, Copy, Clipboard, RefreshCw, RotateCcw, Maximize,
  Minimize, Move, Grip, Menu, MoreHorizontal, MoreVertical, Info, AlertCircle,
  AlertTriangle, XCircle, CheckCircle, CircleDot,
};

const ALL_ICONS = Object.keys(ICON_MAP);

interface IconPickerFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export default function IconPickerField({ label, value, onChange }: IconPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return ALL_ICONS;
    const q = search.toLowerCase();
    return ALL_ICONS.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  const SelectedIcon = value ? ICON_MAP[value] : null;

  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center gap-2 rounded-lg border border-border/40 bg-card/50 px-2 text-xs transition-colors hover:border-primary/30"
          >
            {SelectedIcon ? (
              <SelectedIcon className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 truncate text-left text-foreground">{value || "Select icon"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="border-b border-border/30 p-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons..."
              className="h-7 text-xs"
              autoFocus
            />
          </div>
          <ScrollArea className="h-56">
            <div className="grid grid-cols-7 gap-0.5 p-2">
              {/* None option */}
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted",
                  !value && "bg-primary/10 text-primary"
                )}
                title="None"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
              {filtered.map((name) => {
                const IconComp = ICON_MAP[name];
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { onChange(name); setOpen(false); setSearch(""); }}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted",
                      value === name && "bg-primary/10 text-primary"
                    )}
                    title={name}
                  >
                    <IconComp className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <p className="p-4 text-center text-[10px] text-muted-foreground">No icons found</p>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
