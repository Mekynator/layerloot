import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_STORAGE_KEY,
  type SupportedLanguage,
} from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  const handleChange = async (lang: SupportedLanguage) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

    if (user) {
      await supabase
        .from("profiles")
        .update({ language: lang } as any)
        .eq("user_id", user.id);
    }
  };

  const currentLang = (i18n.language?.split("-")[0] || "en") as SupportedLanguage;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-secondary-foreground hover:text-primary"
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleChange(lang)}
            className={`cursor-pointer ${currentLang === lang ? "font-bold text-primary" : ""}`}
          >
            {lang.toUpperCase()} — {LANGUAGE_LABELS[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
