import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAdminActivity } from "@/lib/activity-log";
import { useToast } from "@/hooks/use-toast";

export interface AdminNote {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  note: string;
  is_pinned: boolean;
  created_at: string;
}

export function useAdminNotes(entityType: string, entityId: string | undefined) {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotes = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    const { data } = await supabase
      .from("admin_internal_notes" as any)
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setNotes((data as any as AdminNote[]) ?? []);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(async (text: string) => {
    if (!entityId || !user) return;
    const { error } = await supabase.from("admin_internal_notes" as any).insert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: user.id,
      note: text,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    logAdminActivity({
      userId: user.id,
      userEmail: user.email ?? undefined,
      action: "internal_note_added",
      entityType,
      entityId,
      summary: `Added internal note on ${entityType} ${entityId.slice(0, 8)}`,
    });
    await fetchNotes();
  }, [entityId, entityType, user, fetchNotes, toast]);

  const togglePin = useCallback(async (noteId: string, currentPinned: boolean) => {
    await supabase
      .from("admin_internal_notes" as any)
      .update({ is_pinned: !currentPinned } as any)
      .eq("id", noteId);
    await fetchNotes();
  }, [fetchNotes]);

  const deleteNote = useCallback(async (noteId: string) => {
    await supabase.from("admin_internal_notes" as any).delete().eq("id", noteId);
    await fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, addNote, togglePin, deleteNote, refetch: fetchNotes };
}
