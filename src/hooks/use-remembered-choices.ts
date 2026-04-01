import { useCallback, useState } from "react";

const CHOICES_KEY = "layerloot_remembered_choices";

export interface RememberedChoices {
  lastMaterial?: string;
  lastColor?: string;
  lastSize?: string;
  lastFinish?: string;
  lastVariantIds?: Record<string, string>;
  lastGiftSettings?: {
    recipientAgeGroup?: string;
    recipientInterests?: string[];
    occasion?: string;
  };
}

function readChoices(): RememberedChoices {
  try {
    const raw = localStorage.getItem(CHOICES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeChoices(choices: RememberedChoices) {
  localStorage.setItem(CHOICES_KEY, JSON.stringify(choices));
}

export function useRememberedChoices() {
  const [choices, setChoices] = useState<RememberedChoices>(() => readChoices());

  const saveChoice = useCallback((key: keyof RememberedChoices, value: any) => {
    setChoices((prev) => {
      const next = { ...prev, [key]: value };
      writeChoices(next);
      return next;
    });
  }, []);

  const saveVariantChoice = useCallback((productId: string, variantId: string) => {
    setChoices((prev) => {
      const next = {
        ...prev,
        lastVariantIds: { ...(prev.lastVariantIds || {}), [productId]: variantId },
      };
      writeChoices(next);
      return next;
    });
  }, []);

  return { choices, saveChoice, saveVariantChoice };
}
