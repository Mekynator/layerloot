import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function InlineEditor({ initialValue, field, onSave, onCancel }: { initialValue: string; field: string; onSave: (value: string) => void | Promise<void>; onCancel: () => void }) {
  const [value, setValue] = useState(initialValue ?? "");
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    ref.current?.focus();
    if (ref.current instanceof HTMLInputElement) {
      ref.current.select();
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
      if (e.key === "Enter" && !(ref.current instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        void onSave(value.trim());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onSave, onCancel]);

  const isMultiline = field === "body" || field === "subheading";

  return (
    <div className="w-full max-w-[680px] rounded-md border border-border/30 bg-card/95 p-2 shadow-lg">
      {isMultiline ? (
        <Textarea ref={ref as any} value={value} onChange={(e) => setValue(e.target.value)} className="min-h-[88px] resize-y" onBlur={() => void onSave(value.trim())} />
      ) : (
        <Input ref={ref as any} value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => void onSave(value.trim())} />
      )}

      <div className="mt-2 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => void onSave(value.trim())}>Save</Button>
      </div>
    </div>
  );
}
