import { useCallback, useState } from "react";
import {
  generateContent,
  type ContentGenerationRequest,
  type ContentGenerationResult,
  type ContentTone,
  type ContentPurpose,
} from "@/lib/ai-engine";

interface UseAIContentReturn {
  /** Generate content based on purpose, tone, and context */
  generate: (request: ContentGenerationRequest) => void;
  /** Regenerate with the same request */
  regenerate: () => void;
  /** Pick an alternate suggestion */
  pickAlternate: (index: number) => void;
  /** Current generated result */
  result: ContentGenerationResult | null;
  /** All available variations (primary + alternates) */
  allVariations: string[];
  /** Currently selected tone */
  tone: ContentTone;
  /** Set tone for next generation */
  setTone: (tone: ContentTone) => void;
  /** Whether a generation is in progress */
  isGenerating: boolean;
}

/**
 * Hook for AI-powered content generation.
 * Generates headings, CTAs, descriptions, etc. based on tone and context.
 * All generation is local (template-based) — no external API calls.
 */
export function useAIContent(defaultTone: ContentTone = "professional"): UseAIContentReturn {
  const [result, setResult] = useState<ContentGenerationResult | null>(null);
  const [lastRequest, setLastRequest] = useState<ContentGenerationRequest | null>(null);
  const [tone, setTone] = useState<ContentTone>(defaultTone);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback((request: ContentGenerationRequest) => {
    setIsGenerating(true);
    setLastRequest(request);

    // Simulate brief async to feel responsive
    const timer = setTimeout(() => {
      const generated = generateContent({ ...request, tone: request.tone ?? tone });
      setResult(generated);
      setIsGenerating(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [tone]);

  const regenerate = useCallback(() => {
    if (!lastRequest) return;
    generate({ ...lastRequest, tone });
  }, [lastRequest, tone, generate]);

  const pickAlternate = useCallback((index: number) => {
    if (!result) return;
    const picked = result.alternates[index];
    if (!picked) return;

    const newAlternates = [result.text, ...result.alternates.filter((_, i) => i !== index)];
    setResult({
      ...result,
      text: picked,
      alternates: newAlternates,
    });
  }, [result]);

  const allVariations = result ? [result.text, ...result.alternates] : [];

  return {
    generate,
    regenerate,
    pickAlternate,
    result,
    allVariations,
    tone,
    setTone,
    isGenerating,
  };
}
