import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmailTemplate } from "./types";

interface Props {
  template: EmailTemplate;
}

export default function EmailLivePreview({ template: t }: Props) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");

  const replacePlaceholders = (text: string) => {
    const map: Record<string, string> = {
      '{{site_name}}': 'LayerLoot',
      '{{site_url}}': 'https://layerloot.neuraltune.me',
      '{{support_email}}': 'layerloot.support@neuraltune.me',
      '{{year}}': new Date().getFullYear().toString(),
      '{{customer_name}}': 'Jane Doe',
      '{{customer_email}}': 'jane@example.com',
      '{{customer_phone}}': '+45 12 34 56 78',
      '{{company_name}}': 'LayerLoot ApS',
      '{{logo_url}}': '',
      '{{login_url}}': 'https://layerloot.neuraltune.me/auth',
      '{{reset_url}}': 'https://layerloot.neuraltune.me/reset-password?token=example',
      '{{verification_url}}': 'https://layerloot.neuraltune.me/auth/verify?token=example',
      '{{order_number}}': 'LL-20250403-001',
      '{{order_date}}': 'April 3, 2025',
      '{{order_total}}': '450 kr',
      '{{order_status}}': 'Confirmed',
      '{{payment_method}}': 'Visa •••• 4242',
      '{{shipping_method}}': 'Standard Shipping',
      '{{shipping_address}}': 'Jane Doe\nVestergade 12, 3. tv\n1456 Copenhagen K\nDenmark',
      '{{billing_address}}': 'Jane Doe\nVestergade 12, 3. tv\n1456 Copenhagen K\nDenmark',
      '{{tracking_url}}': 'https://track.example.com/LL20250403001',
      '{{order_items_table}}': '1× Custom Figurine — 280 kr\n1× Lithophane Night Lamp — 170 kr',
      '{{invoice_number}}': 'INV-2025-0042',
      '{{invoice_date}}': 'April 3, 2025',
      '{{subtotal}}': '400 kr',
      '{{discount_amount}}': '-50 kr',
      '{{shipping_amount}}': '49 kr',
      '{{tax_amount}}': '100 kr',
      '{{grand_total}}': '499 kr',
      '{{currency}}': 'DKK',
      '{{vat_number}}': 'DK-12345678',
      '{{invoice_download_url}}': 'https://layerloot.neuraltune.me/invoices/INV-2025-0042.pdf',
      '{{request_number}}': 'CR-2025-007',
      '{{request_date}}': 'April 3, 2025',
      '{{request_type}}': 'Custom 3D Print',
      '{{request_fee}}': '100 kr',
      '{{quoted_price}}': '350 kr',
      '{{custom_request_summary}}': 'Custom figurine with detailed features, mounted on a wooden base. Approximately 15 cm tall.',
      '{{uploaded_files}}': 'model_v3.stl (4.2 MB)',
      '{{customer_note}}': 'Please use matte black filament. I would like the base to be slightly wider than the model.',
      '{{custom_order_status}}': 'Under Review',
      '{{custom_order_link}}': 'https://layerloot.neuraltune.me/account',
      '{{review_notes}}': 'Model looks great. Minor supports needed on the wing tips. Estimated print time: 14 hours.',
      '{{dimensions}}': '150 × 100 × 80 mm',
      '{{material}}': 'PLA+',
      '{{color}}': 'Matte Black',
      '{{quantity}}': '1',
      '{{ticket_number}}': 'TK-2025-019',
      '{{ticket_subject}}': 'Question about my order',
      '{{ticket_message}}': 'Hi, I wanted to ask about the estimated delivery time for my order.',
      '{{reply_time_estimate}}': '24-48 hours',
      '{{ticket_status}}': 'Open',
      '{{ticket_url}}': 'https://layerloot.neuraltune.me/account',
      '{{estimated_delivery}}': 'April 10, 2025',
      '{{gift_message}}': 'Happy birthday! 🎉 Enjoy something special from LayerLoot.',
      '{{discount_code}}': 'GIFT-LL-X9K2M',
      '{{loyalty_points}}': '240',
      '{{admin_name}}': 'LayerLoot Admin',
      '{{support_signature}}': 'Best regards,\nThe LayerLoot Support Team',
      '{{terms_url}}': 'https://layerloot.neuraltune.me/policies/terms',
      '{{privacy_url}}': 'https://layerloot.neuraltune.me/policies/privacy',
      '{{returns_url}}': 'https://layerloot.neuraltune.me/policies/returns',
    };
    let result = text || '';
    Object.entries(map).forEach(([k, v]) => { result = result.split(k).join(v); });
    return result;
  };

  const r = (s: string) => replacePlaceholders(s);
  const width = mode === "desktop" ? "100%" : "375px";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 pb-3 border-b border-border/30 mb-3">
        <span className="text-xs font-medium text-muted-foreground mr-auto">Preview</span>
        <Button size="sm" variant={mode === "desktop" ? "secondary" : "ghost"} className="h-7 w-7 p-0" onClick={() => setMode("desktop")}>
          <Monitor className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant={mode === "mobile" ? "secondary" : "ghost"} className="h-7 w-7 p-0" onClick={() => setMode("mobile")}>
          <Smartphone className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Subject / preheader preview */}
      <div className="mb-3 rounded-lg bg-muted/30 p-3 text-xs space-y-1">
        <div className="flex gap-2">
          <span className="text-muted-foreground w-16 shrink-0">From:</span>
          <span className="font-medium text-foreground">{t.sender_name} &lt;{t.sender_email}&gt;</span>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground w-16 shrink-0">Subject:</span>
          <span className="font-medium text-foreground">{r(t.subject) || '(no subject)'}</span>
        </div>
        {t.preheader && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-16 shrink-0">Preview:</span>
            <span className="text-muted-foreground">{r(t.preheader)}</span>
          </div>
        )}
      </div>

      {/* Email body */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto transition-all duration-300" style={{ maxWidth: width }}>
          <div style={{ backgroundColor: t.bg_color, fontFamily: "'Source Sans 3', Arial, sans-serif", borderRadius: `${t.border_radius}px`, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {/* Header */}
            <div style={{ padding: `${t.padding}px`, textAlign: 'center', borderBottom: t.show_divider ? '1px solid #e2e8f0' : 'none' }}>
              {t.show_logo && (
                t.logo_url
                  ? <img src={t.logo_url} alt="Logo" style={{ height: 32, margin: '0 auto 8px' }} />
                  : <div style={{ fontSize: 24, fontWeight: 'bold', color: t.accent_color, letterSpacing: 3 }}>⬡ LAYERLOOT</div>
              )}
            </div>

            {/* Hero image */}
            {t.header_image_url && (
              <div>
                <img src={t.header_image_url} alt="Header" style={{ width: '100%', display: 'block' }} />
              </div>
            )}

            {/* Content */}
            <div style={{ padding: `${t.padding}px` }}>
              {t.title && <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }}>{r(t.title)}</h1>}
              {t.subtitle && <h2 style={{ fontSize: 15, fontWeight: 600, color: t.accent_color, margin: '0 0 16px' }}>{r(t.subtitle)}</h2>}

              {t.body && (
                <div style={{ fontSize: 15, color: t.text_color, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 20px' }}>
                  {r(t.body)}
                </div>
              )}

              {t.content_image_url && (
                <div style={{ margin: '16px 0', textAlign: 'center' }}>
                  <img src={t.content_image_url} alt="Content" style={{ maxWidth: '100%', borderRadius: 8 }} />
                </div>
              )}

              {/* Highlight box */}
              {t.highlight_box && (
                <div style={{
                  backgroundColor: `${t.accent_color}10`,
                  border: `1px solid ${t.accent_color}30`,
                  borderRadius: 8,
                  padding: 16,
                  margin: '16px 0',
                  fontSize: 14,
                  color: t.text_color,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}>
                  {r(t.highlight_box)}
                </div>
              )}

              {/* CTA */}
              {t.cta_text && (
                <div style={{ textAlign: 'center', margin: '24px 0' }}>
                  <a href="#" style={{
                    backgroundColor: t.accent_color,
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 600,
                    borderRadius: t.border_radius,
                    padding: '14px 28px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}>
                    {r(t.cta_text)}
                  </a>
                </div>
              )}

              {t.secondary_cta_text && (
                <div style={{ textAlign: 'center', margin: '0 0 20px' }}>
                  <a href="#" style={{
                    fontSize: 14,
                    color: t.accent_color,
                    textDecoration: 'underline',
                  }}>
                    {r(t.secondary_cta_text)}
                  </a>
                </div>
              )}
            </div>

            {/* Divider */}
            {t.show_divider && <hr style={{ borderColor: '#e2e8f0', margin: 0 }} />}

            {/* Footer */}
            <div style={{ padding: `${t.padding}px`, textAlign: 'center' }}>
              {t.signature && <div style={{ fontSize: 13, color: t.text_color, marginBottom: 12 }}>{r(t.signature)}</div>}
              {t.show_support && t.support_block && <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{r(t.support_block)}</div>}
              {t.footer_text && <div style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{r(t.footer_text)}</div>}
              {t.footer_image_url && (
                <div style={{ marginTop: 12 }}>
                  <img src={t.footer_image_url} alt="Footer" style={{ maxWidth: '100%', borderRadius: 8 }} />
                </div>
              )}
              {t.show_legal && (
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 12 }}>
                  You are receiving this email because you have an account at LayerLoot.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
