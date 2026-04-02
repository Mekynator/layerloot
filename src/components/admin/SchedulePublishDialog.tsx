import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SchedulePublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: Date) => void;
  onPublishNow: () => void;
  currentSchedule?: Date | null;
  onCancelSchedule?: () => void;
}

export default function SchedulePublishDialog({
  open, onOpenChange, onSchedule, onPublishNow, currentSchedule, onCancelSchedule,
}: SchedulePublishDialogProps) {
  const [date, setDate] = useState<Date | undefined>(currentSchedule ?? undefined);
  const [time, setTime] = useState(
    currentSchedule ? format(currentSchedule, "HH:mm") : "09:00"
  );

  const handleSchedule = () => {
    if (!date) return;
    const [h, m] = time.split(":").map(Number);
    const scheduled = new Date(date);
    scheduled.setHours(h, m, 0, 0);
    if (scheduled <= new Date()) return;
    onSchedule(scheduled);
    onOpenChange(false);
  };

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wider text-sm">Schedule Publish</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {currentSchedule && (
            <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <Clock className="h-4 w-4" />
                Scheduled for {format(currentSchedule, "MMM d, yyyy HH:mm")}
              </div>
              {onCancelSchedule && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => { onCancelSchedule(); onOpenChange(false); }}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Time</Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full" />
          </div>

          <p className="text-[10px] text-muted-foreground">
            Timezone: {tz}
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="sm" onClick={() => { onPublishNow(); onOpenChange(false); }} className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" /> Publish Now Instead
          </Button>
          <Button size="sm" onClick={handleSchedule} disabled={!date} className="gap-1.5 text-xs font-display uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5" /> Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
