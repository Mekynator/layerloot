import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircleQuestion, Send, CheckCircle2, User, ShieldCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface ProductQuestion {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
  is_public: boolean;
}

function useProductQuestions(productId: string) {
  return useQuery({
    queryKey: ["product-questions", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_questions")
        .select("id, question, answer, created_at, is_public")
        .eq("product_id", productId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as ProductQuestion[];
    },
    enabled: Boolean(productId),
    staleTime: 1000 * 60 * 5,
  });
}

function formatQADate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ProductQA({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: questions = [], isLoading } = useProductQuestions(productId);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || !newQuestion.trim() || newQuestion.trim().length < 10) {
      toast({
        title: "Question too short",
        description: "Please write at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("product_questions").insert({
      product_id: productId,
      user_id: user.id,
      question: newQuestion.trim(),
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setNewQuestion("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    toast({ title: "Question submitted", description: "We'll answer it soon!" });
    queryClient.invalidateQueries({ queryKey: ["product-questions", productId] });
  };

  const answeredQuestions = questions.filter((q) => q.answer);
  const hasContent = answeredQuestions.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pt-4"
    >
      <div className="space-y-2">
        <Badge
          variant="outline"
          className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.2em] text-primary"
        >
          Q&A
        </Badge>
        <h2 className="font-display text-2xl font-bold uppercase text-foreground">
          Questions & Answers
        </h2>
      </div>

      {/* Question form */}
      {user ? (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="space-y-3 p-5">
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
              Ask a question
            </p>
            <Textarea
              placeholder="What would you like to know about this product?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              rows={2}
              maxLength={500}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">{newQuestion.length}/500</p>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !newQuestion.trim()}
                size="sm"
                className="font-display uppercase tracking-wider"
              >
                {submitting ? (
                  "Submitting..."
                ) : submitted ? (
                  <>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Submitted
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Ask
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary hover:underline">
                Sign in
              </Link>{" "}
              to ask a question about this product.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Questions list */}
      <div className="space-y-3">
        {!hasContent && !isLoading && (
          <div className="section-surface px-6 py-10 text-center">
            <MessageCircleQuestion className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No questions yet — be the first to ask!
            </p>
          </div>
        )}

        <AnimatePresence>
          {answeredQuestions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{q.question}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatQADate(q.created_at)}</p>
                </div>
              </div>

              {q.answer && (
                <div className="ml-8 flex items-start gap-2 rounded-lg border border-primary/10 bg-primary/5 p-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                    <ShieldCheck className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                      LayerLoot
                    </p>
                    <p className="text-sm text-foreground">{q.answer}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
