import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, LANGUAGE_STORAGE_KEY, type SupportedLanguage } from "@/lib/i18n";
import type { AccountModuleProps } from "./types";

const SettingsModule = ({ user, tt }: AccountModuleProps) => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [shippingAddress, setShippingAddress] = useState({ name: "", street: "", city: "", zip: "", country: "Denmark" });
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("shipping_address").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.shipping_address) setShippingAddress({ name: "", street: "", city: "", zip: "", country: "Denmark", ...(data.shipping_address as any) });
    });
  }, [user]);

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div>
          <h3 className="mb-4 font-display text-lg font-bold uppercase text-foreground">
            <MapPin className="mr-2 inline h-5 w-5" />{tt("account.settings.defaultShippingAddress", "Default Shipping Address")}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">{tt("account.settings.addressHint", "This address will be auto-filled at checkout.")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>{tt("account.settings.fullName", "Full Name")}</Label><Input value={shippingAddress.name} onChange={e => setShippingAddress({ ...shippingAddress, name: e.target.value })} placeholder={tt("account.settings.fullNamePlaceholder", "John Doe")} /></div>
            <div><Label>{tt("account.settings.streetAddress", "Street Address")}</Label><Input value={shippingAddress.street} onChange={e => setShippingAddress({ ...shippingAddress, street: e.target.value })} placeholder={tt("account.settings.streetPlaceholder", "123 Main St")} /></div>
            <div><Label>{tt("account.settings.city", "City")}</Label><Input value={shippingAddress.city} onChange={e => setShippingAddress({ ...shippingAddress, city: e.target.value })} placeholder={tt("account.settings.cityPlaceholder", "Copenhagen")} /></div>
            <div><Label>{tt("account.settings.zipCode", "Zip Code")}</Label><Input value={shippingAddress.zip} onChange={e => setShippingAddress({ ...shippingAddress, zip: e.target.value })} placeholder={tt("account.settings.zipPlaceholder", "2100")} /></div>
            <div><Label>{tt("account.settings.country", "Country")}</Label><Input value={shippingAddress.country} onChange={e => setShippingAddress({ ...shippingAddress, country: e.target.value })} /></div>
          </div>
          <Button className="mt-4 font-display uppercase tracking-wider" disabled={savingAddress} onClick={async () => {
            if (!user) return;
            setSavingAddress(true);
            const { error } = await supabase.from("profiles").update({ shipping_address: shippingAddress as any }).eq("user_id", user.id);
            setSavingAddress(false);
            if (error) { toast({ title: tt("common.error", "Error"), description: error.message, variant: "destructive" }); return; }
            toast({ title: tt("account.settings.addressSaved", "Address saved!") });
          }}>
            {savingAddress ? tt("common.saving", "Saving...") : tt("account.settings.saveAddress", "Save Address")}
          </Button>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="mb-4 font-display text-lg font-bold uppercase text-foreground">
            <Globe className="mr-2 inline h-5 w-5" />{t("account.languagePreference")}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">{t("account.languageHint")}</p>
          <Select value={(i18n.language?.split("-")[0] || "en") as SupportedLanguage} onValueChange={async (lang: SupportedLanguage) => {
            await i18n.changeLanguage(lang);
            localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
            if (user) await supabase.from("profiles").update({ language: lang } as any).eq("user_id", user.id);
            toast({ title: t("account.languageSaved") });
          }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{SUPPORTED_LANGUAGES.map(lang => <SelectItem key={lang} value={lang}>{lang.toUpperCase()} — {LANGUAGE_LABELS[lang]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsModule;
